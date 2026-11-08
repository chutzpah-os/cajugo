"use client";

import { useState } from "react";
import { Button } from "@/ui/button";

/** Chave e "copia e cola" do Pix com Copiar (PIX-FR-004). */
export function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-input bg-bg px-3 py-3 font-mono text-sm">
          {value}
        </code>
        <Button
          variant="dark"
          size="sm"
          className="min-h-11"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}
