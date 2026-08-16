#!/usr/bin/env python3
"""Train and save the ETT linear models and ProbSparse transformer checkpoints locally.

Reproduces the models from:
  - datasets/ett_ml_baselines.ipynb            (linear, per horizon, classical features,
                                               with and without the ballpark ambient)
  - datasets/ett_probsparse_transformer.ipynb  (Informer / InformerCopy checkpoints)

Every training resets the seed (torch 0 / numpy 0), so all artifacts are deterministic.
Checkpoints are saved under models/ with a JSON sidecar carrying the config, the
standardization scaler, and the test MAE per forecast step, so they load standalone:

    from models.informer import Informer
    import torch
    model = Informer(enc_in=7, **cfg)
    model.load_state_dict(torch.load("models/transformer_etth1/informer_96_96_sparse.pt"))

Run from python/:  .venv/bin/python scripts/save_checkpoints.py
"""
import json
import math
import os
import sys
import time

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from models.informer import Informer, InformerCopy

DEV = "mps" if torch.backends.mps.is_available() else "cpu"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # python/
OUT = os.path.join(ROOT, "models")

HOURS_PER_MONTH = 30 * 24
SEQ_LEN, LABEL_LEN, PRED_LEN = 96, 48, 96
BATCH_SIZE = 64
OT_COL = 6
CFG = dict(d_model=128, n_heads=8, d_ff=256, e_layers=3, d_layers=1, dropout=0.1, factor=5)


def resolve(name):
    for base in ("datasets", "."):
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    return name


def ballpark_ambient(index):
    """Beijing normals + diurnal — pure calendar function (no leakage, known at t+h)."""
    monthly = np.array([-3.0, -0.6, 6.3, 14.0, 20.0, 24.5, 27.0, 25.9, 20.9, 13.9, 4.9, -1.5])
    anchors = np.array([1, 15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349, 365])
    vals = np.concatenate([[monthly[0]], monthly, [monthly[-1]]])
    seasonal = np.interp(np.asarray(index.dayofyear, dtype=float), anchors, vals)
    hour = np.asarray(index.hour) + np.asarray(index.minute) / 60.0
    return seasonal - 4.5 * np.cos(2 * np.pi * (hour - 14) / 24)


def informer_split(df, per_month=HOURS_PER_MONTH):
    nt, nv = 12 * per_month, 4 * per_month
    return df.iloc[:nt], df.iloc[nt:nt + nv], df.iloc[nt + nv:nt + nv + 2 * per_month]


# --------------------------------------------------------------------------- data
def make_windows(x, seq_len, label_len, pred_len, stride, ot_col, exog_future_col=None):
    """Windows; optionally fill the decoder's pred part with a known-future exog column."""
    T = len(x)
    encs, decs, ys = [], [], []
    for t in range(0, T - seq_len - pred_len + 1, stride):
        encs.append(x[t:t + seq_len])
        dec = np.zeros((label_len + pred_len, x.shape[1]))
        dec[:label_len] = x[t + seq_len - label_len:t + seq_len]
        if exog_future_col is not None:
            dec[label_len:, exog_future_col] = x[t + seq_len:t + seq_len + pred_len, exog_future_col]
        decs.append(dec)
        ys.append(x[t + seq_len:t + seq_len + pred_len, ot_col])
    return np.stack(encs), np.stack(decs), np.stack(ys)


def prepare(df, stride_train=4, stride_eval=3, use_ambient=False, pred_len=PRED_LEN):
    tr, va, te = informer_split(df)
    if use_ambient:
        df = df.assign(amb=ballpark_ambient(df.index))
        tr, va, te = informer_split(df)
    mu, sd = tr.mean(), tr.std()
    std = lambda d: (d - mu) / sd
    exog = 7 if use_ambient else None
    return (make_windows(std(tr).to_numpy(), SEQ_LEN, LABEL_LEN, pred_len, stride_train, OT_COL, exog),
            make_windows(std(va).to_numpy(), SEQ_LEN, LABEL_LEN, pred_len, stride_eval, OT_COL, exog),
            make_windows(std(te).to_numpy(), SEQ_LEN, LABEL_LEN, pred_len, stride_eval, OT_COL, exog),
            float(sd["OT"]), float(mu["OT"]))


