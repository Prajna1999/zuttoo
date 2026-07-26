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

// Simulated copilot — canned answers grounded in SITE_TELEMETRY, keyed by keyword.
// No live model call. Swap for a real API route when ANTHROPIC_API_KEY is available.
const FM_RESPONSES: { match: RegExp; reply: string }[] = [
  {
    match: /f-?07|trip/i,
    reply: "F-07 tripped at 14:30 on 50/51 overcurrent, phase B, 412 A (pickup 380 A) — restored 14:52. This is the third trip in 14 days, all between 14:00–15:30 on high-ambient days. Downstream DTR-42 loading peaked at 104% before each trip, which is the likely root cause rather than a feeder fault.\n\n→ Recommend load-transfer study for DTR-42 before the next high-ambient window.",
  },
  {
    match: /tx-?097|overnight|safe/i,
    reply: "TX-097 is DEGRADING: winding temp 89.1°C, top-oil 78.4°C, ambient 34.2°C, load 71%. Cooling bank 2 has been in FAULT since 09:12 (bank 1 still running). Winding temp is rising 0.4°C/day beyond what load explains, 6 days running. Buchholz is normal, OLTC at position 9.\n\nSafe for tonight at current load, but margin is shrinking — get bank 2 fans restored before the next high-load day. Any switching still requires shift-engineer authorisation and LOTO.",
  },
  {
    match: /inspection report|report/i,
    reply: "INSPECTION REPORT — TX-097 (10 MVA ONAN/ONAF)\nStatus: DEGRADING\nTop-oil temp: 78.4°C · Winding temp: 89.1°C · Ambient: 34.2°C · Load: 71%\nCooling fans: bank1 RUNNING, bank2 FAULT (not starting since 09:12)\nBuchholz: normal · OLTC position: 9\nFinding: winding temp rising 0.4°C/day beyond load-explained baseline, 6 consecutive days.\nRecommendation: restore cooling bank 2; re-check winding temp trend in 48h.\nSafety: switching/isolation requires shift-engineer authorisation, LOTO mandatory.",
  },
  {
    match: /inv-?212|check first/i,
    reply: "INV-212 is CRITICAL: efficiency 92.1% vs 95.9% baseline, IGBT heatsink at 81°C, DC ripple elevated. Model predicts a failure window ≤ 9 days (confidence 0.91).\n\nFirst checks: (1) heatsink/fan airflow for blockage, (2) DC-side connections for ripple source, (3) IGBT module thermal images against baseline. Isolate only under shift-engineer authorisation and LOTO before any physical inspection.",
  },
];

export function simulateFieldMateReply(question: string): string {
  const hit = FM_RESPONSES.find((r) => r.match.test(question));
  if (hit) return hit.reply;
  return `I don't have a preset answer for that. I can speak to TX-097 (degrading, cooling fan fault), F-07 (tripped 14:30, restored), or INV-212 (critical, failure window ≤ 9 days) — try one of the suggestions below.\n\nSnapshot as of ${SITE_TELEMETRY.timestamp}. Switching always requires shift-engineer authorisation and LOTO.`;
}
