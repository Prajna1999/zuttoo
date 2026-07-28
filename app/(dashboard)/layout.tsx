import type { Metadata } from "next";
import { Shell } from "@/components/shell";

// Demo consoles are app surfaces, not landing pages — keep them out of search
// results so the marketing pages rank instead.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
