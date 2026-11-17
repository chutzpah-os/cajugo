import type { z } from "zod";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
  sum,
} from "drizzle-orm";
import {
  authorizeTo,
  can,
  grantRole,
  type AuthDeps,
} from "@/domains/auth/service";
import type {
  Cloudinary,
  SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import {
  checkPrivateUpload,
  PRIVATE_FORMATS,
  privateExtension,
} from "@/platform/cloudinary/private-files";
import {
  contactTarget,
  parseRefCode,
  searchShowcase,
  type PublicCard,
} from "@/domains/showcase/service";
import { getSettings } from "@/domains/settings/service";
import { LIVE_STATUSES } from "@/domains/stores/service";
import {
  reopenInTx,
  sellInTx,
  shortTitle,
  writeCommissionOverride,
} from "@/domains/vehicles/service";
import { brDay } from "@/platform/br/date";
import { formatTaxId, maskTaxId } from "@/platform/br/tax-id";
import { appUrl } from "@/platform/http/urls";
import {
  leads,
  partnerships,
  profiles,
  sales,
  sellers,
  sellerVehicleClicks,
  stores,
  userRole,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { isKnownBot } from "@/platform/http/bots";
import {
  consumeRateLimit,
  RATE_LIMITS,
  withinPublicFormLimits,
} from "@/platform/http/rate-limit";
import type { PrivateFile } from "@/platform/http/private-file";
import { authorize, type Session } from "@/platform/http/session";
import {
  addSellerSchema,
  confirmSaleSchema,
  commissionOverrideSchema,
  attachDocumentSchema,
  documentSideSchema,
  blockSellerSchema,
  networkRulesSchema,
  saleTermsSchema,
  partnershipDecisionSchema,
  partnershipRequestSchema,
  saleUndoSchema,
  pixUpdateSchema,
  sellerClickSchema,
  sellerDecisionSchema,
  sellerSignupSchema,
} from "./schemas";
import { commissionFor, feeFor } from "./commission";
import { codeCandidates, type PartnerState, type SellerStatus } from "./status";

/**
 * Rede Caju, lado do vendedor (spec 008). O vendedor age sempre como ele mesmo
 * (`session.userId`); as decisões são da equipe da CajuGo.
 */

export type SignupContext = {
  /** IP com hash, para o limite por rede (SEL-SEC-003). */
  ipHash: string;
  /** Campo isca preenchido: robô recebe sucesso falso (SEL-SEC-003). */
  honeypotFilled?: boolean;
};

const fieldError = (field: string, code: string, message: string) =>
  AppError.validation([{ field, code, message }]);

const CPF_TAKEN = () => fieldError("cpf", "cpf_taken", "CPF já cadastrado.");

/** CPF livre, ou já da própria conta (indicador que já resgatou, 010). */
async function assertCpfFree(db: Db, cpf: string, ownerId?: string) {
  const [taken] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.cpf, cpf),
        ownerId ? ne(profiles.id, ownerId) : undefined,
      ),
    );
  if (taken) throw CPF_TAKEN();
}

/** Vendedor `in_review` + papel + auditoria, dentro da transação do chamador. */
async function createSeller(
  tx: Db,
  userId: string,
  data: { cpf: string; city: string; pix: { type: string; key: string } },
) {
  await grantRole(tx, userId, "seller", "public-signup");
  await tx
    .update(profiles)
    .set({ cpf: data.cpf, pixKey: data.pix.key, pixKeyType: data.pix.type })
    .where(eq(profiles.id, userId));
  await tx.insert(sellers).values({ profileId: userId, city: data.city });
  await logActivity(tx, {
    userId,
    action: "seller.registered",
    entity: "seller",
    entityId: userId,
  });
}

/**
 * Cadastro do vendedor [7a] (SEL-FR-001, 016, SEL-SEC-003). Visitante: conta no
 * provedor de login e, numa transação, perfil + papel + vendedor Em análise; se a
 * transação falhar, a conta é apagada. Campo isca: sucesso falso, nada é criado.
 */
export async function registerSeller(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx: SignupContext,
): Promise<{ userId: string | null }> {
  const now = deps.now?.() ?? new Date();
  if (
    !(await withinPublicFormLimits(deps.db, "seller-signup", ctx.ipHash, now))
  )
    throw AppError.tooManyRequests(60);
  if (ctx.honeypotFilled) return { userId: null };
  if (session) return addSellerToAccount(deps.db, session, input);

  const data = parseOrThrow(sellerSignupSchema, input);

  const [existing] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, data.email));
  if (existing)
    throw fieldError(
      "email",
      "account_exists",
      "Se você já tem conta, entre para continuar.",
    );
  await assertCpfFree(deps.db, data.cpf);

  const user = await deps.auth.adminCreateUser(data.email, data.password);
  try {
    await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      await createSeller(tx, user.id, data);
    });
    return { userId: user.id };
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    // Corrida com outro cadastro do mesmo CPF: o índice único decide.
    if (
      /profiles_cpf/.test(String((error as { cause?: unknown }).cause ?? error))
    )
      throw CPF_TAKEN();
    throw error;
  }
}

/**
 * Quem já tem conta (lojista, usuário da loja, indicador) vira vendedor na mesma conta
 * (SEL-FR-016, conta única do PRD §2): sem nova senha; nome, e-mail e celular vêm da
 * conta. Equipe da CajuGo não acumula papéis (AUT-SEC-009).
 */
async function addSellerToAccount(
  db: Db,
  session: Session,
  input: unknown,
): Promise<{ userId: string }> {
  if (session.roles.some((r) => r === "admin" || r === "support"))
    throw AppError.forbidden();
  if (session.roles.includes("seller"))
    throw AppError.conflict("Sua conta já é de vendedor.");
  const data = parseOrThrow(addSellerSchema, input);
  // CPF já da conta (indicador que resgatou, 010) não é trocado por outro.
  const [own] = await db
    .select({ cpf: profiles.cpf })
    .from(profiles)
    .where(eq(profiles.id, session.userId));
  if (own?.cpf && own.cpf !== data.cpf)
    throw fieldError(
      "cpf",
      "cpf_mismatch",
      "Use o CPF já cadastrado na sua conta.",
    );
  await assertCpfFree(db, data.cpf, session.userId);
  await db.transaction((tx) => createSeller(tx, session.userId, data));
  return { userId: session.userId };
}

