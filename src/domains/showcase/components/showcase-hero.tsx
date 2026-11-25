const count = new Intl.NumberFormat("pt-BR");

/**
 * Abertura da vitrine (pedido do dono, 2026-11-25, na referência de duas colunas): o
 * que é a CajuGo à esquerda e a ilustração à direita; o quadro Buscar/Vender vem logo
 * abaixo. O título da página continua sendo o `h1` da lista (SEO.md).
 */
export function ShowcaseHero({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-8 pt-2 lg:pt-4">
      <div className="flex max-w-2xl flex-col gap-2.5 lg:gap-4">
        <p className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-ink lg:text-[38px]">
          Seu próximo veículo está aqui: a vitrine das lojas com{" "}
          <span className="underline decoration-castanha decoration-[5px] underline-offset-[6px]">
            {total > 0
              ? `${count.format(total)} ${total === 1 ? "veículo" : "veículos"} à venda`
              : "veículos à venda"}
          </span>
        </p>
        <p className="text-[15px] text-text-2 lg:text-[17px]">
          A CajuGo reúne o estoque das lojas de veículos num só lugar: carros,
          motos, picapes e muito mais, com fotos, preço e a referência da Tabela
          FIPE. Achou o seu? Fale direto com a loja pelo WhatsApp, sem
          intermediário e sem custo para você.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática (WebP de 59 KB), só no desktop */}
      <img
        src="/tipos/hero.webp"
        alt=""
        width={360}
        height={252}
        className="ml-auto hidden h-[252px] w-[360px] flex-none object-contain lg:block"
      />
    </div>
  );
}
