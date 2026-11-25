import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { AuthLayout } from "@/ui/auth-layout";
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
const PANEL = {
  eyebrow: "Rede Caju",
  title: "Venda veículos das lojas e ganhe comissão",
  perks: [
    "Escolha os veículos da vitrine que quer divulgar",
    "Compartilhe com o seu link de vendedor",
    "A loja parceira paga a comissão da venda",
    "Você não paga nada para participar",
  ],
} as const;

export default function SellerSignupPage() {
  return (
    <>
      <SiteHeader />
      <AuthLayout
        title="Seja vendedor da Rede Caju"
        subtitle="Divulgue os carros da vitrine e ganhe comissão das lojas parceiras. Você não paga nada."
        progress={{
          label: "1 de 2 · depois, a foto do documento",
          step: 1,
          total: 2,
        }}
        panel={PANEL}
        steps={[
          "Faça o cadastro e envie a foto do documento",
          "A equipe CajuGo confere e aprova",
          "Divulgue os veículos e ganhe a comissão das vendas",
        ]}
        faq={[
          {
            q: "Preciso pagar algo?",
            a: "Não. Ser vendedor da Rede Caju é grátis.",
          },
          {
            q: "Quem paga a minha comissão?",
            a: "A loja parceira, quando a venda é confirmada.",
          },
          {
            q: "Posso divulgar carros de várias lojas?",
            a: "Sim, das lojas que aceitam vendedores e aprovarem a parceria.",
          },
        ]}
      >
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
