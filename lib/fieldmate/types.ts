// FieldMate — Diagnostician scaffolding types.
// v1 has exactly ONE agent: the Diagnostician (diagnosis grounded in the real
// product data). The other agents from the architecture vision (Scout,
// Archivist, Field Lead, Safety Warden, SME Escalator, Chronicler) are
// deliberately NOT implemented — see docs/fieldmate-agent-architecture.md.

export type ProductId = "assetiq" | "gridsense" | "solariq" | "windiq";

export type AgentId = "diagnostician";

// The only tools that exist. All five are grounded in real data — the
// Diagnostician cannot touch anything that is not a real record.
export type ToolId =
  | "resolve_asset" | "get_dossier" | "get_asset_state"
  | "run_diagnostics" | "get_alert_context";

export type RiskLevel = "low" | "warn" | "crit";

export type Citation = {
  source: string;   // which real-data record
  detail: string;   // the number or statement being cited
  asOf?: string;    // freshness of the source
};

// Normalized view of an asset — the context the Diagnostician reads.
// Runtime templates read state.facts, never domain JSON.
export type AssetDossier = {
  assetId: string;
  domain: ProductId;
  kind: string;         // "turbofan engine" | "smart meter" | ...
  label: string;
  site: string;
  risk: RiskLevel;
  headline: string;     // one-line current state
  facts: { label: string; value: string }[];
  alerts: string[];
  sourceLabel: string;
  asOf: string;
  evidence: Citation[];
};

export type DiagnosisInput = {
  question: string;
  assetId: string;
  data: DataSources;
};

export type DiagnosisOutput = {
  answer: string;
  agent: AgentId;
  citations: Citation[];
  confidence: number;   // 0..1; low → the finding says it is not confident
  asOf: string;
};

// Injected data plane: the same parsed JSON the dashboards import. The app
// wires this with the real imports; the demo wires it with fs reads of
// lib/*-real.json. Agents never read JSON directly.
export type DataSources = {
  assetiq?: AssetiqData;
  gridsense?: GridsenseData;
  solariq?: SolariqData;
  windiq?: WindiqData;
};

// Minimal structural views of the real dashboard JSONs (lib/*-real.json).
export type AssetiqQueueRow = {
  id: string; unit: number; predRul: number; trueRul: number;
  err: number; alert: boolean;
};
export type AssetiqData = {
  queue: AssetiqQueueRow[];
  kpis: { rulMaeCycles: number; rulRmseCycles: number; alertPrecision: number;
          alertRecall: number; nearFailure: number; alertsIssued: number;
          caught: number; missed: number };
  fleet: { name: string; trainEngines: number; testEngines: number;
           sensors: number; informativeSensors: number; medianTtfCycles: number };
  modelCompare: { gbdt: number; transformer: number; ridge: number; constant: number };
  healthCurves: { engine: string; cyclesToFailure: number }[];
};

export type GridsenseSuspect = {
  id: string; feeder: string; type: string; score: number;
  pattern: string; loss: string; unbilledKwhMo: number;
};
export type GridsenseData = {
  suspects: GridsenseSuspect[];
  kpis: { unexplainedPct: number; metersHealthy: number; totalMeters: number;
          suspects: number; recoveryKwhMo: number; mapPct: number };
  findings: { stuckMeters: number; stuckWorst: { id: string; hours: number }[] };
};

export type SolariqStringRow = { id: string; inverter: string; conf: number; lostKwh: number };
export type SolariqInverter = {
  id: string; strings: SolariqStringRow[]; status: string;
  title: string; cause: string; action: string;
};
export type SolariqData = {
  inverters: SolariqInverter[];
  kpis: { performancePct: number; targetPct: number; dataIntegrityPct: number;
          anomalousMwh: number; faultStrings: number; totalStrings: number };
  windowDate?: string;
};

export type WindiqTurbine = {
  id: string; capacity: number; conformance: number; availability: number;
  energyMwh: number; deficitMwh: number; worstBand: string; worstBandRatio: number;
};
export type WindiqData = {
  turbines: WindiqTurbine[];
  farm: { name: string; capacityMw: number; turbineType: string };
  windowDate?: string;
};
