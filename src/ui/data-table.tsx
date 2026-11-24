import type { ReactNode } from "react";
import { cn } from "./cn";

export type Column<T> = {
  key: string;
  label: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

/**
 * Tabela do desktop ([15b], DSG-FR-005/017): cabeçalho em caixa alta 11/700 `text-3`,
 * linhas com divisória `line-2`, dentro de um card branco. No celular cada linha vira
 * o card que a tela passar em `mobile` (a mesma informação, no padrão da captura).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  mobile,
  caption,
  testId,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  mobile: (row: T) => ReactNode;
  caption: string;
  testId?: string;
}) {
  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} data-testid={testId}>
            {mobile(r)}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface lg:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line-2">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-3 py-3 text-left text-[11px] font-bold tracking-[0.04em] text-text-3 uppercase first:pl-4 last:pr-4",
                    c.className,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                data-testid={testId ? `${testId}-row` : undefined}
                className="border-b border-line-2 last:border-0"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-3 align-middle first:pl-4 last:pr-4",
                      c.className,
                    )}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
