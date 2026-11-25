import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { AuthLayout } from "@/ui/auth-layout";
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
const PANEL = {
  eyebrow: "Caju Indica",
  title: "Conhece uma loja de veículos? Indique e ganhe todo mês",
  perks: [
    "Compartilhe o seu link com a loja",
    "A loja assina o Catálogo da CajuGo",
    "Você ganha parte de cada mensalidade paga por ela",
    "Resgate o saldo por Pix",
  ],
} as const;

export default function ReferrerSignupPage() {
  return (
    <>
      <SiteHeader />
      <AuthLayout
        title="Indique lojas e ganhe"
        subtitle="Ganhe parte da mensalidade de cada loja de veículos que assinar o Catálogo com o seu link. CPF e chave Pix só no primeiro resgate."
        panel={PANEL}
      >
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
