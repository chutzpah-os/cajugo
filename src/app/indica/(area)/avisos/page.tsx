import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { NoticesPage } from "@/domains/notices/components/notices-page";
import { noticesFor } from "@/domains/notices/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Avisos | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireArea(
    "indica",
    "/indica/avisos",
  );
  if (!allowed) return <NoPermission home={home} />;
  return <NoticesPage notices={await noticesFor(getDb(), session, 50)} />;
}

/** Avisos do painel (indicador): o único lugar dos avisos (012). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
