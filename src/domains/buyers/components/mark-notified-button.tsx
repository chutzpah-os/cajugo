"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { markAlertNotifiedAction } from "../actions";

/** "Marcar como avisado" (ALR-FR-003): fecha o alerta e apaga nome e celular. */
export function MarkNotifiedButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await markAlertNotifiedAction({ alertId });
          setBusy(false);
          if (!r.ok) setMessage(r.message ?? null);
          router.refresh();
        }}
      >
        {busy ? "Aguarde…" : "Marcar como avisado"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
    </div>
  );
}
