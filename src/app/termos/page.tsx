import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { pageMetadata } from "@/platform/seo/seo";

export const metadata: Metadata = pageMetadata({
  title: "Termos de uso e privacidade",
  description:
    "Termos de uso e política de privacidade da CajuGo: assinatura, anúncios, Rede Caju, Caju Indica e seus dados (LGPD).",
  path: "/termos",
});

const TERMS = [
  [
    "O que é a CajuGo",
    "Plataforma de veículos com catálogo para lojas, vitrine para compradores, a Rede Caju (vendedores independentes) e o programa Caju Indica (indicação de lojas).",
  ],
  [
    "Assinatura e atraso",
    "O Plano Catálogo é mensal, sem fidelidade, pago por Pix com envio do comprovante. A loja fica no ar depois da confirmação do 1º pagamento. Em atraso, há uma tolerância; depois dela, o catálogo fica oculto até o pagamento ser confirmado. O cancelamento não tem multa e o catálogo fica no ar até o fim do período pago.",
  ],
  [
    "Responsabilidade pelos anúncios",
    "Cada loja é responsável pelas informações, fotos e preços dos seus veículos e pelo atendimento a quem a procura. A CajuGo pode ocultar anúncios denunciados ou fora das regras.",
  ],
  [
    "Rede Caju",
    "Vendedores aprovados pela CajuGo divulgam veículos de lojas parceiras e recebem da loja a comissão que ela definir, só por vendas confirmadas. Nessas vendas, a loja paga uma taxa à CajuGo, informada no painel.",
  ],
  [
    "Caju Indica",
    "Quem indica uma loja que assina o Catálogo recebe parte da mensalidade dela por tempo limitado, a partir do 1º pagamento confirmado. Usar o próprio código não vale.",
  ],
] as const;

const PRIVACY = [
  [
    "Dados que coletamos",
    "Nome, e-mail, celular e senha para a conta; dados públicos da loja (nome, endereço, WhatsApp, horário, fotos); CPF ou CNPJ e chave Pix só quando necessários (pagamento, comissão ou resgate).",
  ],
  [
    "Como usamos",
    "Para manter a conta, mostrar os veículos, encaminhar interessados à loja, processar pagamentos e comissões e evitar fraudes. Endereços de rede são guardados de forma irreversível, só para limitar abusos.",
  ],
  [
    "Compartilhamento",
    "Os dados públicos da loja aparecem no catálogo e na vitrine. Dados de quem envia uma mensagem vão só para a loja procurada. Não vendemos dados.",
  ],
  [
    "Seus direitos (LGPD)",
    "Você pode pedir acesso, correção ou exclusão dos seus dados. Dados de lojas canceladas são apagados 90 dias depois do cancelamento.",
  ],
  ["Contato do encarregado", "privacidade@cajugo.com.br"],
] as const;

function Section({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly (readonly [string, string])[];
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-4 flex-col gap-4"
    >
      <h2 id={`${id}-title`} className="text-[22px] font-extrabold">
        {title}
      </h2>
      {items.map(([h, text]) => (
        <div key={h}>
          <h3 className="font-bold">{h}</h3>
          <p className="text-[15px] text-text-2">{text}</p>
        </div>
      ))}
    </section>
  );
}

/** Termos e privacidade [12i] (STO-FR-016): versão inicial do rascunho do PRD. */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-4 py-6 md:max-w-3xl">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">
          Termos e privacidade
        </h1>
        <p
          role="note"
          className="rounded-card bg-warn-soft p-3 text-sm text-warn"
        >
          <strong>Versão inicial, em revisão jurídica.</strong> O texto pode
          mudar; avisaremos no painel quando houver uma nova versão.
        </p>
        <nav aria-label="Seções" className="flex gap-2">
          <a
            href="#termos"
            className="flex min-h-11 items-center rounded-button border border-field bg-surface px-4 text-sm font-bold"
          >
            Termos
          </a>
          <a
            href="#privacidade"
            className="flex min-h-11 items-center rounded-button border border-field bg-surface px-4 text-sm font-bold"
          >
            Privacidade
          </a>
        </nav>
        <Section id="termos" title="Termos de uso" items={TERMS} />
        <Section
          id="privacidade"
          title="Política de privacidade"
          items={PRIVACY}
        />
      </main>
    </>
  );
}
