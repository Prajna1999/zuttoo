import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/design-system";
import { SITE_URL } from "@/lib/marketing-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    ...PRODUCTS.map((p) => ({
      url: `${SITE_URL}/products/${p.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "yearly", priority: 0.6 },
  ];
}
