"use client";

import { useState } from "react";

/**
 * Compartilhar [1b] (SHW-FR-009): usa o do aparelho ou copia o link. O link é sempre o
 * endereço limpo, sem o `?ref=` de quem está compartilhando.
 */
export function ShareButton({
  path,
  title,
  className,
}: {
  path: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        if (typeof navigator.share === "function") {
          // Quem desiste do compartilhamento não tem erro para ver.
          await navigator.share({ title, url }).catch(() => {});
          return;
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }}
    >
      <span aria-live="polite">{copied ? "Link copiado" : "Compartilhar"}</span>
    </button>
  );
}
