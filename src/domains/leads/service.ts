import { sellerForLead } from "@/domains/sellers/service";
import { contactTarget } from "@/domains/showcase/service";
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  isNull,
  lt,
  lte,
  ne,
  sql,
  sum,
} from "drizzle-orm";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { authorizeTo, can, type Permission } from "@/domains/auth/service";
import { brandName } from "@/domains/fipe/service";
import { brDay } from "@/platform/br/date";
import {
  leads,
  profiles,
  vehicleDailyStats,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import {
  consumeRateLimit,
  RATE_LIMITS,
  withinPublicFormLimits,
} from "@/platform/http/rate-limit";
import { isKnownBot } from "@/platform/http/bots";
import { isHoneypotFilledIn } from "@/platform/http/honeypot";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import {
  leadFormSchema,
  moveLeadSchema,
  vehicleIdSchema,
  viewSchema,
  whatsappClickSchema,
} from "./schemas";
import {
  highlighted,
  isOpen,
  type LeadFilter,
  nextStatus,
  type LeadOrigin,
  type LeadStatus,
} from "./status";

export type { LeadFilter } from "./status";

export type ContactResult =
  { ok: true } | { ok: false; message: string; errors: FieldError[] };

const fail = (message: string, errors: FieldError[] = []) =>
  ({ ok: false, message, errors }) as const;

/** Veículo não divulgado só pode ter vindo do catálogo da loja (LED-FR-004). */
const finalOrigin = (origin: LeadOrigin, shared: boolean): LeadOrigin =>
  shared ? origin : "store_catalog";

/**
 * Grava o lead com a chave do envio como id (API.md §2.6): o mesmo envio repetido
 * (duplo toque, nova tentativa da rede) não duplica. Status e canal vêm daqui.
 */
async function insertLead(
  db: Db,
  lead: {
    requestId: string;
    vehicleId: string;
    origin: LeadOrigin;
    target: { storeId: string; shared: boolean };
    channel: "form" | "whatsapp";
    /** Código do link do vendedor guardado no aparelho (`?ref=`, SEL-FR-011). */
    refCode?: string | null;
    contact?: {
      name: string;
      email: string;
      phone: string;
      message: string | null;
    };
  },
  now: Date,
) {
  const seller = await sellerForLead(db, lead.refCode, lead.target.storeId);
  await db
    .insert(leads)
    .values({
      id: lead.requestId,
      storeId: lead.target.storeId,
      vehicleId: lead.vehicleId,
      channel: lead.channel,
      // Vendedor ativo e parceiro da loja: o lead é dele (SEL-FR-011).
      origin: seller ? "seller" : finalOrigin(lead.origin, lead.target.shared),
      sellerId: seller?.sellerId ?? null,
      // O lead pelo WhatsApp já começou a conversa (LED-FR-014).
      status: lead.channel === "whatsapp" ? "contacting" : "new",
      ...lead.contact,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: leads.id });
}

/**
 * "Envie uma mensagem à loja" em [1b] (LED-FR-001, 002, 004, LED-SEC-002, 004): limite
 * por IP, honeypot que finge sucesso, schema estrito; a loja vem do veículo visível.
 */
export async function contactStore(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date; refCode?: string | null },
): Promise<ContactResult> {
  const now = ctx.now ?? new Date();
  if (!(await withinPublicFormLimits(db, "lead", ctx.ipHash, now)))
    return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  if (isHoneypotFilledIn(raw)) return { ok: true };

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Confira os campos destacados.",
      fieldErrorsFromZod(parsed.error),
    );
  const { requestId, vehicleId, origin, name, email, phone, message } =
    parsed.data;
  const target = await contactTarget(db, vehicleId);
  if (!target) return fail("Este veículo não está mais disponível.");
  await insertLead(
    db,
    {
      requestId,
      vehicleId,
      origin,
      target,
      channel: "form",
      refCode: ctx.refCode,
      contact: { name, email, phone, message: message || null },
    },
    now,
  );
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
  ctx: { ipHash: string; now?: Date; refCode?: string | null },
): Promise<void> {
  const now = ctx.now ?? new Date();
  const parsed = whatsappClickSchema.safeParse(raw);
  if (!parsed.success) return;
  if (!(await withinPublicFormLimits(db, "lead-whatsapp", ctx.ipHash, now)))
    return;
  const target = await contactTarget(db, parsed.data.vehicleId);
  if (!target) return;
  await insertLead(
    db,
    { ...parsed.data, target, channel: "whatsapp", refCode: ctx.refCode },
    now,
  );
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

export type LeadCard = {
  id: string;
  status: LeadStatus;
  channel: "form" | "whatsapp";
  origin: LeadOrigin;
  /** "via vendedor {nome}" (SEL-FR-011); só o nome, nunca CPF ou contato. */
  sellerName: string | null;
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

/** `55` + DDD + 9 + 8 dígitos: celular; telefone fixo não abre WhatsApp (LED-FR-007). */
const isMobile = (phone: string) => /^55[1-9]{2}9\d{8}$/.test(phone);

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
      sellerName: profiles.name,
    })
    .from(leads)
    .innerJoin(vehicles, eq(vehicles.id, leads.vehicleId))
    .leftJoin(profiles, eq(profiles.id, leads.sellerId))
    .where(filter === "all" ? own : and(own, eq(leads.status, filter)))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(BOARD_LIMIT);

  const byStatus = await db
    .select({ status: leads.status, n: count() })
    .from(leads)
    .where(own)
    .groupBy(leads.status);
  const countOf = (s: LeadStatus) =>
    byStatus.find((r) => r.status === s)?.n ?? 0;
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
        sellerName: r.sellerName,
        name: r.name,
        initials: initialsOf(r.name),
        message: r.message,
        createdAt: r.createdAt,
        highlight: highlighted(r.status, r.createdAt, now),
        whatsappUrl:
          r.phone && isMobile(r.phone)
            ? whatsappLink(
                r.phone,
                `Olá${r.name ? `, ${r.name.split(/\s+/)[0]}` : ""}! Recebemos seu contato sobre o ${title}.`,
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
      new: countOf("new"),
      contacting: countOf("contacting"),
      negotiating: countOf("negotiating"),
      sold: countOf("sold"),
      lost: countOf("lost"),
    },
    newCount: countOf("new"),
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
  // Sem permissão de leads (ex.: outra área), o menu só não mostra número.
  if (!session?.storeId || !can(session, "leads.view")) return 0;
  const storeId = session.storeId;
  const [row] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(eq(leads.storeId, storeId), eq(leads.status, "new")));
  return row.n;
}

