import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { ContactInbox } from "@/domains/contacts/components/contact-inbox";
import { contactInbox } from "@/domains/contacts/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Contatos | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/contatos",
  );
  if (!allowed || !can(session, "contacts.handle"))
    return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Contatos</h1>
      <p className="text-sm text-text-2">
        Pedidos de quem quer ser avisado de um serviço em breve ou precisa de
        ajuda com a senha. Chame pelo WhatsApp e marque como atendido: nome,
        celular e e-mail são apagados na hora.
      </p>
      <ContactInbox items={await contactInbox(getDb(), session)} />
    </section>
  );
}

/** Pedidos de contato do admin (017): nenhum número da equipe fica público. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
