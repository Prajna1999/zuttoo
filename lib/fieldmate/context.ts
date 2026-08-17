// FieldMate agent scaffolding — the context pipeline (Scout's job).
// Asset ID → domain → real record → normalized AssetDossier. The runtime and
// every specialist read only this normalized view, so swapping the data plane
// (demo fs-reads ↔ app JSON imports ↔ live product backends) never changes
// agent code.
import type {
  AssetDossier, Citation, DataSources, GridsenseData, RiskLevel,
  SolariqData, WindiqData, AssetiqData,
} from "./types";

const ID_PATTERNS: { re: RegExp; domain: "assetiq" | "gridsense" | "solariq" | "windiq" }[] = [
  { re: /^ENG-\d{3}$/, domain: "assetiq" },
  { re: /^MT-\d{3}$/, domain: "gridsense" },
  { re: /^INV-0\d$/, domain: "solariq" },
  { re: /^KWF-0\d$/, domain: "windiq" },
];

export function domainOfAsset(assetId: string) {
  const id = assetId.trim().toUpperCase();
  return ID_PATTERNS.find((p) => p.re.test(id))?.domain ?? null;
}

export function fleetSnapshot(data: DataSources) {
  const rows: { domain: string; label: string; count: number }[] = [];
  if (data.assetiq) rows.push({ domain: "assetiq", label: data.assetiq.fleet.name, count: data.assetiq.fleet.testEngines });
  if (data.gridsense) rows.push({ domain: "gridsense", label: "ECL smart-meter network", count: data.gridsense.kpis.totalMeters });
  if (data.solariq) rows.push({ domain: "solariq", label: "Area Science Park PV plant", count: data.solariq.inverters.length });
  if (data.windiq) rows.push({ domain: "windiq", label: data.windiq.farm.name, count: data.windiq.turbines.length });
  return rows;
}

/** Resolve an asset id to a real record and return the normalized dossier. */
export function resolveAsset(data: DataSources, assetId: string): AssetDossier | null {
  const id = assetId.trim().toUpperCase();
  const domain = domainOfAsset(id);
  if (!domain) return null;

  if (domain === "assetiq" && data.assetiq) return assetiqDossier(data.assetiq, id);
  if (domain === "gridsense" && data.gridsense) return gridsenseDossier(data.gridsense, id);
  if (domain === "solariq" && data.solariq) return solariqDossier(data.solariq, id);
  if (domain === "windiq" && data.windiq) return windiqDossier(data.windiq, id);
  return null;
}

function assetiqDossier(d: AssetiqData, id: string): AssetDossier | null {
  const row = d.queue.find((q) => q.id === id);
  if (!row) return null;
  const risk: RiskLevel = row.alert ? "crit" : row.predRul <= 30 ? "warn" : "low";
  const asOf = "fleet archive (run-to-failure)";
  const ev: Citation[] = [
    { source: "assetiq queue row", detail: `ENG-034 pred RUL ${row.predRul} vs true ${row.trueRul}`, asOf },
    { source: "assetiq kpis", detail: `GBDT test MAE ${d.kpis.rulMaeCycles} cycles · RMSE ${d.kpis.rulRmseCycles}`, asOf },
    { source: "assetiq fleet", detail: `${d.fleet.trainEngines} train engines · ${d.fleet.informativeSensors}/${d.fleet.sensors} informative sensors`, asOf },
  ];
  return {
    assetId: id, domain: "assetiq", kind: "turbofan engine", label: id, site: "C-MAPSS FD001 test fleet",
    risk, headline: row.alert
      ? `predicted RUL ${row.predRul} cycles — inside the 30-cycle dispatch window`
      : `predicted RUL ${row.predRul} cycles`,
    facts: [
      { label: "pred RUL", value: `${row.predRul} cycles` },
      { label: "true RUL", value: `${row.trueRul} cycles` },
      { label: "error", value: `${row.err} cycles` },
      { label: "dispatch", value: row.alert ? "ALERT (≤ 30)" : "no alert" },
      { label: "fleet median TTF", value: `${d.fleet.medianTtfCycles} cycles` },
    ],
    alerts: row.alert ? [`Predicted failure within ${row.predRul} cycles (≈ flights ≈ days)`] : [],
    sourceLabel: "NASA C-MAPSS FD001 · queue row",
    asOf, evidence: ev,
  };
}

