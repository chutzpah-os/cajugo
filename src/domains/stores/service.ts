import { and, eq, gt, inArray, like } from "drizzle-orm";
import { authorizeTo, grantRole, type AuthDeps } from "@/domains/auth/service";
import {
  checkCode,
  codeOf,
  getOrCreateCode,
  registerReferral,
  removeReferralData,
} from "@/domains/referrals/service";
import { profiles, storeSlugRedirects, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type {
  Cloudinary,
  SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import { logActivity } from "@/platform/http/activity-log";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { authorizeStore, type Session } from "@/platform/http/session";
import { storeUrl } from "@/platform/http/urls";
import {
  addStoreSchema,
  registerStoreSchema,
  storeUpdateSchema,
} from "./schemas";
import type { StoreHours } from "./hours";
import { checkSlug, slugSchema } from "./slug";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Endereço reservado sem 1º pagamento (PRD §5.1); liberação na spec 011. */
const SLUG_RESERVATION_DAYS = 7;

const fieldError = (field: string, code: string, message: string) =>
  AppError.validation([{ field, code, message }]);

/** Código de indicação digitado: válido ou erro no campo (STO-FR-007). */
async function acceptedCode(
  deps: AuthDeps,
  raw: string | undefined,
  applicant: { email: string; phone: string },
): Promise<string | null> {
  if (!raw) return null;
  const check = await checkCode(deps.db, raw, applicant);
  if (check.status === "not-found")
    throw fieldError("referralCode", "not_found", "Código não encontrado.");
  if (check.status === "self-referral")
    throw fieldError(
      "referralCode",
      "self_referral",
      "Não vale usar o próprio código.",
    );
  return check.code;
}

export type RegisterContext = {
  /** IP com hash, para o limite por rede (STO-SEC-002). */
  ipHash: string;
  /** Campo isca preenchido: robô (STO-SEC-002). */
  honeypotFilled?: boolean;
};

/** Limite de formulário público por rede: 5/min e 30/dia (SECURITY.md §6). */
async function assertSignupAllowed(
  deps: AuthDeps,
  ctx: RegisterContext,
  now: Date,
) {
  const key = `signup:ip:${ctx.ipHash}`;
  for (const rule of [RATE_LIMITS.publicForm, RATE_LIMITS.publicFormDaily]) {
    const { ok, retryAfterSeconds } = await consumeRateLimit(
      deps.db,
      `${key}:${rule.windowSeconds}`,
      rule,
      now,
    );
    if (!ok) throw AppError.tooManyRequests(retryAfterSeconds);
  }
  if (ctx.honeypotFilled)
    throw new AppError(
      "bad-request",
      "Não foi possível concluir o cadastro.",
      400,
    );
}

/**
 * Cadastro do lojista [5c] (STO-FR-003…007, 014, 015). Visitante: conta no provedor
 * de login e, numa transação, perfil + papel + loja `registered` com endereço reservado
 * + código pessoal + indicação + auditoria; se a transação falhar, a conta é apagada.
 * Conectado (cliente sem loja): cria só a loja e adiciona o papel de lojista.
 * Protegido por campo isca e limite por rede (STO-SEC-002).
 */
export async function registerStore(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx: RegisterContext,
): Promise<{ userId: string; storeId: string }> {
  const now = deps.now?.() ?? new Date();
  await assertSignupAllowed(deps, ctx, now);
  if (session) return addStoreToAccount(deps, session, input, now);

  const parsed = registerStoreSchema.safeParse(input);
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

  const code = await acceptedCode(deps, data.referralCode, data);
  await assertSlugAvailable(deps, data.slug);

  const user = await deps.auth.adminCreateUser(data.email, data.password);
  try {
    const storeId = await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      return createStore(tx, user.id, data.name, data, code, now);
    });
    return { userId: user.id, storeId };
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    throw error;
  }
}

async function assertSlugAvailable(deps: AuthDeps, slug: string) {
  if ((await checkSlug(deps.db, slug)).status !== "available")
    throw AppError.conflict(undefined, [
      { field: "slug", code: "taken", message: "Indisponível." },
    ]);
}

