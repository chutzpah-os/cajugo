"use client";

import { uuidv7 } from "@/platform/db/uuid";
import type { ReactNode } from "react";
import { whatsappClickAction } from "../actions";
import { browserStorage, claimWhatsappLead, leadOrigin } from "../device";
import type { LeadOrigin, LeadVehicle } from "../status";

export type { LeadVehicle } from "../status";

type Storage = ReturnType<typeof browserStorage>;

/**
 * Toque em "WhatsApp" (LED-FR-003, 013): no máximo um lead por aparelho e veículo a cada
 * 24 h, sem esperar a resposta; erro é engolido, o link abre de qualquer jeito.
 */
export function onWhatsappTap(
  lead: LeadVehicle,
  deps: {
    local: Storage;
    session: Storage;
    now: () => Date;
    send: (input: {
      requestId: string;
      vehicleId: string;
      origin: LeadOrigin;
    }) => Promise<void>;
  },
) {
  if (!claimWhatsappLead(deps.local, lead.vehicleId, deps.now())) return;
  deps
    .send({
      requestId: uuidv7(),
      vehicleId: lead.vehicleId,
      origin: leadOrigin(deps.session, lead.storeSlug, lead.shared),
    })
    .catch(() => {});
}

/** Link do WhatsApp que também registra o lead (barra de [1b] e simulador [14b]). */
export function WhatsappButton({
  href,
  lead,
  className,
  children,
  ...rest
}: {
  href: string;
  lead: LeadVehicle;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        onWhatsappTap(lead, {
          local: browserStorage("local"),
          session: browserStorage("session"),
          now: () => new Date(),
          send: whatsappClickAction,
        })
      }
      {...rest}
    >
      {children}
    </a>
  );
}
