"use client";

import { useState } from "react";
import { Button } from "./button";

/** Valor com **Copiar** (chave Pix, copia e cola, link de indicação). */
export function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex h-[50px] min-w-0 flex-1 items-center truncate rounded-input border border-field bg-surface px-3.5 font-mono text-[13px] text-text-2">
          <span className="truncate">{value}</span>
        </code>
        <Button
          variant="dark"
          size="sm"
          className="h-[50px] rounded-input px-3.5 text-[13px]"
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
