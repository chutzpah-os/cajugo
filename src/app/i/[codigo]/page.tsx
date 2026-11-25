import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { cachedLanding } from "@/domains/referrals/current";
import { brl } from "@/platform/br/money";
import { ButtonLink } from "@/ui/button";

/** Rota bloqueante: o código não gerado no build é lido sem `<Suspense>`. */
export const instant = false;

/** Valor de validação do build (guia do Next com Cache Components): nunca é um código. */
export function generateStaticParams() {
  return [{ codigo: "__build__" }];
}

/** Página pessoal de quem indica: fora da busca (IND-FR-003). */
export const metadata: Metadata = {
  title: "Indicação para o Catálogo CajuGo",
  description:
    "Coloque o estoque da sua loja online com o Catálogo CajuGo: catálogo próprio, vitrine CajuGo e leads no WhatsApp.",
  robots: { index: false, follow: true },
};

const PLAN = [
  "Catálogo com o nome da sua loja",
  "Vitrine CajuGo para quem procura carro",
  "Leads direto no seu WhatsApp",
  "Sem fidelidade",
];

/** Landing do link de indicação [8c] (IND-FR-003). */
export default async function ReferralLanding({
  params,
}: PageProps<"/i/[codigo]">) {
  const { codigo } = await params;
  const view = await cachedLanding(codigo);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 py-6">
        {view.referrerName && (
          <p
            data-testid="referral-from"
            className="self-start rounded-badge bg-caju-soft px-3 py-1 text-sm font-bold text-caju-deep"
          >
            Indicação de {view.referrerName}
          </p>
        )}
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
          Seu estoque online hoje, com o nome da sua loja
        </h1>
        <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <p className="text-sm font-bold text-text-2">Plano Catálogo</p>
          <p className="text-[30px] font-extrabold">
            {brl(view.membershipCents)}
            <span className="text-base font-semibold text-text-2">/mês</span>
          </p>
          <ul className="flex flex-col gap-1 text-sm text-text-2">
            {PLAN.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          <ButtonLink href={view.signupUrl} block>
            Quero meu catálogo
          </ButtonLink>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