export type FileDeps = { db: Db; cloudinary: Cloudinary };
export type DocumentSide = "front" | "back";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SIDES: readonly DocumentSide[] = ["front", "back"];
const documentFolder = (sellerId: string) => `sellers/${sellerId}`;
const documentName = (side: DocumentSide) => `document-${side}-`;

/** O vendedor da sessão, com o status; quem não é vendedor → 403. */
async function ownSeller(db: Db, session: Session | null) {
  const s = authorize(session, ["seller"]);
  const [row] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.profileId, s.userId));
  if (!row) throw AppError.forbidden();
  return row;
}

const sideOf = (raw: unknown): DocumentSide => {
  if (!SIDES.includes(raw as DocumentSide)) throw AppError.notFound();
  return raw as DocumentSide;
};

/** Colunas da foto de cada lado (frente e verso andam juntas). */
const DOCUMENT_COLUMNS = {
  front: { publicId: "documentFrontPublicId", format: "documentFrontFormat" },
  back: { publicId: "documentBackPublicId", format: "documentBackFormat" },
} as const;

type SellerRow = typeof sellers.$inferSelect;
const documentOf = (row: SellerRow, side: DocumentSide) => ({
  publicId: row[DOCUMENT_COLUMNS[side].publicId],
  format: row[DOCUMENT_COLUMNS[side].format],
});

/**
 * Assinatura para o navegador enviar a foto do documento direto ao Cloudinary,
 * privada (`authenticated`), na pasta do vendedor da sessão e com nome gerado aqui
 * (SEL-FR-001, SEL-SEC-009). Só enquanto o cadastro está Em análise.
 */
export async function documentUpload(
  deps: FileDeps,
  session: Session | null,
  raw: unknown,
): Promise<SignedUpload> {
  const me = await ownSeller(deps.db, session);
  const { side } = parseOrThrow(documentSideSchema, raw);
  if (me.status !== "in_review")
    throw AppError.conflict("O cadastro já foi analisado.");
  return deps.cloudinary.signUpload({
    folder: documentFolder(me.profileId),
    publicId: `${documentName(side)}${crypto.randomUUID()}`,
    allowedFormats: PRIVATE_FORMATS,
    type: "authenticated",
  });
}

/**
 * Guarda a foto enviada (SEL-FR-001, SEL-SEC-009): tem que ser exatamente o nome
 * assinado para o vendedor e o lado (senão 404), foto ou PDF de até 10 MB (recusada é
 * apagada). A foto anterior do mesmo lado é apagada.
 */
export async function attachDocument(
  deps: FileDeps,
  session: Session | null,
  raw: unknown,
): Promise<void> {
  const me = await ownSeller(deps.db, session);
  if (me.status !== "in_review")
    throw AppError.conflict("O cadastro já foi analisado.");
  const parsed = attachDocumentSchema.safeParse(raw);
  // Lado ou nome fora do formato: o arquivo não é deste vendedor (SEL-SEC-009).
  if (!parsed.success) throw AppError.notFound();
  const { side, publicId } = parsed.data;
  const prefix = deps.cloudinary.fullPublicId(
    documentFolder(me.profileId),
    documentName(side),
  );
  if (!publicId.startsWith(prefix) || !UUID.test(publicId.slice(prefix.length)))
    throw AppError.notFound();
  const { format } = await checkPrivateUpload(
    deps.cloudinary,
    publicId,
    side,
    "Não encontramos a foto enviada. Tente de novo.",
  );
  const previous = documentOf(me, side).publicId;
  const cols = DOCUMENT_COLUMNS[side];
  await deps.db
    .update(sellers)
    .set({ [cols.publicId]: publicId, [cols.format]: format })
    .where(eq(sellers.profileId, me.profileId));
  if (previous && previous !== publicId)
    await deps.cloudinary.destroy(previous, "authenticated");
}

/**
 * Foto do documento (ADR 0011, `contract.md`): admin e suporte veem qualquer uma; o
 * vendedor só a própria. Outro papel, outro vendedor, id ou lado inválido ou sem a
 * foto → 404 (SEL-SEC-009).
 */
export async function documentFile(
  deps: FileDeps,
  session: Session | null,
  sellerId: string,
  side: unknown,
): Promise<PrivateFile> {
  const s = authorize(session, userRole.enumValues);
  const which = sideOf(side);
  if (!UUID.test(sellerId)) throw AppError.notFound();
  if (!can(s, "sellers.view") && s.userId !== sellerId)
    throw AppError.notFound();
  const [row] = await deps.db
    .select()
    .from(sellers)
    .where(eq(sellers.profileId, sellerId));
  const { publicId, format } = row
    ? documentOf(row, which)
    : { publicId: null, format: null };
  if (!publicId || !format) throw AppError.notFound();
  const file = await deps.cloudinary.fetchPrivate(publicId, format);
  if (!file) throw AppError.notFound();
  return {
    ...file,
    filename: `documento-${which}.${privateExtension(format)}`,
  };
}

/** Parceria aberta como o vendedor vê: ativa é "Parceiro"; pendente, "Pendente". */
const partnerState = (status: "pending" | "active" | "declined" | "ended") =>
  status === "active" ? ("partner" as const) : ("pending" as const);

export type SellerHome =
  | {
      kind: "status";
      status: Exclude<SellerStatus, "active">;
      /** Motivo do bloqueio (SEL-FR-002). */
      reason: string | null;
      documentsMissing: boolean;
    }
  | {
      kind: "panel";
      code: string;
      clicksThisMonth: number;
      stores: { storeId: string; name: string; status: PartnerState }[];
    };

