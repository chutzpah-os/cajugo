import { notInArray } from "drizzle-orm";
import { z } from "zod";
import { authorizeTo } from "@/domains/auth/service";
import { notify } from "@/domains/notices/service";
import { scheduleSetting, SETTINGS } from "@/domains/settings/service";
import { brDate } from "@/platform/br/date";
import { brl } from "@/platform/br/money";
import { stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import { saoPauloDate, saoPauloMidnight } from "./due-date";

/**
 * Editar plano [4b] (011b, CAN-FR-011, D3): a mensalidade nova vale a partir de uma
 * data pelo menos 30 dias à frente, para todas as lojas: a fatura aberta desde essa
 * data usa o valor novo (vigência das regras, ADR 0010). Só o admin.
 */

/** Aviso mínimo antes da mudança de preço. */
export const PLAN_NOTICE_DAYS = 30;

const DAY_MS = 86_400_000;

export const editPlanSchema = z
  .object({
    membershipCents: SETTINGS.membership_cents.schema,
    /** AAAA-MM-DD, em São Paulo. */
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  })
  .strict();

export type PlanChangeStore = {
  storeId: string;
  name: string;
  whatsappUrl: string;
};

/** Primeiro dia que pode receber o novo valor (hoje + 30, em São Paulo). */
export function earliestPlanChange(now: Date): string {
  return saoPauloDate(new Date(now.getTime() + PLAN_NOTICE_DAYS * DAY_MS));
}

export async function editPlan(
  deps: { db: Db; now?: () => Date },
  session: Session | null,
  raw: unknown,
): Promise<{ validFrom: Date; stores: PlanChangeStore[] }> {
  const admin = authorizeTo(session, "settings.edit");
  const parsed = editPlanSchema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { membershipCents, validFrom: day } = parsed.data;
  const now = deps.now?.() ?? new Date();
  if (day < earliestPlanChange(now))
    throw AppError.validation([
      {
        field: "validFrom",
        code: "too_soon",
        message: `Escolha uma data a partir de ${brDate.format(
          new Date(`${earliestPlanChange(now)}T12:00:00Z`),
        )} (30 dias de aviso).`,
      },
    ]);
  const [y, m, d] = day.split("-").map(Number);
  const validFrom = saoPauloMidnight(y, m, d);
  const from = brDate.format(validFrom);

  return deps.db.transaction(async (tx) => {
    await scheduleSetting(tx, {
      key: "membership_cents",
      value: membershipCents,
      validFrom,
      changedBy: admin.userId,
    });
    const targets = await tx
      .select({
        storeId: stores.id,
        name: stores.name,
        whatsapp: stores.whatsapp,
        ownerId: stores.ownerId,
      })
      .from(stores)
      .where(notInArray(stores.status, ["canceled", "archived"]))
      .orderBy(stores.name);
    for (const s of targets)
      await notify(
        tx,
        s.ownerId,
        { kind: "plan_changed", amountCents: membershipCents, from },
        now,
      );
    await logActivity(tx, {
      userId: admin.userId,
      action: "plan.edited",
      entity: "settings",
      data: { membershipCents, validFrom: day, stores: targets.length },
    });
    return {
      validFrom,
      stores: targets.map((s) => ({
        storeId: s.storeId,
        name: s.name,
        whatsappUrl: whatsappLink(
          s.whatsapp,
          `Olá, ${s.name}! A mensalidade do Plano Catálogo da CajuGo passa a ${brl(membershipCents)} a partir de ${from}. Qualquer dúvida, é só responder.`,
        ),
      })),
    };
  });
}
