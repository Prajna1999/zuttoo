// FieldMate — Diagnostician demo on the REAL product data.
//
// Loads lib/*-real.json (the same files the dashboards import), resolves real
// asset ids, and runs the one agent that works: asset → real record →
// finding with evidence + confidence.
//
//   npx tsx scripts/fieldmate-demo.ts
import { readFileSync } from "node:fs";
import { diagnose } from "../lib/fieldmate/runtime";
import { AGENTS } from "../lib/fieldmate/agents";
import { TOOLS, REAL_TOOLS } from "../lib/fieldmate/tools";
import type { DataSources, DiagnosisInput } from "../lib/fieldmate/types";

const load = (p: string) =>
  JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));

const DATA: DataSources = {
  assetiq: load("../lib/assetiq-real.json"),
  gridsense: load("../lib/gridsense-real.json"),
  solariq: load("../lib/solariq-real.json"),
  windiq: load("../lib/windiq-real.json"),
};

const line = "─".repeat(72);

function show(t: DiagnosisInput, i: number, label: string) {
  const out = diagnose(t);
  console.log(line);
  console.log(`[${i}] ${label}`);
  console.log(`  agent: ${out.agent} · confidence ${out.confidence}`);
  console.log("  answer:");
  out.answer.split("\n").forEach((l) => console.log(`    ${l}`));
  if (out.citations.length) {
    console.log("  citations:");
    out.citations.forEach((c) => console.log(`    · ${c.source}: ${c.detail}  (as of ${c.asOf})`));
  }
}

console.log("FieldMate — the Diagnostician (the only agent that works)");
console.log(line);
console.log(`Agents (${AGENTS.length}):`);
AGENTS.forEach((a) => console.log(`  ${a.glyph} ${a.name.padEnd(16)} ${a.role}`));
console.log(`\nTool catalog (${TOOLS.length}; ${REAL_TOOLS.length} grounded in real data):`);
REAL_TOOLS.forEach((id) => console.log(`  · ${id} — real`));

const scenarios: { label: string; input: DiagnosisInput }[] = [
  {
    label: `ENG-034 · "Is ENG-034 safe to keep flying?" (assetiq, critical)`,
    input: { question: "Is ENG-034 safe to keep flying?", assetId: "ENG-034", data: DATA },
  },
  {
    label: `MT-183 · "What's wrong with MT-183?" (gridsense, stuck meter)`,
    input: { question: "What's wrong with MT-183?", assetId: "MT-183", data: DATA },
  },
  {
    label: `INV-02 · "Why is INV-02 critical?" (solariq, DAQ fault)`,
    input: { question: "Why is INV-02 critical?", assetId: "INV-02", data: DATA },
  },
  {
    label: `KWF-05 · "Why is KWF-05 underperforming?" (windiq)`,
    input: { question: "Why is KWF-05 underperforming?", assetId: "KWF-05", data: DATA },
  },
  {
    label: `TX-999 · "What's wrong with it?" (unresolvable — must not guess)`,
    input: { question: "What's wrong with it?", assetId: "TX-999", data: DATA },
  },
];

scenarios.forEach((s, i) => show(s.input, i + 1, s.label));

// The demo must never fabricate — assert the real digits are present.
const checks: [string, string][] = [
  ["ENG-034 answer", diagnose(scenarios[0].input).answer],
  ["MT-183 answer", diagnose(scenarios[1].input).answer],
  ["INV-02 answer", diagnose(scenarios[2].input).answer],
  ["KWF-05 answer", diagnose(scenarios[3].input).answer],
];
const mustContain: [string, string][] = [
  ["13.54", checks[0][1]], ["10.13", checks[0][1]], ["6.3", checks[0][1]],
  ["2183", checks[1][1]], ["voltage-channel", checks[2][1].toLowerCase()],
  ["96.5", checks[3][1]], ["85.9", checks[3][1]],
];
console.log(line);
console.log("grounding check — real digits present in answers:");
mustContain.forEach(([digit, text]) =>
  console.log(`  ${text.includes(digit) ? "✓" : "✗ FAIL"}  "${digit}" in ${text.slice(0, 60)}…`)
);