/**
 * Início do vendedor [7b] (SEL-FR-002, 006, SEL-SEC-004): em análise ou bloqueado, só o
 * status; ativo, o painel com os cliques do mês (São Paulo) e as lojas com parceria
 * ativa ou pendente. Sempre só os dados do vendedor da sessão.
 */
export async function sellerHome(
  db: Db,
  session: Session | null,
  now: Date = new Date(),
): Promise<SellerHome> {
  const me = await ownSeller(db, session);
  if (me.status !== "active" || !me.code)
    return {
      kind: "status",
      status: me.status === "blocked" ? "blocked" : "in_review",
      reason: me.status === "blocked" ? me.blockedReason : null,
      documentsMissing: !me.documentFrontPublicId || !me.documentBackPublicId,
    };
  const [clicks] = await db
    .select({ n: sum(sellerVehicleClicks.clicks).mapWith(Number) })
    .from(sellerVehicleClicks)
    .where(
      and(
        eq(sellerVehicleClicks.sellerId, me.profileId),
        gte(sellerVehicleClicks.day, `${brDay(now).slice(0, 8)}01`),
      ),
    );
  const rows = await db
    .select({
      storeId: stores.id,
      name: stores.name,
      status: partnerships.status,
    })
    .from(partnerships)
    .innerJoin(stores, eq(stores.id, partnerships.storeId))
    .where(
      and(
        eq(partnerships.sellerId, me.profileId),
        inArray(partnerships.status, ["active", "pending"]),
      ),
    )
    .orderBy(asc(stores.name));
  return {
    kind: "panel",
    code: me.code,
    clicksThisMonth: clicks?.n ?? 0,
    stores: rows.map((r) => ({
      storeId: r.storeId,
      name: r.name,
      status: partnerState(r.status),
    })),
  };
}

export type AdminSeller = {
  sellerId: string;
  name: string;
  city: string;
  phone: string | null;
  /** Completo só para a equipe (SEL-SEC-001). */
  cpf: string | null;
  code: string | null;
  hasDocuments: boolean;
  blockedReason: string | null;
  createdAt: Date;
};

export type SellersAdmin = {
  counts: Record<SellerStatus, number>;
  inReview: AdminSeller[];
  active: AdminSeller[];
  blocked: AdminSeller[];
};

/**
 * Vendedores do admin [7h] (SEL-FR-003, SEL-SEC-005): admin e suporte veem. Em análise
 * do mais antigo; ativos e bloqueados por nome.
 */
export async function sellersAdmin(
  db: Db,
  session: Session | null,
): Promise<SellersAdmin> {
  const viewer = authorizeTo(session, "sellers.view");
  // CPF completo só para o admin; o suporte vê mascarado (SECURITY §8, SEL-SEC-001).
  const cpfFor = (cpf: string | null) =>
    !cpf
      ? null
      : can(viewer, "sellers.review")
        ? formatTaxId("cpf", cpf)
        : maskTaxId("cpf", cpf);
  const rows = await db
    .select({
      sellerId: sellers.profileId,
      status: sellers.status,
      name: profiles.name,
      city: sellers.city,
      phone: profiles.phone,
      cpf: profiles.cpf,
      code: sellers.code,
      front: sellers.documentFrontPublicId,
      back: sellers.documentBackPublicId,
      blockedReason: sellers.blockedReason,
      createdAt: sellers.createdAt,
    })
    .from(sellers)
    .innerJoin(profiles, eq(profiles.id, sellers.profileId))
    .orderBy(asc(sellers.createdAt), asc(sellers.profileId));
  const view = (status: SellerStatus) =>
    rows
      .filter((r) => r.status === status)
      .map((r): AdminSeller => ({
        sellerId: r.sellerId,
        name: r.name,
        city: r.city,
        phone: r.phone,
        cpf: cpfFor(r.cpf),
        code: r.code,
        blockedReason: r.blockedReason,
        createdAt: r.createdAt,
        hasDocuments: !!r.front && !!r.back,
      }));
  const byName = (a: AdminSeller, b: AdminSeller) =>
    a.name.localeCompare(b.name, "pt-BR");
  const inReview = view("in_review");
  const active = view("active").sort(byName);
  const blocked = view("blocked").sort(byName);
  return {
    counts: {
      in_review: inReview.length,
      active: active.length,
      blocked: blocked.length,
    },
    inReview,
    active,
    blocked,
  };
}

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  return parsed.data;
}

/** Primeiro código livre entre os candidatos do nome (SEL-FR-004). */
async function freeCode(tx: Db, name: string): Promise<string> {
  const candidates = codeCandidates(name, 90);
  const taken = new Set(
    (
      await tx
        .select({ code: sellers.code })
        .from(sellers)
        .where(inArray(sellers.code, candidates))
    ).map((r) => r.code),
  );
  const code = candidates.find((c) => !taken.has(c));
  if (!code) throw AppError.conflict("Não foi possível gerar o código.");
  return code;
}

/**
 * **Aprovar** (SEL-FR-004, SEL-SEC-005, 007): só o admin; Em análise → Ativo, com o
 * código do vendedor. Sem as duas fotos do documento → 409. `false` quando o cadastro
 * já não estava em análise.
 */
export async function approve(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  const actor = authorizeTo(session, "sellers.review");
  const { sellerId } = parseOrThrow(sellerDecisionSchema, raw);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        status: sellers.status,
        front: sellers.documentFrontPublicId,
        back: sellers.documentBackPublicId,
        name: profiles.name,
      })
      .from(sellers)
      .innerJoin(profiles, eq(profiles.id, sellers.profileId))
      .where(eq(sellers.profileId, sellerId))
      .for("update");
    if (!row) throw AppError.notFound();
    if (row.status !== "in_review") return false;
    if (!row.front || !row.back)
      throw AppError.conflict("Falta a foto do documento.");
    await tx
      .update(sellers)
      .set({
        status: "active",
        code: await freeCode(tx, row.name),
        decidedBy: actor.userId,
        approvedAt: now,
      })
      .where(eq(sellers.profileId, sellerId));
    await logActivity(tx, {
      userId: actor.userId,
      action: "seller.approved",
      entity: "seller",
      entityId: sellerId,
    });
    return true;
  });
}

