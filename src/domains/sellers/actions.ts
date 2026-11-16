"use server";

import { headers } from "next/headers";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { errorMessage, logger } from "@/platform/http/logger";
import { recordSellerClick } from "./service";

/** Abertura do link do vendedor (SEL-FR-010): a tela não espera nem mostra erro. */
export async function sellerClickAction(raw: unknown): Promise<void> {
  try {
    const h = await headers();
    await recordSellerClick(getDb(), raw, {
      ipHash: hashIp(clientIp(h)),
      userAgent: h.get("user-agent"),
    });
  } catch (error) {
    logger.error("sellers.click_failed", { error: errorMessage(error) });
  }
}