/** Loja + papel + código + indicação + auditoria, dentro da transação do chamador. */
async function createStore(
  tx: Db,
  userId: string,
  personName: string,
  data: {
    storeName: string;
    slug: string;
    city: string;
    state: string;
    whatsapp: string;
  },
  code: string | null,
  now: Date,
): Promise<string> {
  await grantRole(tx, userId, "store_owner", "public-signup");
  const [store] = await tx
    .insert(stores)
    .values({
      name: data.storeName,
      slug: data.slug,
      city: data.city,
      state: data.state,
      whatsapp: data.whatsapp,
      ownerId: userId,
      slugReservedUntil: new Date(
        now.getTime() + SLUG_RESERVATION_DAYS * DAY_MS,
      ),
    })
    .returning({ id: stores.id });
  await tx
    .update(profiles)
    .set({ storeId: store.id })
    .where(eq(profiles.id, userId));
  await getOrCreateCode(tx, userId, personName);
  if (code) await registerReferral(tx, code, store.id);
  await logActivity(tx, {
    userId,
    action: "store.registered",
    entity: "store",
    entityId: store.id,
  });
  return store.id;
}

/** Quem já tem conta (vendedor, indicador) abre a loja na mesma conta (STO-FR-015). */
async function addStoreToAccount(
  deps: AuthDeps,
  session: Session,
  input: unknown,
  now: Date,
): Promise<{ userId: string; storeId: string }> {
  if (session.roles.some((r) => r === "admin" || r === "support"))
    throw AppError.forbidden();
  if (
    session.storeId ||
    session.roles.some((r) => r === "store_owner" || r === "store_staff")
  )
    throw new AppError("conflict", "Sua conta já tem uma loja.", 409);
  const parsed = addStoreSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const data = parsed.data;

  const [profile] = await deps.db
    .select({
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
    })
    .from(profiles)
    .where(eq(profiles.id, session.userId));
  if (!profile) throw AppError.unauthorized();
  const code = await acceptedCode(deps, data.referralCode, {
    email: profile.email,
    phone: profile.phone ?? "",
  });
  await assertSlugAvailable(deps, data.slug);

  const storeId = await deps.db.transaction((tx) =>
    createStore(tx, session.userId, profile.name, data, code, now),
  );
  return { userId: session.userId, storeId };
}

/** Loja da sessão para quem pode editar Minha loja (STO-SEC-001, STO-SEC-003). */
function ownStore(session: Session | null): {
  userId: string;
  storeId: string;
} {
  const s = authorizeTo(session, "store.edit");
  if (!s.storeId) throw AppError.forbidden();
  return { userId: s.userId, storeId: s.storeId };
}

/**
 * Minha loja [3b] (STO-FR-008, 009, 012): só a loja da sessão; o formulário não
 * recebe id de loja (campo desconhecido é recusado). Usuário da loja: 403.
 */
export async function updateStore(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<void> {
  const { userId, storeId } = ownStore(session);
  const parsed = storeUpdateSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const d = parsed.data;
  await deps.db.transaction(async (tx) => {
    await tx
      .update(stores)
      .set({
        name: d.name,
        about: d.about ?? null,
        whatsapp: d.whatsapp,
        instagram: d.instagram ?? null,
        addressStreet: d.addressStreet ?? null,
        addressNumber: d.addressNumber ?? null,
        addressComplement: d.addressComplement ?? null,
        addressDistrict: d.addressDistrict ?? null,
        addressZip: d.addressZip ?? null,
        hours: d.hours ?? null,
        shareByDefault: d.shareByDefault,
      })
      .where(eq(stores.id, storeId));
    await logActivity(tx, {
      userId,
      action: "store.updated",
      entity: "store",
      entityId: storeId,
    });
  });
}

/** Minha loja como a tela mostra (saída montada à mão). */
export type StoreSummary = {
  name: string;
  slug: string;
  status: string;
  about: string | null;
  whatsapp: string;
  instagram: string | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    zip: string | null;
    city: string;
    state: string;
  };
  hours: StoreHours | null;
  shareByDefault: boolean;
  logoPublicId: string | null;
  coverPublicId: string | null;
  /** dd/mm/aaaa da próxima troca de endereço permitida; `null`: pode trocar já (STO-FR-013). */
  nextSlugChange: string | null;
  /** Código pessoal de indicação do lojista (STO-FR-014). */
  referralCode: string | null;
};

