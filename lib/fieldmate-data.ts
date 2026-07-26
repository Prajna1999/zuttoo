export const SITE_TELEMETRY = {
  site: "Substation A (33/11 kV), Division 4",
  timestamp: "2026-07-26 15:05 IST",
  assets: {
    "TX-097": { type: "Power transformer, 10 MVA ONAN/ONAF", status: "DEGRADING", top_oil_temp_C: 78.4, winding_temp_C: 89.1, ambient_C: 34.2, load_pct: 71,
      cooling_fans: { bank1: "RUNNING", bank2: "FAULT - not starting since 09:12" }, buchholz: "normal", oltc_position: 9, note: "Winding temp rising 0.4 C/day beyond load-explained baseline for 6 days." },
    "F-07": { type: "11 kV feeder - Old City North", status: "TRIPPED at 14:30, restored 14:52", relay_flag: "50/51 overcurrent, phase B, 412 A (pickup 380 A)", recent: "Third trip in 14 days, all 14:00-15:30 on high-ambient days", downstream: "DTR-42 loading peaked 104% before each trip" },
    "INV-212": { type: "Solar inverter 250 kW, Pooling Station 3", status: "CRITICAL", efficiency_pct: 92.1, baseline_efficiency_pct: 95.9, igbt_heatsink_C: 81, dc_ripple: "elevated", prediction: "failure window <= 9 days, confidence 0.91" },
  },
  safety: "Any switching or isolation requires shift-engineer authorisation. LOTO mandatory.",
} as const;

export const FM_SUGGESTIONS = [
  "Why did F-07 trip at 14:30?",
  "Is TX-097 safe overnight?",
  "Draft inspection report for TX-097",
  "What to check first on INV-212?",
];
