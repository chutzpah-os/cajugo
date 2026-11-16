"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import type { DecisionResult } from "../actions";

/**
 * Botão de uma decisão da equipe em [14e] (Manter, Mostrar de novo): chama a action e
 * recarrega a fila, lida sem cache.
 */
export function DecisionButton({
  run,
  children,
  testId,
}: {
  run: () => Promise<DecisionResult>;
  children: ReactNode;
  testId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        block
        disabled={busy}
        data-testid={testId}
        onClick={async () => {
          setBusy(true);
          const r = await run();
          setBusy(false);
          setMessage(r.ok ? null : r.message);
          router.refresh();
        }}
      >
        {busy ? "Aguarde…" : children}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
    </div>
  );
}
