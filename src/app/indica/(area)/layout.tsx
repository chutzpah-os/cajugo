import type { Metadata } from "next";
import { AreaLayout } from "@/domains/auth/components/area-layout";
import type { Identity } from "@/domains/auth/components/area-shell";
import { accountMenu } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";

/** Card da pessoa na sidebar do desktop (012). */
const identity: Identity = async (session) => {
  const me = await accountMenu(getDb(), session);
  return me ? { name: me.fullName, caption: "Indicador · Caju Indica" } : null;
};

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AreaLayout area="indica" identity={identity}>
      {children}
    </AreaLayout>
  );
}
