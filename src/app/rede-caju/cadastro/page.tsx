import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSession } from "@/domains/auth/service";
import { SellerSignupForm } from "@/domains/sellers/components/seller-signup-form";

export const metadata: Metadata = {
  title: "Cadastro de vendedor | CajuGo",
  robots: { index: false, follow: true },
};

async function Form() {
  await connection();
  const session = await currentSession();
  // Já é vendedor: o status ou o painel ficam em /rede-caju.
  if (session?.roles.includes("seller")) redirect("/rede-caju");
  return (
    <>
      {session && (
        <p className="rounded-card bg-info-soft p-3 text-sm text-info">
          Você está conectado: o cadastro de vendedor fica na sua conta.
        </p>
      )}
      <SellerSignupForm signedIn={!!session} />
    </>
  );
}

/** Cadastro do vendedor [7a] (1/2): conta e dados (SEL-FR-001, 016). */
export default function SellerSignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 pt-4 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
            Seja vendedor da Rede Caju
          </h1>
          <p className="text-sm text-text-2">
            Divulgue os carros da vitrine e ganhe comissão das lojas parceiras.
            Você não paga nada.
          </p>
          <p className="text-sm text-text-3">
            1 de 2 · depois, a foto do documento
          </p>
        </div>
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </main>
    </>
  );
}
