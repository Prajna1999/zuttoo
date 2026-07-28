import { ImageResponse } from "next/og";
import { PRODUCTS } from "@/lib/design-system";
import { MARKETING_COPY } from "@/lib/marketing-data";
import { PRODUCT_HUES } from "@/components/marketing/product-icons";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = PRODUCTS.find((p) => p.id === id);
  const copy = MARKETING_COPY[id as keyof typeof MARKETING_COPY];
  const hue = PRODUCT_HUES[id] ?? "#2dd4bf";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0b1120",
          color: "#e6ecf4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: hue }} />
          <div style={{ fontSize: 26, color: "#9aa8bd", letterSpacing: 2 }}>
            {(product?.sub ?? "ZUTTOO").toUpperCase()}
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: 96, fontWeight: 700, lineHeight: 1 }}>
          {product?.name ?? "Zuttoo"}
        </div>
        <div style={{ marginTop: 32, fontSize: 36, color: "#9aa8bd", maxWidth: 950, lineHeight: 1.3 }}>
          {copy?.tagline ?? ""}
        </div>
        <div style={{ marginTop: 48, fontSize: 26, color: hue }}>zuttoo.in</div>
      </div>
    ),
    { ...size }
  );
}
