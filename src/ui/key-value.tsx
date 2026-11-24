import type { ReactNode } from "react";

/** Linhas chave–valor de 40 px com divisória `line-2` ([6g], [3c], DESIGN.md §3). */
export function KeyValue({
  rows,
}: {
  rows: readonly (readonly [label: string, value: ReactNode])[];
}) {
  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex min-h-10 items-center justify-between gap-3 border-b border-line-2 py-2 text-sm last:border-0"
        >
          <dt className="text-text-3">{label}</dt>
          <dd className="text-right font-semibold break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
