import { contactTarget } from "@/domains/showcase/service";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { authorizeTo, type Permission } from "@/domains/auth/service";
import { brandName } from "@/domains/fipe/service";
import { brDay } from "@/platform/br/date";
import { leads, vehicleDailyStats, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import { isKnownBot } from "@/platform/http/bots";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import { leadFormSchema, viewSchema, whatsappClickSchema } from "./schemas";
import { highlighted, type LeadOrigin, type LeadStatus } from "./status";

export type ContactResult =
  { ok: true } | { ok: false; message: string; errors: FieldError[] };

const fail = (message: string, errors: FieldError[] = []) =>
  ({ ok: false, message, errors }) as const;

/** Por IP, com uma chave por tipo de registro (LED-SEC-002). */
async function withinLimits(
  db: Db,
  kind: string,
  ipHash: string,
  now: Date,
): Promise<boolean> {
  for (const rule of [RATE_LIMITS.publicForm, RATE_LIMITS.publicFormDaily]) {
    const { ok } = await consumeRateLimit(
      db,
      `${kind}:ip:${ipHash}:${rule.windowSeconds}`,
      rule,
      now,
    );
    if (!ok) return false;
  }
  return true;
}

/** Veículo não divulgado só pode ter vindo do catálogo da loja (LED-FR-004). */
const finalOrigin = (origin: LeadOrigin, shared: boolean): LeadOrigin =>
  shared ? origin : "store_catalog";

/**
 * "Envie uma mensagem à loja" em [1b] (LED-FR-001, 002, 004, LED-SEC-002, 004): limite
 * por IP, honeypot que finge sucesso, schema estrito; a loja vem do veículo visível.
 */
export async function contactStore(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<ContactResult> {
  const now = ctx.now ?? new Date();
  if (!(await withinLimits(db, "lead", ctx.ipHash, now)))
    return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  const honeypot = (raw as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "")
    return { ok: true };

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Confira os campos destacados.",
      fieldErrorsFromZod(parsed.error),
    );
  const { vehicleId, origin, name, email, phone, message } = parsed.data;
  const target = await contactTarget(db, vehicleId);
  if (!target) return fail("Este veículo não está mais disponível.");

  await db.insert(leads).values({
    storeId: target.storeId,
    vehicleId,
    channel: "form",
    origin: finalOrigin(origin, target.shared),
    status: "new",
    name,
    email,
    phone,
    message: message || null,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true };
}

/**
 * Toque em "WhatsApp" em [1b] ou no simulador (LED-FR-003, 014): lead sem nome nem
 * contato, já Em contato (a conversa começou no WhatsApp da loja). Nunca lança: a
 * conversa abre de qualquer jeito; entrada inválida, veículo fora do ar ou limite do IP
 * só não gravam.
 */
export async function recordWhatsappClick(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<void> {
  const now = ctx.now ?? new Date();
  const parsed = whatsappClickSchema.safeParse(raw);
  if (!parsed.success) return;
  if (!(await withinLimits(db, "lead-whatsapp", ctx.ipHash, now))) return;
  const target = await contactTarget(db, parsed.data.vehicleId);
  if (!target) return;
  await db.insert(leads).values({
    storeId: target.storeId,
    vehicleId: parsed.data.vehicleId,
    channel: "whatsapp",
    origin: finalOrigin(parsed.data.origin, target.shared),
    status: "contacting",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Abertura da página do veículo (LED-FR-015): o aparelho só chama uma vez por veículo
 * por dia; aqui, robô, veículo fora do ar e mais de 60 por minuto do IP não contam.
 */
export async function recordView(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; userAgent: string | null; now?: Date },
): Promise<void> {
  const now = ctx.now ?? new Date();
  const parsed = viewSchema.safeParse(raw);
  if (!parsed.success || isKnownBot(ctx.userAgent)) return;
  const { ok } = await consumeRateLimit(
    db,
    `view:ip:${ctx.ipHash}`,
    RATE_LIMITS.liveCheck,
    now,
  );
  if (!ok || !(await contactTarget(db, parsed.data.vehicleId))) return;
  await db
    .insert(vehicleDailyStats)
    .values({ vehicleId: parsed.data.vehicleId, day: brDay(now), views: 1 })
    .onConflictDoUpdate({
      target: [vehicleDailyStats.vehicleId, vehicleDailyStats.day],
      set: { views: sql`${vehicleDailyStats.views} + 1` },
    });
}

/** Loja da sessão com a permissão pedida; posse fica no `where` (SECURITY.md §4). */
function storeOf(session: Session | null, permission: Permission): string {
  const s = authorizeTo(session, permission);
  if (!s.storeId) throw AppError.forbidden();
  return s.storeId;
}

export type LeadFilter = "all" | "new" | "contacting" | "negotiating";

export type LeadCard = {
  id: string;
  status: LeadStatus;
  channel: "form" | "whatsapp";
  origin: LeadOrigin;
  /** Nulos no lead pelo WhatsApp e depois de 2 anos. */
  name: string | null;
  initials: string | null;
  message: string | null;
  createdAt: Date;
  /** Novo há mais de 24 h (LED-FR-009). */
  highlight: boolean;
  whatsappUrl: string | null;
  telUrl: string | null;
  vehicle: {
    id: string;
    title: string;
    priceCents: number | null;
    /** Excluído: o card mostra o nome sem link (LED-FR-010). */
    deleted: boolean;
  };
};

export type LeadsBoard = {
  cards: LeadCard[];
  counts: Record<LeadFilter, number>;
  /** "Novos, sem resposta": leads Novo agora. */
  newCount: number;
  /** "% vieram da vitrine CajuGo" nos últimos 30 dias; `null` sem leads. */
  cajugoShare: number | null;
};

/** Até onde [3a] mostra de uma vez; paginação quando uma loja passar disso. */
const BOARD_LIMIT = 200;
const SHARE_WINDOW_MS = 30 * 86_400_000;

const initialsOf = (name: string | null) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : null;

/**
 * Tela Leads [3a] (LED-FR-005 a 010, 014): leads da loja da sessão, do mais novo,
 * com contagens por status (sem data), Novos agora e o % da vitrine em 30 dias. Os
 * dados pessoais do lead só saem daqui (LED-SEC-003).
 */
export async function leadsBoard(
  db: Db,
  session: Session | null,
  filter: LeadFilter,
  now: Date = new Date(),
): Promise<LeadsBoard> {
  const storeId = storeOf(session, "leads.view");
  const own = eq(leads.storeId, storeId);
  const rows = await db
    .select({
      id: leads.id,
      status: leads.status,
      channel: leads.channel,
      origin: leads.origin,
      name: leads.name,
      phone: leads.phone,
      message: leads.message,
      createdAt: leads.createdAt,
      vehicleId: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      priceCents: vehicles.priceCents,
      vehicleStatus: vehicles.status,
    })
    .from(leads)
    .innerJoin(vehicles, eq(vehicles.id, leads.vehicleId))
    .where(filter === "all" ? own : and(own, eq(leads.status, filter)))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(BOARD_LIMIT);

  const byStatus = await db
    .select({ status: leads.status, n: count() })
    .from(leads)
    .where(own)
    .groupBy(leads.status);
  const n = (s: LeadStatus) => byStatus.find((r) => r.status === s)?.n ?? 0;
  const [recent] = await db
    .select({
      all: count(),
      cajugo:
        sql<number>`count(*) filter (where ${leads.origin} = 'cajugo')`.mapWith(
          Number,
        ),
    })
    .from(leads)
    .where(
      and(own, gt(leads.createdAt, new Date(now.getTime() - SHARE_WINDOW_MS))),
    );

  return {
    cards: rows.map((r) => {
      const title =
        [r.make && brandName(r.make), r.model].filter(Boolean).join(" ") ||
        "Veículo";
      return {
        id: r.id,
        status: r.status,
        channel: r.channel,
        origin: r.origin,
        name: r.name,
        initials: initialsOf(r.name),
        message: r.message,
        createdAt: r.createdAt,
        highlight: highlighted(r.status, r.createdAt, now),
        whatsappUrl: r.phone
          ? whatsappLink(
              r.phone,
              `Olá${r.name ? `, ${r.name.split(/\s+/)[0]}` : ""}! Recebemos seu contato sobre o ${title} pela CajuGo.`,
            )
          : null,
        telUrl: r.phone ? `tel:+${r.phone}` : null,
        vehicle: {
          id: r.vehicleId,
          title,
          priceCents: r.priceCents,
          deleted: r.vehicleStatus === "deleted",
        },
      };
    }),
    counts: {
      all: byStatus.reduce((sum, r) => sum + r.n, 0),
      new: n("new"),
      contacting: n("contacting"),
      negotiating: n("negotiating"),
    },
    newCount: n("new"),
    cajugoShare: recent.all
      ? Math.round((recent.cajugo / recent.all) * 100)
      : null,
  };
}

/** Contador do item "Leads" do menu (LED-FR-011): leads Novo da loja. */
export async function newLeadsCount(
  db: Db,
  session: Session | null,
): Promise<number> {
  const storeId = storeOf(session, "leads.view");
  const [row] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(eq(leads.storeId, storeId), eq(leads.status, "new")));
  return row.n;
}