/** Muda o status só a partir do esperado e registra a decisão. */
async function decide(
  db: Db,
  actorId: string,
  sellerId: string,
  from: SellerStatus,
  set: Partial<typeof sellers.$inferInsert>,
  action: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const done = await tx
      .update(sellers)
      .set({ ...set, decidedBy: actorId })
      .where(and(eq(sellers.profileId, sellerId), eq(sellers.status, from)))
      .returning({ id: sellers.profileId });
    if (!done.length) return false;
    await logActivity(tx, {
      userId: actorId,
      action,
      entity: "seller",
      entityId: sellerId,
      data,
    });
    return true;
  });
}

/**
 * **Bloquear** (SEL-FR-005, SEL-SEC-005, 007): só o admin, com motivo; Ativo →
 * Bloqueado. As parcerias ficam como estão e deixam de valer enquanto ele estiver
 * bloqueado.
 */
export async function block(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<boolean> {
  const actor = authorizeTo(session, "sellers.review");
  const { sellerId, reason } = parseOrThrow(blockSellerSchema, raw);
  return decide(
    db,
    actor.userId,
    sellerId,
    "active",
    { status: "blocked", blockedReason: reason },
    "seller.blocked",
    { reason },
  );
}

/** **Desbloquear** (SEL-FR-005): só o admin; Bloqueado → Ativo, sem o motivo. */
export async function unblock(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<boolean> {
  const actor = authorizeTo(session, "sellers.review");
  const { sellerId } = parseOrThrow(sellerDecisionSchema, raw);
  return decide(
    db,
    actor.userId,
    sellerId,
    "blocked",
    { status: "active", blockedReason: null },
    "seller.unblocked",
  );
}

/** O vendedor da sessão, ativo e com código; senão 403 (SEL-FR-002). */
async function activeSellerOf(db: Db, session: Session | null) {
  const me = await ownSeller(db, session);
  if (me.status !== "active" || !me.code) throw AppError.forbidden();
  return { sellerId: me.profileId, code: me.code };
}

export type SellerCard = {
  card: PublicCard;
  storeId: string;
  /**
   * Parceria com a loja do veículo: só "partner" ganha comissão (PRD §5.7); "closed"
   * quando a loja não aceita vendedores (RCL-FR-001).
   */
  partner: PartnerState | "none" | "closed";
  /** "Você ganha R$ X": só em loja parceira com comissão definida (SEL-FR-008). */
  earnCents: number | null;
  /** Link do veículo com o código do vendedor (SEL-FR-008). */
  shareUrl: string;
};

export type SellerShowcase = {
  items: SellerCard[];
  total: number;
  nextCursor: string | null;
};

/**
 * Vitrine do vendedor [7c] (SEL-FR-007, 008, 009, SEL-SEC-004, 008): a mesma busca da
 * vitrine CajuGo, com a parceria do vendedor da sessão com cada loja, a comissão
 * calculada aqui e o link de compartilhar em todo veículo.
 */
export async function sellerShowcase(
  db: Db,
  session: Session | null,
  input: {
    filters: Parameters<typeof searchShowcase>[1]["filters"];
    cursor?: string | null;
  },
): Promise<SellerShowcase> {
  const me = await activeSellerOf(db, session);
  const page = await searchShowcase(db, {
    scope: "showcase",
    filters: input.filters,
    cursor: input.cursor,
  });
  const ids = page.items.map((c) => c.vehicleId);
  const owners = ids.length
    ? await db
        .select({
          vehicleId: vehicles.id,
          storeId: vehicles.storeId,
          commissionType: stores.commissionType,
          commissionValue: stores.commissionValue,
          overrideType: vehicles.commissionOverrideType,
          overrideValue: vehicles.commissionOverrideValue,
          acceptsSellers: stores.acceptsSellers,
        })
        .from(vehicles)
        .innerJoin(stores, eq(stores.id, vehicles.storeId))
        .where(inArray(vehicles.id, ids))
    : [];
  const ownerOf = new Map(owners.map((o) => [o.vehicleId, o]));
  const storeIds = [...new Set(owners.map((o) => o.storeId))];
  const mine = storeIds.length
    ? await db
        .select({ storeId: partnerships.storeId, status: partnerships.status })
        .from(partnerships)
        .where(
          and(
            eq(partnerships.sellerId, me.sellerId),
            inArray(partnerships.storeId, storeIds),
            inArray(partnerships.status, ["active", "pending"]),
          ),
        )
    : [];
  const partnerOf = new Map(
    mine.map((p) => [p.storeId, partnerState(p.status)]),
  );
  return {
    total: page.total,
    nextCursor: page.nextCursor,
    items: page.items.flatMap((card) => {
      const owner = ownerOf.get(card.vehicleId);
      if (!owner) return [];
      // Loja que não aceita vendedores suspende a parceria (RCL-FR-001).
      const partner = !owner.acceptsSellers
        ? ("closed" as const)
        : (partnerOf.get(owner.storeId) ?? "none");
      return [
        {
          card,
          storeId: owner.storeId,
          partner,
          earnCents:
            partner === "partner"
              ? commissionFor(ruleOf(owner), card.priceCents)
              : null,
          shareUrl: `${appUrl()}${card.path}?ref=${me.code}`,
        },
      ];
    }),
  };
}

/**
 * **Pedir parceria** (SEL-FR-009, SEL-SEC-004): só o vendedor ativo, para uma loja no
 * ar. Fica Pendente; pedir de novo não duplica (índice único das abertas). Já
 * parceiro: devolve "partner".
 */
export async function requestPartnership(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<PartnerState> {
  const me = await activeSellerOf(db, session);
  const { storeId } = parseOrThrow(partnershipRequestSchema, raw);
  const [store] = await db
    .select({ id: stores.id, acceptsSellers: stores.acceptsSellers })
    .from(stores)
    .where(
      and(eq(stores.id, storeId), inArray(stores.status, [...LIVE_STATUSES])),
    );
  if (!store) throw AppError.notFound();
  if (!store.acceptsSellers)
    throw AppError.conflict("Esta loja não aceita vendedores.");
  await db
    .insert(partnerships)
    .values({ sellerId: me.sellerId, storeId, origin: "request" })
    .onConflictDoNothing();
  const [open] = await db
    .select({ status: partnerships.status })
    .from(partnerships)
    .where(
      and(
        eq(partnerships.sellerId, me.sellerId),
        eq(partnerships.storeId, storeId),
        inArray(partnerships.status, ["active", "pending"]),
      ),
    );
  return open ? partnerState(open.status) : "pending";
}

/** Vendedor ativo dono do código; `null` para código fora do formato ou não ativo. */
async function activeSellerByCode(
  db: Db,
  raw: string | null | undefined,
): Promise<{ sellerId: string; name: string } | null> {
  const code = parseRefCode(raw);
  if (!code) return null;
  const [row] = await db
    .select({ sellerId: sellers.profileId, name: profiles.name })
    .from(sellers)
    .innerJoin(profiles, eq(profiles.id, sellers.profileId))
    .where(and(eq(sellers.code, code), eq(sellers.status, "active")));
  return row ?? null;
}

/**
 * Abertura do link do vendedor (SEL-FR-010): o aparelho chama uma vez por vendedor e
 * veículo por dia; aqui, robô, código de vendedor não ativo, veículo fora do ar e mais
 * de 60 por minuto da rede não contam. Vale com ou sem parceria.
 */
export async function recordSellerClick(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; userAgent: string | null; now?: Date },
): Promise<void> {
  const now = ctx.now ?? new Date();
  const parsed = sellerClickSchema.safeParse(raw);
  if (!parsed.success || isKnownBot(ctx.userAgent)) return;
  const { ok } = await consumeRateLimit(
    db,
    `seller-click:ip:${ctx.ipHash}`,
    RATE_LIMITS.liveCheck,
    now,
  );
  if (!ok) return;
  const seller = await activeSellerByCode(db, parsed.data.code);
  if (!seller || !(await contactTarget(db, parsed.data.vehicleId))) return;
  await db
    .insert(sellerVehicleClicks)
    .values({
      sellerId: seller.sellerId,
      vehicleId: parsed.data.vehicleId,
      day: brDay(now),
      clicks: 1,
    })
    .onConflictDoUpdate({
      target: [
        sellerVehicleClicks.sellerId,
        sellerVehicleClicks.vehicleId,
        sellerVehicleClicks.day,
      ],
      set: { clicks: sql`${sellerVehicleClicks.clicks} + 1` },
    });
}

/**
 * Vendedor do lead (SEL-FR-011, SEL-SEC-006): só quando o código é de um vendedor
 * ativo e parceiro ativo da loja do veículo. Sem parceria, bloqueado ou código falso:
 * `null` e o lead fica sem vendedor.
 */
export async function sellerForLead(
  db: Db,
  code: string | null | undefined,
  storeId: string,
): Promise<{ sellerId: string; name: string } | null> {
  const seller = await activeSellerByCode(db, code);
  if (!seller) return null;
  return (await effectivePartner(db, seller.sellerId, storeId)) ? seller : null;
}

/**
 * **Parceria que vale** (GLOSSARY, RCL-FR-001, 005): vendedor ativo, parceria ativa e a
 * loja aceitando vendedores. Bloquear o vendedor ou desligar "Aceitar vendedores"
 * suspende sem mudar a parceria.
 */
async function effectivePartner(
  db: Db,
  sellerId: string,
  storeId: string,
): Promise<boolean> {
  return (await effectivePartners(db, storeId)).some(
    (p) => p.sellerId === sellerId,
  );
}

export type SellerAccount = {
  name: string;
  email: string;
  phone: string | null;
  city: string;
  code: string;
  /** Mascarado: o completo só a equipe vê (SEL-SEC-001). */
  cpf: string | null;
  pix: { type: string; key: string } | null;
};

/** Conta do vendedor [13c] (SEL-FR-014, SEL-SEC-001, 002): só a do vendedor ativo da sessão. */
export async function sellerAccount(
  db: Db,
  session: Session | null,
): Promise<SellerAccount> {
  const me = await activeSellerOf(db, session);
  const [row] = await db
    .select({
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
      cpf: profiles.cpf,
      pixKey: profiles.pixKey,
      pixKeyType: profiles.pixKeyType,
      city: sellers.city,
    })
    .from(profiles)
    .innerJoin(sellers, eq(sellers.profileId, profiles.id))
    .where(eq(profiles.id, me.sellerId));
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    code: me.code,
    cpf: row.cpf ? maskTaxId("cpf", row.cpf) : null,
    pix:
      row.pixKey && row.pixKeyType
        ? { type: row.pixKeyType, key: row.pixKey }
        : null,
  };
}

/**
 * Trocar a chave Pix [13c] (SEL-FR-014): conferida pelo tipo; o registro de atividade
 * não leva a chave (SEL-SEC-002).
 */
export async function updatePixKey(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<void> {
  const me = await activeSellerOf(db, session);
  const { pix } = parseOrThrow(pixUpdateSchema, raw);
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ pixKey: pix.key, pixKeyType: pix.type })
      .where(eq(profiles.id, me.sellerId));
    await logActivity(tx, {
      userId: me.sellerId,
      action: "seller.pix_changed",
      entity: "seller",
      entityId: me.sellerId,
      data: { type: pix.type },
    });
  });
}

