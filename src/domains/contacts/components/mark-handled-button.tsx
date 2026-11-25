"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { markContactHandledAction } from "../actions";

/** "Marcar como atendido": fecha o pedido e apaga nome, celular e e-mail. */
export function MarkHandledButton({ requestId }: { requestId: string }) {
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
          const r = await markContactHandledAction({ requestId });
          setBusy(false);
          if (!r.ok) setMessage(r.message ?? null);
          router.refresh();
        }}
      >
        {busy ? "Aguarde…" : "Marcar como atendido"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
    </div>
  );
}
