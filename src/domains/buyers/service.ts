import { and, asc, count, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { authorizeTo } from "@/domains/auth/service";
import { getSettings } from "@/domains/settings/service";
import {
  firstMatch,
  savedSearch,
  searchLabel,
  type PublicCard,
  type SavedSearch,
} from "@/domains/showcase/service";
import { isUniqueViolation } from "@/platform/db/errors";
import { logActivity } from "@/platform/http/activity-log";
import { isHoneypotFilledIn } from "@/platform/http/honeypot";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import type { Session } from "@/platform/http/session";
import { appUrl } from "@/platform/http/urls";
import { whatsappLink } from "@/platform/whatsapp/link";
import { alertIdFromToken, cancelToken } from "./alert-token";
import { alertRequestSchema, cancelSchema, notifySchema } from "./schemas";
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
  const pendingOf = and(
    eq(searchAlerts.phone, input.phone),
    eq(searchAlerts.status, "pending"),
  );
  try {
    return await db.transaction(async (tx) => {
      // Um pedido por vez para o mesmo celular: o limite de 5 não estoura na corrida.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`alert:${input.phone}`}))`,
      );
      const [same] = await tx
        .select({ id: searchAlerts.id })
        .from(searchAlerts)
        .where(
          and(
            pendingOf,
            eq(searchAlerts.query, input.search.query),
            input.search.discoveryPath
              ? eq(searchAlerts.discoveryPath, input.search.discoveryPath)
              : isNull(searchAlerts.discoveryPath),
          ),
        );
      if (same) return { ok: true, status: "duplicate" } as const;
      const [{ pending }] = await tx
        .select({ pending: count() })
        .from(searchAlerts)
        .where(pendingOf);
      if (pending >= PENDING_PER_PHONE)
        return { ok: false, error: "too-many" } as const;
      const [row] = await tx
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
      return { ok: true, status: "created", alertId: row.id } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: true, status: "duplicate" };
    throw error;
  }
}

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
  if (!(await withinPublicFormLimits(db, "alert", ctx.ipHash, now)))
    return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  if (isHoneypotFilledIn(raw))
    return { ok: true, status: "created", cancelPath: null };

  const parsed = alertRequestSchema.safeParse(raw);
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

const DAY_MS = 86_400_000;

/** Validade das regras vigentes (ALR-FR-005): mudar a regra muda os vencimentos. */
async function validityMs(db: Db, now: Date): Promise<number> {
  return (await getSettings(db, now)).search_alert_validity_days * DAY_MS;
}

/** "Fiat ARGO DRIVE 1.0 2022": o veículo na mensagem e na tela "Alertas". */
function vehicleTitle(v: PublicCard): string {
  return [v.make, v.version ?? v.model, v.yearModel].filter(Boolean).join(" ");
}

export type AlertInbox = {
  /** Com veículo compatível: o admin avisa pelo WhatsApp (ALR-FR-002). */
  matched: {
    alertId: string;
    name: string;
    label: string;
    vehicle: PublicCard;
    vehicleTitle: string;
    whatsappUrl: string;
    createdAt: Date;
  }[];
  /** Ainda sem veículo: sem nome nem celular na lista. */
  waiting: {
    alertId: string;
    label: string;
    createdAt: Date;
    expiresAt: Date;
  }[];
};

/**
 * Alertas pendentes dentro da validade das regras (ALR-FR-005, lida agora: mudar a
 * regra muda os vencimentos), cada um com o 1º veículo compatível, se houver.
 */
export async function alertInbox(
  db: Db,
  now: Date = new Date(),
): Promise<AlertInbox> {
  const validity = await validityMs(db, now);
  const rows = await db
    .select()
    .from(searchAlerts)
    .where(
      and(
        eq(searchAlerts.status, "pending"),
        gt(searchAlerts.createdAt, new Date(now.getTime() - validity)),
      ),
    )
    .orderBy(asc(searchAlerts.createdAt), asc(searchAlerts.id));

  const inbox: AlertInbox = { matched: [], waiting: [] };
  for (const a of rows) {
    const search = { query: a.query, discoveryPath: a.discoveryPath };
    const label = searchLabel(search);
    const vehicle = await firstMatch(db, search, a.createdAt);
    if (vehicle && a.name && a.phone)
      inbox.matched.push({
        alertId: a.id,
        name: a.name,
        label,
        vehicle,
        vehicleTitle: vehicleTitle(vehicle),
        whatsappUrl: whatsappLink(
          a.phone,
          noticeText(a.id, a.name, label, vehicle),
        ),
        createdAt: a.createdAt,
      });
    else
      inbox.waiting.push({
        alertId: a.id,
        label,
        createdAt: a.createdAt,
        expiresAt: new Date(a.createdAt.getTime() + validity),
      });
  }
  return inbox;
}

