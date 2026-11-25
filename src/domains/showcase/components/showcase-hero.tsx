/**
 * Abertura da página inicial (017, pedido do dono em 2026-11-25): a CajuGo como a
 * plataforma automotiva, com o texto à esquerda e a ilustração à direita no desktop;
 * o quadro Buscar · Vender vem logo abaixo.
 */
export function ShowcaseHero() {
  return (
    <div className="flex items-center gap-8 pt-4 lg:pt-6">
      <div className="flex max-w-2xl flex-col gap-2.5 lg:gap-4">
        <p className="text-[24px] leading-tight font-extrabold tracking-[-0.02em] text-ink lg:text-[40px]">
          A sua plataforma automotiva: compre, venda e cuide do seu veículo,{" "}
          <span className="underline decoration-castanha decoration-[5px] underline-offset-[6px]">
            tudo aqui
          </span>
        </p>
        <p className="text-[15px] text-text-2 lg:text-[17px]">
          Na CajuGo você encontra veículos novos e usados das lojas, coloca o
          estoque da sua loja online, consulta o histórico de um veículo antes
          de comprar e fala direto com a loja pelo WhatsApp, sem intermediário.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática (WebP de 62 KB), só no desktop */}
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
