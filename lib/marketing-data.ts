import type { PRODUCTS } from "@/lib/design-system";
import { REAL_DATA_PRODUCTS } from "@/lib/design-system";

type ProductId = (typeof PRODUCTS)[number]["id"];

export const SITE_URL = "https://zuttoo.in";
export const SITE_NAME = "Zuttoo";
export const SITE_TAGLINE = "AI products for real-world operations";
export const SITE_DESCRIPTION =
  "Zuttoo builds AI that turns the data your operations already produce — sensors, meters, machines, field systems — into clear, costed actions for your teams, in any industry.";

export const MARKETING_COPY: Record<ProductId, { tagline: string; blurb: string; features: string[] }> = {
  assetiq: {
    tagline: "Know a failure is coming, weeks before it happens.",
    blurb:
      "AssetIQ watches your transformers, inverters, and motors using telemetry you already collect, and flags degradation long before it becomes an outage.",
    features: [
      "Remaining-useful-life estimates per asset, updated continuously",
      "Explainable alerts — ranked contributing signals, not a black box",
      "Works with the telemetry you already collect — no new sensors required",
    ],
  },
  gridsense: {
    tagline: "Turn smart-meter data into recovered revenue.",
    blurb:
      "GridSense reads your Advanced Metering Infrastructure (AMI) — the smart-meter network you've already deployed — to reconcile feeder input against billed consumption and rank electricity-theft suspects by confidence, so field teams chase the highest-value leads first.",
    features: [
      "Feeder-level energy accounting from AMI meter reads, updated daily",
      "Ranked theft suspects with the pattern that flagged them",
      "Day-ahead load forecasting with accuracy tracking",
    ],
  },
  solariq: {
    tagline: "Find the megawatt-hours you're already leaving on the table.",
    blurb:
      "SolarIQ diagnoses underperformance down to the individual string, and tells your O&M team exactly what to check and what it's worth fixing.",
    features: [
      "String-level performance-ratio heatmap across the plant",
      "AI diagnosis with root cause and recommended action",
      "Loss attribution — soiling, faults, shading, clipping, degradation",
    ],
  },
  windiq: {
    tagline: "Catch yaw drift and gearbox faults before they cost generation.",
    blurb:
      "WindIQ tracks each turbine's power-curve conformance against the IEC reference and surfaces the wake, yaw, and mechanical issues quietly eating into output.",
    features: [
      "Fleet-wide power-curve conformance, ranked by severity",
      "Wake-loss and yaw-misalignment detection with recovery estimates",
      "Loss attribution across wake, curtailment, icing, and mechanical faults",
    ],
  },
};

// One-line "what the live demo is running on" per product (real datasets only).
export const REAL_STATS: Partial<Record<ProductId, string>> = {
  assetiq: "100 turbofan engines · 21 sensors · NASA C-MAPSS FD001 run-to-failure archive",
  windiq: "6 × 2.05 MW Senvion MM92 · real Kelmarsh wind-farm SCADA (2016)",
  solariq: "14 kWp · 3 inverters · 8 strings · real Area Science Park SCADA (2013–21)",
  gridsense: "321 smart meters · hourly AMI · ECL distribution network (2012–14)",
};
export const isRealDataProduct = (id: string) =>
  (REAL_DATA_PRODUCTS as readonly string[]).includes(id);
