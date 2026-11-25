import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { pageMetadata } from "@/platform/seo/seo";
import { SiteFooter } from "@/ui/site-footer";
import { cachedProgramBanner } from "@/domains/referrals/current";
import { brl } from "@/platform/br/money";
import { ProgramLanding } from "@/ui/program-landing";

export const metadata: Metadata = pageMetadata({
  title: "Caju Indica: indique lojas de veículos e ganhe",
  description:
    "Conhece uma loja de veículos? Indique a CajuGo com o seu link e ganhe parte de cada mensalidade que ela pagar. Resgate por Pix.",
  path: "/conheca/caju-indica",
});

/** Página de vendas do Caju Indica (Descobrir, 017). */
export default async function CajuIndicaLanding() {
  // Valores das regras do programa (admin, [8f]); sem programa ativo, sem números.
  const rules = await cachedProgramBanner();
  return (
    <>
      <SiteHeader active="descobrir" />
      <ProgramLanding
        example={rules && <EarningsExample {...rules} />}
        c={{
          eyebrow: "Caju Indica",
          title: "Conhece uma loja de veículos? Indique e ganhe todo mês",
          lead: "Compartilhe o seu link com lojas de carros, motos e outros veículos. Quando a loja assinar o Catálogo da CajuGo, você ganha parte de cada mensalidade que ela pagar.",
          primary: { label: "Quero indicar", href: "/indica/cadastro" },
          signIn: {
            label: "Já indico: entrar",
            href: "/entrar?next=%2Findica",
          },
          highlights: rules
            ? [
                {
                  value: brl(rules.rewardCents),
                  label: "por loja, a cada mensalidade paga",
                },
                {
                  value: `${rules.months} meses`,
                  label: "de ganho por loja indicada",
                },
                { value: "Pix", label: "para resgatar o saldo" },
                { value: "Grátis", label: "para participar" },
              ]
            : [
                { value: "Grátis", label: "para participar" },
                { value: "Pix", label: "para resgatar o saldo" },
              ],
          audience: [
            {
              title: "Quem conhece lojistas",
              text: "Amigos, clientes e parceiros de lojas de veículos.",
            },
            {
              title: "Vendedores e despachantes",
              text: "Quem já circula pelas lojas da cidade no dia a dia.",
            },
            {
              title: "Lojistas da CajuGo",
              text: "Indique outras lojas e use o crédito para abater a sua fatura.",
            },
          ],
          steps: [
            {
              title: "Crie a sua conta",
              text: "Em um minuto, com nome, celular e e-mail. Você recebe o seu link e o seu código.",
            },
            {
              title: "Indique a loja",
              text: "Mande o link pelo WhatsApp. A loja faz o cadastro com o seu código.",
            },
            {
              title: "Ganhe e resgate",
              text: "A cada mensalidade paga pela loja, o valor entra no seu saldo. Você resgata por Pix.",
            },
          ],
          benefits: [
            {
              title: "Ganho recorrente",
              text: "Não é um prêmio único: você ganha a cada mensalidade paga, pelo prazo do programa.",
            },
            {
              title: "Sem precisar ter loja",
              text: "Qualquer pessoa pode indicar: vendedor, cliente, amigo do lojista.",
            },
            {
              title: "Acompanhe tudo no painel",
              text: "Veja cada indicação, o status da loja e o seu saldo.",
            },
            {
              title: "Resgate por Pix",
              text: "O CPF e a chave Pix só são pedidos no primeiro resgate.",
            },
          ],
          faq: [
            {
              q: "Quanto eu ganho?",
              a: "Uma parte da mensalidade de cada loja indicada, pelo número de meses das regras do programa. O valor aparece no seu painel.",
            },
            {
              q: "Quando a indicação vale?",
              a: "Quando a loja indicada assina o Catálogo e o pagamento é confirmado. Indicar a própria loja não vale.",
            },
            {
              q: "Como recebo?",
              a: "O saldo fica no painel e você pede o resgate por Pix a partir do valor mínimo.",
            },
          ],
          closing: {
            title: "Comece a indicar hoje",
            text: "Crie a conta, pegue o seu link e mande para a primeira loja.",
          },
        }}
      />
      <SiteFooter />
    </>
  );
}

/** Exemplo de ganhos com as regras atuais do programa (nada inventado). */
function EarningsExample({
  rewardCents,
  months,
}: {
  rewardCents: number;
  months: number;
}) {
  return (
    <section
      aria-labelledby="exemplo"
      className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 lg:p-8"
    >
      <div className="flex flex-col gap-1">
        <h2 id="exemplo" className="text-[24px] font-extrabold">
          Quanto dá para ganhar
        </h2>
        <p className="text-sm text-text-2">
          Com as regras de hoje: {brl(rewardCents)} por loja, a cada mensalidade
          paga, por até {months} meses.
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-text-3">
            <th className="py-2 font-semibold">Lojas assinando</th>
            <th className="py-2 font-semibold">Por mês</th>
            <th className="py-2 font-semibold">No total ({months} meses)</th>
          </tr>
        </thead>
        <tbody>
          {[1, 3, 5, 10].map((n) => (
            <tr key={n} className="border-b border-line-2 last:border-0">
              <td className="py-2.5 font-bold">{n}</td>
              <td className="py-2.5">{brl(rewardCents * n)}</td>
              <td className="py-2.5 font-extrabold text-caju-deep">
                {brl(rewardCents * n * months)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
