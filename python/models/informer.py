"""Informer-style architecture (ProbSparse self-attention) — importable module.

Mirrors the model built in datasets/ett_probsparse_transformer.ipynb so that the
saved checkpoints under models/transformer_etth1/ can be loaded and evaluated
standalone:

    from models.informer import Informer
    model = Informer(enc_in=7, **cfg).to(device)
    model.load_state_dict(torch.load("models/transformer_etth1/informer_96_96_sparse.pt"))

The ProbSparse self-attention (Informer, Zhou et al., AAAI 2021) keeps the top-u
queries by a sparsity measurement and fills the rest with mean(V), dropping the
cost from O(L^2) to O(L ln L). `sparse=False` swaps in full attention (used in the
notebook as the precision baseline for the ambient experiments).
"""
import math

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class ProbAttention(nn.Module):
    """Single-head ProbSparse attention (Informer Sec 3.2).

    Sparsity measurement M(q_i) = max_j(q_i k_j^T / sqrt(d)) - mean_j(q_i k_j^T / sqrt(d))
    is estimated on a random sample of keys; the top-u queries attend to all keys,
    every other query's output is the mean of the values.
    """

    def __init__(self, d_k, factor=5):
        super().__init__()
        self.d_k = d_k
        self.factor = factor

    def forward(self, q, k, v, mask=None):
        B, L, E = q.shape
        Lk = k.shape[1]
        u = min(int(self.factor * math.log(L)), L)
        if u < L:
            sample_k = min(int(self.factor * math.log(L)), Lk)
            idx = torch.randint(0, Lk, (sample_k,), device=q.device)
            k_sample = k[:, idx, :]
            scores = torch.einsum("bld,bkd->blk", q, k_sample) / math.sqrt(E)
            M = scores.max(dim=-1).values - scores.mean(dim=-1)
            top = torch.topk(M, u, dim=-1, sorted=False).indices
            q_top = q.gather(1, top.unsqueeze(-1).expand(-1, -1, E))
            scores_full = torch.einsum("bue,bke->buk", q_top, k) / math.sqrt(E)
            if mask is not None:
                scores_full = scores_full.masked_fill(mask[top] == 0, float("-inf"))
            attn = torch.softmax(scores_full, dim=-1)
            ctx_top = torch.einsum("bul,bld->bud", attn, v)
            out = v.mean(dim=1, keepdim=True).expand(B, L, E).clone()
            out.scatter_(1, top.unsqueeze(-1).expand(-1, -1, E), ctx_top)
        else:
            scores = torch.einsum("bld,bkd->blk", q, k) / math.sqrt(E)
            if mask is not None:
                scores = scores.masked_fill(mask == 0, float("-inf"))
            out = torch.einsum("blk,bkd->bld", torch.softmax(scores, dim=-1), v)
        return out


class FullAttention(nn.Module):
    """Standard O(L^2) attention — the precision baseline for the sparse mechanism."""

    def forward(self, q, k, v, mask=None):
        scores = torch.einsum("bld,bkd->blk", q, k) / math.sqrt(q.shape[-1])
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))
        return torch.einsum("blk,bkd->bld", torch.softmax(scores, dim=-1), v)


class ProbSparseMultiHeadAttention(nn.Module):
    def __init__(self, d_model, n_heads, factor=5, sparse=True):
        super().__init__()
        assert d_model % n_heads == 0
        self.n_heads, self.d_h = n_heads, d_model // n_heads
        self.q = nn.Linear(d_model, d_model)
        self.k = nn.Linear(d_model, d_model)
        self.v = nn.Linear(d_model, d_model)
        self.out = nn.Linear(d_model, d_model)
        self.attn = ProbAttention(self.d_h, factor) if sparse else FullAttention()

    def forward(self, q, kv=None, mask=None):
        if kv is None:
            kv = q
        B, Lq = q.shape[0], q.shape[1]
        Lk = kv.shape[1]

        def split(x, L):
            return (x.view(B, L, self.n_heads, self.d_h)
                     .transpose(1, 2)
                     .reshape(B * self.n_heads, L, self.d_h))

        qq, kk, vv = split(self.q(q), Lq), split(self.k(kv), Lk), split(self.v(kv), Lk)
        ctx = self.attn(qq, kk, vv, mask)
        ctx = ctx.view(B, self.n_heads, Lq, self.d_h).transpose(1, 2).reshape(B, Lq, -1)
        return self.out(ctx)


