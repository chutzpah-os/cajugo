import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { AlertInbox } from "@/domains/buyers/components/alert-inbox";
import { cachedAlertInbox } from "@/domains/buyers/current";

export const metadata: Metadata = { title: "Alertas | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/alertas",
  );
  if (!allowed || !can(session, "alerts.notify"))
    return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Alertas</h1>
      <p className="text-sm text-text-2">
        Pedidos de &quot;Avisar quando chegar&quot;. Avise pelo WhatsApp e
        marque como avisado: o nome e o celular são apagados na hora.
      </p>
      <AlertInbox inbox={await cachedAlertInbox()} />
    </section>
  );
}

/** Alertas de busca do admin [12a] (ALR-FR-002, ALR-FR-003, ALR-SEC-001). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