export async function storeSummary(
  db: Db,
  session: Session | null,
): Promise<StoreSummary> {
  const { userId, storeId } = ownStore(session);
  const [s] = await db.select().from(stores).where(eq(stores.id, storeId));
  if (!s) throw AppError.notFound();
  const next = nextSlugChangeAt(s.slugChangedAt);
  return {
    name: s.name,
    slug: s.slug,
    status: s.status,
    about: s.about,
    whatsapp: s.whatsapp,
    instagram: s.instagram,
    address: {
      street: s.addressStreet,
      number: s.addressNumber,
      complement: s.addressComplement,
      district: s.addressDistrict,
      zip: s.addressZip,
      city: s.city,
      state: s.state,
    },
    hours: (s.hours as StoreHours | null) ?? null,
    shareByDefault: s.shareByDefault,
    logoPublicId: s.logoPublicId,
    coverPublicId: s.coverPublicId,
    nextSlugChange: next && next > new Date() ? brDate.format(next) : null,
    referralCode: await codeOf(db, userId),
  };
}

const SLUG_CHANGE_INTERVAL_DAYS = 30;
const SLUG_REDIRECT_DAYS = 90;
const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

/** Quando a loja pode trocar de endereço de novo (30 dias depois da última troca). */
function nextSlugChangeAt(changedAt: Date | null): Date | null {
  return changedAt
    ? new Date(changedAt.getTime() + SLUG_CHANGE_INTERVAL_DAYS * DAY_MS)
    : null;
}

/**
 * Troca do endereço do catálogo (STO-FR-013): no máximo 1 vez a cada 30 dias; o
 * endereço antigo leva ao novo por 90 dias. Voltar a um endereço antigo da própria
 * loja é permitido. Só a loja da sessão (STO-SEC-001); usuário da loja: 403.
 */