/**
 * "→ próximo status" e "Perdido" no card [3a] (LED-FR-008, LED-SEC-001, 005): só a
 * loja do lead (dono e usuário da loja) e só a partir de um status aberto. A troca
 * confere o status lido (`where status = esperado`): dois toques não pulam dois passos.
 */
export async function moveLead(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<LeadStatus> {
  const storeId = storeOf(session, "leads.manage");
  const parsed = moveLeadSchema.safeParse(raw);
  if (!parsed.success) throw AppError.notFound();
  const { leadId, to } = parsed.data;
  const own = and(eq(leads.id, leadId), eq(leads.storeId, storeId));
  const [lead] = await db
    .select({ status: leads.status })
    .from(leads)
    .where(own);
  if (!lead) throw AppError.notFound();
  const target = to === "lost" ? "lost" : nextStatus(lead.status);
  if (!isOpen(lead.status) || !target)
    throw AppError.conflict("Este lead já foi encerrado.");
  const [moved] = await db
    .update(leads)
    .set({ status: target, updatedAt: now })
    .where(and(own, eq(leads.status, lead.status)))
    .returning({ status: leads.status });
  if (!moved) throw AppError.conflict("O lead mudou. Atualize a página.");
  return moved.status;
}

/**
 * "Desempenho do anúncio" em [6e] (LED-FR-012): visualizações somadas e leads do
 * veículo; os dias no ar vêm do resumo do veículo (VEH-FR-011). Veículo de outra loja,
 * excluído ou id inválido: 404 (LED-SEC-001).
 */
export async function vehiclePerformance(
  db: Db,
  session: Session | null,
  vehicleId: string,
): Promise<{ views: number; leads: number }> {
  const storeId = storeOf(session, "vehicles.manage");
  if (!vehicleIdSchema.safeParse(vehicleId).success) throw AppError.notFound();
  const [v] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(vehicles.storeId, storeId),
        ne(vehicles.status, "deleted"),
      ),
    );
  if (!v) throw AppError.notFound();
  const [views] = await db
    .select({ n: sum(vehicleDailyStats.views).mapWith(Number) })
    .from(vehicleDailyStats)
    .where(eq(vehicleDailyStats.vehicleId, vehicleId));
  const [received] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(eq(leads.vehicleId, vehicleId), eq(leads.storeId, storeId)));
  return { views: views?.n ?? 0, leads: received.n };
}

/**
 * Retenção de 2 anos (LED-SEC-006, `SECURITY.md` §8), no job diário: o lead perde nome,
 * e-mail, telefone e mensagem, e continua nas contagens. Idempotente.
 */
export async function purgeOldLeads(
  db: Db,
  now: Date = new Date(),
): Promise<number> {
  const limit = new Date(now);
  limit.setUTCFullYear(limit.getUTCFullYear() - 2);
  const rows = await db
    .update(leads)
    .set({ name: null, email: null, phone: null, message: null, purgedAt: now })
    .where(and(lte(leads.createdAt, limit), isNull(leads.purgedAt)))
    .returning({ id: leads.id });
  return rows.length;
}

/**
 * "Contatos no mês" do painel [15b] (012): leads da loja do dia 1 até agora e no mesmo
 * período do mês anterior. Só a contagem, sem dado do comprador.
 */
export async function leadsThisMonth(
  db: Db,
  session: Session | null,
  now: Date = new Date(),
): Promise<{ count: number; previous: number }> {
  const storeId = storeOf(session, "leads.view");
  const start = saoPauloMonthStart(now);
  const prevStart = saoPauloMonthStart(new Date(start.getTime() - 86_400_000));
  const prevEnd = new Date(
    prevStart.getTime() + (now.getTime() - start.getTime()),
  );
  const between = (a: Date, b: Date) =>
    and(
      eq(leads.storeId, storeId),
      gte(leads.createdAt, a),
      lt(leads.createdAt, b),
    );
  const [[cur], [prev]] = await Promise.all([
    db.select({ n: count() }).from(leads).where(between(start, now)),
    db.select({ n: count() }).from(leads).where(between(prevStart, prevEnd)),
  ]);
  return { count: cur.n, previous: prev.n };
}

/** Loja arquivada (011b, CAN-FR-007): os leads da loja são apagados. Devolve quantos. */
export async function removeStoreLeads(
  tx: Db,
  storeId: string,
): Promise<number> {
  const gone = await tx
    .delete(leads)
    .where(eq(leads.storeId, storeId))
    .returning({ id: leads.id });
  return gone.length;
}

/** Contagens do painel do admin (012b). */
export { leadsSnapshot, storeLeadsThisMonth } from "./snapshot";
