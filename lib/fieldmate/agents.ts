// FieldMate — the Diagnostician (the only agent that works).
// One agent, five real-data tools. The rest of the roster from the
// architecture vision is not implemented on purpose: those agents need a
// knowledge corpus, CMMS, and a permit register that don't exist yet, and a
// scaffold that pretended they worked would be fake. Diagnosis is the one job
// fully grounded in the real product data today.
import type { AgentId, ToolId } from "./types";

export type AgentDef = {
  id: AgentId;
  name: string;
  role: string;
  mission: string;
  triggers: string[];
  tools: ToolId[];
  output: string;
  escalation: string;
  glyph: string;
  color: string;
};

export const AGENTS: AgentDef[] = [
  {
    id: "diagnostician",
    name: "Diagnostician",
    role: "Analytics agent — interprets the product models for THIS asset",
    mission:
      "Read the RUL / conformance / string / anomaly outputs of the product that owns " +
      "this asset and translate them into a finding with evidence, confidence, and a " +
      "recommended next check. Never invent numbers — cite the model output.",
    triggers: ["\"why?\" / \"what's wrong?\"", "health / RUL / conformance questions", "alert drill-down"],
    tools: ["run_diagnostics", "get_alert_context", "get_dossier", "resolve_asset", "get_asset_state"],
    output: "finding + evidence + confidence + next check",
    escalation: "No model output for this asset → say so plainly, offer the raw data instead",
    glyph: "🩺",
    color: "#F2B441",
  },
];

export const ROSTER: Record<AgentId, AgentDef> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
) as Record<AgentId, AgentDef>;

export const agentById = (id: AgentId): AgentDef => ROSTER[id];
