#!/usr/bin/env python3
"""Build lib/gridsense-real.json from the ECL smart-meter network dataset.

Data: ECL (Electricity Load Diagrams) — 321 metered clients, hourly, 2012-01-01 ->
2014-12-31, originally UCI ElectricityLoadDiagrams20112014 (Portuguese distribution
utility); mirrored by laiguokun/multivariate-time-series-data (electricity.txt).
Usage: python3 python/scripts/build-gridsense-data.py  (reads python/datasets/ecl_electricity.txt)
"""
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "..", "datasets", "ecl_electricity.txt")
OUT = os.path.join(HERE, "..", "..", "lib", "gridsense-real.json")

d = pd.read_csv(CSV, sep=",", header=None).astype(np.float64)
d.columns = [f"MT-{i+1:03d}" for i in range(d.shape[1])]
df = d.set_index(pd.date_range("2012-01-01", periods=len(d), freq="h"))
df.index.name = "t"
df["P"] = df.sum(axis=1) / 1000.0  # division load MW

M_COLS = [c for c in df.columns if c.startswith("MT-")]
n = len(df)
i_tr, i_va = int(0.7 * n), int(0.8 * n)
PEAK = float(df["P"].max())

# --- stuck meters (>= 24 h identical readings) ---
def stuck_mask(s, min_len=24):
    same = (s == s.shift()).fillna(False)
    grp = (same != same.shift()).cumsum()
    cnt = same.groupby(grp).transform("sum")
    return same & (cnt >= min_len)

stuck_meters = [c for c in M_COLS if float(stuck_mask(df[c]).sum()) > 0]

# --- cohorts (largest meters -> F-01) ---
means = df[M_COLS].mean()
order = means.sort_values(ascending=False).index
cohorts = [order[int(len(order) * q):int(len(order) * (q + 0.2))] for q in np.arange(0, 1, 0.2)]
F_NAMES = [("F-01", "Heavy Industrial"), ("F-02", "Industrial"),
           ("F-03", "Commercial / Light Industrial"), ("F-04", "Residential High"),
           ("F-05", "Residential")]

# --- expected vs recorded accounting (last 30 days vs prior 90) ---
w = df.index >= "2014-12-01"
base = (df.index >= "2014-09-01") & (df.index < "2014-12-01")
hofw = df.index.hour * 7 + df.index.dayofweek
prof = {}
for c in M_COLS:
    g = df.loc[base, c].groupby(hofw[base]).median()
    prof[c] = g.reindex(hofw[w]).values

feeders = []
for (fid, fname), cset in zip(F_NAMES, cohorts):
    rec = float(df.loc[w, cset].sum().sum()) / 1000.0
    exp = float(pd.DataFrame({c: prof[c] for c in cset}).sum().sum()) / 1000.0
    gap = max(0.0, exp - rec)
    feeders.append({"id": fid, "name": fname, "meters": len(cset),
                    "expectedMwh": round(exp, 1), "recordedMwh": round(rec, 1),
                    "gapMwh": round(gap, 1), "lossPct": round(100 * gap / exp if exp else 0, 1)})
div_gap_pct = round(100 * sum(f["gapMwh"] for f in feeders) / sum(f["expectedMwh"] for f in feeders), 1)

# --- suspects (weighted drop/stuck/night score), top 3 per cohort ---
win = df.index >= "2014-12-01"
b90 = (df.index >= "2014-09-01") & (df.index < "2014-12-01")
night_h = df.index.hour < 5
sus_rows = []
for (fid, fname), cset in zip(F_NAMES, cohorts):
    cm = df[cset]
    night_frac = cm.loc[b90].clip(lower=0)[night_h[b90]].sum() / cm.loc[b90].clip(lower=0).sum()
    c_med = float(night_frac.median())
    for c in cset:
        last = float(df.loc[win, c].mean())
        prev = float(df.loc[b90, c].mean())
        drop = max(0.0, min(1.0, 1 - last / prev)) if prev > 5 else 0.0
        stk = float(stuck_mask(df.loc[b90, c]).sum()) / (90 * 24)
        nf = float(night_frac[c])
        night = min(1.0, abs(nf - c_med) / c_med) if c_med > 0.02 else 0.0
        score = 0.45 * drop + 0.35 * stk + 0.20 * night
        if score >= 0.35:
            if drop >= stk and drop >= night:
                pat = (f"Consumption dropped {100*drop:.0f}% in the last 30 days vs its own "
                       f"90-day baseline (prev mean {prev:.0f} kW).")
            elif stk >= night:
                pat = (f"Meter reading stuck identical for {stk*90*24:.0f} h of the last 90 days "
                       "— dead/bypassed meter.")
            else:
                ds = "+" if nf > c_med else "-"
                pat = (f"Night-time share {100*nf:.0f}% vs cohort median {100*c_med:.0f}% "
                       f"({ds}{100*abs(nf-c_med)/c_med:.0f}%).")
            unbilled = max(0.0, prev - last) * 24 * 30 / 1000.0
            sus_rows.append({"id": c, "feeder": fid, "type": fname, "score": round(score, 2),
                             "pattern": pat, "loss": f"~{round(unbilled, 0):.0f} kWh/mo",
                             "unbilledKwhMo": round(unbilled, 0)})
