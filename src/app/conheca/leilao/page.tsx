import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { pageMetadata } from "@/platform/seo/seo";
import { SiteFooter } from "@/ui/site-footer";
import { ProgramLanding } from "@/ui/program-landing";

export const metadata: Metadata = pageMetadata({
  title: "Leilão CajuGo: ajuda para escolher o veículo certo no leilão",
  description:
    "Em breve: a CajuGo ajuda você a escolher o veículo no leilão, avaliando os lotes, consultando o histórico e orientando o seu lance.",
  path: "/conheca/leilao",
});

/**
 * Página de vendas do serviço de leilão (Serviços, 017): ajuda o comprador a escolher o
 * veículo no leilão. Ainda não existe: a chamada (`/conheca/leilao/avisar`) abre o
 * WhatsApp do atendimento; a página fica estática.
 */
export default function AuctionLanding() {
  return (
    <>
      <SiteHeader active="servicos" />
      <ProgramLanding
        c={{
          eyebrow: "Leilão CajuGo · em breve",
          title: "Compre em leilão com segurança e ajuda de quem entende",
          lead: "A CajuGo vai ajudar você a escolher o veículo certo no leilão: avaliamos os lotes, consultamos o histórico e orientamos o seu lance.",
          primary: {
            label: "Quero ser avisado",
            href: "/conheca/leilao/avisar",
            newTab: true,
          },
          signIn: { label: "Ver veículos à venda", href: "/veiculos" },
          highlights: [
            { value: "Seleção", label: "dos lotes que valem a pena" },
            { value: "Histórico", label: "consulta do veículo antes do lance" },
            { value: "Orientação", label: "no valor do lance" },
            { value: "Em breve", label: "avisamos quando abrir" },
          ],
          audience: [
            {
              title: "Quem quer pagar menos",
              text: "Busca um veículo abaixo do preço de mercado, com segurança.",
            },
            {
              title: "Primeira compra em leilão",
              text: "Quer entender as regras e não cair em armadilhas.",
            },
            {
              title: "Lojistas repondo estoque",
              text: "Precisa de ajuda para avaliar vários lotes com rapidez.",
            },
          ],
          steps: [
            {
              title: "Conte o que procura",
              text: "Tipo de veículo, faixa de preço e a sua cidade.",
            },
            {
              title: "A CajuGo seleciona os lotes",
              text: "Avaliamos as opções e consultamos o histórico de cada uma.",
            },
            {
              title: "Você decide o lance",
              text: "Com a nossa orientação, você escolhe e dá o lance com segurança.",
            },
          ],
          benefits: [
            {
              title: "Menos risco",
              text: "Você sabe o que está comprando antes de dar o lance.",
            },
            {
              title: "Histórico do veículo",
              text: "Débitos, restrições e sinais de batida, pela consulta veicular.",
            },
            {
              title: "Orientação no lance",
              text: "Ajuda para não pagar acima do que o veículo vale.",
            },
            {
              title: "Atendimento humano",
              text: "A equipe CajuGo acompanha você do começo ao fim.",
            },
          ],
          faq: [
            {
              q: "O serviço já está disponível?",
              a: "Ainda não. Toque em Quero ser avisado e falamos com você pelo WhatsApp quando abrir.",
            },
            {
              q: "Quanto vai custar?",
              a: "O valor será informado no lançamento do serviço.",
            },
            {
              q: "Funciona em qualquer leilão?",
              a: "Vamos começar pelos leilões da região e ampliar com o tempo.",
            },
          ],
          closing: {
            title: "Quer comprar em leilão com ajuda?",
            text: "Deixe o seu contato e avisamos assim que o serviço abrir.",
          },
        }}
      />
      <SiteFooter />
    </>
  );
}
