"use client";

import { useEffect, useState } from "react";
import { openingStatus, type WeekHours } from "@/platform/br/opening-hours";

/**
 * "Aberta agora · fecha às 18h" (015, PRC-FR-007): calculado no navegador, porque a
 * página do veículo fica em cache; antes disso, nada aparece.
 */
export function OpeningStatus({ hours }: { hours: WeekHours | null }) {
  const [status, setStatus] = useState<ReturnType<typeof openingStatus>>(null);
  useEffect(() => {
    const update = () => setStatus(openingStatus(hours, new Date()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [hours]);
  if (!status) return null;
  return (
    <p
      data-testid="opening-status"
      className="flex min-h-11 items-center gap-2 rounded-input border border-line px-3 text-sm font-semibold"
    >
      <span
        aria-hidden
        className={`size-2.5 rounded-full ${status.open ? "bg-ok" : "bg-caju-deep"}`}
      />
      {status.label}
    </p>
  );
}
