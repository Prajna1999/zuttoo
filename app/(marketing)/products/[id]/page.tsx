import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/design-system";
import { MARKETING_COPY, SITE_URL } from "@/lib/marketing-data";
import { ProductIconTile, PRODUCT_HUES } from "@/components/marketing/product-icons";
import { ConsoleScreenshot } from "@/components/marketing/console-screenshot";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = PRODUCTS.find((p) => p.id === id);
  const copy = MARKETING_COPY[id as keyof typeof MARKETING_COPY];
  if (!product || !copy) return {};
  return {
    title: `${product.name} — ${product.sub}`,
    description: `${copy.tagline} ${copy.blurb}`,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      title: `${product.name} — ${product.sub}`,
      description: copy.tagline,
      url: `/products/${id}`,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = PRODUCTS.find((p) => p.id === id);
  const copy = MARKETING_COPY[id as keyof typeof MARKETING_COPY];
  if (!product || !copy) notFound();
  const hue = PRODUCT_HUES[product.id];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: product.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: copy.blurb,
      url: `${SITE_URL}/products/${product.id}`,
      publisher: { "@type": "Organization", name: "Zuttoo Technologies Private Limited", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: product.name, item: `${SITE_URL}/products/${product.id}` },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link href="/#products" className="text-sm font-medium text-mk-ink-faint transition-colors hover:text-mk-ink">
        ← All products
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ProductIconTile id={product.id} size={44} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: hue }}>
              {product.sub}
            </span>
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-4 max-w-xl font-display text-xl font-medium leading-snug text-mk-ink sm:text-2xl">
            {copy.tagline}
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-mk-ink-dim">{copy.blurb}</p>

          <div className="mt-9 space-y-3">
            {copy.features.map((f) => (
              <div key={f} className="flex items-start gap-3 rounded-xl border border-mk-border bg-mk-bg p-4">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full"
                  style={{ color: hue, background: `color-mix(in srgb, ${hue} 12%, transparent)` }}
                >
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2.5 6.5 5 9l4.5-6" />
                  </svg>
                </span>
                <span className="text-sm leading-relaxed text-mk-ink-dim">{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={`/${product.id}`}
              className="rounded-lg bg-mk-ink px-5 py-3 text-sm font-medium text-mk-bg shadow-sm transition-opacity hover:opacity-85"
            >
              Launch live demo →
            </Link>
            <Link
              href="/#products"
              className="rounded-lg border border-mk-border bg-mk-bg px-5 py-3 text-sm font-medium text-mk-ink transition-colors hover:bg-mk-surface"
            >
              All products
            </Link>
          </div>
        </div>

        <div className="min-w-0 self-start lg:sticky lg:top-24">
          <ConsoleScreenshot id={product.id} />
          <p className="mt-3 text-center text-xs text-mk-ink-faint">
            Interactive console · live in this demo environment
          </p>
        </div>
      </div>
    </div>
  );
}