/** Mensagem pronta do aviso (ALR-FR-002, ALR-FR-004). */
function noticeText(
  alertId: string,
  name: string,
  label: string,
  v: PublicCard,
): string {
  return `Olá, ${name}! Você pediu na CajuGo para avisar quando chegasse: ${label}. Chegou este: ${vehicleTitle(v)}, ${appUrl()}${v.path}\n\nSe não quiser mais este alerta: ${appUrl()}/alertas/cancelar/${cancelToken(alertId)}`;
}

/** Fechar o alerta apaga o dado pessoal na mesma escrita (ALR-SEC-004). */
const closed = (status: "notified" | "canceled" | "expired", now: Date) => ({
  status,
  name: null,
  phone: null,
  closedAt: now,
});

/**
 * "Marcar como avisado" (ALR-FR-003): só admin e suporte (ALR-SEC-001); fecha o
 * alerta e registra quem avisou. `false` quando ele já não estava pendente.
 */
export async function markNotified(
  db: Db,
  session: Session | null,
  input: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  const actor = authorizeTo(session, "alerts.notify");
  const parsed = notifySchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { alertId } = parsed.data;
  // Vencido e ainda não limpo pelo job: fecha como vencido, não como avisado.
  await purgeExpired(db, now);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(searchAlerts)
      .set({ ...closed("notified", now), notifiedBy: actor.userId })
      .where(
        and(eq(searchAlerts.id, alertId), eq(searchAlerts.status, "pending")),
      )
      .returning({ id: searchAlerts.id });
    if (!row) return false;
    await logActivity(tx, {
      userId: actor.userId,
      action: "search_alert.notified",
      entity: "search_alert",
      entityId: alertId,
    });
    return true;
  });
}

export type CancelOutcome = "canceled" | "closed" | "invalid";

/**
 * Cancelar pelo link (ALR-FR-004, ALR-SEC-005): só com o link do próprio alerta.
 * `closed` quando ele já foi avisado, cancelado ou venceu.
 */
export async function cancelAlert(
  db: Db,
  input: unknown,
  now: Date = new Date(),
): Promise<CancelOutcome> {
  const parsed = cancelSchema.safeParse(input);
  const alertId = parsed.success ? alertIdFromToken(parsed.data.token) : null;
  if (!alertId) return "invalid";
  await purgeExpired(db, now);
  const canceled = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(searchAlerts)
      .set(closed("canceled", now))
      .where(
        and(eq(searchAlerts.id, alertId), eq(searchAlerts.status, "pending")),
      )
      .returning({ id: searchAlerts.id });
    if (row)
      await logActivity(tx, {
        userId: null,
        action: "search_alert.canceled",
        entity: "search_alert",
        entityId: alertId,
      });
    return !!row;
  });
  if (canceled) return "canceled";
  const [exists] = await db
    .select({ id: searchAlerts.id })
    .from(searchAlerts)
    .where(eq(searchAlerts.id, alertId));
  return exists ? "closed" : "invalid";
}

/**
 * Job diário (ALR-FR-005, ALR-SEC-004): pendente além da validade das regras vira
 * `expired` e perde nome e celular. Idempotente: devolve quantos fechou agora.
 */
export async function purgeExpired(
  db: Db,
  now: Date = new Date(),
): Promise<number> {
  const validity = await validityMs(db, now);
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(searchAlerts)
      .set(closed("expired", now))
      .where(
        and(
          eq(searchAlerts.status, "pending"),
          lte(searchAlerts.createdAt, new Date(now.getTime() - validity)),
        ),
      )
      .returning({ id: searchAlerts.id });
    for (const r of rows)
      await logActivity(tx, {
        userId: null,
        action: "search_alert.expired",
        entity: "search_alert",
        entityId: r.id,
      });
    return rows.length;
  });
}
