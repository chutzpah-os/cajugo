import Link from "next/link";
import { brl } from "@/platform/br/money";
import { Badge, type BadgeTone } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { CopyLine } from "@/ui/copy-line";
import { EmptyState } from "@/ui/empty-state";
import type { ReferralItem, ReferralPanel, ReferralStatus } from "../service";

const pct = (bps: number) => `${(bps / 100).toLocaleString("pt-BR")}%`;
const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const STATUS: Record<ReferralStatus, [string, BadgeTone]> = {
  registered: ["Cadastrada", "info"],
  active: ["Rendendo", "ok"],
  paused: ["Pausada", "warn"],
  ended: ["Encerrada", "neutral"],
  invalid: ["Não válida", "neutral"],
};

/** Código, link, Copiar e WhatsApp [8a]/[9d] (IND-FR-001, 002, 015). */
export function ReferralShare({ panel }: { panel: ReferralPanel }) {
  if (!panel.enabled)
    return (
      <p role="status" className="rounded-card bg-neutral-soft p-4 text-sm">
        O Caju Indica está pausado no momento. Suas indicações já feitas
        continuam valendo.
      </p>
    );
  const message = `Coloque o estoque da sua loja online com o Catálogo CajuGo: ${panel.url}`;
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <h2 className="text-[19px] leading-tight font-extrabold">
        Ganhe {pct(panel.pctBps)} da mensalidade de cada loja indicada
      </h2>
      <p className="text-sm text-text-2">
        Por até {panel.months} meses, enquanto a loja continuar assinando.
        Começa a contar no 1º pagamento dela.
      </p>
      <CopyLine label="Seu código" value={panel.code} />
      <CopyLine label="Seu link" value={panel.url} />
      <ButtonLink
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        variant="whatsapp"
        block
      >
        Enviar pelo WhatsApp
      </ButtonLink>
    </section>
  );
}

/** "Como funciona" do Caju Indica. */
export function HowItWorks({ months }: { months: number }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[17px] font-extrabold">Como funciona</h2>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-text-2">
        <li>Envie o seu link para uma loja de veículos.</li>
        <li>A loja cria o catálogo com o seu código.</li>
        <li>
          A cada mensalidade paga por ela, nas {months} primeiras, você ganha a
          recompensa.
        </li>
        <li>Indicamos só lojas; não existe indicação de vendedor.</li>
      </ol>
    </section>
  );
}

/** Indicações com filtros [8b]/[9d] (IND-FR-005, 017): só o nome da loja e o status. */
export function ReferralList({
  basePath,
  filter,
  counts,
  items,
}: {
  basePath: string;
  filter: string;
  counts: { all: number; earning: number; registered: number; paused: number };
  items: ReferralItem[];
}) {
  const filters = [
    ["todas", "Todas", counts.all],
    ["rendendo", "Rendendo", counts.earning],
    ["cadastradas", "Cadastradas", counts.registered],
    ["pausadas", "Pausadas", counts.paused],
  ] as const;
  if (!counts.all)
    return (
      <EmptyState title="Nenhuma indicação ainda">
        Envie o seu link: a loja que se cadastrar com ele aparece aqui.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filtrar indicações" className="flex flex-wrap gap-2">
        {filters.map(([value, label, n]) => (
          <Link
            key={value}
            href={value === "todas" ? basePath : `${basePath}?filtro=${value}`}
            aria-current={filter === value ? "page" : undefined}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${
              filter === value
                ? "border-ink bg-ink text-white"
                : "border-field bg-surface text-ink"
            }`}
          >
            {label}
            <span className="opacity-60">{n}</span>
          </Link>
        ))}
      </nav>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => {
            const [label, tone] = STATUS[item.status];
            return (
              <li
                key={`${item.store}-${i}`}
                data-testid="referral-item"
                className="flex items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3"
              >
                <span className="text-sm">
                  <strong className="block">{item.store}</strong>
                  {item.status === "invalid"
                    ? "Não rende recompensa"
                    : `Rendeu ${brl(item.earnedCents)} · faltam ${item.monthsLeft} ${item.monthsLeft === 1 ? "mês" : "meses"}`}
                </span>
                <Badge tone={tone}>{label}</Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-text-2">Nenhuma indicação neste filtro.</p>
      )}
    </div>
  );
}

/** Movimentações (crédito ou saldo), da mais recente. */
export function Movements({
  items,
}: {
  items: { label: string; amountCents: number; date: Date; note?: string }[];
}) {
  if (!items.length)
    return <p className="text-sm text-text-2">Nenhuma movimentação ainda.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
      {items.map((m, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
        >
          <span>
            <strong className="block">{m.label}</strong>
            <span className="text-text-2">
              {brDate.format(new Date(m.date))}
              {m.note ? ` · ${m.note}` : ""}
            </span>
          </span>
          <span className="font-bold whitespace-nowrap">
            + {brl(m.amountCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}
