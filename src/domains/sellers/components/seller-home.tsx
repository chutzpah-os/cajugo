import Link from "next/link";
import { ButtonLink } from "@/ui/button";
import type { SellerHome as Home } from "../service";
import { PARTNER_LABEL } from "../status";

/**
 * Início do vendedor [7b] (SEL-FR-002, 006): em análise ou bloqueado, só o status;
 * ativo, os cliques do mês e as lojas com parceria.
 */
export function SellerHome({ home }: { home: Home }) {
  if (home.kind === "status")
    return home.status === "blocked" ? (
      <section
        data-testid="seller-status"
        className="flex flex-col gap-2 rounded-card border border-caju-deep bg-surface p-4"
      >
        <h2 className="text-[19px] font-extrabold">Conta bloqueada</h2>
        <p className="text-sm text-text-2">Motivo: {home.reason}</p>
        <p className="text-sm text-text-2">
          Seus links não marcam novos contatos. Para revisar, fale com a CajuGo.
        </p>
      </section>
    ) : (
      <section
        data-testid="seller-status"
        className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
      >
        <h2 className="text-[19px] font-extrabold">
          {home.documentsMissing
            ? "Envie a foto do documento"
            : "Cadastro em análise"}
        </h2>
        <p className="text-sm text-text-2">
          {home.documentsMissing
            ? "Falta a frente ou o verso do seu documento com foto para a CajuGo analisar o cadastro."
            : "A CajuGo confere seus dados e o documento antes de aprovar. Quando for aprovado, a vitrine e os seus links aparecem aqui. Você não paga nada."}
        </p>
        {home.documentsMissing && (
          <ButtonLink href="/rede/cadastro/documento" className="self-start">
            Enviar documento
          </ButtonLink>
        )}
      </section>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-card bg-ink p-3 text-white">
        <div className="flex flex-col">
          <span
            className="text-[22px] font-extrabold"
            data-testid="seller-clicks"
          >
            {home.clicksThisMonth}
          </span>
          <span className="text-xs text-on-dark-2">cliques no mês</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[22px] font-extrabold">{home.code}</span>
          <span className="text-xs text-on-dark-2">seu código</span>
        </div>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Lojas</h2>
        {home.stores.length ? (
          <ul className="flex flex-col gap-2">
            {home.stores.map((s) => (
              <li
                key={s.storeId}
                data-testid="seller-store"
                className="flex min-h-11 items-center justify-between rounded-card border border-line bg-surface px-3"
              >
                <span className="font-bold">{s.name}</span>
                <span className="text-sm text-text-2">
                  {PARTNER_LABEL[s.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-2">
            Nenhuma loja ainda. Na{" "}
            <Link href="/rede/vitrine" className="font-bold underline">
              vitrine
            </Link>
            , peça parceria às lojas dos carros que quer divulgar.
          </p>
        )}
      </section>
    </div>
  );
}
