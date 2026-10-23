import type { Metadata } from "next";
import { AreaLayout } from "@/domains/auth/components/area-layout";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaLayout area="rede">{children}</AreaLayout>;
}