def batches(data, bs, shuffle=True, seed=0):
    Xe, Xd, Y = data
    n = len(Xe)
    order = np.random.RandomState(seed).permutation(n) if shuffle else np.arange(n)
    for i in range(0, n, bs):
        idx = order[i:i + bs]
        yield (torch.tensor(Xe[idx], dtype=torch.float32, device=DEV),
               torch.tensor(Xd[idx], dtype=torch.float32, device=DEV),
               torch.tensor(Y[idx], dtype=torch.float32, device=DEV))


def evaluate(model, data, ot_sd, ot_mean):
    model.eval()
    preds, trues = [], []
    with torch.no_grad():
        for Xe, Xd, Y in batches(data, 128, shuffle=False):
            preds.append(model(Xe, Xd)[:, :, 0].cpu().numpy())
            trues.append(Y.cpu().numpy())
    p = np.concatenate(preds) * ot_sd + ot_mean
    t = np.concatenate(trues) * ot_sd + ot_mean
    return np.abs(p - t).mean(axis=0)   # per-step MAE (°C)


def persistence_mae(data, ot_sd, ot_mean):
    Xe, _, Y = data
    last = Xe[:, -1, OT_COL] * ot_sd + ot_mean
    return np.abs(Y * ot_sd + ot_mean - last[:, None]).mean(axis=0)


def train_model(model, tr_data, va_data, ot_sd, ot_mean, epochs=30, lr=1e-3, patience=8, tag=""):
    opt = torch.optim.AdamW(model.parameters(), lr=lr)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    best_mae, best_state, bad = float("inf"), None, 0
    t0 = time.time()
    for epoch in range(epochs):
        model.train()
        for Xe, Xd, Y in batches(tr_data, BATCH_SIZE, seed=epoch):
            opt.zero_grad()
            loss = F.mse_loss(model(Xe, Xd), Y.unsqueeze(-1))
            loss.backward()
            opt.step()
        sched.step()
        va_mae = evaluate(model, va_data, ot_sd, ot_mean).mean()
        if va_mae < best_mae:
            best_mae, bad = va_mae, 0
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        else:
            bad += 1
            if bad >= patience:
                break
    model.load_state_dict(best_state)
    return best_mae


def save_transformer(name, arch, enc_in, pred_len, use_ambient, sparse=True, epochs=30):
    torch.manual_seed(0)
    np.random.seed(0)
    df = pd.read_csv(resolve("ETTh1.csv"), parse_dates=["date"]).set_index("date")
    tr, va, te, ot_sd, ot_mean = prepare(df, use_ambient=use_ambient, pred_len=pred_len)
    cfg = {**CFG, "pred_len": pred_len, "sparse": sparse}
    model = arch(enc_in=enc_in, **cfg).to(DEV)
    t0 = time.time()
    best_mae = train_model(model, tr, va, ot_sd, ot_mean, epochs=epochs, tag=name)
    mae_step = evaluate(model, te, ot_sd, ot_mean)
    torch.save(model.state_dict(), os.path.join(OUT, "transformer_etth1", name + ".pt"))
    meta = {
        "model": name, "arch": arch.__name__, "enc_in": enc_in,
        "config": cfg, "window": {"seq_len": SEQ_LEN, "label_len": LABEL_LEN, "pred_len": pred_len},
        "use_ballpark_ambient": use_ambient, "device": DEV,
        "ot_sd": ot_sd, "ot_mean": ot_mean,
        "val_mae_all": round(float(best_mae), 3),
        "test_mae_per_step": [round(float(x), 3) for x in mae_step],
        "test_mae_all": round(float(mae_step.mean()), 3),
        "train_seconds": round(time.time() - t0),
    }
    with open(os.path.join(OUT, "transformer_etth1", name + ".json"), "w") as f:
        json.dump(meta, f, indent=1)
    print(f"  [{name}] val MAE {best_mae:.3f}°C | test MAE {mae_step.mean():.3f}°C | "
          f"step1 {mae_step[0]:.2f} step24 {mae_step[23]:.2f} step96 {mae_step[95]:.2f} | {meta['train_seconds']}s")
    return meta


