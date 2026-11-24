"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/ui/cn";
import { XIcon } from "@/ui/icons";
import { dismissNoticeAction } from "../actions";

/** Avisos à mostra; o resto abre em "Ver todos" (012: não tomar a tela). */
const SHOWN = 3;
import type { NoticeView } from "../service";

/** Avisos no topo do painel (GLOSSARY "Aviso", PIX-FR-013), com "Dispensar". */
export function NoticeList({ notices }: { notices: NoticeView[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [all, setAll] = useState(false);
  const visible = notices.filter((n) => !hidden.includes(n.id));
  if (!visible.length) return null;
  const extra = visible.length - SHOWN;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <ul aria-label="Avisos" className="flex flex-col gap-1.5">
        {visible.map((n, i) => (
          <li
            key={n.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl px-3 text-[13px] leading-snug",
              n.tone === "alert"
                ? "bg-caju-soft text-caju-deep"
                : "bg-ok-soft text-ok",
              !all && i >= SHOWN && "hidden",
            )}
          >
            <span
              role={n.tone === "alert" ? "alert" : "status"}
              className="py-2"
            >
              {n.text}
            </span>
            <button
              type="button"
              aria-label={`Dispensar: ${n.text}`}
              onClick={async () => {
                setHidden((h) => [...h, n.id]);
                await dismissNoticeAction(n.id);
                router.refresh();
              }}
              className="flex size-11 shrink-0 items-center justify-center"
            >
              <XIcon size={15} />
            </button>
          </li>
        ))}
      </ul>
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="flex min-h-11 items-center self-start text-[13px] font-bold text-caju-ink"
        >
          {all ? "Mostrar menos" : `Ver todos os avisos (${visible.length})`}
        </button>
      )}
    </div>
  );
}
