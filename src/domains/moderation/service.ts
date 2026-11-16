import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { can, authorizeTo } from "@/domains/auth/service";
import { notifyStore } from "@/domains/notices/service";
import { contactTarget, vehiclePath } from "@/domains/showcase/service";
import {
  hideVehicle,
  shortTitle,
  showVehicle,
} from "@/domains/vehicles/service";
import {
  stores,
  vehiclePhotos,
  vehicleReports,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import { logActivity } from "@/platform/http/activity-log";
import { isHoneypotFilledIn } from "@/platform/http/honeypot";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import type { Session } from "@/platform/http/session";
import { hiddenReasonText, REPORT_REASONS, type ReportReason } from "./reasons";
import { hideSchema, reportSchema, vehicleDecisionSchema } from "./schemas";

export { hiddenReasonText } from "./reasons";

export type ReportResult =
  { ok: true } | { ok: false; message: string; errors: FieldError[] };

const fail = (message: string, errors: FieldError[] = []) =>
  ({ ok: false, message, errors }) as const;

/**
 * "Denunciar anúncio" em [14d] (RPT-FR-001, RPT-SEC-002, 006): limite por IP, honeypot
 * que finge sucesso, schema estrito, veículo visível ao público. A chave do envio vira o
 * id (repetir não duplica). Nada de quem denunciou: nem conta, nem contato, nem IP.
 */
export async function reportVehicle(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<ReportResult> {
  const now = ctx.now ?? new Date();
  if (!(await withinPublicFormLimits(db, "report", ctx.ipHash, now)))
    return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  if (isHoneypotFilledIn(raw)) return { ok: true };

  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Confira os campos destacados.",
      fieldErrorsFromZod(parsed.error),
    );
  const { requestId, vehicleId, reason, details } = parsed.data;
  if (!(await contactTarget(db, vehicleId)))
    return fail("Este veículo não está mais disponível.");

  await db
    .insert(vehicleReports)
    .values({
      id: requestId,
      vehicleId,
      reason,
      details: details || null,
      createdAt: now,
    })
    .onConflictDoNothing({ target: vehicleReports.id });
  return { ok: true };
}

/** O anúncio num card da equipe: foto, nome, loja, preço e link (RPT-FR-002). */
export type ModeratedCard = {
  id: string;
  title: string;
  priceCents: number | null;
  storeName: string;
  path: string;
  coverPublicId: string | null;
};

/**
 * Dados de card dos veículos para a equipe: lidos direto, sem a regra pública, para
 * loja suspensa e veículo despublicado com a marca também aparecerem (RPT-FR-007, 008).
 */
async function cardsOf(
  db: Db,
  ids: string[],
): Promise<Map<string, ModeratedCard>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      yearModel: vehicles.yearModel,
      priceCents: vehicles.priceCents,
      storeName: stores.name,
      city: stores.city,
      state: stores.state,
      coverPublicId: vehiclePhotos.publicId,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .leftJoin(
      vehiclePhotos,
      and(
        eq(vehiclePhotos.vehicleId, vehicles.id),
        eq(vehiclePhotos.position, 0),
      ),
    )
    .where(inArray(vehicles.id, ids));
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        title: shortTitle(r),
        priceCents: r.priceCents,
        storeName: r.storeName,
        path: vehiclePath(r),
        coverPublicId: r.coverPublicId,
      },
    ]),
  );
}

export type ReportCard = {
  vehicle: ModeratedCard;
  /** Denúncias abertas do anúncio. */
  open: number;
  byReason: { reason: ReportReason; count: number }[];
  /** Descrições escritas, da mais antiga; nunca quem denunciou (RPT-SEC-006). */
  details: string[];
  firstAt: Date;
  lastAt: Date;
};

/** Denúncias abertas de anúncios no ar: só elas formam a fila (RPT-FR-002). */
const openOnAir = and(
  eq(vehicleReports.status, "open"),
  eq(vehicles.status, "published"),
);

/**
 * Fila "Denúncias" [14e] (RPT-FR-002, RPT-SEC-003): só admin e suporte. Um card por
 * anúncio publicado com denúncia aberta, da denúncia mais antiga para a mais nova.
 * Vendido, despublicado ou excluído sai sozinho e volta se for publicado de novo.
 */
export async function reportQueue(
  db: Db,
  session: Session | null,
): Promise<ReportCard[]> {
  authorizeTo(session, "admin.moderate");
  const rows = await db
    .select({
      vehicleId: vehicleReports.vehicleId,
      reason: vehicleReports.reason,
      details: vehicleReports.details,
      createdAt: vehicleReports.createdAt,
    })
    .from(vehicleReports)
    .innerJoin(vehicles, eq(vehicles.id, vehicleReports.vehicleId))
    .where(openOnAir)
    .orderBy(asc(vehicleReports.createdAt), asc(vehicleReports.id));

  const grouped = new Map<string, typeof rows>();
  for (const r of rows)
    grouped.set(r.vehicleId, [...(grouped.get(r.vehicleId) ?? []), r]);
  const cards = await cardsOf(db, [...grouped.keys()]);

  return [...grouped].flatMap(([vehicleId, reports]) => {
    const vehicle = cards.get(vehicleId);
    if (!vehicle) return [];
    return [
      {
        vehicle,
        open: reports.length,
        byReason: REPORT_REASONS.flatMap((reason) => {
          const n = reports.filter((r) => r.reason === reason).length;
          return n ? [{ reason, count: n }] : [];
        }),
        details: reports.flatMap((r) => (r.details ? [r.details] : [])),
        firstAt: reports[0].createdAt,
        lastAt: reports[reports.length - 1].createdAt,
      },
    ];
  });
}

