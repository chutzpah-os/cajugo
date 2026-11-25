import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { pageMetadata } from "@/platform/seo/seo";
import { ButtonLink } from "@/ui/button";
import { CheckIcon } from "@/ui/icons";
import { SiteFooter } from "@/ui/site-footer";
import { ProgramLanding } from "@/ui/program-landing";

export const metadata: Metadata = pageMetadata({
  title: "Catálogo para lojas de veículos: sua loja online hoje",
  description:
    "Catálogo com o nome da sua loja, vitrine CajuGo e interessados no WhatsApp. Veículos ilimitados, R$ 100/mês, sem comissão na venda e sem fidelidade.",
  path: "/conheca/lojistas",
});

const PLAN = [
  "Veículos ilimitados",
  "Até 20 fotos por veículo",
  "Catálogo com o nome da loja, link e QR code",
  "Vitrine CajuGo",
  "Interessados direto no WhatsApp",
  "Painel de leads",
] as const;

/** Página de vendas do Catálogo para lojas (Descobrir, 017). */
export default function MerchantDiscoverLanding() {
  return (
    <>
      <SiteHeader active="descobrir" />
      <ProgramLanding
        example={<PlanCard />}
        c={{
          eyebrow: "Catálogo para lojas",
          title: "Sua loja online hoje, na vitrine da CajuGo",
          lead: "Coloque o estoque da sua loja na internet com um catálogo só seu, apareça para quem procura veículo na CajuGo e receba os interessados direto no WhatsApp.",
          primary: { label: "Anunciar minha loja", href: "/lojistas/cadastro" },
          signIn: {
            label: "Já sou lojista: entrar",
            href: "/entrar?next=%2Fpainel",
          },
          highlights: [
            { value: "R$ 100", label: "por mês, com tudo incluído" },
            { value: "Ilimitado", label: "número de veículos" },
            { value: "0%", label: "de comissão na venda" },
            { value: "Sem fidelidade", label: "cancele quando quiser" },
          ],
          audience: [
            {
              title: "Lojas de carros e motos",
              text: "Revendas, garagens e lojas de seminovos de qualquer tamanho.",
            },
            {
              title: "Picapes, SUVs e utilitários",
              text: "Lojas especializadas em picapes, SUVs e veículos de trabalho.",
            },
            {
              title: "Quem vende pelo WhatsApp",
              text: "Troque a lista de fotos no celular por um catálogo organizado.",
            },
          ],
          steps: [
            {
              title: "Crie a conta da loja",
              text: "Nome, cidade, WhatsApp e o endereço do catálogo, em poucos minutos.",
            },
            {
              title: "Pague o primeiro mês por Pix",
              text: "Envie o comprovante no painel: a equipe confere e a loja entra no ar.",
            },
            {
              title: "Cadastre os veículos",
              text: "Com fotos, ficha e referência FIPE. Os interessados chegam no seu WhatsApp.",
            },
          ],
          benefits: [
            {
              title: "Catálogo com o nome da loja",
              text: "Um endereço só seu, com link e QR code para divulgar.",
            },
            {
              title: "Vitrine CajuGo",
              text: "Seus veículos também aparecem para quem procura na CajuGo.",
            },
            {
              title: "Painel de leads",
              text: "Veja quem se interessou, por qual veículo e de onde veio.",
            },
            {
              title: "Rede Caju",
              text: "Vendedores independentes divulgam os seus veículos e só ganham quando vendem.",
            },
          ],
          faq: [
            {
              q: "Preciso ter CNPJ?",
              a: "Não. Lojas com CPF também assinam. O documento é pedido no pagamento, para a nota.",
            },
            {
              q: "Posso cancelar quando quiser?",
              a: "Sim, sem multa e sem fidelidade. O catálogo fica no ar até o fim do mês já pago.",
            },
            {
              q: "A CajuGo cobra comissão das minhas vendas?",
              a: "Não. Só quando a venda é feita por um vendedor da Rede Caju há uma pequena taxa, informada no painel antes de você aceitar.",
            },
            {
              q: "Quantos veículos posso anunciar?",
              a: "Quantos quiser: o Catálogo não limita o estoque.",
            },
          ],
          closing: {
            title: "Coloque a sua loja online hoje",
            text: "Crie a conta, pague o primeiro mês por Pix e cadastre os veículos.",
          },
        }}
      />
      <SiteFooter />
    </>
  );
}

/** O plano, com o que vem incluído. */
function PlanCard() {
  return (
    <section
      aria-labelledby="plano"
      className="grid gap-6 rounded-card border-2 border-ink bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:p-8"
    >
      <div className="flex flex-col items-start gap-2">
        <h2 id="plano" className="text-[24px] font-extrabold">
          Plano Catálogo
        </h2>
        <p>
          <strong className="text-[40px] font-extrabold tracking-[-0.02em]">
            R$ 100
          </strong>
          <span className="text-text-2">/mês</span>
        </p>
        <p className="text-sm text-text-2">
          Sem fidelidade. Cancele quando quiser.
        </p>
        <ButtonLink href="/lojistas/cadastro" className="mt-2">
          Anunciar minha loja
        </ButtonLink>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PLAN.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[15px]">
            <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-ok-soft text-ok">
              <CheckIcon size={12} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