class EncoderLayer(nn.Module):
    def __init__(self, d_model, n_heads, d_ff, dropout=0.1, sparse=True):
        super().__init__()
        self.attn = ProbSparseMultiHeadAttention(d_model, n_heads, sparse=sparse)
        self.norm1 = nn.LayerNorm(d_model)
        self.ff = nn.Sequential(nn.Linear(d_model, d_ff), nn.GELU(),
                                nn.Dropout(dropout), nn.Linear(d_ff, d_model))
        self.norm2 = nn.LayerNorm(d_model)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        x = x + self.drop(self.attn(self.norm1(x)))
        x = x + self.drop(self.ff(self.norm2(x)))
        return x


class Distilling(nn.Module):
    """Self-attention distillation: a stride-2 conv halves the sequence length."""

    def __init__(self, d_model):
        super().__init__()
        self.conv = nn.Conv1d(d_model, d_model, kernel_size=3, stride=2, padding=1)

    def forward(self, x):
        return F.gelu(self.conv(x.transpose(1, 2))).transpose(1, 2)


class DecoderLayer(nn.Module):
    def __init__(self, d_model, n_heads, d_ff, dropout=0.1, sparse=True):
        super().__init__()
        self.self_attn = ProbSparseMultiHeadAttention(d_model, n_heads, sparse=sparse)
        self.cross_attn = ProbSparseMultiHeadAttention(d_model, n_heads, sparse=sparse)
        self.norm1, self.norm2, self.norm3 = (nn.LayerNorm(d_model),) * 3
        self.ff = nn.Sequential(nn.Linear(d_model, d_ff), nn.GELU(),
                                nn.Dropout(dropout), nn.Linear(d_ff, d_model))
        self.drop = nn.Dropout(dropout)

    def forward(self, x, enc, mask=None):
        x = x + self.drop(self.self_attn(self.norm1(x), mask=mask))
        x = x + self.drop(self.cross_attn(self.norm2(x), kv=enc))
        x = x + self.drop(self.ff(self.norm3(x)))
        return x


class Informer(nn.Module):
    """Compact Informer: ProbSparse encoder (with distillation) + generative decoder."""

    def __init__(self, enc_in, c_out=1, seq_len=96, label_len=48, pred_len=96,
                 d_model=128, n_heads=8, d_ff=256, e_layers=3, d_layers=1,
                 dropout=0.1, factor=5, sparse=True):
        super().__init__()
        self.pred_len = pred_len
        self.d_model = d_model
        self.sparse = sparse
        dec_len = label_len + pred_len
        self.enc_embed = nn.Linear(enc_in, d_model)
        self.dec_embed = nn.Linear(enc_in, d_model)
        self.enc_pos = nn.Parameter(torch.randn(1, seq_len, d_model) * 0.02)
        self.dec_pos = nn.Parameter(torch.randn(1, dec_len, d_model) * 0.02)
        self.encoder = nn.ModuleList([EncoderLayer(d_model, n_heads, d_ff, dropout, sparse)
                                      for _ in range(e_layers)])
        self.distils = nn.ModuleList([Distilling(d_model) for _ in range(e_layers - 1)])
        self.decoder = nn.ModuleList([DecoderLayer(d_model, n_heads, d_ff, dropout, sparse)
                                      for _ in range(d_layers)])
        self.proj = nn.Linear(d_model, c_out)
        self.register_buffer("dec_mask", torch.tril(torch.ones(dec_len, dec_len)))

    def forward(self, x_enc, x_dec):
        enc = self.enc_embed(x_enc) + self.enc_pos
        for i, layer in enumerate(self.encoder):
            enc = layer(enc)
            if i < len(self.distils):
                enc = self.distils[i](enc)          # 96 -> 48 -> 24
        dec = self.dec_embed(x_dec) + self.dec_pos
        for layer in self.decoder:
            dec = layer(dec, enc, mask=self.dec_mask)
        return self.proj(dec)[:, -self.pred_len:]   # last pred_len steps -> OT


class InformerCopy(Informer):
    """Informer + explicit copy residual: the last real OT is concatenated into the
    final projection, giving the model a trivial persistence path to learn from."""

    def __init__(self, **kw):
        super().__init__(**kw)
        self.proj = nn.Linear(self.d_model + 1, 1)

    def forward(self, x_enc, x_dec):
        enc = self.enc_embed(x_enc) + self.enc_pos
        for i, layer in enumerate(self.encoder):
            enc = layer(enc)
            if i < len(self.distils):
                enc = self.distils[i](enc)
        dec = self.dec_embed(x_dec) + self.dec_pos
        for layer in self.decoder:
            dec = layer(dec, enc, mask=self.dec_mask)
        last = x_enc[:, -1, 6:7].unsqueeze(1).expand(-1, dec.shape[1], -1)
        return self.proj(torch.cat([dec, last], dim=-1))[:, -self.pred_len:]
