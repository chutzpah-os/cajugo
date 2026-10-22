import type { ReactNode } from "react";

/** Estado vazio: borda tracejada, ícone em caju-soft, título, texto e ação (DESIGN.md §3). */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-field-dash px-6 py-8 text-center">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-xl bg-caju-soft text-caju"
      >
        {icon}
      </span>
      <h2 className="text-[17px] font-extrabold">{title}</h2>
      <p className="text-sm text-text-2">{children}</p>
      {action}
    </div>
  );
}