def save_linear():
    """Per-horizon linear models (classical features), with and without the ballpark ambient."""
    df = pd.read_csv(resolve("ETTh1.csv"), parse_dates=["date"]).set_index("date")
    amb = pd.Series(ballpark_ambient(df.index), index=df.index)

    def build_features(d):
        idx = d.index
        f = pd.DataFrame(index=idx)
        f["ot_now"] = d["OT"]
        for h in [1, 2, 3, 6, 12, 24, 48, 168]:
            f[f"ot_lag{h}h"] = d["OT"].shift(h)
        for w in [24, 168]:
            r = d["OT"].rolling(w, min_periods=w)
            f[f"ot_mean{w}h"] = r.mean(); f[f"ot_std{w}h"] = r.std()
            f[f"ot_min{w}h"] = r.min(); f[f"ot_max{w}h"] = r.max()
        p = d[["HUFL", "MUFL", "LUFL"]].sum(axis=1)
        q = d[["HULL", "MULL", "LULL"]].sum(axis=1)
        f["p_total"] = p; f["q_total"] = q
        f["p_lag1h"] = p.shift(1); f["p_lag24h"] = p.shift(24)
        f["p_mean24h"] = p.rolling(24, min_periods=24).mean()
        f["hour_sin"] = np.sin(2 * np.pi * idx.hour / 24)
        f["hour_cos"] = np.cos(2 * np.pi * idx.hour / 24)
        f["dow_sin"] = np.sin(2 * np.pi * idx.dayofweek / 7)
        f["dow_cos"] = np.cos(2 * np.pi * idx.dayofweek / 7)
        f["month_sin"] = np.sin(2 * np.pi * idx.month / 12)
        f["month_cos"] = np.cos(2 * np.pi * idx.month / 12)
        f["is_weekend"] = (idx.dayofweek >= 5).astype(int)
        return f

    feats = build_features(df)
    records = []
    for h in [1, 6, 24, 48, 168]:
        amb_fh = amb.shift(-h)
        Xy = feats.assign(amb_now=amb, amb_fh=amb_fh, y=df["OT"].shift(-h)).dropna()
        n = len(Xy)
        trm = np.arange(int(n * 0.7)); tem = np.arange(int(n * 0.8), n)
        X, yt = Xy.drop(columns="y"), Xy["y"].to_numpy()
        base_cols = [c for c in X.columns if c not in ("amb_now", "amb_fh")]
        pers = float(mean_absolute_error(yt[tem], X["ot_now"].to_numpy()[tem]))

        lin0 = LinearRegression().fit(X.iloc[trm][base_cols], yt[trm])
        lin1 = LinearRegression().fit(X.iloc[trm], yt[trm])
        m0 = float(mean_absolute_error(yt[tem], lin0.predict(X.iloc[tem][base_cols])))
        m1 = float(mean_absolute_error(yt[tem], lin1.predict(X.iloc[tem])))
        base_name = f"linear_h{h}"
        amb_name = f"linear_h{h}_ballpark_amb"
        joblib.dump(lin0, os.path.join(OUT, "linear_etth1", base_name + ".joblib"))
        joblib.dump(lin1, os.path.join(OUT, "linear_etth1", amb_name + ".joblib"))
        records.append({
            "horizon_h": h, "persistence_mae": round(pers, 3),
            base_name + "_mae": round(m0, 3), amb_name + "_mae": round(m1, 3),
            "features": base_cols, "ambient_features": ["amb_now", "amb_fh"],
            "split": "70/10/20 by time on the dropna'd feature frame",
        })
        print(f"  [linear h={h:>3}h] no-amb {m0:.3f} | +ballpark amb {m1:.3f} | persistence {pers:.3f}°C")
    with open(os.path.join(OUT, "linear_etth1", "linear_metadata.json"), "w") as f:
        json.dump(records, f, indent=1)


def main():
    os.makedirs(os.path.join(OUT, "linear_etth1"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "transformer_etth1"), exist_ok=True)
    print(f"device: {DEV} | output: {OUT}")
    print("== linear models (ETTh1, per horizon) ==")
    save_linear()
    print("== transformer checkpoints (ETTh1) ==")
    save_transformer("informer_96_96_sparse", Informer, 7, 96, use_ambient=False)
    save_transformer("informer_96_96_amb_sparse", Informer, 8, 96, use_ambient=True)
    save_transformer("informer_96_96_amb_full", Informer, 8, 96, use_ambient=True, sparse=False)
    save_transformer("informer_96_96_amb_full_copy", InformerCopy, 8, 96, use_ambient=True, sparse=False)
    save_transformer("informer_96_168_amb_sparse", Informer, 8, 168, use_ambient=True)
    print("done — artifacts under models/")


if __name__ == "__main__":
    main()
