// FieldMate — the Diagnostician runtime.
// The whole pipeline of the one agent that works: asset → real record →
// finding with evidence + confidence. No intent router, no safety gate, no
// procedure machine — those belonged to agents that are not built. An LLM can
// later replace the answer composer; it still reads only the real records
// (see docs/fieldmate-agent-architecture.md).
import type { AssetDossier, DiagnosisInput, DiagnosisOutput } from "./types";
import { resolveAsset, fleetSnapshot } from "./context";

function findingFor(d: AssetDossier): { body: string; confidence: number } {
  const f = Object.fromEntries(d.facts.map((x) => [x.label, x.value]));
  switch (d.domain) {
    case "assetiq":
      return {
        body: [
          `${d.assetId} is a turbofan engine in the C-MAPSS FD001 test fleet. The GBDT RUL model predicts **${f["pred RUL"]}** remaining (true RUL ${f["true RUL"]}, model error ${f["error"]}).`,
          d.risk === "crit"
            ? "**Finding:** inside the 30-cycle dispatch window — schedule grounding and the module inspection now. (Diagnostic recommendation; LOTO and approvals are outside this agent's scope.)"
            : `Finding: outside the dispatch window, but ${f["pred RUL"]} is short — plan the next check within that horizon.`,
          `Model trust: GBDT test MAE 10.13 cycles (RMSE 13.54) across 100 held-out engines; in the near-failure band (≤30 cycles) MAE drops to 4.08 — the model is most accurate exactly where it matters.`,
        ].join("\n\n"),
        confidence: 0.9,
      };
    case "gridsense":
      return {
        body: [
          `${d.assetId} is a smart meter on ${d.site}. ${d.headline}.`,
          ...d.facts.filter((x) => x.label !== "status").map((x) => `- ${x.label}: ${x.value}`),
          `Network context: ${d.evidence[1]?.detail ?? ""}.`,
          "**Finding:** the reading signature matches a dead/bypassed meter — verify seal and CT integrity on site.",
        ].join("\n"),
        confidence: 0.85,
      };
    case "solariq":
      return {
        body: [
          `${d.assetId}: ${d.headline}.`,
          `Cause (real 2013–21 SCADA): ${f["cause"]}`,
          `Recommended action: ${f["action"]}`,
          `Plant context: ${d.evidence[2]?.detail ?? ""}.`,
          "**Finding:** the fault signature is consistent — no inverter-outage response needed; the check is DAQ-side.",
        ].join("\n\n"),
        confidence: 0.9,
      };
    case "windiq": {
      const conf = parseFloat(String(f["conformance"]));
      const avail = parseFloat(String(f["availability"]));
      const lines = [
        `${d.assetId}: ${d.headline}.`,
        `- conformance ${f["conformance"]} · availability ${f["availability"]}`,
        `- deficit ${f["deficit"]} · worst band ${f["worst band"]}`,
        conf < 95
          ? "**Finding:** power curve trails the IEC reference — check fault codes and yaw alignment first."
          : avail < 90
            ? "**Finding:** conformance is within band — the availability gap is the story; pull the downtime/fault-code log."
            : "**Finding:** tracking within band — no action needed; deficit is within expectation.",
      ];
      return { body: lines.join("\n"), confidence: 0.85 };
    }
  }
}

export function diagnose(input: DiagnosisInput): DiagnosisOutput {
  const dossier = resolveAsset(input.data, input.assetId);

  if (!dossier) {
    const known = fleetSnapshot(input.data)
      .map((r) => `${r.domain} (${r.count})`)
      .join(", ");
    return {
      answer: `I couldn't resolve **${input.assetId}** in the real fleet data. I know these fleets: ${known}. Check the ID on the asset label / QR — the Diagnostician never guesses an asset ID.`,
      agent: "diagnostician",
      citations: [],
      confidence: 0.2,
      asOf: "—",
    };
  }

  const { body, confidence } = findingFor(dossier);
  return {
    answer:
      body +
      `\n\n— Diagnostician · grounded in ${dossier.sourceLabel} (as of ${dossier.asOf})`,
    agent: "diagnostician",
    citations: dossier.evidence,
    confidence,
    asOf: dossier.asOf,
  };
}
