import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSession } from "@/domains/auth/service";
import { ReferrerSignupForm } from "@/domains/referrals/components/referrer-signup-form";

export const metadata: Metadata = {
  title: "Indique lojas e ganhe | CajuGo",
  robots: { index: false, follow: true },
};

async function Form() {
  await connection();
  const session = await currentSession();
  // Já indica: o painel do lojista ou o do indicador/vendedor.
  if (session?.roles.includes("store_owner")) redirect("/painel/conta");
  if (session?.roles.some((r) => r === "referrer" || r === "seller"))
    redirect("/indica");
  return (
    <>
      {session && (
        <p className="rounded-card bg-info-soft p-3 text-sm text-info">
          Você está conectado: o Caju Indica fica na sua conta.
        </p>
      )}
      <ReferrerSignupForm signedIn={!!session} />
    </>
  );
}

/** Cadastro rápido do indicador [9b] (IND-FR-004). */
export default function ReferrerSignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 pt-4 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
            Indique lojas e ganhe
          </h1>
          <p className="text-sm text-text-2">
            Ganhe parte da mensalidade de cada loja de veículos que assinar o
            Catálogo com o seu link. CPF e chave Pix só no primeiro resgate.
          </p>
        </div>
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </main>
    </>
  );
}
