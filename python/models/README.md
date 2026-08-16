# Models — ETT forecasting checkpoints (ETTh1)

Trained by `scripts/save_checkpoints.py` (run from `python/`:
`.venv/bin/python scripts/save_checkpoints.py`). Every training resets the seed, so
re-running the script reproduces these artifacts byte-for-byte. Numbers are test-window
MAE in °C; see each JSON sidecar for per-step MAE and full metadata.

## Layout

- `informer.py` — the importable architecture (ProbSparse self-attention encoder with
  distillation + generative decoder, plus `InformerCopy` = + explicit copy residual).
  Checkpoints are `state_dict`s and need this module to load.
- `linear_etth1/` — per-horizon scikit-learn `LinearRegression` models on the classical
  29-feature set (lags + rolling + load + calendar), 70/10/20 temporal split:
  - `linear_h{1,6,24,48,168}.joblib` — classical features only
  - `linear_h{1,6,24,48,168}_ballpark_amb.joblib` — + ballpark ambient `amb(t)`, `amb(t+h)`
  - `linear_metadata.json` — feature list, test MAE vs persistence per horizon
- `transformer_etth1/` — compact Informer checkpoints (`d_model=128, n_heads=8,
  d_ff=256, e_layers=3`, seq 96 / label 48; `sparse=True` = ProbSparse everywhere,
  `sparse=False` = full attention). **Saved by the notebook itself**
  (`datasets/ett_probsparse_transformer.ipynb` §5) from each model's best validation
  state, so these are the exact weights behind the notebook's reported numbers
  (see `saved_by` in each `.json`):
  - `informer_96_96_sparse.pt` — 7 channels, the headline model
  - `informer_96_96_amb_sparse.pt` — + ballpark ambient channel (8ch)
  - `informer_96_96_amb_full.pt` — 8ch, full attention (the ambient gain shows here)
  - `informer_96_96_amb_full_copy.pt` — 8ch, full attention + copy residual
  - `informer_96_168_amb_sparse.pt` — 8ch, week horizon (pred_len 168)
  - each `.json` — config, scaler statistics, test MAE per step

`scripts/save_checkpoints.py` re-trains deterministic equivalents (same hyperparameters,
seeds reset per model) — running it overwrites these files with re-run weights; the
notebook is the authoritative saver.

## Loading

```python
import json, sys, torch
sys.path.insert(0, "python")                 # or run from python/
from models.informer import Informer

meta = json.load(open("models/transformer_etth1/informer_96_96_sparse.json"))
model = Informer(enc_in=meta["enc_in"], **meta["config"])
model.load_state_dict(torch.load("models/transformer_etth1/informer_96_96_sparse.pt",
                                 weights_only=True))
```

Linear: `joblib.load("models/linear_etth1/linear_h168_ballpark_amb.joblib")`.

## How to feed inputs

- Standardize the 7 (or 8, with `amb` column) channels with the per-channel mean/std of
  the first 12 months (12×720 rows) — saved as `ot_sd`/`ot_mean` and the full scaler
  statistics can be recomputed with `informer_split` in `scripts/save_checkpoints.py`.
- Transformer windows: `x_enc` = last 96 steps, `x_dec` = last 48 real steps + zeros
  (for the 8ch models, the ambient column of the zero part is filled with the ballpark
  climatology at `t+h` — a known calendar function). Predictions are the last
  `pred_len` outputs, de-standardized with `ot_sd`/`ot_mean`.

## Reported test MAE (°C, ETTh1 — notebook's exact checkpoint weights)

| artifact | 1h | 24h | 96h/168h |
|---|---|---|---|
| persistence (reference) | 0.43 | 1.57 | 2.20 / 2.51 |
| linear h=168 (classical feats) | — | — | 2.316 |
| linear h=168 (+ ballpark amb) | — | — | 2.306 |
| informer_96_96_sparse | 4.98 | 5.53 | 6.10 |
| informer_96_96_amb_sparse | 7.68 | 7.98 | 8.11 |
| informer_96_96_amb_full | 5.51 | 4.99 | 4.48 |
| informer_96_96_amb_full_copy | 7.36 | 6.99 | 6.46 |
| informer_96_168_amb_sparse | — | — | 7.63 @168h |

Context: the study's conclusion — ETTh1 is persistence-dominated; the transformer's
short-horizon copy deficit is architectural (attention cannot learn the identity
mapping at this scale), and the ballpark ambient helps only where the model can use it.
See `datasets/ett_ml_baselines.ipynb` and `datasets/ett_probsparse_transformer.ipynb`.
