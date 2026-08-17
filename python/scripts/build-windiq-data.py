#!/usr/bin/env python3
"""Build lib/windiq-real.json from the open Kelmarsh wind farm SCADA dataset.

Data: Cubico Sustainable Investments, CC-BY-4.0, https://zenodo.org/records/5841834
Usage: python3 python/scripts/build-windiq-data.py /path/to/extracted/kelmarsh_2016
"""
import csv, glob, json, math, os, sys
from collections import defaultdict
from datetime import datetime

SRC = sys.argv[1] if len(sys.argv) > 1 else "kelmarsh_2016"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "lib", "windiq-real.json")
RATED_KW = 2050.0  # Senvion MM92
BIN = 0.5          # m/s wind-speed bins for the fleet reference power curve


def fnum(s):
    try:
        v = float(s)
        return None if math.isnan(v) else v
    except (ValueError, TypeError):
        return None


def read_turbine(path):
    """Yield dicts of the columns we use from one Greenbyte turbine CSV."""
    with open(path) as f:
        rows = csv.reader(f)
        hdr = None
        for row in rows:
            if row and row[0].startswith("#") and not row[0].startswith("# Date and time"):
                continue
            if hdr is None:
                row[0] = row[0].lstrip("# ")
                hdr = {name: i for i, name in enumerate(row)}
                cols = {
                    "t": hdr["Date and time"],
                    "ws": hdr["Wind speed (m/s)"],
                    "kw": hdr["Power (kW)"],
                    "exp": hdr["Energy Export (kWh)"],
                    "theo": hdr["Energy Theoretical (kWh)"],
                }
                continue
            yield {
                "t": row[cols["t"]],
                "ws": fnum(row[cols["ws"]]),
                "kw": fnum(row[cols["kw"]]),
                "exp": fnum(row[cols["exp"]]),
                "theo": fnum(row[cols["theo"]]),
            }


turbine_files = sorted(glob.glob(os.path.join(SRC, "Turbine_Data_*.csv")))
status_files = sorted(glob.glob(os.path.join(SRC, "Status_*.csv")))
assert turbine_files, f"no Turbine_Data_*.csv under {SRC}"

data = {os.path.basename(p).split("_")[3]: list(read_turbine(p)) for p in turbine_files}

# Fleet reference power curve: mean power per wind-speed bin across all turbines.
bins = defaultdict(lambda: [0.0, 0])
for rows in data.values():
    for r in rows:
        if r["ws"] is not None and r["kw"] is not None:
            b = round(r["ws"] / BIN) * BIN
            bins[b][0] += r["kw"]
            bins[b][1] += 1
ref = {b: s / n for b, (s, n) in bins.items() if n >= 50}

turbines = []
for num, rows in sorted(data.items()):
    actual = expect = 0.0
    exp_kwh = theo_kwh = 0.0
    band = defaultdict(lambda: [0.0, 0.0])  # per-bin actual/expected for deficit band
    for r in rows:
        if r["exp"] is not None:
            exp_kwh += r["exp"]
        if r["theo"] is not None:
            theo_kwh += r["theo"]
        if r["ws"] is None or r["kw"] is None:
            continue
        b = round(r["ws"] / BIN) * BIN
        if b in ref:
            actual += max(r["kw"], 0)
            expect += ref[b]
            band[b][0] += max(r["kw"], 0)
            band[b][1] += ref[b]
    conf = 100 * actual / expect if expect else 0
    avail = 100 * exp_kwh / theo_kwh if theo_kwh else 0
    # worst wind-speed band (only where meaningful expected energy)
    worst = min(
        ((a / e, b) for b, (a, e) in band.items() if e > 0.02 * expect and 4 <= b <= 14),
        default=(1, None),
    )
    # deficit vs fleet reference over the year, in MWh (10-min intervals)
    deficit_mwh = max(0.0, (expect - actual) / 6 / 1000)
    turbines.append({
        "id": f"KWF-{int(num):02d}",
        "capacity": RATED_KW / 1000,
        "conformance": round(conf, 1),
        "availability": round(avail, 1),
        "energyMwh": round(exp_kwh / 1000, 1),
        "deficitMwh": round(deficit_mwh, 1),
        "worstBand": f"{worst[1] - 1:.0f}–{worst[1] + 1:.0f} m/s" if worst[1] else None,
        "worstBandRatio": round(100 * worst[0], 1),
    })

# Loss attribution: stop duration by IEC category from the status logs,
# converted to MWh with the fleet's mean operating power.
op_kw = []
for rows in data.values():
    op_kw += [r["kw"] for r in rows if r["kw"] is not None and r["kw"] > 50]
mean_op_kw = sum(op_kw) / len(op_kw)
loss_h = defaultdict(float)
for p in status_files:
    with open(p) as f:
        rows = csv.reader(f)
        hdr = None
        for row in rows:
            if row and row[0].startswith("#"):
                continue
            if hdr is None:
                hdr = {n: i for i, n in enumerate(row)}
                continue
            if row[hdr["Status"]] != "Stop" or row[hdr["Duration"]] in ("-", ""):
                continue
            cat = row[hdr["IEC category"]] or "Uncategorised"
            if cat == "Full Performance":
                continue
            d = row[hdr["Duration"]]
            days, hms = (d.split(" days, ") if " days, " in d else ("0", d))
            h, m, s = hms.split(":")
            loss_h[cat] += int(days) * 24 + int(h) + int(m) / 60 + int(s) / 3600
losses = sorted(
    ({"name": k, "mwh": round(v * mean_op_kw / 1000)} for k, v in loss_h.items()),
    key=lambda x: -x["mwh"],
)[:6]

# Generation chart: the real 24h farm window with the highest mean output,
# actual vs Greenbyte theoretical (as forecast), 30-min points.
ts = defaultdict(lambda: [0.0, 0.0])  # t -> [actual kW, theoretical kW]
for rows in data.values():
    for r in rows:
        if r["kw"] is not None:
            ts[r["t"]][0] += r["kw"]
        if r["theo"] is not None:
            ts[r["t"]][1] += r["theo"] * 6  # kWh per 10 min -> kW
keys = sorted(ts)
best_i, best_sum = 0, -1
for i in range(0, len(keys) - 144, 144):
    s = sum(ts[k][0] for k in keys[i : i + 144])
    if s > best_sum:
        best_sum, best_i = s, i
window = keys[best_i : best_i + 144]
generation = []
for j in range(0, 144, 3):  # 30-min points
    chunk = window[j : j + 3]
    t = datetime.strptime(chunk[0], "%Y-%m-%d %H:%M:%S")
    act = sum(ts[k][0] for k in chunk) / 3 / 1000
    pred = sum(ts[k][1] for k in chunk) / 3 / 1000
    generation.append({"t": t.strftime("%H:%M"), "actual": round(act, 2), "pred": round(pred, 2)})

out = {
    "source": "Kelmarsh wind farm SCADA 2016 · Cubico Sustainable Investments · CC-BY-4.0 · zenodo.org/records/5841834",
    "farm": {"name": "Kelmarsh Wind Farm", "capacityMw": 12.3, "turbineType": "Senvion MM92"},
    "windowDate": window[0][:10],
    "turbines": turbines,
    "losses": losses,
    "generation": generation,
}
with open(OUT, "w") as f:
    json.dump(out, f, indent=1)
print(f"wrote {OUT}")
print(json.dumps({k: out[k] for k in ("windowDate", "turbines", "losses")}, indent=1))
