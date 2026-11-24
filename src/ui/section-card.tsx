import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Card de seção do design: branco, borda `line`, raio 16, padding 16; título 16/800
 * com ação em texto `caju-ink` à direita (ex.: "Faturas", "Editar plano").
 */
export function SectionCard({
  title,
  action,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={title && id ? id : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-surface p-4",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-baseline justify-between gap-3">
          {title && (
            <h2 id={id} className="text-base font-extrabold">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
