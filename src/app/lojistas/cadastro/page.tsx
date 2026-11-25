import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { AuthLayout } from "@/ui/auth-layout";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSession } from "@/domains/auth/service";
import { StoreSignupForm } from "@/domains/stores/components/store-signup-form";
import { appUrl } from "@/platform/http/urls";

export const metadata: Metadata = {
  title: "Criar conta da loja | CajuGo",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: PageProps<"/lojistas/cadastro">) {
  await connection();
  const { codigo } = await searchParams;
  const code =
    typeof codigo === "string" && /^[A-Za-z0-9]{3,20}$/.test(codigo)
      ? codigo.toUpperCase()
      : "";
  const session = await currentSession();
  return (
    <>
      {session && (
        <p className="rounded-card bg-info-soft p-3 text-sm text-info">
          Você está conectado: a loja será criada na sua conta.
        </p>
      )}
      <StoreSignupForm
        signedIn={!!session}
        initialCode={code}
        appHost={new URL(appUrl()).host}
      />
    </>
  );
}

/** Cadastro do lojista [5c] (1/2): conta + loja (STO-FR-003…007, 015). */
const PANEL = {
  eyebrow: "Catálogo para lojas",
  title: "Sua loja online hoje, na vitrine da CajuGo",
  perks: [
    "Catálogo com o nome da sua loja, com link e QR code",
    "Seus veículos também na vitrine CajuGo",
    "Interessados direto no seu WhatsApp",
    "R$ 100/mês, sem comissão na venda e sem fidelidade",
  ],
} as const;

export default function StoreSignupPage(
  props: PageProps<"/lojistas/cadastro">,
) {
  return (
    <>
      <SiteHeader />
      <AuthLayout
        title="Criar conta da loja"
        progress={{
          label: "1 de 2 · depois, o pagamento por Pix",
          step: 1,
          total: 2,
        }}
        panel={PANEL}
        steps={[
          "Crie a conta e escolha o endereço do catálogo",
          "Pague o primeiro mês por Pix",
          "Cadastre os veículos e receba os interessados no WhatsApp",
        ]}
        faq={[
          {
            q: "Tem fidelidade?",
            a: "Não. Você cancela quando quiser, pelo painel.",
          },
          {
            q: "Quantos veículos posso anunciar?",
            a: "Quantos quiser: o Catálogo não limita o estoque.",
          },
          {
            q: "Como eu pago?",
            a: "Por Pix, com o comprovante enviado no painel. A equipe confere e a loja entra no ar.",
          },
          {
            q: "A CajuGo cobra comissão na venda?",
            a: "Não. A mensalidade é o único valor.",
          },
        ]}
      >
        <Suspense fallback={null}>
          <Form {...props} />
        </Suspense>
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
