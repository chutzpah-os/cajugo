import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSession } from "@/domains/auth/service";
import { DocumentForm } from "@/domains/sellers/components/document-form";
import { sellerDocuments } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";
import { Logo } from "@/ui/logo";

export const metadata: Metadata = {
  title: "Documento | CajuGo",
  robots: { index: false, follow: false },
};

async function Form() {
  await connection();
  const session = await currentSession();
  if (!session)
    redirect(`/entrar?next=${encodeURIComponent("/rede/cadastro/documento")}`);
  if (!session.roles.includes("seller")) redirect("/rede/cadastro");
  const sent = await sellerDocuments(getDb(), session);
  if (!sent) redirect("/rede");
  return <DocumentForm sent={sent} />;
}

/** Cadastro do vendedor [7a] (2/2): foto do documento, frente e verso (SEL-FR-001). */
export default function SellerDocumentPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 pt-4 pb-8">
      <header className="flex items-center gap-2">
        <Logo />
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
          Foto do documento
        </h1>
        <p className="text-sm text-text-2">
          Envie a frente e o verso de um documento com foto (RG ou CNH). Só a
          equipe da CajuGo vê, para conferir o seu cadastro.
        </p>
        <p className="text-sm text-text-3">2 de 2</p>
      </div>
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </main>
  );
}
