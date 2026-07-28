import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS } from "@/lib/design-system";
import { MARKETING_COPY, SITE_URL } from "@/lib/marketing-data";
import { ProductIconTile, PRODUCT_HUES } from "@/components/marketing/product-icons";
import { ConsoleScreenshot } from "@/components/marketing/console-screenshot";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Zuttoo Technologies Private Limited",
  url: SITE_URL,
  email: "sales@zuttoo.in",
  telephone: "+91-9783025207",
  address: {
    "@type": "PostalAddress",
    streetAddress: "3rd Floor, Orchid Centre, Nr. IILM Institute, Sector 53, DLF QE",
    addressLocality: "Gurgaon",
    addressRegion: "Haryana",
    postalCode: "122002",
    addressCountry: "IN",
  },
};

const HERO_ONELINERS: Record<(typeof PRODUCTS)[number]["id"], string> = {
  assetiq: "AI that predicts equipment failure weeks ahead",
  gridsense: "AI that finds losses and theft in smart-meter (AMI) data",
  solariq: "AI that diagnoses solar underperformance to the string",
  windiq: "AI that catches turbine faults before lost generation",
};

const PLATFORM_POINTS = [
  {
    title: "Runs on data you already have",
    body: "Meter head-ends, inverter and turbine feeds, substation and plant telemetry — Zuttoo integrates through a protocol gateway. No new sensors, no rip-and-replace.",
  },
  {
    title: "Answers, priced in MWh and rupees",
    body: "Every alert names the root cause, the recommended action, and what fixing it is worth — so teams triage by value, not by noise.",
  },
  {
    title: "FieldMate copilot, built in",
    body: "An AI field assistant docked in every console. Ask about any asset in plain language and get a drafted, numbers-filled report back.",
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD).replace(/</g, "\\u003c") }}
      />
      <section className="mk-glow">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-14 md:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
            <div>
              <div className="mk-rise inline-flex items-center gap-2 rounded-full border border-mk-border bg-mk-bg/70 px-3.5 py-1.5 text-xs font-medium text-mk-ink-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-mk-accent" />
                Four AI products · one platform
              </div>
              <h1
                className="mk-rise mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
                style={{ animationDelay: "80ms" }}
              >
                AI products for electricity operators.
              </h1>
              <p
                className="mk-rise mt-6 max-w-2xl text-base leading-relaxed text-mk-ink-dim sm:text-lg"
                style={{ animationDelay: "160ms" }}
              >
                Zuttoo builds AI that reads the data your infrastructure already produces — substation and plant
                telemetry, smart-meter readings from your Advanced Metering Infrastructure (AMI), inverter and
                turbine feeds — and turns it into clear, costed actions for your teams.
              </p>
              <div className="mk-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
                <a
                  href="#products"
                  className="rounded-lg bg-mk-ink px-5 py-3 text-sm font-medium text-mk-bg shadow-sm transition-opacity hover:opacity-85"
                >
                  Explore the suite
                </a>
                <Link
                  href="/assetiq"
                  className="rounded-lg border border-mk-border bg-mk-bg px-5 py-3 text-sm font-medium text-mk-ink transition-colors hover:bg-mk-surface"
                >
                  Open a live demo →
                </Link>
              </div>
            </div>
            <div className="mk-rise min-w-0" style={{ animationDelay: "200ms" }}>
              <ConsoleScreenshot id="assetiq" />
              <p className="mt-3 text-center text-xs text-mk-ink-faint">
                AssetIQ console · live in this demo environment
              </p>
            </div>
          </div>

          <div
            className="mk-rise mt-12 grid gap-3 border-t border-mk-border pt-8 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animationDelay: "320ms" }}
          >
            {PRODUCTS.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-mk-surface"
              >
                <ProductIconTile id={p.id} size={34} />
                <div>
                  <div className="font-display text-sm font-bold tracking-tight">{p.name}</div>
                  <div className="mt-0.5 text-xs leading-snug text-mk-ink-dim">{HERO_ONELINERS[p.id]}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">One suite, four products</h2>
        <p className="mt-2 max-w-xl text-mk-ink-dim">
          Each product ships as its own console, on a shared data platform. Every demo below is live.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group rounded-2xl border border-mk-border bg-mk-bg p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <ProductIconTile id={p.id} />
                <span
                  className="text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: PRODUCT_HUES[p.id] }}
                >
                  View product →
                </span>
              </div>
              <div className="mt-5 font-display text-2xl font-bold tracking-tight">{p.name}</div>
              <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-mk-ink-faint">{p.sub}</div>
              <p className="mt-3 leading-relaxed text-mk-ink-dim">{MARKETING_COPY[p.id].tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-mk-border bg-mk-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          {PLATFORM_POINTS.map((pt) => (
            <div key={pt.title}>
              <h3 className="font-display text-lg font-bold tracking-tight">{pt.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-mk-ink-dim">{pt.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