/** O que já foi enviado no passo das fotos [7a]; `null` fora de "em análise". */
export async function sellerDocuments(
  db: Db,
  session: Session | null,
): Promise<{ front: boolean; back: boolean } | null> {
  const me = await ownSeller(db, session);
  if (me.status !== "in_review") return null;
  return {
    front: !!me.documentFrontPublicId,
    back: !!me.documentBackPublicId,
  };
}

/** Loja da sessão de quem cuida da Rede Caju (só o lojista, RCL-SEC-002). */
function networkStoreOf(session: Session | null) {
  const s = authorizeTo(session, "sellers.manage");
  if (!s.storeId) throw AppError.forbidden();
  return { userId: s.userId, storeId: s.storeId };
}

export type StoreNetwork = {
  acceptsSellers: boolean;
  /** Taxa CajuGo das regras, para a prévia de [7e] (RCL-FR-002). */
  feeBps: number;
  /** Veículos no ar da loja, para o ajuste por veículo (RCL-FR-003). */
  vehicleOptions: { vehicleId: string; title: string }[];
  commission: { type: "pct" | "fixed"; value: number } | null;
  overrides: {
    vehicleId: string;
    title: string;
    type: "pct" | "fixed";
    value: number;
  }[];
  pending: {
    partnershipId: string;
    sellerName: string;
    city: string;
    requestedAt: Date;
  }[];
  /** Celular e chave Pix para pagar a comissão; nunca o CPF (RCL-SEC-004). */
  partners: {
    partnershipId: string;
    sellerName: string;
    city: string;
    phone: string | null;
    pixKey: string | null;
    sales: number;
    blocked: boolean;
  }[];
};

