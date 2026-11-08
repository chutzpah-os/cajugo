import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "./uuid";

// Modelo completo em docs/ARCHITECTURE.md §4. Cada tabela entra com a spec do seu domínio.
// RLS ligado sem policy em todas as tabelas: o navegador nunca acessa o banco (SECURITY.md §4).

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const userRole = pgEnum("user_role", [
  "store_owner",
  "admin",
  "support",
  "store_staff",
  "seller",
  "referrer",
]);

export const storeStatus = pgEnum("store_status", [
  "registered",
  "payment_review",
  "active",
  "past_due",
  "suspended",
  "cancel_scheduled",
  "canceled",
  "archived",
]);

/** 1:1 com auth.users do Supabase Auth (mesmo id). */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    /** Uma conta pode ter vários papéis (PRD §2). */
    roles: userRole("roles")
      .array()
      .notNull()
      .default(sql`'{}'::user_role[]`),
    /** Último painel usado: é o que abre no próximo login (AUT-FR-006). */
    lastPanel: userRole("last_panel"),
    storeId: uuid("store_id").references((): AnyPgColumn => stores.id),
    notifyEmail: boolean("notify_email").notNull().default(true),
    mustChangePassword: boolean("must_change_password")
      .notNull()
      .default(false),
    ...timestamps,
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Último uso; base da regra de inatividade (AUT-FR-004). */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    tempPasswordExpiresAt: timestamp("temp_password_expires_at", {
      withTimezone: true,
    }),
  },
  (t) => [
    // Equipe CajuGo e clientes não se misturam na mesma conta (AUT-SEC-009).
    check(
      "profiles_team_roles_separate",
      // Compara como texto: não depende de valores do enum criados na mesma transação.
      sql`not (${t.roles}::text[] && array['admin','support'] and ${t.roles}::text[] && array['store_owner','store_staff','seller','referrer'])`,
    ),
  ],
).enableRLS();

/** CPF ou CNPJ de quem paga a loja (spec 004). */
export const taxIdType = pgEnum("tax_id_type", ["cpf", "cnpj"]);

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    name: text("name").notNull(),
    // Só [a-z0-9-], validado na entrada; por isso não precisa de citext.
    slug: text("slug").notNull().unique(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    whatsapp: text("whatsapp").notNull(),
    /** Endereço em campos (SEO local); cidade e UF ficam em `city`/`state`. */
    addressStreet: text("address_street"),
    addressNumber: text("address_number"),
    addressComplement: text("address_complement"),
    addressDistrict: text("address_district"),
    /** CEP, 8 dígitos. */
    addressZip: text("address_zip"),
    about: text("about"),
    instagram: text("instagram"),
    logoPublicId: text("logo_public_id"),
    coverPublicId: text("cover_public_id"),
    hours: jsonb("hours"),
    shareByDefault: boolean("share_by_default").notNull().default(true),
    status: storeStatus("status").notNull().default("registered"),
    /** Última troca de endereço do catálogo: no máximo 1 a cada 30 dias (STO-FR-013). */
    slugChangedAt: timestamp("slug_changed_at", { withTimezone: true }),
    /** Endereço reservado até o 1º pagamento; liberado pela spec 011. */
    slugReservedUntil: timestamp("slug_reserved_until", { withTimezone: true }),
    ownerId: uuid("owner_id")
      .notNull()
      .references((): AnyPgColumn => profiles.id),
    /** Documento fiscal, só dígitos (PIX-FR-002); mascarado para o lojista. */
    taxId: text("tax_id"),
    taxIdType: taxIdType("tax_id_type"),
    /** Dia do vencimento (1–31), fixado na 1ª confirmação (PIX-FR-009). */
    billingDay: smallint("billing_day"),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }),
    /** Primeira ativação (onboarding [5e]). */
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("stores_tax_id").on(t.taxId)],
).enableRLS();

/** Contador por janela de tempo para rate limit de formulários públicos e login. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
).enableRLS();

/** Auditoria: só recebe insert (garantido no código, SECURITY.md §4 e §11). */
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data"),
  ...timestamps,
}).enableRLS();

/**
 * Regras configuráveis (spec 002, ADR 0010): uma linha por alteração, só INSERT.
 * Valor atual = linha mais recente da chave; valor numa data = mais recente até ela.
 * Chaves, formatos e limites em `src/domains/settings/definitions.ts`.
 */
export const settingValues = pgTable(
  "setting_values",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    key: text("key").notNull(),
    /** `null` = "não configurado" (só a chave Pix). */
    value: jsonb("value"),
    validFrom: timestamp("valid_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** `null` = valor provisório da migration. */
    changedBy: uuid("changed_by").references(() => profiles.id),
  },
  (t) => [index("setting_values_key_valid_from").on(t.key, t.validFrom.desc())],
).enableRLS();

