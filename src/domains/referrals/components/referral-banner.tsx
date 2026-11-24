import Link from "next/link";
import { brl } from "@/platform/br/money";

type Banner = { pctBps: number; months: number; rewardCents: number };

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
  variant: "banner" | "footer";
}) {
  if (!banner) return null;
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
