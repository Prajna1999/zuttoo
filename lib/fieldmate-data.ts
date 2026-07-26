export type ProductId = "assetiq" | "gridsense" | "solariq" | "windiq";

export type Attachment = { name: string; pages: number };

type ThreadConfig = {
  site: string;
  greeting: string;
  suggestions: string[];
  responses: { match: RegExp; reply: string; attachment?: Attachment }[];
  fallback: string;
};

// Simulated copilot — canned, keyword-matched replies per product, grounded in
// that page's own data. No live model call. Swap for a real API route later.
export const FM_THREADS: Record<ProductId, ThreadConfig> = {
  assetiq: {
    site: "Substation A (33/11 kV), Division 4",
    greeting: "FieldMate online. I see TX-097 (degrading, cooling fan fault), INV-212 (critical, failure window ≤ 9 days), TX-104 and MTR-018 (both healthy). What do you need?",
    suggestions: [
      "Is TX-097 safe overnight?",
      "Draft inspection report for TX-097",
      "What to check first on INV-212?",
      "Any healthy assets I can skip this week?",
    ],
    responses: [
      { match: /tx-?097|overnight|safe/i, reply: "TX-097 is DEGRADING: winding temp 89.1°C, top-oil 78.4°C, ambient 34.2°C, load 71%. Cooling bank 2 has been in FAULT since 09:12 (bank 1 still running). Winding temp is rising 0.4°C/day beyond what load explains, 6 days running.\n\nSafe for tonight at current load, but margin is shrinking — get bank 2 fans restored before the next high-load day. Any switching still requires shift-engineer authorisation and LOTO." },
      { match: /inspection report|report/i, reply: "INSPECTION REPORT — TX-097 (10 MVA ONAN/ONAF)\nStatus: DEGRADING\nTop-oil: 78.4°C · Winding: 89.1°C · Ambient: 34.2°C · Load: 71%\nCooling: bank1 RUNNING, bank2 FAULT (since 09:12)\nFinding: winding temp rising 0.4°C/day beyond load-explained baseline, 6 days.\nRecommendation: restore cooling bank 2; re-check trend in 48h.\n\nFull report drafted and attached.", attachment: { name: "TX-097_Inspection_Report.pdf", pages: 3 } },
      { match: /inv-?212|check first/i, reply: "INV-212 is CRITICAL: efficiency 92.1% vs 95.9% baseline, IGBT heatsink 81°C, DC ripple elevated. Predicted failure window ≤ 9 days (confidence 0.91).\n\nFirst checks: heatsink/fan airflow, DC-side connections for ripple source, IGBT thermal imaging vs baseline." },
      { match: /healthy|skip/i, reply: "TX-104 (health 91, RUL 210d) and MTR-018 (health 84, RUL 156d) are both tracking within band — no action needed this week. Focus stays on TX-097 and INV-212." },
    ],
    fallback: "I can speak to TX-097, INV-212, TX-104, or MTR-018 on this fleet — try one of the suggestions below.",
  },
  gridsense: {
    site: "Division 4 AMI · Feeder F-07, Old City North",
    greeting: "FieldMate online for GridSense. F-07 tripped at 14:30 (restored 14:52) and has 3 flagged theft suspects. What do you need?",
    suggestions: [
      "Why did F-07 trip at 14:30?",
      "Summarise the theft suspects on F-07",
      "Is DTR-42 overloaded?",
      "Draft a field visit note for C-88412",
    ],
    responses: [
      { match: /trip|f-?07/i, reply: "F-07 tripped at 14:30 on 50/51 overcurrent, phase B, 412 A (pickup 380 A) — restored 14:52. Third trip in 14 days, all 14:00–15:30 on high-ambient days. Downstream DTR-42 loading peaked at 104% before each trip — likely root cause is transformer overload, not a feeder fault.\n\n→ Recommend a load-transfer study for DTR-42 before the next high-ambient window." },
      { match: /suspect|theft|c-\d+/i, reply: "3 high-confidence suspects on F-07: C-88412 (commercial, score 0.94, ~2,400 kWh/mo unbilled, consumption dropped 71% after a meter swap), C-81067 (residential, score 0.89, zero recorded draw for 4 months), C-83550 (commercial, score 0.85, harmonic signature suggests bypassed CT)." },
      { match: /dtr-?42|overload/i, reply: "DTR-42 loading peaked at 104% just before each of F-07's last 3 trips — above rated capacity on high-ambient afternoons. It's the likely driver of the overcurrent trips, not a fault on the feeder itself." },
      { match: /field visit|c-88412/i, reply: "FIELD VISIT NOTE — C-88412 (Commercial)\nFlag: consumption dropped 71% after meter swap; neighbouring loads unchanged\nEst. unbilled: ~2,400 kWh/mo\nAction: verify CT/meter seal integrity on-site, cross-check connected load vs billed load.\n\nField visit note drafted and attached.", attachment: { name: "C-88412_Field_Visit_Note.pdf", pages: 1 } },
    ],
    fallback: "I can speak to F-07's trip history, its theft suspects, or downstream DTR-42 loading — try one of the suggestions below.",
  },
  solariq: {
    site: "Pooling Station 3 · 5 MWp, 10 inverters",
    greeting: "FieldMate online for SolarIQ. INV-04 has a string-fuse cluster and INV-09 has a dead string. What do you need?",
    suggestions: [
      "Diagnose INV-04 strings 7–10",
      "Why is INV-09 string 15 dead?",
      "Is the soiling loss on INV-07 worth an early wash?",
      "Draft a fault report for INV-04",
    ],
    responses: [
      { match: /fault report/i, reply: "FAULT REPORT — INV-04, strings 7–10\nPR: ~64% (plant avg 96%)\nPattern: symmetric drop across 4 adjacent strings, 11-day onset, no irradiance correlation\nFinding: matches string-fuse failure cluster\nAction: check combiner box CB-04-B fuses\nEst. recovery: +38 MWh/yr\n\nFull report drafted and attached.", attachment: { name: "INV-04_Fault_Report.pdf", pages: 2 } },
      { match: /inv-?04|7.?10|7–10/i, reply: "INV-04, strings 7–10 (PR ~64%): symmetric drop across 4 adjacent strings, 11-day onset, no irradiance correlation — matches a string-fuse failure cluster.\n\n→ Check combiner box CB-04-B fuses. Est. recovery +38 MWh/yr." },
      { match: /inv-?09|string 15|dead/i, reply: "INV-09, string 15: zero current since 03:40 Tue, adjacent strings normal. Likely a DC connector or fuse open-circuit.\n\n→ Dispatch with an IV-curve tracer. Est. loss ₹410/day until fixed." },
      { match: /inv-?07|soiling|wash/i, reply: "INV-07 uniform deficit (−5.5%), 9-day drift correlated with a dust-storm event — classic soiling signature.\n\n→ Advance the wash cycle for Block 7 by 6 days; wash ROI is positive at the current loss rate." },
      { match: /recoverable|loss/i, reply: "Recoverable loss across the plant is ~103 MWh/yr (≈ ₹4.6L at PPA rate), split mainly across soiling (42), string faults (31), and degradation (22 MWh/yr)." },
    ],
    fallback: "I can speak to INV-04, INV-09, INV-07, or overall plant loss attribution — try one of the suggestions below.",
  },
  windiq: {
    site: "Wind Farm 2 · 42 MW, 14 turbines",
    greeting: "FieldMate online for WindIQ. WTG-07 is critical (gearbox) and WTG-03 has a yaw misalignment. What do you need?",
    suggestions: [
      "Is WTG-07 safe to keep running?",
      "What's causing WTG-03's power curve deficit?",
      "Explain the WTG-05 wake loss",
      "Draft a dispatch note for WTG-07",
    ],
    responses: [
      { match: /wtg-?07|gearbox|safe to keep/i, reply: "WTG-07 is CRITICAL: gearbox bearing vibration RMS up 3.1x baseline over 9 days, correlated with oil temp drift. Conformance down to 41%.\n\n→ Not safe to keep running — ground the turbine and borescope the gearbox within 48h." },
      { match: /wtg-?03|yaw/i, reply: "WTG-03: yaw misalignment averaging 6.4° over 72h, power curve trailing the IEC reference by 9% at rated wind speed.\n\n→ Dispatch yaw calibration. Est. recovery ~140 MWh/yr." },
      { match: /wtg-?05|wake/i, reply: "WTG-05 shows an 8% deficit in the 6–10 m/s band with no fault codes — consistent with wake shadow from WTG-03 during the prevailing SW wind regime.\n\n→ Model a wake-steering offset for WTG-03 during SW conditions." },
      { match: /dispatch note|wtg-07 note/i, reply: "DISPATCH NOTE — WTG-07\nStatus: CRITICAL, conformance 41%\nFinding: gearbox bearing vibration RMS 3.1x baseline, 9 days, oil temp drift correlated\nAction: ground turbine, borescope inspection within 48h\nSafety: LOTO before any nacelle access.\n\nDispatch note drafted and attached.", attachment: { name: "WTG-07_Dispatch_Note.pdf", pages: 1 } },
    ],
    fallback: "I can speak to WTG-07 (critical), WTG-03 (yaw), or WTG-05 (wake loss) — try one of the suggestions below.",
  },
};

export function simulateFieldMateReply(
  productId: ProductId,
  question: string
): { reply: string; attachment?: Attachment } {
  const cfg = FM_THREADS[productId];
  const hit = cfg.responses.find((r) => r.match.test(question));
  return hit ? { reply: hit.reply, attachment: hit.attachment } : { reply: cfg.fallback };
}