/**
 * Rede Caju da loja [7e] [7f] (RCL-FR-001..007, RCL-SEC-001, 002, 004): regras,
 * ajustes por veículo, pedidos pendentes (só de vendedor ativo, do mais antigo) e
 * parceiros ativos, sempre da loja da sessão.
 */
export async function storeNetwork(
  db: Db,
  session: Session | null,
): Promise<StoreNetwork> {
  const { storeId } = networkStoreOf(session);
  const [store] = await db
    .select({
      acceptsSellers: stores.acceptsSellers,
      type: stores.commissionType,
      value: stores.commissionValue,
    })
    .from(stores)
    .where(eq(stores.id, storeId));
  const overrides = await db
    .select({
      vehicleId: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      type: vehicles.commissionOverrideType,
      value: vehicles.commissionOverrideValue,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.storeId, storeId),
        ne(vehicles.status, "deleted"),
        isNotNull(vehicles.commissionOverrideType),
      ),
    )
    .orderBy(asc(vehicles.make), asc(vehicles.model));
  const options = await db
    .select({
      vehicleId: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      version: vehicles.version,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.storeId, storeId),
        inArray(vehicles.status, ["published", "hidden"]),
      ),
    )
    .orderBy(asc(vehicles.make), asc(vehicles.model), asc(vehicles.version));
  const { cajugo_fee_bps: feeBps } = await getSettings(db);
  const pending = await db
    .select({
      partnershipId: partnerships.id,
      sellerName: profiles.name,
      city: sellers.city,
      requestedAt: partnerships.createdAt,
    })
    .from(partnerships)
    .innerJoin(sellers, eq(sellers.profileId, partnerships.sellerId))
    .innerJoin(profiles, eq(profiles.id, sellers.profileId))
    .where(
      and(
        eq(partnerships.storeId, storeId),
        eq(partnerships.status, "pending"),
        eq(sellers.status, "active"),
      ),
    )
    .orderBy(asc(partnerships.createdAt), asc(partnerships.id));
  const salesBySeller = db
    .select({ sellerId: sales.sellerId, n: count().as("n") })
    .from(sales)
    .where(and(eq(sales.storeId, storeId), isNull(sales.canceledAt)))
    .groupBy(sales.sellerId)
    .as("sales_by_seller");
  const partners = await db
    .select({
      partnershipId: partnerships.id,
      sellerName: profiles.name,
      city: sellers.city,
      phone: profiles.phone,
      pixKey: profiles.pixKey,
      sales: sql<number>`coalesce(${salesBySeller.n}, 0)`.mapWith(Number),
      status: sellers.status,
    })
    .from(partnerships)
    .innerJoin(sellers, eq(sellers.profileId, partnerships.sellerId))
    .innerJoin(profiles, eq(profiles.id, sellers.profileId))
    .leftJoin(salesBySeller, eq(salesBySeller.sellerId, partnerships.sellerId))
    .where(
      and(eq(partnerships.storeId, storeId), eq(partnerships.status, "active")),
    )
    .orderBy(asc(profiles.name));
  return {
    acceptsSellers: store.acceptsSellers,
    feeBps,
    vehicleOptions: options.map((o) => ({
      vehicleId: o.vehicleId,
      title: [shortTitle(o), o.version].filter(Boolean).join(" · "),
    })),
    commission:
      store.type && store.value !== null
        ? { type: store.type, value: store.value }
        : null,
    overrides: overrides.flatMap((o) =>
      o.type && o.value !== null
        ? [
            {
              vehicleId: o.vehicleId,
              title: shortTitle(o),
              type: o.type,
              value: o.value,
            },
          ]
        : [],
    ),
    pending,
    partners: partners.map((p) => ({
      partnershipId: p.partnershipId,
      sellerName: p.sellerName,
      city: p.city,
      phone: p.phone,
      pixKey: p.pixKey,
      sales: p.sales,
      blocked: p.status === "blocked",
    })),
  };
}

/** "Aceitar vendedores" e a comissão padrão [7e] (RCL-FR-001, 002, RCL-SEC-005). */
export async function setNetworkRules(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<void> {
  const { userId, storeId } = networkStoreOf(session);
  const rules = parseOrThrow(networkRulesSchema, raw);
  await db.transaction(async (tx) => {
    await tx
      .update(stores)
      .set({
        acceptsSellers: rules.acceptsSellers,
        commissionType: rules.commissionType,
        commissionValue: rules.commissionValue,
      })
      .where(eq(stores.id, storeId));
    await logActivity(tx, {
      userId,
      action: "store.network_rules",
      entity: "store",
      entityId: storeId,
      data: rules,
    });
  });
}

const DECISIONS = {
  approve: { from: "pending", to: "active", action: "partnership.approved" },
  decline: { from: "pending", to: "declined", action: "partnership.declined" },
  end: { from: "active", to: "ended", action: "partnership.ended" },
} as const;

/**
 * **Aprovar**, **Recusar** e **Encerrar parceria** [7f] (RCL-FR-005, 006, RCL-SEC-001,
 * 005): só o lojista, só parceria da própria loja (outra → 404), só a partir do status
 * esperado (senão 409). Recusar e encerrar liberam um pedido novo.
 */
export async function decidePartnership(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<void> {
  const { userId, storeId } = networkStoreOf(session);
  const { partnershipId, decision } = parseOrThrow(
    partnershipDecisionSchema,
    raw,
  );
  const rule = DECISIONS[decision];
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ status: partnerships.status })
      .from(partnerships)
      .where(
        and(
          eq(partnerships.id, partnershipId),
          eq(partnerships.storeId, storeId),
        ),
      )
      .for("update");
    if (!row) throw AppError.notFound();
    if (row.status !== rule.from)
      throw AppError.conflict("Esta parceria já mudou. Atualize a página.");
    await tx
      .update(partnerships)
      .set({
        status: rule.to,
        ...(decision === "end" ? { endedAt: now } : {}),
      })
      .where(eq(partnerships.id, partnershipId));
    await logActivity(tx, {
      userId,
      action: rule.action,
      entity: "partnership",
      entityId: partnershipId,
    });
  });
}

