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

---

# Models — Kelmarsh wind farm SCADA 2016 (forecasting, power curve, anomaly)

Trained by `datasets/kelmarsh_scada_analysis.ipynb` (the notebook saves its own artifacts).
Raw data: 6 × Senvion MM92, 10-minute SCADA 2016, Cubico Sustainable Investments,
CC-BY-4.0, zenodo.org/records/5841834 — `datasets/kelmarsh_2016/` (git-ignored, ~620 MB;
regenerate from `Kelmarsh_SCADA_2016_3082.zip`). This is the same data behind
`lib/windiq-real.json` (built by `python/scripts/build-windiq-data.py`) — §3 of the notebook
reproduces the dashboard's per-turbine conformance/availability/deficit and the status-log
loss table **to the digit**.

## Layout — `scada_kelmarsh/`

- `power_linear_h{1,6,24}.joblib` — Ridge on history-only features (power/wind-speed/
  theoretical lags + hour/day-of-year sines), 70/10/20 temporal split. Target: farm power MW.
- `power_linear_metadata.json` — feature list, test MAE per horizon.
- `informer_power_96_6.pt/.json` — ProbSparse Informer, seq 96 / label 48 / pred 6 (1 h ahead).
- `informer_power_96_96.pt/.json` — same, pred 96 (16 h ahead).
- `informer_power_96_96_oracle.pt/.json` — same but the decoder's prediction part is filled
  with the **true future wind speed** — a perfect-NWP oracle (leakage, diagnostic only).

## Reported test MAE (MW; % of fleet capacity 12.3 MW — notebook's exact weights)

§4 baselines, history-only features, 70/10/20 temporal split (test = last ~9.8k rows):

| model | 1 h | 6 h | 24 h |
|---|---|---|---|
| persistence | 0.956 (7.8%) | 1.876 (15.3%) | 2.707 (22.0%) |
| constant mean | 2.545 (20.7%) | 2.549 (20.7%) | 2.561 (20.8%) |
| linear | 0.969 (7.9%) | 1.847 (15.0%) | 2.407 (19.6%) |
| GBDT | 1.094 (8.9%) | 2.088 (17.0%) | 2.655 (21.6%) |
| linear + ws(t+h) oracle | 0.520 (4.2%) | 0.824 (6.7%) | 0.949 (7.7%) |

§6 transformer, stride-3 windows from the same test region (16 h = 96 steps):

| model | 1 h (pred 6) | 16 h (pred 96) |
|---|---|---|
| persistence | 0.734 (6.0%) | 1.970 (16.0%) |
| constant mean | — | 2.550 (20.7%) |
| informer_power_96_6 | 0.793 (6.4%) | — |
| informer_power_96_96 | — | 1.882 (15.3%) |
| informer_power_96_96_oracle | — | 0.295 (2.4%) |

Honest conclusions, mirroring the ETT arc: at short horizons **persistence is the bar** and
the transformer loses to it (same copy deficit); at 16 h the transformer beats both
persistence and a constant level (it learns persistence-decay + mean reversion); the
**missing exogenous signal is the future wind speed** — a perfect-NWP oracle cuts the 24 h
error 2.41 → 0.95 MW (−60%, linear) and the 16 h error 1.88 → 0.30 MW (−84%, transformer).
The power curve itself is the workhorse SCADA model: fleet reference curve, per-turbine
conformance/availability, derating screen (>30% below curve in the 8–16 m/s band ≈ 119 MWh
fleet-wide) and stuck-sensor runs are all computed in the notebook.

## Loading

Transformer: same as the ETT checkpoints, but `enc_in=3` and window params from the sidecar —
`Informer(enc_in=meta["enc_in"], seq_len=…, label_len=…, pred_len=…, **hyper)`.
Standardize the 3 channels (P, ws, theo — `channel_mean`/`channel_sd` in the `.json`) with
the train-split statistics, build `x_enc` (last `seq_len` steps) and `x_dec` (last
`label_len` real steps + zeros), predict, de-standardize channel 0.
Linear: `joblib.load("models/scada_kelmarsh/power_linear_h24.joblib")` — features in
`power_linear_metadata.json`.