export async function changeSlug(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<{ slug: string }> {
  const { userId, storeId } = ownStore(session);
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(
      fieldErrorsFromZod(parsed.error).map((e) => ({ ...e, field: "slug" })),
    );
  const slug = parsed.data;
  const now = deps.now?.() ?? new Date();

  const [store] = await deps.db
    .select({ slug: stores.slug, changedAt: stores.slugChangedAt })
    .from(stores)
    .where(eq(stores.id, storeId));
  if (!store) throw AppError.notFound();
  if (store.slug === slug) return { slug };
  const next = nextSlugChangeAt(store.changedAt);
  if (next) {
    if (now < next)
      throw fieldError(
        "slug",
        "too_soon",
        `Você poderá trocar de novo a partir de ${brDate.format(next)}.`,
      );
  }

  const [ownOld] = await deps.db
    .select({ slug: storeSlugRedirects.oldSlug })
    .from(storeSlugRedirects)
    .where(
      and(
        eq(storeSlugRedirects.oldSlug, slug),
        eq(storeSlugRedirects.storeId, storeId),
      ),
    );
  if (!ownOld) await assertSlugAvailable(deps, slug);

  await deps.db.transaction(async (tx) => {
    if (ownOld)
      await tx
        .delete(storeSlugRedirects)
        .where(eq(storeSlugRedirects.oldSlug, slug));
    const expiresAt = new Date(now.getTime() + SLUG_REDIRECT_DAYS * DAY_MS);
    await tx
      .insert(storeSlugRedirects)
      .values({ oldSlug: store.slug, storeId, expiresAt })
      .onConflictDoUpdate({
        target: storeSlugRedirects.oldSlug,
        set: { storeId, expiresAt },
      });
    await tx
      .update(stores)
      .set({ slug, slugChangedAt: now })
      .where(eq(stores.id, storeId));
    await logActivity(tx, {
      userId,
      action: "store.slug_changed",
      entity: "store",
      entityId: storeId,
      data: { from: store.slug, to: slug },
    });
  });
  return { slug };
}

/**
 * Endereço `/loja/{slug}`: a loja dona do endereço atual, ou a loja para a qual um
 * endereço antigo ainda redireciona (até 90 dias). `null` se nenhum.
 */
export async function resolveSlug(
  db: Db,
  slug: string,
  at: Date = new Date(),
): Promise<{ storeId: string; slug: string; redirected: boolean } | null> {
  const [current] = await db
    .select({ id: stores.id, slug: stores.slug })
    .from(stores)
    .where(eq(stores.slug, slug));
  if (current)
    return { storeId: current.id, slug: current.slug, redirected: false };
  const [old] = await db
    .select({ id: stores.id, slug: stores.slug })
    .from(storeSlugRedirects)
    .innerJoin(stores, eq(stores.id, storeSlugRedirects.storeId))
    .where(
      and(
        eq(storeSlugRedirects.oldSlug, slug),
        gt(storeSlugRedirects.expiresAt, at),
      ),
    );
  return old ? { storeId: old.id, slug: old.slug, redirected: true } : null;
}

/** Imagens públicas da loja (SECURITY.md §5): formatos e tamanho. */
const IMAGE_FORMATS = ["jpg", "png", "webp", "heic"];
export const STORE_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_KINDS = ["logo", "cover"] as const;
export type StoreImageKind = (typeof IMAGE_KINDS)[number];

type ImageDeps = AuthDeps & { cloudinary: Cloudinary };

function imageKind(kind: unknown): StoreImageKind {
  const k = IMAGE_KINDS.find((x) => x === kind);
  if (!k) throw fieldError("kind", "invalid", "Tipo de imagem inválido.");
  return k;
}

/**
 * Assinatura para enviar logo ou capa direto ao Cloudinary (STO-FR-010, STO-SEC-004):
 * pasta da loja da sessão, nome gerado aqui, só imagens. Usuário da loja: 403.
 */
export async function storeImageUpload(
  deps: ImageDeps,
  session: Session | null,
  kind: unknown,
): Promise<SignedUpload> {
  const { storeId } = ownStore(session);
  const k = imageKind(kind);
  return deps.cloudinary.signUpload({
    folder: `stores/${storeId}`,
    publicId: `${k}-${crypto.randomUUID()}`,
    allowedFormats: IMAGE_FORMATS,
  });
}

/**
 * Salva a imagem enviada (STO-FR-010) depois de conferir no Cloudinary: pasta da loja
 * da sessão (outra loja: 404), formato permitido e até 15 MB (STO-SEC-004); o
 * arquivo recusado é apagado do Cloudinary.
 */
export async function setStoreImage(
  deps: ImageDeps,
  session: Session | null,
  kind: unknown,
  publicId: unknown,
): Promise<void> {
  const { userId, storeId } = ownStore(session);
  const k = imageKind(kind);
  const prefix = deps.cloudinary.fullPublicId(`stores/${storeId}`, `${k}-`);
  // Exatamente o nome que o servidor assinou ({pasta da loja}/{tipo}-{uuid}): sem
  // isso, `../` depois do prefixo apontaria para a pasta de outra loja.
  if (
    typeof publicId !== "string" ||
    !publicId.startsWith(prefix) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      publicId.slice(prefix.length),
    )
  )
    throw AppError.notFound();

  const image = await deps.cloudinary.verifyUpload(publicId);
  if (!image)
    throw fieldError(
      k,
      "not_uploaded",
      "Não encontramos a imagem enviada. Tente de novo.",
    );
  const refusal = !IMAGE_FORMATS.includes(image.format)
    ? fieldError(k, "format", "Use uma imagem JPG, PNG, WEBP ou HEIC.")
    : image.bytes > STORE_IMAGE_MAX_BYTES
      ? fieldError(k, "too_large", "A imagem pode ter no máximo 15 MB.")
      : null;
  if (refusal) {
    // Recusado não fica na pasta da loja (cota e SECURITY.md §5).
    await deps.cloudinary.destroy(publicId);
    throw refusal;
  }

  await deps.db.transaction(async (tx) => {
    await tx
      .update(stores)
      .set(
        k === "logo" ? { logoPublicId: publicId } : { coverPublicId: publicId },
      )
      .where(eq(stores.id, storeId));
    await logActivity(tx, {
      userId,
      action: `store.${k}_changed`,
      entity: "store",
      entityId: storeId,
    });
  });
}

/**
 * Transições de status ligadas à cobrança (PRD §5.2), chamadas pelo `billing` dentro
 * da transação dele. Cada uma só muda a loja que está no status de origem esperado e
 * diz se mudou: chamada repetida ou fora de ordem não faz nada.
 */
export async function markPaymentReview(db: Db, storeId: string) {
  const done = await db
    .update(stores)
    .set({ status: "payment_review" })
    .where(and(eq(stores.id, storeId), eq(stores.status, "registered")))
    .returning({ id: stores.id });
  return done.length > 0;
}