/** Contador de "Denúncias" no menu (RPT-FR-007): anúncios na fila; 0 sem permissão. */
export async function openReportsCount(
  db: Db,
  session: Session | null,
): Promise<number> {
  if (!can(session, "admin.moderate")) return 0;
  const rows = await db
    .selectDistinct({ id: vehicleReports.vehicleId })
    .from(vehicleReports)
    .innerJoin(vehicles, eq(vehicles.id, vehicleReports.vehicleId))
    .where(openOnAir);
  return rows.length;
}

function parseDecision(raw: unknown) {
  const parsed = vehicleDecisionSchema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  return parsed.data;
}

/**
 * **Manter** (RPT-FR-003, RPT-SEC-005): arquiva as denúncias abertas do anúncio, que
 * sai da fila; o anúncio não muda. Registro com quem decidiu, sem o texto das denúncias.
 * `false` quando não havia denúncia aberta (outra pessoa já decidiu).
 */
export async function keep(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  const actor = authorizeTo(session, "admin.moderate");
  const { vehicleId } = parseDecision(raw);
  return db.transaction(async (tx) => {
    const closed = await closeOpenReports(
      tx,
      vehicleId,
      "kept",
      actor.userId,
      now,
    );
    if (!closed.length) return false;
    await logActivity(tx, {
      userId: actor.userId,
      action: "vehicle_reports.kept",
      entity: "vehicle",
      entityId: vehicleId,
      data: { reports: closed.length },
    });
    return true;
  });
}

/** Fecha as denúncias abertas do anúncio com a decisão (dentro da transação). */
const closeOpenReports = (
  tx: Db,
  vehicleId: string,
  status: "kept" | "hidden",
  actorId: string,
  now: Date,
) =>
  tx
    .update(vehicleReports)
    .set({ status, decidedBy: actorId, decidedAt: now })
    .where(
      and(
        eq(vehicleReports.vehicleId, vehicleId),
        eq(vehicleReports.status, "open"),
      ),
    )
    .returning({ id: vehicleReports.id });

/**
 * **Ocultar** (RPT-FR-004, 006, RPT-SEC-004, 005), numa transação: o veículo fica oculto
 * com a marca de moderação, as denúncias abertas dele fecham, a loja dele é avisada com
 * o motivo e a decisão vai para o registro (sem texto das denúncias). `false` quando o
 * anúncio já não estava publicado. Quem chama invalida o cache público.
 */
export async function hide(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  const actor = authorizeTo(session, "admin.moderate");
  const parsed = hideSchema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { vehicleId, reason } = parsed.data;
  const note = reason === "other" ? (parsed.data.note ?? null) : null;
  return db.transaction(async (tx) => {
    const v = await hideVehicle(tx, actor, vehicleId, { reason, note }, now);
    if (!v) return false;
    await closeOpenReports(tx, vehicleId, "hidden", actor.userId, now);
    await notifyStore(
      tx,
      v.storeId,
      {
        kind: "vehicle_hidden",
        vehicle: v.title,
        reason: hiddenReasonText(reason, note),
      },
      now,
    );
    await logActivity(tx, {
      userId: actor.userId,
      action: "vehicle.hidden",
      entity: "vehicle",
      entityId: vehicleId,
      data: { reason, note },
    });
    return true;
  });
}

export type HiddenCard = {
  vehicle: ModeratedCard;
  /** Motivo do Ocultar em texto (o da nota no "Outro"). */
  reason: string;
  hiddenAt: Date;
};

/**
 * Aba "Ocultados" de [14e] (RPT-FR-008, RPT-SEC-003): só admin e suporte; os anúncios
 * ocultos agora, do mais recente.
 */
export async function hiddenList(
  db: Db,
  session: Session | null,
): Promise<HiddenCard[]> {
  authorizeTo(session, "admin.moderate");
  const rows = await db
    .select({
      id: vehicles.id,
      reason: vehicles.hiddenReason,
      note: vehicles.hiddenNote,
      hiddenAt: vehicles.hiddenAt,
    })
    .from(vehicles)
    // Com a marca de moderação: oculto, ou despublicado/vendido pelo lojista (RPT-FR-009).
    .where(
      and(isNotNull(vehicles.hiddenReason), ne(vehicles.status, "deleted")),
    )
    .orderBy(desc(vehicles.hiddenAt), desc(vehicles.id));
  const cards = await cardsOf(
    db,
    rows.map((r) => r.id),
  );
  return rows.flatMap((r) => {
    const vehicle = cards.get(r.id);
    return vehicle && r.reason && r.hiddenAt
      ? [
          {
            vehicle,
            reason: hiddenReasonText(r.reason, r.note),
            hiddenAt: r.hiddenAt,
          },
        ]
      : [];
  });
}

/**
 * **Mostrar de novo** (RPT-FR-008, RPT-SEC-005): o anúncio volta à vitrine sem a marca, a
 * loja é avisada e a decisão vai para o registro. `false` quando ele já não estava
 * oculto. Quem chama invalida o cache público.
 */
export async function show(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  const actor = authorizeTo(session, "admin.moderate");
  const { vehicleId } = parseDecision(raw);
  return db.transaction(async (tx) => {
    const v = await showVehicle(tx, actor, vehicleId, now);
    if (!v) return false;
    await notifyStore(
      tx,
      v.storeId,
      { kind: "vehicle_shown", vehicle: v.title },
      now,
    );
    await logActivity(tx, {
      userId: actor.userId,
      action: "vehicle.shown",
      entity: "vehicle",
      entityId: vehicleId,
    });
    return true;
  });
}