---

# Models — Area Science Park PV plant Q2 (SolarIQ: power curve, string diagnostics, forecasting)

Trained by `datasets/solariq_pvq2_analysis.ipynb` (the notebook saves its own artifacts).
Raw data: real DC-side operating data of a rooftop PV plant (Trieste, 45.64°N), 15-minute
samples, 2013-01-01 → 2021-11-16 (311,232 points, no gaps/NaNs): 8 string currents on 3
inverters, inverter DC voltage + panel temperature, POA irradiance, ambient temperature.
CC-BY-4.0, zenodo.org/records/7115550 — `datasets/PV_Q2.csv` (~30 MB, git-ignored).
Plant DC ≈ 14 kWp (99.9th percentile of measured power).

## Layout — `solariq_pvq2/`

- `power_curve.json` — temperature-corrected efficiency model `P = G·(a₀ + a₁·(Tpan−25))`
  (a₀ = 0.0135 kW/(W/m²), a₁ = −1.1e-5, R² 0.95 train / 0.84 test), bin-mean reference curve.
- `string_conformance.json` — per-string `I = s·G` slopes + conformance (test window and full
  period) + lost kWh. Worst: **inv1-s3 at 96.9% conformance, ≈1.7 MWh lost (zero current for
  634 h in 2017 — a ~26-day dead string)**.
- `power_linear_h{1,6,24}.joblib` + `power_linear_metadata.json` — Ridge on history-only
  features (P/G/T lags + calendar sines), 70/10/20 temporal split. Target: plant DC power kW.
- `informer_power_96_6.pt/.json` — ProbSparse Informer, seq 96 / label 48 / pred 6 (1.5 h).
- `informer_power_96_96.pt/.json` — same, pred 96 (24 h).
- `informer_power_96_96_oracle.pt/.json` — decoder prediction part filled with the **true
  future irradiance** (perfect solar forecast, leakage, diagnostic only).

## Reported test MAE (kW; % of ~14 kWp — notebook's exact weights)

§4 single-point baselines (history-only):

| model | 1 h | 6 h | 24 h |
|---|---|---|---|
| persistence (P(t) → P(t+h)) | 0.84 (6.0%) | 3.33 (23.9%) | 0.87 (6.2%) |
| diurnal mean | 1.34 (9.6%) | 1.34 (9.6%) | 1.34 (9.6%) |
| linear | 0.84 (6.1%) | 1.72 (12.3%) | 1.06 (7.6%) |
| GBDT | 0.49 (3.5%) | 0.87 (6.2%) | 0.84 (6.0%) |
| linear + G(t+h) oracle | 0.28 (2.0%) | 0.49 (3.5%) | 0.28 (2.0%) |

§6 multi-step transformer (stride-3 windows from the same test region):

| model | 1.5 h (pred 6) | 24 h (pred 96) |
|---|---|---|
| persistence (hold last value) | 0.75 (5.4%) | 3.04 (21.8%) |
| diurnal mean | — | 1.34 (9.6%) |
| informer_power_96_6 | 0.70 (5.0%) | — |
| informer_power_96_96 | — | 1.15 (8.2%) |
| informer_power_96_96_oracle | — | 0.33 (2.4%) |

Honest conclusions: **lagged irradiance beats persistence** at every horizon (GBDT 0.49 vs
0.84 kW at 1 h) and the transformer edges hold-last-value persistence at 1.5 h (0.70 vs
0.75) — the first time in this arc a transformer beats persistence (ETT/wind did not). For a
**24 h trajectory** the flat-line persistence is hopeless (3.04 kW), the diurnal mean is the
bar (1.34), and the transformer beats it (1.15). The **missing signal is future irradiance**:
the perfect-irradiance oracle cuts single-point errors ~70% (24 h: 1.06 → 0.28 kW) and the
24 h trajectory error to 0.33 kW (−71% vs the transformer). The **string-level power curve is
the workhorse SolarIQ diagnostic**: per-string conformance with lost-kWh accounting (inv1-s3:
96.9%, ≈1.7 MWh lost — zero current 634 h in 2017), and the **inv2 voltage-channel/DAQ fault**
(973 h of zero DC voltage in 2021 with string currents tracking normally → only 2 of 3,893
points are a true outage; ≈3.2 MWh of output is invisible in the V×I power record — the cause
of the 2021 efficiency step-down, which the notebook attributes to the fault, not soiling).