/** Comprovante da 1ª mensalidade recusado: volta a "cadastrada" para reenviar. */
export async function backToRegistered(db: Db, storeId: string) {
  const done = await db
    .update(stores)
    .set({ status: "registered" })
    .where(and(eq(stores.id, storeId), eq(stores.status, "payment_review")))
    .returning({ id: stores.id });
  return done.length > 0;
}

/**
 * 1º pagamento confirmado (PIX-FR-009, PIX-FR-011): loja ativa, dia e próximo
 * vencimento, data da ativação; o endereço deixa de ser só reservado.
 */
export async function activateFirstTime(
  db: Db,
  storeId: string,
  input: { billingDay: number; nextDueAt: Date; at: Date },
) {
  const done = await db
    .update(stores)
    .set({
      status: "active",
      billingDay: input.billingDay,
      nextDueAt: input.nextDueAt,
      activatedAt: input.at,
      slugReservedUntil: null,
    })
    .where(
      and(
        eq(stores.id, storeId),
        inArray(stores.status, ["registered", "payment_review"]),
      ),
    )
    .returning({ id: stores.id });
  return done.length > 0;
}

/** Padrões de um veículo novo (VEH-FR-008): divulgação e WhatsApp da loja. */
export async function vehicleDefaults(
  db: Db,
  storeId: string,
): Promise<{ shareOnCajugo: boolean; contactWhatsapp: string }> {
  const [s] = await db
    .select({ share: stores.shareByDefault, whatsapp: stores.whatsapp })
    .from(stores)
    .where(eq(stores.id, storeId));
  if (!s) throw AppError.notFound();
  return { shareOnCajugo: s.share, contactWhatsapp: s.whatsapp };
}

/** Status em que a loja está "no ar" para o público (PRD §5.5). */
export const LIVE_STATUSES = [
  "active",
  "past_due",
  "cancel_scheduled",
] as const;

export function isStoreLive(status: string): boolean {
  return (LIVE_STATUSES as readonly string[]).includes(status);
}

export type OnboardingStatus = {
  /** Mostrar o banner e os primeiros passos [5e]? */
  show: boolean;
  catalogUrl: string;
  steps: {
    subscription: boolean;
    firstVehicle: boolean;
    storeComplete: boolean;
  };
  done: number;
};

/**
 * Primeiros passos [5e] (PIX-FR-012): com a loja no ar, assinatura ativa ✓, primeiro
 * veículo (spec 005) e loja completa (logo, capa, sobre e horário). Some quando os 3
 * estão completos.
 */
export async function onboardingStatus(
  db: Db,
  session: Session | null,
): Promise<OnboardingStatus> {
  const s = authorizeStore(session);
  const [store] = await db
    .select({
      slug: stores.slug,
      status: stores.status,
      activatedAt: stores.activatedAt,
      logo: stores.logoPublicId,
      cover: stores.coverPublicId,
      about: stores.about,
      hours: stores.hours,
    })
    .from(stores)
    .where(eq(stores.id, s.storeId));
  if (!store) throw AppError.notFound();
  const steps = {
    subscription: !!store.activatedAt && isStoreLive(store.status),
    // Veículos chegam na spec 005; até lá nenhuma loja tem o primeiro.
    firstVehicle: false,
    storeComplete:
      !!store.logo && !!store.cover && !!store.about?.trim() && !!store.hours,
  };
  const done = Object.values(steps).filter(Boolean).length;
  return {
    show: steps.subscription && done < 3,
    catalogUrl: storeUrl(store.slug),
    steps,
    done,
  };
}

/** E-mails dos cadastros feitos pelos testes ponta a ponta (spec 003). */
export const E2E_SIGNUP_EMAIL = /^e2e-cadastro-[a-z0-9-]+@cajugo\.test$/;

/** Só testes: contas e lojas criadas pelos e2e de cadastro (`e2e-cadastro-*@cajugo.test`). */
export async function e2eSignups(
  db: Db,
): Promise<{ profileIds: string[]; storeIds: string[] }> {
  const accounts = (
    await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(like(profiles.email, "e2e-cadastro-%@cajugo.test"))
  ).filter((a) => E2E_SIGNUP_EMAIL.test(a.email));
  const profileIds = accounts.map((a) => a.id);
  const storeIds = profileIds.length
    ? (
        await db
          .select({ id: stores.id })
          .from(stores)
          .where(inArray(stores.ownerId, profileIds))
      ).map((s) => s.id)
    : [];
  return { profileIds, storeIds };
}

