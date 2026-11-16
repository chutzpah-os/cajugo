"use client";

import { useState } from "react";
import { cn } from "@/ui/cn";
import { HeartIcon } from "@/ui/heart-icon";
import { FAVORITES_LIMIT, type FavoriteSnapshot } from "../favorites";
import { useFavorite } from "../use-favorites";

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
        <HeartIcon filled={saved} />
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
