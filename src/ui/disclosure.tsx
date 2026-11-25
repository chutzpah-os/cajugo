"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "./icons";

/**
 * Seção recolhível dentro de um card (012): a informação fica na própria tela, sem
 * abrir outra página, e não polui a tela enquanto está fechada. `open` só vale na
 * primeira vez: depois de uma action, a seção continua como a pessoa deixou.
 */
export function Disclosure({
  title,
  badge,
  open,
  testId,
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  open?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  const [isOpen, setOpen] = useState(open ?? false);
  return (
    <details
      data-testid={testId}
      open={isOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        <ChevronDownIcon
          size={18}
          className="flex-none text-text-3 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 px-4 pt-1 pb-4">{children}</div>
    </details>
  );
}
