"use client";

import { useState } from "react";
import { cn } from "@/ui/cn";
import {
  FAVORITES_LIMIT,
  useFavorite,
  type FavoriteSnapshot,
} from "../favorites";

/**
 * Coração de favoritar (BUY-FR-004): no servidor e na hidratação sai desmarcado e do
 * mesmo tamanho, para a página seguir em cache e sem CLS (BUY-NFR-002).
 */
export function FavoriteButton({
  snapshot,
  className,
}: {
  snapshot: FavoriteSnapshot;
  className?: string;
}) {
  const { saved, toggle } = useFavorite(snapshot.id);
  const [full, setFull] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={`Favoritar ${snapshot.title}`}
        data-testid="favorite"
        onClick={() => setFull(toggle(snapshot) === "full")}
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          className,
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={cn(
            "size-6",
            saved ? "fill-caju stroke-caju" : "fill-none stroke-current",
          )}
          strokeWidth={2}
          strokeLinejoin="round"
        >
          <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
        </svg>
      </button>
      {full && (
        <span
          role="status"
          className="absolute top-14 right-2 z-10 rounded-button bg-ink px-3 py-2 text-xs font-semibold text-white"
        >
          Você chegou a {FAVORITES_LIMIT} favoritos. Remova um para salvar
          outro.
        </span>
      )}
    </>
  );
}
