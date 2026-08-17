#!/usr/bin/env python3
"""Build lib/assetiq-real.json from the NASA C-MAPSS FD001 model artifacts.

Reads the notebook's authoritative outputs (models/assetiq_cmapss/rul_metadata.json —
predictions, alerts, bands, queue, permutation importance) so the dashboard matches the
executed notebook to the digit. Health curves + fleet histogram are computed from the raw
flight-cycle data (descriptive only).
Usage: python3 python/scripts/build-assetiq-data.py
"""
import json
import os

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "datasets", "cmapss_fd001")
META = os.path.join(HERE, "..", "models", "assetiq_cmapss", "rul_metadata.json")
OUT = os.path.join(HERE, "..", "..", "lib", "assetiq-real.json")

COLS = ["unit", "cycle"] + [f"op{i}" for i in range(1, 4)] + [f"s{i}" for i in range(1, 22)]
tr = pd.read_csv(os.path.join(DATA, "train_FD001.txt"), sep=r"\s+", header=None, names=COLS)
te = pd.read_csv(os.path.join(DATA, "test_FD001.txt"), sep=r"\s+", header=None, names=COLS)
rul = np.loadtxt(os.path.join(DATA, "RUL_FD001.txt"))
m = json.load(open(META))

HI_SENS = ["s11", "s4", "s2"]
def hi_curve(g):
    v = g[HI_SENS].values.astype(float)
    lo, hi = v.min(0), v.max(0)
    return ((v - lo) / (hi - lo + 1e-9)).mean(1)

def downsample(xs, ys, n=60):
    if len(xs) <= n:
        return [float(x) for x in xs], [float(y) for y in ys]
    idx = np.linspace(0, len(xs) - 1, n).astype(int)
    return [float(xs[i]) for i in idx], [float(ys[i]) for i in idx]

fleet_engines = [1, 60, 100, 34]  # two healthy-life, one longest-lived, the top queue engine
health_curves = []
for u in fleet_engines:
    g = tr[tr.unit == u].sort_values("cycle")
    xs, ys = downsample(g.cycle.values, hi_curve(g))
    health_curves.append({"engine": f"ENG-{u:03d}", "cycles": xs, "health": ys,
                          "cyclesToFailure": int(g["cycle"].max())})

mxf = tr.groupby("unit")["cycle"].max()
hist, edges = np.histogram(mxf, bins=10)
fleet_hist = [{"lo": int(edges[i]), "hi": int(edges[i + 1]), "count": int(hist[i])}
              for i in range(len(hist))]

const = m["sensors"]["constant"]
inform = m["sensors"]["informative"]
bands = [{"band": b[0].replace("<= 30 (near failure)", "≤ 30 cycles (near failure)")
                    .replace("> 100 (early life)", "> 100 cycles (early life)"),
          "n": b[1], "rmse": b[2], "mae": b[3]} for b in m["bands_gbdt"]]
queue = [{"id": f"ENG-{q[0]:03d}", "unit": q[0], "predRul": q[1], "trueRul": q[2],
          "err": q[3], "alert": q[4]} for q in m["queue_gbdt"]]

out = {
    "source": "NASA C-MAPSS FD001 · turbofan engine degradation simulation (Prognostics Data Repository)",
    "fleet": {"name": "C-MAPSS FD001 turbofan fleet", "trainEngines": 100, "testEngines": 100,
              "trainFlights": int(len(tr)), "testFlights": int(len(te)),
              "sensors": 21, "informativeSensors": len(inform),
              "constantSensors": const, "informative": inform,
              "regime": "single operating condition · 1 cycle = 1 flight",
              "medianTtfCycles": int(mxf.median())},
    "kpis": {"rulMaeCycles": m["test_mae_cycles"]["gbdt"],
             "rulRmseCycles": m["test_rmse_cycles"]["gbdt"],
             "alertPrecision": round(m["alerts"]["gbdt"]["precision"], 2),
             "alertRecall": round(m["alerts"]["gbdt"]["recall"], 2),
             "nearFailure": 25, "alertsIssued": m["alerts"]["gbdt"]["alerts"],
             "caught": m["alerts"]["gbdt"]["tp"], "missed": m["alerts"]["gbdt"]["missed"]},
    "modelCompare": {"constant": m["test_rmse_cycles"]["constant"],
                     "ridge": m["test_rmse_cycles"]["ridge"],
                     "gbdt": m["test_rmse_cycles"]["gbdt"],
                     "transformer": m["test_rmse_cycles"]["transformer"]},
    "modelCompareMae": {"constant": m["test_mae_cycles"]["constant"],
                        "ridge": m["test_mae_cycles"]["ridge"],
                        "gbdt": m["test_mae_cycles"]["gbdt"],
                        "transformer": m["test_mae_cycles"]["transformer"]},
    "alerts": m["alerts"],
    "bands": bands,
    "queue": queue,
    "importance": [{"signal": s, "score": w} for s, w in m["perm_importance_top"]],
    "healthCurves": health_curves,
    "fleetHist": fleet_hist,
    "predictions": m["predictions"],
}
with open(OUT, "w") as f:
    json.dump(out, f, indent=1)
print(f"wrote {OUT}")
print(json.dumps({"kpis": out["kpis"], "bands": bands,
                  "queue": [(q["id"], q["predRul"], q["alert"]) for q in queue[:5]],
                  "importance": out["importance"][:3]}, indent=1))