/** Regra da comissão do veículo: o ajuste dele, senão a padrão da loja (RCL-FR-003). */
function ruleOf(v: {
  overrideType: "pct" | "fixed" | null;
  overrideValue: number | null;
  commissionType: "pct" | "fixed" | null;
  commissionValue: number | null;
}) {
  return v.overrideType
    ? { type: v.overrideType, value: v.overrideValue }
    : { type: v.commissionType, value: v.commissionValue };
}

/**
 * Ajuste da comissão de um veículo [7e] (RCL-FR-003, RCL-SEC-001, 002, 005): só o
 * lojista, só veículo da própria loja (outra → 404), nos limites da comissão; nulo
 * remove o ajuste.
 */
export async function setVehicleCommission(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<void> {
  const { userId, storeId } = networkStoreOf(session);
  const rule = parseOrThrow(commissionOverrideSchema, raw);
  await db.transaction(async (tx) => {
    if (!(await writeCommissionOverride(tx, { storeId, ...rule })))
      throw AppError.notFound();
    await logActivity(tx, {
      userId,
      action: "vehicle.commission_override",
      entity: "vehicle",
      entityId: rule.vehicleId,
      data: { type: rule.type, value: rule.value },
    });
  });
}

/** Loja da sessão de quem confirma venda (lojista e usuário da loja, RCL-SEC-002). */
function saleStoreOf(session: Session | null) {
  const s = authorizeTo(session, "sales.confirm");
  if (!s.storeId) throw AppError.forbidden();
  return { userId: s.userId, storeId: s.storeId };
}

/** Veículo à venda da loja (publicado ou oculto), com a regra da comissão; senão 404. */
async function saleVehicle(db: Db, storeId: string, vehicleId: string) {
  const [v] = await db
    .select({
      id: vehicles.id,
      status: vehicles.status,
      overrideType: vehicles.commissionOverrideType,
      overrideValue: vehicles.commissionOverrideValue,
      commissionType: stores.commissionType,
      commissionValue: stores.commissionValue,
      acceptsSellers: stores.acceptsSellers,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.storeId, storeId)));
  if (!v || v.status === "deleted") throw AppError.notFound();
  return v;
}

/** Parceiros que valem da loja (GLOSSARY), por nome. */
async function effectivePartners(
  db: Db,
  storeId: string,
): Promise<{ sellerId: string; name: string }[]> {
  return db
    .select({ sellerId: sellers.profileId, name: profiles.name })
    .from(partnerships)
    .innerJoin(stores, eq(stores.id, partnerships.storeId))
    .innerJoin(sellers, eq(sellers.profileId, partnerships.sellerId))
    .innerJoin(profiles, eq(profiles.id, sellers.profileId))
    .where(
      and(
        eq(partnerships.storeId, storeId),
        eq(partnerships.status, "active"),
        eq(stores.acceptsSellers, true),
        eq(sellers.status, "active"),
      ),
    )
    .orderBy(asc(profiles.name));
}

export type SaleTerms = {
  /** Vendedor do lead mais recente do veículo com parceria que vale (RCL-FR-013). */
  suggested: { sellerId: string; name: string } | null;
  partners: { sellerId: string; name: string }[];
  commissionCents: number | null;
  feeCents: number | null;
  feeBps: number;
};

/**
 * Cálculo ao vivo de **Confirmar venda** [7g] (RCL-FR-009, 010, 013): comissão (ajuste
 * do veículo ou padrão da loja) e taxa CajuGo sobre o valor final, só para vendedor que
 * é parceiro que vale; o vendedor sugerido e a lista de parceiros.
 */
