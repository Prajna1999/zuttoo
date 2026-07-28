import type { PRODUCTS } from "@/lib/design-system";

type ProductId = (typeof PRODUCTS)[number]["id"];

export const SITE_URL = "https://zuttoo.in";
export const SITE_NAME = "Zuttoo";
export const SITE_TAGLINE = "AI products for electricity operators";
export const SITE_DESCRIPTION =
  "Zuttoo builds AI for electricity operators — predictive maintenance, smart-meter (AMI) intelligence, and solar & wind performance analytics — on the data your infrastructure already produces.";

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
