"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dismissNoticeAction } from "../actions";
import type { NoticeView } from "../service";

/** Avisos no topo do painel (GLOSSARY "Aviso", PIX-FR-013), com "Dispensar". */
export function NoticeList({ notices }: { notices: NoticeView[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = notices.filter((n) => !hidden.includes(n.id));
  if (!visible.length) return null;
  return (
    <ul aria-label="Avisos" className="mt-3 flex flex-col gap-2">
      {visible.map((n) => (
        <li
          key={n.id}
          className={
            n.tone === "alert"
              ? "flex items-start justify-between gap-2 rounded-card bg-caju-soft p-3 text-sm text-caju-deep"
              : "flex items-start justify-between gap-2 rounded-card bg-ok-soft p-3 text-sm text-ok"
          }
        >
          <span
            role={n.tone === "alert" ? "alert" : "status"}
            className="py-2.5"
          >
            {n.text}
          </span>
          <button
            type="button"
            onClick={async () => {
              setHidden((h) => [...h, n.id]);
              await dismissNoticeAction(n.id);
              router.refresh();
            }}
            className="flex min-h-11 shrink-0 items-center px-2 font-semibold underline underline-offset-2"
          >
            Dispensar
          </button>
        </li>
      ))}
    </ul>
  );
}
