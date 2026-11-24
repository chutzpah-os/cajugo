import type { ReactNode } from "react";
import { Initials } from "./initials";

/**
 * Card de loja / assinatura (DESIGN.md §3, [1d], [4b]): sigla em quadrado `ink`, nome
 * 15/800, linha de baixo 12 `text-3`, selo à direita; rodapé com divisória `line-2`,
 * a informação à esquerda e a ação à direita.
 */
export function StoreCard({
  name,
  subtitle,
  badge,
  footer,
  action,
  children,
  testId,
}: {
  name: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  /** Conteúdo extra abaixo do rodapé (ex.: botões de decisão do admin). */
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <li
      data-testid={testId}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5"
    >
      <div className="flex items-center gap-3">
        <Initials name={name} />
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <p className="truncate text-[15px] font-extrabold">{name}</p>
          {subtitle && (
            <p className="truncate text-xs text-text-3">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      {(footer || action) && (
        <div className="flex items-center justify-between gap-3 border-t border-line-2 pt-2.5 text-[13px] text-text-2">
          <div className="min-w-0">{footer}</div>
          {action && <div className="flex-none">{action}</div>}
        </div>
      )}
      {children}
    </li>
  );
}
