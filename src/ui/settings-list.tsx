import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "./icons";

/** Lista de configurações: linhas de 52 px com divisória `line-2` e chevron (DESIGN.md §3). */
export function SettingsList({
  items,
}: {
  items: readonly { href: string; label: ReactNode; hint?: ReactNode }[];
}) {
  return (
    <ul className="flex flex-col">
      {items.map((i) => (
        <li key={i.href} className="border-b border-line-2 last:border-0">
          <Link
            href={i.href}
            className="flex min-h-[52px] items-center justify-between gap-3 text-[15px] font-semibold"
          >
            <span className="flex flex-col">
              {i.label}
              {i.hint && (
                <span className="text-[13px] font-normal text-text-3">
                  {i.hint}
                </span>
              )}
            </span>
            <ChevronRightIcon size={16} className="flex-none text-text-4" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
