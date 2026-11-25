import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { pageMetadata } from "@/platform/seo/seo";
import { SiteFooter } from "@/ui/site-footer";
import { ProgramLanding } from "@/ui/program-landing";

export const metadata: Metadata = pageMetadata({
  title: "Rede Caju: venda veículos das lojas e ganhe comissão",
  description:
    "Seja vendedor da Rede Caju: divulgue os veículos das lojas parceiras com o seu link e ganhe comissão a cada venda. Sem custo para participar.",
  path: "/conheca/rede-caju",
});

/** Página de vendas da Rede Caju (Descobrir, 017). */
export default function RedeCajuLanding() {
  return (
    <>
      <SiteHeader active="descobrir" />
      <ProgramLanding
        example={<SellerVetting />}
        c={{
          eyebrow: "Rede Caju",
          title: "Venda veículos das lojas e ganhe comissão",
          lead: "Como vendedor independente, escolha os veículos da vitrine CajuGo, divulgue com o seu link e ganhe a comissão combinada com a loja quando a venda acontecer. Você não paga nada.",
          primary: { label: "Quero ser vendedor", href: "/rede-caju/cadastro" },
          signIn: {
            label: "Já sou vendedor: entrar",
            href: "/entrar?next=%2Frede-caju",
          },
          highlights: [
            { value: "Grátis", label: "para participar" },
            { value: "Comissão", label: "a cada venda confirmada" },
            { value: "Seu link", label: "marca os clientes como seus" },
            { value: "Extrato", label: "das comissões no painel" },
          ],
          audience: [
            {
              title: "Vendedores autônomos",
              text: "Quem já vende veículos e quer um estoque maior para oferecer.",
            },
            {
              title: "Quem tem rede de contatos",
              text: "Grupos de WhatsApp, redes sociais e comunidades da cidade.",
            },
            {
              title: "Quem quer renda extra",
              text: "Divulgue no seu tempo, sem precisar comprar nenhum veículo.",
            },
          ],
          steps: [
            {
              title: "Faça o cadastro",
              text: "Com os seus dados, a chave Pix e a foto do documento.",
            },
            {
              title: "Aprovação dupla",
              text: "A CajuGo confere e aprova o seu cadastro. Depois, cada loja parceira aprova a parceria com você.",
            },
            {
              title: "Divulgue e ganhe",
              text: "Compartilhe os veículos com o seu link. Venda confirmada, a loja paga a sua comissão.",
            },
          ],
          benefits: [
            {
              title: "Estoque pronto para vender",
              text: "Os veículos das lojas parceiras, com fotos e ficha, para você divulgar.",
            },
            {
              title: "Seu link de vendedor",
              text: "Quem chega pelo seu link fica marcado como seu, e a venda conta para você.",
            },
            {
              title: "Extrato das comissões",
              text: "Veja as vendas, o que está a receber e o que já foi pago.",
            },
            {
              title: "Sem custo",
              text: "Participar da Rede Caju é grátis.",
            },
          ],
          faq: [
            {
              q: "Quem paga a comissão?",
              a: "A loja parceira, quando a venda é confirmada. O valor segue a comissão definida pela loja.",
            },
            {
              q: "Viro funcionário da loja ou da CajuGo?",
              a: "Não. Você atua como vendedor independente: escolhe o que divulgar e quando, e ganha a comissão das vendas que fizer.",
            },
            {
              q: "Preciso ter CNPJ?",
              a: "Não. O cadastro é com CPF.",
            },
            {
              q: "Posso vender de várias lojas?",
              a: "Sim, das lojas que aceitam vendedores e aprovam a sua parceria.",
            },
          ],
          closing: {
            title: "Comece a vender pela Rede Caju",
            text: "Faça o cadastro e envie o documento para a aprovação.",
          },
        }}
      />
      <SiteFooter />
    </>
  );
}

const VETTING = [
  {
    title: "Prioridade para quem já é conhecido",
    text: "Damos prioridade a vendedores indicados pelas lojas, com histórico de vendas, conhecidos no mercado e com boas referências.",
  },
  {
    title: "Avaliação prévia de todos",
    text: "Todo vendedor envia os documentos para a avaliação da CajuGo antes de começar. Depois, cada loja parceira aprova a parceria.",
  },
  {
    title: "Começando agora? A gente acompanha",
    text: "Novos vendedores independentes podem receber treinamento e começam vendendo acompanhados pela CajuGo, só veículos anunciados na CajuGo e seguindo os protocolos recomendados por nós.",
  },
] as const;

/** Como a CajuGo avalia e acompanha os vendedores (pedido do dono, 2026-11-25). */
function SellerVetting() {
  return (
    <section
      aria-labelledby="avaliacao"
      className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 lg:p-8"
    >
      <div className="flex flex-col gap-1">
        <h2 id="avaliacao" className="text-[24px] font-extrabold">
          Como avaliamos os vendedores
        </h2>
        <p className="text-sm text-text-2">
          A Rede Caju é feita de vendedores de confiança: a CajuGo e cada loja
          parceira aprovam quem vende os veículos.
        </p>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {VETTING.map((v, i) => (
          <li key={v.title} className="flex flex-col gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-white">
              {i + 1}
            </span>
            <h3 className="font-extrabold">{v.title}</h3>
            <p className="text-sm text-text-2">{v.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
