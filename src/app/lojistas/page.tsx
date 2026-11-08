import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { appUrl } from "@/platform/http/urls";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";
import { ButtonLink } from "@/ui/button";

const TITLE = "Catálogo de carros para sua loja";
const DESCRIPTION =
  "Seu estoque online hoje: catálogo com o nome da sua loja, vitrine CajuGo e leads no WhatsApp. R$ 100/mês, sem fidelidade.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/lojistas",
});

const BENEFITS = [
  [
    "Catálogo com o nome da loja",
    "Um endereço só seu, com link e QR code para divulgar.",
  ],
  [
    "Vitrine CajuGo",
    "Seus veículos também aparecem para quem procura carro na CajuGo.",
  ],
  [
    "Tudo sincronizado",
    "Cadastrou ou vendeu, o catálogo e a vitrine atualizam juntos.",
  ],
  [
    "Leads no WhatsApp",
    "O interessado fala direto com a loja, sem intermediário.",
  ],
] as const;

const PLAN = [
  "Veículos ilimitados",
  "Até 20 fotos por veículo",
  "Link e QR code do catálogo",
  "Painel de leads",
];

const FAQ = [
  [
    "Preciso ter CNPJ?",
    "Não. Lojas com CPF também assinam. O documento é pedido no pagamento, para a nota.",
  ],
  [
    "Posso cancelar quando quiser?",
    "Sim, sem multa e sem fidelidade. O catálogo fica no ar até o fim do mês já pago.",
  ],
  [
    "A CajuGo cobra comissão das minhas vendas?",
    "Não. Só quando a venda é feita por um vendedor da Rede Caju há uma pequena taxa, informada no painel antes de você aceitar.",
  ],
  [
    "O que é a Rede Caju?",
    "Vendedores independentes, aprovados pela CajuGo, que divulgam os seus veículos e ganham a comissão que você definir, só quando vendem.",
  ],
] as const;

/** Landing do lojista [5b] (STO-FR-002, STO-NFR-001). */
export default function MerchantLandingPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "CajuGo",
              url: appUrl(),
            },
            {
              "@type": "Service",
              name: "Plano Catálogo CajuGo",
              description: DESCRIPTION,
              provider: { "@type": "Organization", name: "CajuGo" },
              areaServed: "BR",
              offers: {
                "@type": "Offer",
                price: "100.00",
                priceCurrency: "BRL",
                url: `${appUrl()}/lojistas`,
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map(([q, a]) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            },
          ],
        }}
      />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 pt-6 pb-28 md:max-w-3xl">
        <section className="flex flex-col gap-3 rounded-card bg-ink p-6 text-white">
          <span className="self-start rounded-badge bg-caju px-2 py-1 text-[11px] font-bold tracking-[0.03em] uppercase">
            Lojistas
          </span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">
            Seu estoque online hoje, com vitrine na CajuGo.
          </h1>
          <p className="text-[15px] text-on-dark-2">
            Catálogo com o nome da sua loja, vitrine para quem procura carro e
            interessados direto no seu WhatsApp.
          </p>
          <Link
            href="/entrar"
            className="flex min-h-11 items-center self-start text-sm font-semibold underline underline-offset-2"
          >
            Já tenho conta: entrar
          </Link>
        </section>

        <section aria-labelledby="beneficios" className="flex flex-col gap-3">
          <h2 id="beneficios" className="text-[20px] font-extrabold">
            O que você recebe
          </h2>
          <ol className="flex flex-col gap-3">
            {BENEFITS.map(([title, text], i) => (
              <li
                key={title}
                className="flex gap-3 rounded-card border border-line bg-surface p-4"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-caju-soft font-extrabold text-caju"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-sm text-text-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="plano"
          className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-5"
        >
          <h2 id="plano" className="text-[20px] font-extrabold">
            Plano Catálogo
          </h2>
          <p>
            <strong className="text-[32px] font-extrabold">R$ 100</strong>
            <span className="text-text-2">/mês</span>
          </p>
          <ul className="flex flex-col gap-1.5 text-[15px]">
            {PLAN.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          <p className="text-sm text-text-2">
            Sem fidelidade. Cancele quando quiser.
          </p>
        </section>

        <section aria-labelledby="perguntas" className="flex flex-col gap-2">
          <h2 id="perguntas" className="text-[20px] font-extrabold">
            Perguntas frequentes
          </h2>
          {FAQ.map(([q, a]) => (
            <details
              key={q}
              className="rounded-card border border-line bg-surface px-4"
            >
              <summary className="flex min-h-12 cursor-pointer items-center font-bold">
                {q}
              </summary>
              <p className="pb-4 text-sm text-text-2">{a}</p>
            </details>
          ))}
        </section>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3 px-4 py-3 md:max-w-3xl">
          <p className="text-sm">
            <strong>R$ 100/mês</strong>
            <span className="block text-text-3">Plano Catálogo</span>
          </p>
          <ButtonLink href="/lojistas/cadastro">Prosseguir</ButtonLink>
        </div>
      </div>
    </>
  );
}
