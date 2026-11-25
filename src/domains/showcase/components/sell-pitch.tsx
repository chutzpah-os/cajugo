import Link from "next/link";
import { ButtonLink } from "@/ui/button";

const PERKS = [
  "Catálogo com o nome da sua loja",
  "Seus veículos na vitrine CajuGo",
  "Interessados direto no seu WhatsApp",
  "R$ 100/mês, sem comissão na venda",
] as const;

/** Aba **Vender** do topo da vitrine (TIP-FR-020): leva à página do lojista. */
export function SellPitch() {
  return (
    <div className="flex flex-col gap-4" data-testid="sell-pitch">
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] font-extrabold">
          Venda seus veículos na CajuGo
        </h2>
        <p className="text-sm text-text-2">
          Coloque o estoque da sua loja online hoje e receba os interessados no
          WhatsApp.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PERKS.map((p) => (
          <li key={p} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="font-extrabold text-caju">
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink href="/lojistas">Quero anunciar</ButtonLink>
        <Link
          href="/lojistas"
          className="flex h-11 items-center text-sm font-bold text-caju-ink"
        >
          Saiba mais →
        </Link>
      </div>
    </div>
  );
}