function gridsenseDossier(d: GridsenseData, id: string): AssetDossier | null {
  const sus = d.suspects.find((s) => s.id === id);
  const stuck = d.findings.stuckWorst.find((s) => s.id === id);
  const risk: RiskLevel = sus && sus.score > 0.45 ? "warn" : "low";
  const ev: Citation[] = [
    { source: "gridsense suspects", detail: sus ? `${id} score ${sus.score} · ${sus.pattern}` : `${id} not flagged in the suspect list`, asOf: "Dec 2014 window" },
    { source: "gridsense kpis", detail: `${d.kpis.metersHealthy}/${d.kpis.totalMeters} meters healthy · ${d.kpis.suspects} suspects`, asOf: "Dec 2014 window" },
  ];
  if (stuck) ev.push({ source: "gridsense findings", detail: `${id} stuck ${stuck.hours} h`, asOf: "Dec 2014 window" });
  return {
    assetId: id, domain: "gridsense", kind: "smart meter", label: id,
    site: sus ? `Feeder ${sus.feeder} · ${sus.type}` : "ECL network",
    risk,
    headline: sus ? `Flagged · score ${sus.score}` : "Healthy — no anomaly flagged",
    facts: sus
      ? [
          { label: "score", value: `${sus.score}` },
          { label: "pattern", value: sus.pattern },
          { label: "est. unbilled", value: sus.loss },
        ]
      : [{ label: "status", value: "no anomaly" }],
    alerts: sus ? [sus.pattern] : [],
    sourceLabel: "ECL smart-meter network · suspects/findings",
    asOf: "Dec 2014 window", evidence: ev,
  };
}

function solariqDossier(d: SolariqData, id: string): AssetDossier | null {
  const inv = d.inverters.find((i) => i.id === id);
  if (!inv) return null;
  const risk: RiskLevel = inv.status === "crit" ? "crit" : inv.status === "warn" ? "warn" : "low";
  const worst = inv.strings.reduce((a, b) => (b.conf < a.conf ? b : a));
  const ev: Citation[] = [
    { source: "solariq inverters", detail: inv.title, asOf: d.windowDate },
    { source: "solariq strings", detail: `worst string ${worst.id} conf ${worst.conf}% · ${worst.lostKwh} kWh lost`, asOf: d.windowDate },
    { source: "solariq kpis", detail: `plant performance ${d.kpis.performancePct}% · data integrity ${d.kpis.dataIntegrityPct}%`, asOf: d.windowDate },
  ];
  return {
    assetId: id, domain: "solariq", kind: "PV inverter", label: id, site: "Area Science Park PV plant",
    risk, headline: inv.title,
    facts: [
      { label: "status", value: inv.status.toUpperCase() },
      { label: "strings", value: `${inv.strings.length} · worst ${worst.id} ${worst.conf}%` },
      { label: "cause", value: inv.cause },
      { label: "action", value: inv.action },
    ],
    alerts: inv.status !== "healthy" ? [inv.title] : [],
    sourceLabel: "Area Science Park PV · inverters",
    asOf: d.windowDate ?? "archive", evidence: ev,
  };
}

function windiqDossier(d: WindiqData, id: string): AssetDossier | null {
  const t = d.turbines.find((x) => x.id === id);
  if (!t) return null;
  const risk: RiskLevel = t.conformance < 95 ? "warn" : t.conformance < 90 ? "crit" : "low";
  const ev: Citation[] = [
    { source: "windiq turbines", detail: `${id} conformance ${t.conformance}% · availability ${t.availability}%`, asOf: d.windowDate },
    { source: "windiq turbines", detail: `worst band ${t.worstBand} at ${t.worstBandRatio}% · deficit ${t.deficitMwh} MWh`, asOf: d.windowDate },
    { source: "windiq farm", detail: `${d.farm.name} · ${d.farm.capacityMw} MW · ${d.farm.turbineType}`, asOf: d.windowDate },
  ];
  return {
    assetId: id, domain: "windiq", kind: "wind turbine", label: id, site: d.farm.name,
    risk,
    headline: `conformance ${t.conformance}% · availability ${t.availability}%`,
    facts: [
      { label: "conformance", value: `${t.conformance}%` },
      { label: "availability", value: `${t.availability}%` },
      { label: "deficit", value: `${t.deficitMwh} MWh` },
      { label: "worst band", value: `${t.worstBand} @ ${t.worstBandRatio}%` },
    ],
    alerts: t.conformance < 95 ? [`Conformance ${t.conformance}% below the IEC reference band`] : [],
    sourceLabel: "Kelmarsh wind-farm SCADA · turbines",
    asOf: d.windowDate ?? "2016 SCADA", evidence: ev,
  };
}
