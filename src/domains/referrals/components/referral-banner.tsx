import Link from "next/link";
import { brl } from "@/platform/br/money";

type Banner = { pctBps: number; months: number; rewardCents: number };

/** "R$ 30" (sem centavos quando é valor redondo), como no design. */
const brlShort = (cents: number) =>
  cents % 100 ? brl(cents) : `R$ ${(cents / 100).toLocaleString("pt-BR")}`;

const pct = (bps: number) => `${(bps / 100).toLocaleString("pt-BR")}%`;

/**
 * "Indique uma loja e ganhe" na vitrine [9a] (IND-FR-014): o banner no topo e a linha
 * do rodapé. Some com o programa desligado (`banner` nulo).
 */
export function ReferralBanner({
  banner,
  variant,
}: {
  banner: Banner | null;
  variant: "banner" | "footer" | "card";
}) {
  if (!banner) return null;
  // Card escuro dentro da grade da vitrine ([15a], [9a]).
  if (variant === "card")
    return (
      <div
        data-testid="referral-banner"
        className="flex h-full min-h-[280px] flex-col justify-center gap-3 rounded-card bg-ink p-5 text-white"
      >
        <p className="text-[11px] font-bold tracking-[0.06em] text-castanha uppercase">
          Caju Indica
        </p>
        <p className="text-[22px] leading-tight font-extrabold tracking-[-0.01em]">
          Conhece uma loja de carros? Ganhe {brlShort(banner.rewardCents)} por
          mês.
        </p>
        <p className="text-sm text-on-dark-2">
          Por até {banner.months} meses, enquanto a loja continuar assinando.
        </p>
        <Link
          href="/indica/cadastro"
          className="mt-1 flex h-11 items-center self-start rounded-button bg-caju px-4 text-sm font-bold text-white"
        >
          Quero indicar
        </Link>
      </div>
    );
  if (variant === "footer")
    return (
      <p className="border-t border-line pt-4 text-sm text-text-2">
        Conhece uma loja de veículos?{" "}
        <Link
          href="/indica/cadastro"
          className="font-bold text-caju-ink underline underline-offset-2"
        >
          Indique e ganhe {brl(banner.rewardCents)} por mês
        </Link>
        .
      </p>
    );
  return (
    <Link
      href="/indica/cadastro"
      data-testid="referral-banner"
      className="flex min-h-11 flex-col gap-1 rounded-card bg-caju-tint p-4"
    >
      <strong className="text-[17px] font-extrabold">
        Indique uma loja e ganhe
      </strong>
      <span className="text-sm text-text-2">
        {pct(banner.pctBps)} da mensalidade ({brl(banner.rewardCents)}) por até{" "}
        {banner.months} meses, enquanto a loja indicada assinar.
      </span>
    </Link>
  );
}
