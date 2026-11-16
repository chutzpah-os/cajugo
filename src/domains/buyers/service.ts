import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  listSourceSchema,
  savedSearch,
  type SavedSearch,
} from "@/domains/showcase/service";
import { brMobileSchema } from "@/platform/br/phone";
import { isUniqueViolation } from "@/platform/db/errors";
import { fieldErrorsFromZod, type FieldError } from "@/platform/http/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import { cancelToken } from "./alert-token";
import { searchAlerts } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/** Até 5 alertas pendentes por celular (ALR-SEC-002). */
export const PENDING_PER_PHONE = 5;

export type CreateAlertResult =
  | { ok: true; status: "created"; alertId: string }
  | { ok: true; status: "duplicate" }
  | { ok: false; error: "too-many" };

/**
 * "Avisar quando chegar" (ALR-FR-001): guarda nome, celular, a busca normalizada e a
 * hora do consentimento. A mesma busca pendente do mesmo celular não repete
 * (ALR-FR-006, índice único); um celular tem até 5 pendentes (ALR-SEC-002).
 */
export async function createAlert(
  db: Db,
  input: { name: string; phone: string; search: SavedSearch },
  now: Date = new Date(),
): Promise<CreateAlertResult> {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(searchAlerts)
    .where(
      and(
        eq(searchAlerts.phone, input.phone),
        eq(searchAlerts.status, "pending"),
      ),
    );
  try {
    if (pending >= PENDING_PER_PHONE) {
      // A mesma busca já guardada é "duplicada", não "demais".
      const [same] = await db
        .select({ id: searchAlerts.id })
        .from(searchAlerts)
        .where(
          and(
            eq(searchAlerts.phone, input.phone),
            eq(searchAlerts.status, "pending"),
            eq(searchAlerts.query, input.search.query),
            input.search.discoveryPath
              ? eq(searchAlerts.discoveryPath, input.search.discoveryPath)
              : isNull(searchAlerts.discoveryPath),
          ),
        );
      return same
        ? { ok: true, status: "duplicate" }
        : { ok: false, error: "too-many" };
    }
    const [row] = await db
      .insert(searchAlerts)
      .values({
        name: input.name,
        phone: input.phone,
        query: input.search.query,
        discoveryPath: input.search.discoveryPath,
        consentAt: now,
        createdAt: now,
      })
      .returning({ id: searchAlerts.id });
    return { ok: true, status: "created", alertId: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: true, status: "duplicate" };
    throw error;
  }
}

const requestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(80, "Use até 80 caracteres."),
    phone: brMobileSchema,
    consent: z.literal(true, {
      error: "Aceite para receber o aviso pelo WhatsApp.",
    }),
    source: listSourceSchema,
    query: z.string().max(1000),
    website: z.string().max(200).optional(),
  })
  .strict();

export type AlertRequestResult =
  | {
      ok: true;
      status: "created" | "duplicate";
      /** Link de cancelar mostrado na confirmação (D3); `null` quando não há o que mostrar. */
      cancelPath: string | null;
    }
  | { ok: false; message: string; errors: FieldError[] };

const fail = (message: string, errors: FieldError[] = []) =>
  ({ ok: false, message, errors }) as const;

/**
 * Formulário "Avisar quando chegar" [12a] (ALR-FR-001, ALR-SEC-002): limite por IP
 * (5/min, 30/dia), honeypot que finge sucesso, schema estrito e só vitrine ou
 * descoberta. Devolve o link de cancelar para a confirmação.
 */
export async function requestAlert(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<AlertRequestResult> {
  const now = ctx.now ?? new Date();
  for (const rule of [RATE_LIMITS.publicForm, RATE_LIMITS.publicFormDaily]) {
    const { ok } = await consumeRateLimit(
      db,
      `alert:ip:${ctx.ipHash}:${rule.windowSeconds}`,
      rule,
      now,
    );
    if (!ok)
      return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }
  const honeypot = (raw as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "")
    return { ok: true, status: "created", cancelPath: null };

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Confira os campos destacados.",
      fieldErrorsFromZod(parsed.error),
    );
  const search = savedSearch(parsed.data.source, parsed.data.query);
  if (!search) return fail("Não foi possível guardar o alerta desta página.");

  const r = await createAlert(
    db,
    { name: parsed.data.name, phone: parsed.data.phone, search },
    now,
  );
  if (!r.ok)
    return fail(
      `Este celular já tem ${PENDING_PER_PHONE} alertas ativos. Cancele um para pedir outro.`,
    );
  return r.status === "created"
    ? {
        ok: true,
        status: "created",
        cancelPath: `/alertas/cancelar/${cancelToken(r.alertId)}`,
      }
    : { ok: true, status: "duplicate", cancelPath: null };
}