## Loading

Same as the Kelmarsh transformers but `enc_in=3`, channels `[P, G, T]` (kW, W/m², °C) with
`channel_mean`/`channel_sd` from the `.json`; de-standardize channel 0. Linear:
`joblib.load("models/solariq_pvq2/power_linear_h24.joblib")`.

---

# Models — ECL smart-meter network (GridSense: AMI accounting, suspects, load forecast)

Trained by `datasets/gridsense_ami_analysis.ipynb` (the notebook saves its own artifacts).
Raw data: ECL (Electricity Load Diagrams) — 321 metered clients, hourly, 2012-01-01 →
2014-12-31 (26,304 points, no NaNs), UCI ElectricityLoadDiagrams20112014 (Portuguese
distribution utility), mirrored by `laiguokun/multivariate-time-series-data` →
`datasets/ecl_electricity.txt` (~95 MB, git-ignored). This is the same electricity series
used as the Informer/ECL benchmark. Division load peak ≈ 1,790 MW.

## Layout — `gridsense_ami/`

- `load_linear_h24.joblib` / `load_linear_h168.joblib` — Ridge day/week-ahead forecasters
  (P lags 1/24/168 + calendar sines + ballpark Lisbon temperature), division load MW.
- `informer_load_96_24.pt/.json` — ProbSparse Informer, seq 96 / label 48 / pred 24
  (day-ahead), channels [P MW, T_ballpark °C].
- `informer_load_96_96.pt/.json` — same, pred 96 (4-day).

## Reported test MAE (MW; % of 1,790 MW peak — notebook's exact weights)

§5 single-point baselines:

| model | day-ahead (24 h) | week-ahead (168 h) |
|---|---|---|
| persistence (same time yesterday) | 43.10 (2.4%) | 61.69 (3.4%) |
| diurnal mean | 114.11 (6.4%) | 116.12 (6.5%) |
| linear | 40.13 (2.2%) | 55.60 (3.1%) |
| linear + ballpark T | 40.04 (2.2%) | 54.86 (3.1%) |
| GBDT | 37.53 (2.1%) | 60.99 (3.4%) |

§6 transformer (multi-step trajectory):

| model | day-ahead (pred 24) | 4-day (pred 96) |
|---|---|---|
| persistence (yesterday / flat) | 31.17 (1.7%) | 346.64 (19.4%) |
| diurnal mean | — | 112.84 (6.3%) |
| informer_load_96_24 | 107.45 (6.0%) | — |
| informer_load_96_96 | — | 149.44 (8.3%) |

Honest conclusions: **persistence (same time yesterday) is the day-ahead bar** (31.2 MW) and
GBDT is the best learned model (37.5); **ballpark ambient temperature is redundant for the
aggregate** (the calendar terms already carry the seasonal shape — the ETT ambient gain does
not transfer here); **the transformer loses to persistence again — the copy deficit**
(day-ahead 107 vs 31 MW; at 4-day it does not beat the diurnal mean). The AMI analytics
(§2–§4) are the product's real value: 15 stuck meters (MT-183 stuck 19,913 h — a dead
meter), the 30-day expected-vs-recorded accounting (F-01 heavy-industrial gap 21%, mostly
seasonal/operational — framed honestly), and 5 ranked suspects with dominant patterns
(drop/stuck/night) and est. unbilled kWh.

## Loading

