import Link from "next/link";
import {
  LOG_TYPES,
  type ActivityLogView as View,
  type LogType,
} from "../activity-log";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const fieldClass =
  "h-12 rounded-input border border-field bg-surface px-3 text-[15px]";

/** Link do Log com os filtros atuais e outros parâmetros. */
function logHref(filter: View["filter"], extra: Record<string, string>) {
  const q = new URLSearchParams(
    Object.entries({ ...filter, ...extra }).filter(
      (e): e is [string, string] => !!e[1],
    ),
  ).toString();
  return q ? `/admin/log?${q}` : "/admin/log";
}

/**
 * **Logs de atividade** no item Log (ADM-FR-015) e o histórico de uma loja
 * (ADM-FR-011, `?loja=`): filtros tipo e período por GET, 20 por vez, ação em texto e
 * quem fez. Sem dado pessoal além do nome de quem fez.
 */
export function ActivityLogSection({ view }: { view: View }) {
  const { filter } = view;
  return (
    <section
      aria-labelledby="activity-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
    >
      <h2 id="activity-title" className="text-[17px] font-extrabold">
        {view.store ? `Histórico de ${view.store.name}` : "Logs de atividade"}
      </h2>
      {view.store && (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/lojas/${view.store.id}`}
            className="flex min-h-11 items-center font-bold text-caju-ink"
          >
            ← Voltar à loja
          </Link>
          <Link
            href={logHref({ ...filter, loja: undefined }, {})}
            className="flex min-h-11 items-center font-bold text-text-2"
          >
            Ver o registro geral
          </Link>
        </div>
      )}
      <form
        action="/admin/log"
        className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
      >
        {filter.loja && <input type="hidden" name="loja" value={filter.loja} />}
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Tipo
          <select
            name="tipo"
            defaultValue={filter.tipo ?? ""}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(LOG_TYPES) as LogType[]).map((k) => (
              <option key={k} value={k}>
                {LOG_TYPES[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          De
          <input
            type="date"
            name="de"
            defaultValue={filter.de}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={filter.ate}
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          className="h-12 rounded-button bg-ink px-5 text-[15px] font-bold text-white"
        >
          Filtrar
        </button>
      </form>
      {view.items.length === 0 ? (
        <p className="text-sm text-text-2">
          Nenhum registro com esses filtros.
        </p>
      ) : (
        <ul className="flex flex-col" data-testid="activity-log">
          {view.items.map((i) => (
            <li
              key={i.id}
              data-testid="activity-item"
              className="flex flex-col gap-0.5 border-b border-line-2 py-2 text-sm last:border-0"
            >
              <span className="font-semibold">{i.label}</span>
              <span className="text-xs text-text-2">
                {dateTime.format(new Date(i.at))} · {i.by}
              </span>
            </li>
          ))}
        </ul>
      )}
      {view.next && (
        <Link
          href={logHref(filter, { depois: view.next })}
          className="flex min-h-11 items-center justify-center rounded-button border-[1.5px] border-field text-[15px] font-bold"
        >
          Carregar mais
        </Link>
      )}
    </section>
  );
}
