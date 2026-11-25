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
              title: "A equipe aprova",
              text: "A CajuGo confere o cadastro. Depois, você pede parceria às lojas.",
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