Same pattern as the others: `Informer(enc_in=2, seq_len=96, label_len=48, pred_len=…, **hyper)`
with channels `[P, Tball]` (`channel_mean`/`channel_sd` in the `.json`), de-standardize
channel 0. Linear: `joblib.load("models/gridsense_ami/load_linear_h24.joblib")`.

---

# Models — NASA C-MAPSS turbofan FD001 (AssetIQ: health index, RUL, maintenance alerts)

Trained by `datasets/assetiq_cmapss_analysis.ipynb` (the notebook saves its own artifacts).
Raw data: NASA C-MAPSS turbofan engine degradation simulation, subset FD001 — 100
run-to-failure engines (20,631 flight cycles, 21 sensors + 3 operating settings; single
operating condition) and 100 engines truncated before failure with true RUL labels
(1 cycle = 1 flight). Mirrored at `datasets/cmapss_fd001/{train,test,RUL}_FD001.txt`
(git-ignored; from Hugging Face `gabrieleformis/cmapss-dataset`).

## Layout — `assetiq_cmapss/`

- `rul_ridge.joblib` — ridge on rolling window statistics (W=30: mean/std/min/max/slope of
  the 14 informative sensors + current raw values of all 21 → 105 features), RUL cycles.
- `rul_gbdt.joblib` — HistGradientBoosting on the same features (the headline model).
- `rul_metadata.json` — sensors (21 all / 7 constant / 14 informative), test RMSE/MAE per
  model, permutation importance top-10, band errors, alert simulation, top-12 maintenance
  queue, and all 100 test-engine predictions (the dashboard reads this file).
- `rul_transformer.pt/.json` — encoder-only transformer, 30-cycle raw sensor windows
  (z-scored, train stats) → mean-pool → linear head → RUL (sequence-to-scalar; no target
  history at test time, so the forecast-style Informer does not apply). `channel_mean/sd`
  and `target_mean/sd` in the `.json` for de-standardization.

## Reported test error (100 held-out engines; cycles ≈ flights ≈ days)

| model | RMSE | MAE |
|---|---|---|
| constant (train-mean RUL) | 41.84 | 36.18 |
| ridge | 18.05 | 14.49 |
| transformer (raw 30-cycle windows) | 16.90 | 12.54 |
| GBDT | 13.54 | 10.13 |

GBDT error by true-RUL band: ≤30 cycles (n=25) RMSE 5.29 / MAE 4.08; 30–60 (n=14)
13.34 / 10.37; 60–100 (n=28) 16.93 / 14.32; >100 (n=33) 14.70 / 11.06 — most accurate
exactly where it matters (near failure), hardest in mid-life.

Dispatch simulation (alert at predicted RUL ≤ 30): GBDT 22 alerts → 21 TP / 1 FP / 4
missed (precision 0.95, recall 0.84); ridge 15 → 15 / 0 / 10 (1.00 / 0.60); transformer 23
→ 22 / 1 / 3 (0.96 / 0.88).

Honest conclusions: **GBDT on engineered window statistics wins on point estimates**
(RMSE 13.5 ≈ the published classical-ML state of the art on FD001); the raw-window
**transformer is a respectable second** (16.9) but cannot close the gap at 100 training
engines — the same classical-vs-attention finding as the wind/solar/grid notebooks. The
transformer's marginally higher dispatch recall (0.88 vs 0.84) is a calibration artifact.
Caveats that stop these numbers transferring directly: single operating condition, clean
labels, no sensor faults, identical engines — real fleets mix regimes, have broken channels
(§2's constant-sensor screen) and unknown wear states.

## Loading

`joblib.load("models/assetiq_cmapss/rul_gbdt.joblib")` — features are per-engine rolling
W=30 statistics (14 informative sensors × mean/std/min/max/slope + 21 raw currents, 105
cols, feature order in `FEAT_NAMES` in the notebook). Transformer:
`RulEncoder(d=96, h=6, L=3)` from the notebook §5, then `load_state_dict` of
`rul_transformer.pt`, de-standardize with `channel_mean/sd` + `target_mean/sd`.