/**
 * Só testes (`pnpm e2e:seed`, que recusa rodar na produção): apaga as lojas e contas
 * criadas pelos e2e de cadastro (`e2e-cadastro-*@cajugo.test`) e tudo que depende
 * delas. A auditoria fica (é só de inserção).
 */
export async function removeE2ESignups(deps: AuthDeps): Promise<number> {
  const accounts = (
    await deps.db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(like(profiles.email, "e2e-cadastro-%@cajugo.test"))
  ).filter((a) => E2E_SIGNUP_EMAIL.test(a.email));
  if (!accounts.length) return 0;
  const ids = accounts.map((a) => a.id);

  await deps.db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: stores.id })
      .from(stores)
      .where(inArray(stores.ownerId, ids));
    const storeIds = owned.map((s) => s.id);
    // Indicações e códigos são do domínio referrals.
    await removeReferralData(tx, ids, storeIds);
    if (storeIds.length) {
      await tx
        .delete(storeSlugRedirects)
        .where(inArray(storeSlugRedirects.storeId, storeIds));
      await tx
        .update(profiles)
        .set({ storeId: null })
        .where(inArray(profiles.storeId, storeIds));
      await tx.delete(stores).where(inArray(stores.id, storeIds));
    }
    await tx.delete(profiles).where(inArray(profiles.id, ids));
  });
  for (const id of ids) await deps.auth.adminDeleteUser(id);
  return ids.length;
}

export type CodeCheckView =
  | { status: "ok"; referrerName: string }
  | { status: "not-found" | "self-referral" }
  | null;

/**
 * Checagem ao vivo do código no cadastro (STO-FR-007). Conectado: compara com o
 * e-mail e o celular da própria conta; visitante: com o que digitou. Só o nome de
 * quem indicou sai daqui (STO-SEC-005).
 */
export async function checkReferralCode(
  db: Db,
  session: Session | null,
  input: { code: string; email: string; phone: string },
): Promise<CodeCheckView> {
  let applicant = {
    email: String(input.email).slice(0, 254),
    phone: String(input.phone).slice(0, 30),
  };
  if (session) {
    const [p] = await db
      .select({ email: profiles.email, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.id, session.userId));
    applicant = { email: p?.email ?? "", phone: p?.phone ?? "" };
  }
  const result = await checkCode(
    db,
    String(input.code).slice(0, 20),
    applicant,
  );
  return result.status === "ok"
    ? { status: "ok", referrerName: result.referrerName }
    : { status: result.status };
}

/**
 * Loja do endereço público `/loja/{slug}` (só dados públicos). `redirected`: o
 * endereço é antigo e leva ao atual (STO-FR-013). `null`: endereço inexistente ou
 * loja fora do ar.
 */
export async function publicStore(
  db: Db,
  slug: string,
): Promise<{
  slug: string;
  redirected: boolean;
  name: string;
  city: string;
  state: string;
} | null> {
  const resolved = await resolveSlug(db, slug);
  if (!resolved) return null;
  const [s] = await db
    .select({ name: stores.name, city: stores.city, state: stores.state })
    .from(stores)
    // Só loja no ar (PRD §5.5): cadastrada, em análise, suspensa ou cancelada não é
    // pública (STO-FR-006, PIX-FR-014, SECURITY.md §4).
    .where(
      and(
        eq(stores.id, resolved.storeId),
        inArray(stores.status, LIVE_STATUSES),
      ),
    );
  return s
    ? { slug: resolved.slug, redirected: resolved.redirected, ...s }
    : null;
}

/**
 * Só testes (`pnpm e2e:seed`): volta a loja de teste ao estado inicial (endereço,
 * sem troca recente, sem redirecionamentos, sem imagens, sem horário, fora da vitrine).
 */
export async function resetStoreForTests(
  db: Db,
  storeId: string,
  slug: string,
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(storeSlugRedirects)
      .where(eq(storeSlugRedirects.storeId, storeId));
    await tx
      .update(stores)
      .set({
        slug,
        slugChangedAt: null,
        logoPublicId: null,
        coverPublicId: null,
        hours: null,
        about: null,
        instagram: null,
        // Loja de teste nunca vai para a vitrine CajuGo.
        shareByDefault: false,
      })
      .where(eq(stores.id, storeId));
  });
}

export { STORES_TAG } from "./tags";
