"use server";

import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { dismissNotice } from "./service";

/** "Dispensar" um aviso do painel (PIX-FR-013); de outra pessoa não faz nada. */
export async function dismissNoticeAction(noticeId: string): Promise<void> {
  try {
    await dismissNotice(getDb(), await currentSession(), String(noticeId));
  } catch {
    // Já dispensado ou de outra pessoa: a lista recarrega igual.
  }
}