suspects = sorted(sus_rows, key=lambda r: (-r["score"]))[:9]
suspects = sorted(suspects, key=lambda r: r["feeder"])

# --- day-ahead forecast: GBDT (best learned model) on a real test day ---
LAGS = [1, 24, 168]
def feats(s, h):
    cols = {f"P_l{lag}": s.shift(lag) for lag in LAGS}
    t = s.index
    hour = t.hour + t.minute / 60
    cols["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    cols["hour_cos"] = np.cos(2 * np.pi * hour / 24)
    cols["doy_sin"] = np.sin(2 * np.pi * t.dayofyear / 365.25)
    cols["doy_cos"] = np.cos(2 * np.pi * t.dayofyear / 365.25)
    X = pd.DataFrame(cols)
    y = s.shift(-h)
    dd = X.copy(); dd["y"] = y
    dd = dd.dropna()
    return dd.drop(columns="y").values, dd["y"].values

P = df["P"]
X, y, = feats(P, 24)
idx = np.random.default_rng(0).choice(i_tr, size=15000, replace=False)
hgb = HistGradientBoostingRegressor(max_iter=200, learning_rate=0.08, max_leaf_nodes=31,
                                    random_state=0).fit(X[idx], y[idx])
mae_test = float(mean_absolute_error(y[i_va:], hgb.predict(X[i_va:])))
map_pct = round(100 * mae_test / PEAK, 1)

DAY = "2014-11-20"  # a real test day
day_idx = df.index.normalize() == pd.Timestamp(DAY)
tgt = df.index[day_idx]
Xday = pd.DataFrame({f"P_l{lag}": P.shift(lag).loc[tgt].values for lag in LAGS})
hour = tgt.hour
Xday["hour_sin"] = np.sin(2 * np.pi * hour / 24)
Xday["hour_cos"] = np.cos(2 * np.pi * hour / 24)
Xday["doy_sin"] = np.sin(2 * np.pi * tgt.dayofyear / 365.25)
Xday["doy_cos"] = np.cos(2 * np.pi * tgt.dayofyear / 365.25)
pred = hgb.predict(Xday.values)
forecast = [{"t": t.strftime("%H:%M"), "pred": round(float(p), 1), "actual": round(float(P.loc[t]), 1)}
            for t, p in zip(tgt, pred)]

out = {
    "source": "ECL smart-meter network · UCI ElectricityLoadDiagrams20112014 (Portuguese distribution utility)",
    "plant": {"name": "ECL distribution network", "meters": len(M_COLS), "resolution": "hourly",
              "location": "Portugal", "peakMw": round(PEAK, 1)},
    "period": {"from": df.index.min().strftime("%Y-%m-%d"), "to": df.index.max().strftime("%Y-%m-%d")},
    "kpis": {"unexplainedPct": div_gap_pct, "metersHealthy": len(M_COLS) - len(stuck_meters),
             "totalMeters": len(M_COLS), "suspects": len(suspects),
             "recoveryKwhMo": round(sum(r["unbilledKwhMo"] for r in suspects), 0),
             "mapPct": map_pct},
    "feeders": feeders,
    "suspects": suspects,
    "forecastDate": DAY,
    "forecast": forecast,
    "findings": {"stuckMeters": len(stuck_meters),
                 "stuckWorst": [{"id": c, "hours": round(float(stuck_mask(df[c]).sum()), 0)} for c in
                                sorted(stuck_meters, key=lambda c: -float(stuck_mask(df[c]).sum()))[:3]]},
}
with open(OUT, "w") as f:
    json.dump(out, f, indent=1)
print(f"wrote {OUT}")
print(json.dumps({"kpis": out["kpis"], "feeders": feeders,
                  "suspects": [(s["id"], s["feeder"], s["score"]) for s in suspects],
                  "forecast": (len(forecast), DAY, mae_test, map_pct)}, indent=1))