export async function saleTerms(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<SaleTerms> {
  const { storeId } = saleStoreOf(session);
  const input = parseOrThrow(saleTermsSchema, raw);
  const v = await saleVehicle(db, storeId, input.vehicleId);
  const partners = await effectivePartners(db, storeId);
  const ids = partners.map((p) => p.sellerId);
  const [last] = ids.length
    ? await db
        .select({ sellerId: leads.sellerId })
        .from(leads)
        .where(and(eq(leads.vehicleId, v.id), inArray(leads.sellerId, ids)))
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(1)
    : [];
  const { cajugo_fee_bps: feeBps } = await getSettings(db);
  const priced =
    input.finalPriceCents && input.sellerId && ids.includes(input.sellerId)
      ? input.finalPriceCents
      : null;
  return {
    suggested: partners.find((p) => p.sellerId === last?.sellerId) ?? null,
    partners,
    commissionCents: priced === null ? null : commissionFor(ruleOf(v), priced),
    feeCents: priced === null ? null : feeFor(priced, feeBps),
    feeBps,
  };
}

const notPartner = () =>
  AppError.validation([
    {
      field: "sellerId",
      code: "not_partner",
      message: "Escolha um parceiro da loja.",
    },
  ]);

/**
 * **Confirmar venda** [7g] (RCL-FR-011, 012, RCL-SEC-001, 002, 003, 005): numa
 * transação, a venda (comissão e taxa calculadas aqui, taxa guardada, D4) e o veículo
 * vendido com o id dela. Vendedor do link tem que ser o sugerido; outro parceiro, um
 * parceiro que vale da loja. Veículo já vendido → 409.
 */
export async function confirmSale(
  deps: { db: Db },
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<{ saleId: string }> {
  const { userId, storeId } = saleStoreOf(session);
  const input = parseOrThrow(confirmSaleSchema, raw);
  const db = deps.db;
  const v = await saleVehicle(db, storeId, input.vehicleId);
  if (v.status !== "published" && v.status !== "hidden")
    throw AppError.conflict("Este veículo já não está à venda.");

  let sellerId: string | null = null;
  if (input.attribution !== "store") {
    const terms = await saleTerms(db, session, {
      vehicleId: v.id,
      finalPriceCents: input.finalPriceCents,
      sellerId: input.sellerId ?? null,
    });
    const isPartner = terms.partners.some((p) => p.sellerId === input.sellerId);
    if (!isPartner) throw notPartner();
    if (
      input.attribution === "link" &&
      terms.suggested?.sellerId !== input.sellerId
    )
      throw notPartner();
    sellerId = input.sellerId ?? null;
  }
  const { cajugo_fee_bps: feeBps } = await getSettings(db);
  const commissionCents = sellerId
    ? (commissionFor(ruleOf(v), input.finalPriceCents) ?? 0)
    : null;
  const feeCents = sellerId ? feeFor(input.finalPriceCents, feeBps) : null;

  return db.transaction(async (tx) => {
    const [sale] = await tx
      .insert(sales)
      .values({
        vehicleId: v.id,
        storeId,
        finalPriceCents: input.finalPriceCents,
        attribution: input.attribution,
        sellerId,
        commissionCents,
        commissionStatus: sellerId
          ? input.commissionPaid
            ? "paid"
            : "to_receive"
          : null,
        feeBps: sellerId ? feeBps : null,
        feeCents,
        confirmedBy: userId,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: sales.id });
    if (!sale) throw AppError.conflict("Este veículo já foi vendido.");
    if (
      !(await sellInTx(
        tx,
        { storeId, vehicleId: v.id, saleId: sale.id, userId },
        now,
      ))
    )
      throw AppError.conflict("Este veículo já não está à venda.");
    await logActivity(tx, {
      userId,
      action: "sale.confirmed",
      entity: "sale",
      entityId: sale.id,
      data: {
        vehicleId: v.id,
        finalPriceCents: input.finalPriceCents,
        attribution: input.attribution,
        commissionCents,
        feeCents,
      },
    });
    return { saleId: sale.id };
  });
}

/**
 * **Desfazer venda** da Rede Caju (RCL-FR-015, RCL-SEC-001): cancela a venda, a comissão
 * e a taxa e reabre o veículo (até 7 dias). Comissão já paga → 409; venda de outra loja
 * ou inexistente → 404.
 */
export async function undoSale(
  deps: { db: Db },
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<void> {
  const { userId, storeId } = saleStoreOf(session);
  const { vehicleId } = parseOrThrow(saleUndoSchema, raw);
  await deps.db.transaction(async (tx) => {
    const [sale] = await tx
      .select({ id: sales.id, status: sales.commissionStatus })
      .from(sales)
      .where(
        and(
          eq(sales.vehicleId, vehicleId),
          eq(sales.storeId, storeId),
          isNull(sales.canceledAt),
        ),
      )
      .for("update");
    if (!sale) throw AppError.notFound();
    if (sale.status === "paid")
      throw AppError.conflict(
        "A comissão já foi paga. Para desfazer, fale com a CajuGo.",
      );
    await tx
      .update(sales)
      .set({ canceledAt: now })
      .where(eq(sales.id, sale.id));
    await reopenInTx(tx, { storeId, vehicleId, userId }, now);
    await logActivity(tx, {
      userId,
      action: "sale.canceled",
      entity: "sale",
      entityId: sale.id,
    });
  });
}

/** Venda ativa do veículo para [6e]: com ela, o desfazer é pela venda (RCL-FR-015). */
export async function saleOf(
  db: Db,
  session: Session | null,
  vehicleId: string,
): Promise<{ commissionPaid: boolean } | null> {
  const { storeId } = saleStoreOf(session);
  const [sale] = await db
    .select({ status: sales.commissionStatus })
    .from(sales)
    .where(
      and(
        eq(sales.vehicleId, vehicleId),
        eq(sales.storeId, storeId),
        isNull(sales.canceledAt),
      ),
    );
  return sale ? { commissionPaid: sale.status === "paid" } : null;
}

/** Bloco **Rede Caju** da Conta [3c] (RCL-FR-014): aceita? e pedidos pendentes. */
export async function networkSummary(
  db: Db,
  session: Session | null,
): Promise<{ acceptsSellers: boolean; pending: number }> {
  const { storeId } = networkStoreOf(session);
  const [store] = await db
    .select({ acceptsSellers: stores.acceptsSellers })
    .from(stores)
    .where(eq(stores.id, storeId));
  const [pending] = await db
    .select({ n: count() })
    .from(partnerships)
    .innerJoin(sellers, eq(sellers.profileId, partnerships.sellerId))
    .where(
      and(
        eq(partnerships.storeId, storeId),
        eq(partnerships.status, "pending"),
        eq(sellers.status, "active"),
      ),
    );
  return { acceptsSellers: store.acceptsSellers, pending: pending.n };
}

/**
 * A loja da sessão aceita vendedores? Decide se "Vendido" abre a Confirmar venda [7g]
 * (RCL-FR-008); vale para quem confirma venda (lojista e usuário da loja).
 */
export async function storeAcceptsSellers(
  db: Db,
  session: Session | null,
): Promise<boolean> {
  const { storeId } = saleStoreOf(session);
  const [store] = await db
    .select({ acceptsSellers: stores.acceptsSellers })
    .from(stores)
    .where(eq(stores.id, storeId));
  return !!store?.acceptsSellers;
}
