import type { z } from "zod";
import { and, asc, eq, gte, inArray, ne, sum } from "drizzle-orm";
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
import { searchShowcase, type PublicCard } from "@/domains/showcase/service";
import { LIVE_STATUSES } from "@/domains/stores/service";
import { brDay } from "@/platform/br/date";
import { appUrl } from "@/platform/http/urls";
import {
  partnerships,
  profiles,
  sellers,
  sellerVehicleClicks,
  stores,
  userRole,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import type { PrivateFile } from "@/platform/http/private-file";
import { authorize, type Session } from "@/platform/http/session";
import {
  addSellerSchema,
  blockSellerSchema,
  partnershipRequestSchema,
  sellerDecisionSchema,
  sellerSignupSchema,
} from "./schemas";
import { commissionFor } from "./commission";
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

  const parsed = sellerSignupSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const data = parsed.data;

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
  const parsed = addSellerSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  await assertCpfFree(db, parsed.data.cpf, session.userId);
  await db.transaction((tx) => createSeller(tx, session.userId, parsed.data));
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

/**
 * Assinatura para o navegador enviar a foto do documento direto ao Cloudinary,
 * privada (`authenticated`), na pasta do vendedor da sessão e com nome gerado aqui
 * (SEL-FR-001, SEL-SEC-009). Só enquanto o cadastro está Em análise.
 */
export async function documentUpload(
  deps: FileDeps,
  session: Session | null,
  side: unknown,
): Promise<SignedUpload> {
  const me = await ownSeller(deps.db, session);
  if (me.status !== "in_review")
    throw AppError.conflict("O cadastro já foi analisado.");
  return deps.cloudinary.signUpload({
    folder: documentFolder(me.profileId),
    publicId: `${documentName(sideOf(side))}${crypto.randomUUID()}`,
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
  input: { side: unknown; publicId: unknown },
): Promise<void> {
  const me = await ownSeller(deps.db, session);
  if (me.status !== "in_review")
    throw AppError.conflict("O cadastro já foi analisado.");
  const side = sideOf(input.side);
  const prefix = deps.cloudinary.fullPublicId(
    documentFolder(me.profileId),
    documentName(side),
  );
  const publicId = typeof input.publicId === "string" ? input.publicId : "";
  if (!publicId.startsWith(prefix) || !UUID.test(publicId.slice(prefix.length)))
    throw AppError.notFound();
  const { format } = await checkPrivateUpload(
    deps.cloudinary,
    publicId,
    side,
    "Não encontramos a foto enviada. Tente de novo.",
  );
  const previous =
    side === "front" ? me.documentFrontPublicId : me.documentBackPublicId;
  await deps.db
    .update(sellers)
    .set(
      side === "front"
        ? { documentFrontPublicId: publicId, documentFrontFormat: format }
        : { documentBackPublicId: publicId, documentBackFormat: format },
    )
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
  const publicId =
    which === "front" ? row?.documentFrontPublicId : row?.documentBackPublicId;
  const format =
    which === "front" ? row?.documentFrontFormat : row?.documentBackFormat;
  if (!publicId || !format) throw AppError.notFound();
  const file = await deps.cloudinary.fetchPrivate(publicId, format);
  if (!file) throw AppError.notFound();
  return {
    ...file,
    filename: `documento-${which}.${privateExtension(format)}`,
  };
}

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
      status: r.status === "active" ? "partner" : "pending",
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
  authorizeTo(session, "sellers.view");
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
        cpf: r.cpf,
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
  /** Parceria com a loja do veículo: só "partner" ganha comissão (PRD §5.7). */
  partner: PartnerState | "none";
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
    mine.map((p) => [
      p.storeId,
      p.status === "active" ? ("partner" as const) : ("pending" as const),
    ]),
  );
  return {
    total: page.total,
    nextCursor: page.nextCursor,
    items: page.items.flatMap((card) => {
      const owner = ownerOf.get(card.vehicleId);
      if (!owner) return [];
      const partner = partnerOf.get(owner.storeId) ?? "none";
      return [
        {
          card,
          storeId: owner.storeId,
          partner,
          earnCents:
            partner === "partner"
              ? commissionFor(
                  { type: owner.commissionType, value: owner.commissionValue },
                  card.priceCents,
                )
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
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(eq(stores.id, storeId), inArray(stores.status, [...LIVE_STATUSES])),
    );
  if (!store) throw AppError.notFound();
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
  return open?.status === "active" ? "partner" : "pending";
}
