"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { moveLeadAction } from "../actions";
import { nextStatus, STATUS_LABEL, type LeadStatus } from "../status";

/**
 * "→ próximo status" num toque e "Perdido" no menu do card [3a] (LED-FR-008). Lead
 * Vendido ou Perdido não tem ações.
 */
export function LeadActions({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const next = nextStatus(status);
  if (!next) return null;

  async function move(to: "next" | "lost") {
    setBusy(true);
    const r = await moveLeadAction({ leadId, to });
    setBusy(false);
    setMessage(r.ok ? null : r.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => move("next")}
          className="flex h-11 flex-1 items-center justify-center rounded-button bg-ink px-3 text-sm font-bold text-white disabled:opacity-60"
        >
          → {STATUS_LABEL[next]}
        </button>
        <details className="relative">
          <summary
            aria-label="Mais ações do lead"
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-button border border-field text-lg font-bold"
          >
            ⋯
          </summary>
          <div className="absolute right-0 bottom-12 z-10 w-40 rounded-card border border-line bg-surface p-1 shadow-lg">
            <button
              type="button"
              disabled={busy}
              onClick={() => move("lost")}
              className="flex h-11 w-full items-center rounded-button px-3 text-sm font-semibold text-caju-deep"
            >
              Perdido
            </button>
          </div>
        </details>
      </div>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
    </div>
  );
}
