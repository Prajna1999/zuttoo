// FieldMate — the Diagnostician's tool catalog.
// Five tools, every one grounded in real data: a tool must return numbers
// that exist in lib/*-real.json or the notebook artifacts — no invented
// readings, ever. (The ten procedural tools of the planned roster — docs
// search, procedures, parts, lockout/permit, logging, escalation — are not
// implemented; see docs/fieldmate-agent-architecture.md.)
import type { AgentId, ToolId } from "./types";

export type ToolDef = {
  id: ToolId;
  owner: AgentId;
  purpose: string;
  input: string;
  output: string;
  source: string;   // the real-data record it reads
  real: boolean;    // always true in v1
};

export const TOOLS: ToolDef[] = [
  { id: "resolve_asset", owner: "diagnostician", purpose: "Map an asset ID / QR / work order to a fleet record",
    input: "assetId or scan payload", output: "domain + asset row",
    source: "asset registry over lib/*-real.json ids", real: true },
  { id: "get_dossier", owner: "diagnostician", purpose: "Assemble the normalized AssetDossier for the asset",
    input: "assetId", output: "AssetDossier (facts + evidence)",
    source: "lib/*-real.json (state, alerts, model outputs)", real: true },
  { id: "get_asset_state", owner: "diagnostician", purpose: "Snapshot of the asset's current readings",
    input: "assetId", output: "state facts with freshness",
    source: "product backends (dashboards read the same JSON)", real: true },
  { id: "run_diagnostics", owner: "diagnostician", purpose: "Read the product model for this asset",
    input: "assetId + question", output: "finding + confidence",
    source: "assetiq queue/predictions, windiq conformance, solariq strings, gridsense suspects",
    real: true },
  { id: "get_alert_context", owner: "diagnostician", purpose: "Open alerts + alert history for the asset",
    input: "assetId", output: "alert list with timestamps",
    source: "lib/*-real.json (findings, alerts, queue)", real: true },
];

export const TOOL_INDEX: Record<ToolId, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t])
) as Record<ToolId, ToolDef>;

export const toolById = (id: ToolId): ToolDef => TOOL_INDEX[id];

export const REAL_TOOLS: ToolId[] = TOOLS.filter((t) => t.real).map((t) => t.id);