/** Endereço antigo do catálogo que ainda leva à loja (90 dias, STO-FR-013). */
export const storeSlugRedirects = pgTable("store_slug_redirects", {
  oldSlug: text("old_slug").primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}).enableRLS();

export const referralStatus = pgEnum("referral_status", [
  "invited",
  "registered",
  "active",
  "paused",
  "ended",
  "rejected",
]);

/** Código de indicação (GLOSSARY): pessoal (`profile_id`) ou de campanha (spec 010). */
export const referralCodes = pgTable("referral_codes", {
  /** Maiúsculas e números (ex.: `RICARDO10`). */
  code: text("code").primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id)
    .unique(),
  campaignName: text("campaign_name"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}).enableRLS();

/** Indicação: quem indicou × loja indicada (uma por loja). Recompensas na spec 010. */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    code: text("code")
      .notNull()
      .references(() => referralCodes.code),
    referrerId: uuid("referrer_id").references(() => profiles.id),
    referredStoreId: uuid("referred_store_id")
      .notNull()
      .references(() => stores.id)
      .unique(),
    status: referralStatus("status").notNull().default("registered"),
    /** Por que a indicação não vale (ex.: `self_referral`, PIX-FR-003). */
    rejectReason: text("reject_reason"),
    monthsPaid: integer("months_paid").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("referrals_referrer_status").on(t.referrerId, t.status)],
).enableRLS();

/** Fatura (GLOSSARY): a 1ª mensalidade (`first`, spec 004) e as mensais (`monthly`, spec 011). */
export const invoiceKind = pgEnum("invoice_kind", ["first", "monthly"]);
export const invoiceStatus = pgEnum("invoice_status", [
  "open",
  "paid",
  "overdue",
  "canceled",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    kind: invoiceKind("kind").notNull(),
    /** AAAA-MM nas mensais; vazio na 1ª mensalidade. */
    period: text("period"),
    membershipCents: integer("membership_cents").notNull(),
    feesCents: integer("fees_cents").notNull().default(0),
    creditCents: integer("credit_cents").notNull().default(0),
    /** Valor esperado, fixado na abertura pela regra vigente (PIX-SEC-004). */
    totalCents: integer("total_cents").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: invoiceStatus("status").notNull().default("open"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("invoices_first_per_store")
      .on(t.storeId)
      .where(sql`${t.kind} = 'first'`),
    uniqueIndex("invoices_store_period").on(t.storeId, t.period),
    index("invoices_store_status").on(t.storeId, t.status),
  ],
).enableRLS();

/** Pagamento (GLOSSARY): comprovante enviado → confirmado ou recusado; ou registro sem comprovante. */
export const paymentStatus = pgEnum("payment_status", [
  "submitted",
  "confirmed",
  "rejected",
]);
export const paymentMethod = pgEnum("payment_method", [
  "pix",
  "cash",
  "transfer",
  "other",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    /** Valor pago informado pelo lojista; vazio no registro sem comprovante. */
    paidCents: integer("paid_cents"),
    /** Valor que vale: o informado ou o corrigido pelo admin (PIX-FR-008). */
    amountCents: integer("amount_cents").notNull(),
    /** Arquivo privado no Cloudinary (`authenticated`, ADR 0011). */
    receiptPublicId: text("receipt_public_id"),
    receiptFormat: text("receipt_format"),
    status: paymentStatus("status").notNull(),
    rejectReason: text("reject_reason"),
    manual: boolean("manual").notNull().default(false),
    method: paymentMethod("method").notNull().default("pix"),
    note: text("note"),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => profiles.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_status_submitted").on(t.status, t.submittedAt),
    index("payments_store").on(t.storeId, t.submittedAt),
    // Um comprovante em análise por fatura (PIX-FR-006, PIX-SEC-007).
    uniqueIndex("payments_one_in_review")
      .on(t.invoiceId)
      .where(sql`${t.status} = 'submitted'`),
    // Uma fatura tem no máximo um pagamento confirmado (PIX-SEC-007).
    uniqueIndex("payments_one_confirmed")
      .on(t.invoiceId)
      .where(sql`${t.status} = 'confirmed'`),
  ],
).enableRLS();

/** Aviso no painel (GLOSSARY, ADR 0007). Cada spec acrescenta os seus tipos. */
export const noticeKind = pgEnum("notice_kind", [
  "payment_confirmed",
  "payment_rejected",
]);

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    kind: noticeKind("kind").notNull(),
    /** Só o necessário para a frase (motivo, valores); nunca dado pessoal. */
    data: jsonb("data").notNull(),
    ...timestamps,
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => [index("notices_profile_created").on(t.profileId, t.createdAt)],
).enableRLS();
