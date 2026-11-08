import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { StoreInfoForm } from "@/domains/stores/components/store-info-form";
import { hoursToForm } from "@/domains/stores/hours-form";
import { storeSummary } from "@/domains/stores/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Minha loja | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/loja",
    "store.edit",
  );
  if (!allowed) return <NoPermission home={home} />;
  const s = await storeSummary(getDb(), session);
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Minha loja</h1>
      <StoreInfoForm
        initial={{
          name: s.name,
          about: s.about ?? "",
          whatsapp: s.whatsapp.replace(/^55/, ""),
          instagram: s.instagram ? `@${s.instagram}` : "",
          addressStreet: s.address.street ?? "",
          addressNumber: s.address.number ?? "",
          addressComplement: s.address.complement ?? "",
          addressDistrict: s.address.district ?? "",
          addressZip: s.address.zip?.replace(/^(\d{5})(\d{3})$/, "$1-$2") ?? "",
          cityLabel: `${s.address.city}/${s.address.state}`,
          hours: hoursToForm(s.hours),
          shareByDefault: s.shareByDefault,
        }}
      />
    </section>
  );
}

/** Minha loja [3b] (STO-FR-008, 009, 012; STO-SEC-003). */
export default function MyStorePage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
