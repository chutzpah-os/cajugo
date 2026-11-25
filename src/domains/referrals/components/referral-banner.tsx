import Link from "next/link";
import { brl } from "@/platform/br/money";

type Banner = { pctBps: number; months: number; rewardCents: number };

/** "R$ 30" (sem centavos quando é valor redondo), como no design. */
const brlShort = (cents: number) =>
  cents % 100 ? brl(cents) : `R$ ${(cents / 100).toLocaleString("pt-BR")}`;

/**
 * "Conhece uma loja de veículos? Ganhe R$ 30 por mês" na vitrine (IND-FR-014): faixa
 * fina logo abaixo do quadro Comprar · Vender (pedido do dono, 2026-11-25). Some com
 * o programa desligado (`banner` nulo).
 */
export function ReferralBanner({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  return (
    <Link
      href="/indica/cadastro"
      data-testid="referral-banner"
      className="group flex min-h-12 items-center justify-between gap-3 rounded-card bg-ink px-4 py-2.5 text-white lg:px-5"
    >
      <span className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
        <span className="text-[11px] font-bold tracking-[0.06em] text-castanha uppercase">
          Caju Indica
        </span>
        <span className="text-sm font-bold">
          Conhece uma loja de veículos? Ganhe {brlShort(banner.rewardCents)} por
          mês
          <span className="font-normal text-on-dark-2">
            , por até {banner.months} meses.
          </span>
        </span>
      </span>
      <span className="flex-none text-sm font-bold text-castanha group-hover:underline">
        Quero indicar →
      </span>
    </Link>
  );
}
