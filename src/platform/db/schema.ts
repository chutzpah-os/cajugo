import {
  boolean,
  check,
  date,
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
  customType,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql, type SQL } from "drizzle-orm";
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
    /** Só dígitos; vendedor no cadastro (008), indicador no 1º resgate (010). */
    cpf: text("cpf"),
    /** Chave Pix para receber (vendedor, indicador); tipo de `pixKeySchema`. */
    pixKey: text("pix_key"),
    pixKeyType: text("pix_key_type"),
  },
  (t) => [
    uniqueIndex("profiles_cpf")
      .on(t.cpf)
      .where(sql`${t.cpf} is not null`),
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

/** Comissão da loja para o vendedor (PRD §5.7): % do preço ou valor fixo. */
export const commissionType = pgEnum("commission_type", ["pct", "fixed"]);

/** Letras acentuadas do português (e vizinhas) e o equivalente sem acento. */
const ACCENTS_FROM = "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ";
const ACCENTS_TO = "AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn";

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    name: text("name").notNull(),
    // Só [a-z0-9-], validado na entrada; por isso não precisa de citext.
    slug: text("slug").notNull().unique(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    /**
     * Cidade no endereço de descoberta (`/carros/campinas-sp`, ADR 0014), gerada pelo
     * banco: igual ao `slugify` da aplicação para todas as cidades do IBGE (teste de
     * migration). `translate` antes de `lower`: não depende do locale do banco.
     */
    citySlug: text("city_slug").generatedAlwaysAs((): SQL =>
      sql.raw(
        `trim(both '-' from regexp_replace(lower(translate(city, '${ACCENTS_FROM}', '${ACCENTS_TO}')), '[^a-z0-9]+', '-', 'g')) || '-' || lower(state)`,
      ),
    ),
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
    /**
     * Comissão padrão da loja (008, D2): pontos-base em `pct`, centavos em `fixed`.
     * A tela de configurar [7e] é da 009.
     */
    commissionType: commissionType("commission_type"),
    commissionValue: integer("commission_value"),
    /** "Aceitar vendedores independentes" [7e] (009, D1): começa desligado. */
    acceptsSellers: boolean("accepts_sellers").notNull().default(false),
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
    /** Começo do atraso (011): a tolerância conta daqui; a reativação do admin reinicia. */
    pastDueSince: timestamp("past_due_since", { withTimezone: true }),
    /** Primeira ativação (onboarding [5e]). */
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    /** Cancelamento pedido pelo dono [12h] (011b). */
    cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
    /** Motivo opcional, texto de `CANCEL_REASONS` (011b). */
    cancelReason: text("cancel_reason"),
    /** Fim do período pago depois do cancelamento (o `next_due_at` daquele dia). */
    activeUntil: timestamp("active_until", { withTimezone: true }),
    /** Loja cancelada (fim do período ou na hora); a retenção conta daqui (011b). */
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("stores_tax_id").on(t.taxId),
    index("stores_city_slug_status").on(t.citySlug, t.status),
  ],
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
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    ...timestamps,
  },
  // Logs de atividade e histórico da loja do admin (012b), 20 por vez.
  (t) => [
    index("activity_log_created").on(t.createdAt.desc()),
    index("activity_log_entity_created").on(t.entityId, t.createdAt.desc()),
  ],
).enableRLS();

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

/** Recompensa do Caju Indica (010): crédito na fatura do lojista ou saldo de quem indica. */
export const rewardTarget = pgEnum("reward_target", ["credit", "balance"]);

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
    // Uma 1ª mensalidade aberta por vez: quem reassina (011b) abre outra.
    uniqueIndex("invoices_first_open_per_store")
      .on(t.storeId)
      .where(sql`${t.kind} = 'first' and ${t.status} = 'open'`),
    uniqueIndex("invoices_store_period").on(t.storeId, t.period),
    index("invoices_store_status").on(t.storeId, t.status),
    // Ciclo de cobrança (011): faturas abertas por vencimento.
    index("invoices_open_due").on(t.status, t.dueAt),
  ],
).enableRLS();

/** Crédito da loja (011, GLOSSARY): abatido na próxima fatura. */
export const creditKind = pgEnum("credit_kind", [
  "overpayment",
  "fee_refund",
  "referral",
]);

export const billingCredits = pgTable(
  "billing_credits",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    kind: creditKind("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** Pagamento (sobra) ou venda (taxa devolvida) de origem. */
    sourceId: uuid("source_id"),
    /** Nulo enquanto disponível; a fatura em que foi abatido. */
    appliedInvoiceId: uuid("applied_invoice_id").references(() => invoices.id),
    ...timestamps,
  },
  (t) => [
    index("billing_credits_store_open")
      .on(t.storeId)
      .where(sql`${t.appliedInvoiceId} is null`),
  ],
).enableRLS();

/** Recompensa (GLOSSARY): uma por fatura paga da loja indicada (010, IND-NFR-003). */
export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => referrals.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id)
      .unique(),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => profiles.id),
    target: rewardTarget("target").notNull(),
    amountCents: integer("amount_cents").notNull(),
    ...timestamps,
  },
  (t) => [
    index("referral_rewards_beneficiary").on(t.beneficiaryId, t.createdAt),
    index("referral_rewards_referral").on(t.referralId),
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
  "vehicle_hidden",
  "vehicle_shown",
  "invoice_due",
  "store_suspended",
  "store_reactivated",
  "sale_confirmed",
  "commission_received",
  "commission_unreceived",
  "referral_active",
  "referral_reward",
  "cancel_scheduled",
  "cancel_undone",
  "store_canceled",
  "plan_changed",
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

/** Texto de busca do Postgres (coluna gerada, spec 006). */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/** Status do veículo (GLOSSARY, PRD §5.3). */
export const vehicleStatus = pgEnum("vehicle_status", [
  "draft",
  "pending_approval",
  "published",
  "hidden",
  "sold",
  "deleted",
]);

/**
 * Motivo da denúncia e do Ocultar (spec 007b). `other` só no Ocultar, com nota.
 */
export const reportReason = pgEnum("report_reason", [
  "sold",
  "unreal_price",
  "wrong_photos",
  "scam",
  "other",
]);

/** Veículo (spec 005). Placa e chassi nunca vão para página pública (VEH-SEC-002). */
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    status: vehicleStatus("status").notNull().default("draft"),
    /** Ids e nomes da tabela FIPE (os nomes ficam mesmo se a FIPE mudar). */
    fipeBrandId: text("fipe_brand_id"),
    fipeModelId: text("fipe_model_id"),
    fipeYearId: text("fipe_year_id"),
    make: text("make"),
    model: text("model"),
    version: text("version"),
    yearManufacture: smallint("year_manufacture"),
    yearModel: smallint("year_model"),
    mileageKm: integer("mileage_km"),
    transmission: text("transmission"),
    fuel: text("fuel"),
    body: text("body"),
    color: text("color"),
    doors: smallint("doors"),
    engine: text("engine"),
    plate: text("plate"),
    plateEnd: text("plate_end"),
    chassis: text("chassis"),
    priceCents: integer("price_cents"),
    /** Referência FIPE do mês (VEH-FR-007). */
    fipeCode: text("fipe_code"),
    fipePriceCents: integer("fipe_price_cents"),
    fipeMonth: text("fipe_month"),
    showInstallment: boolean("show_installment").notNull().default(false),
    /** Condições Sim/Não do PRD [2a] (lista fechada, validada no domínio). */
    conditions: jsonb("conditions").notNull().default({}),
    features: text("features")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    description: text("description"),
    contactWhatsapp: text("contact_whatsapp"),
    shareOnCajugo: boolean("share_on_cajugo").notNull().default(true),
    /** Divulgação antes da venda, para "Desfazer venda" (VEH-FR-013). */
    shareBeforeSale: boolean("share_before_sale"),
    /**
     * Marca de moderação do Ocultar (007b, D2): sobrevive a despublicar, publicar e
     * desfazer a venda; só "Mostrar de novo" limpa.
     */
    hiddenReason: reportReason("hidden_reason"),
    hiddenNote: text("hidden_note"),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenBy: uuid("hidden_by").references(() => profiles.id),
    /** Ajuste da comissão deste veículo, no lugar da padrão da loja (009). */
    commissionOverrideType: commissionType("commission_override_type"),
    commissionOverrideValue: integer("commission_override_value"),
    /** Venda ativa da Rede Caju (009, D3): com ela, o desfazer simples é recusado. */
    saleId: uuid("sale_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    /** Excluído: guardado 90 dias para o admin (VEH-FR-014). */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** Filtro por marca e descoberta (spec 006). */
    makeSlug: text("make_slug"),
    modelSlug: text("model_slug"),
    /** Marca, modelo e versão sem acento, feito pela aplicação (ADR 0013 e D3). */
    searchText: text("search_text").notNull().default(""),
    search: tsvector("search").generatedAlwaysAs(
      (): SQL => sql`to_tsvector('simple', search_text)`,
    ),
    /** Relevância (GLOSSARY): dia da publicação + completude do anúncio. */
    rankScore: integer("rank_score").notNull().default(0),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("vehicles_store_status").on(t.storeId, t.status),
    index("vehicles_status_share").on(t.status, t.shareOnCajugo),
    // Marca, marca + modelo e "a página já existiu" (D2 da 006b), em qualquer status.
    index("vehicles_make_model_slug").on(t.makeSlug, t.modelSlug),
    index("vehicles_search").using("gin", t.search),
    index("vehicles_status_rank").on(t.status, t.rankScore.desc(), t.id),
    index("vehicles_status_price").on(t.status, t.priceCents, t.id),
    index("vehicles_status_published").on(t.status, t.publishedAt.desc(), t.id),
    index("vehicles_store_status_rank").on(
      t.storeId,
      t.status,
      t.rankScore.desc(),
      t.id,
    ),
  ],
).enableRLS();

/** Fotos do veículo; posição 0 = capa (VEH-FR-004). */
export const vehiclePhotos = pgTable(
  "vehicle_photos",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    publicId: text("public_id").notNull(),
    position: smallint("position").notNull(),
    width: integer("width"),
    height: integer("height"),
    ...timestamps,
  },
  (t) => [uniqueIndex("vehicle_photos_position").on(t.vehicleId, t.position)],
).enableRLS();

/** Histórico de mudanças do veículo publicado (GLOSSARY); spec 005: `field = price`. */
export const vehicleHistory = pgTable(
  "vehicle_history",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    userId: uuid("user_id").references(() => profiles.id),
    ...timestamps,
  },
  (t) => [index("vehicle_history_vehicle").on(t.vehicleId, t.createdAt)],
).enableRLS();

/** Tabela FIPE copiada sob demanda (ADR 0012); só o domínio `fipe` escreve. */
export const fipeBrands = pgTable("fipe_brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
}).enableRLS();

export const fipeModels = pgTable(
  "fipe_models",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id").notNull(),
    name: text("name").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("fipe_models_brand").on(t.brandId)],
).enableRLS();

export const fipeYears = pgTable(
  "fipe_years",
  {
    /** `{modelo}:{código do ano}` (ex.: `5940:2020-1`). */
    id: text("id").primaryKey(),
    modelId: text("model_id").notNull(),
    label: text("label").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("fipe_years_model").on(t.modelId)],
).enableRLS();

export const fipePrices = pgTable("fipe_prices", {
  yearId: text("year_id").primaryKey(),
  fipeCode: text("fipe_code").notNull(),
  priceCents: integer("price_cents").notNull(),
  /** Mês de referência da FIPE (ex.: "novembro de 2026"). */
  month: text("month").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
}).enableRLS();

/** Estados do "Avisar quando chegar" (GLOSSARY: Alerta de busca, spec 006d). */
export const searchAlertStatus = pgEnum("search_alert_status", [
  "pending",
  "notified",
  "canceled",
  "expired",
]);

/**
 * "Avisar quando chegar" [12a]. Nome e celular só para o admin e apagados ao fechar
 * (ALR-SEC-004); a busca é a query normalizada dos filtros e a página da descoberta.
 */
export const searchAlerts = pgTable(
  "search_alerts",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    status: searchAlertStatus("status").notNull().default("pending"),
    name: text("name"),
    /** `55` + DDD + 9 dígitos. */
    phone: text("phone"),
    query: text("query").notNull(),
    /** `/carros/...` quando o pedido veio de uma página de descoberta; vitrine = null. */
    discoveryPath: text("discovery_path"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notifiedBy: uuid("notified_by").references(() => profiles.id),
  },
  (t) => [
    uniqueIndex("search_alerts_pending_search")
      .on(t.phone, t.query, sql`coalesce(${t.discoveryPath}, '')`)
      .where(sql`${t.status} = 'pending'`),
    index("search_alerts_status_created").on(t.status, t.createdAt),
  ],
).enableRLS();

export const leadChannel = pgEnum("lead_channel", ["form", "whatsapp"]);
export const leadOrigin = pgEnum("lead_origin", [
  "cajugo",
  "store_catalog",
  "seller",
]);
export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacting",
  "negotiating",
  "sold",
  "lost",
]);

/**
 * Contato de um visitante com a loja sobre um veículo (spec 007). Veículo e loja só
 * são apagados de verdade na limpeza dos testes (no app é exclusão lógica): cascade.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    channel: leadChannel("channel").notNull(),
    origin: leadOrigin("origin").notNull(),
    status: leadStatus("status").notNull(),
    /** Nulos no lead pelo WhatsApp e depois de 2 anos (LED-SEC-006). */
    name: text("name"),
    email: text("email"),
    /** `55` + DDD + número. */
    phone: text("phone"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    purgedAt: timestamp("purged_at", { withTimezone: true }),
    /** Vendedor do link, quando ativo e parceiro da loja (008). */
    sellerId: uuid("seller_id").references(
      (): AnyPgColumn => sellers.profileId,
    ),
  },
  (t) => [
    index("leads_store_status_created").on(
      t.storeId,
      t.status,
      t.createdAt.desc(),
    ),
    index("leads_store_created").on(t.storeId, t.createdAt.desc()),
    index("leads_vehicle").on(t.vehicleId),
    index("leads_created_unpurged")
      .on(t.createdAt)
      .where(sql`${t.purgedAt} is null`),
  ],
).enableRLS();

/** Visualizações por veículo e dia (São Paulo): 1 por aparelho por dia (LED-FR-015). */
export const vehicleDailyStats = pgTable(
  "vehicle_daily_stats",
  {
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.vehicleId, t.day] })],
).enableRLS();

/** Status da denúncia de anúncio (spec 007b). */
export const reportStatus = pgEnum("report_status", ["open", "kept", "hidden"]);

/**
 * Denúncia de anúncio (spec 007b). Não guarda quem denunciou, nem conta nem IP
 * (RPT-SEC-006); o id é a chave do envio gerada na tela (idempotência).
 */
export const vehicleReports = pgTable(
  "vehicle_reports",
  {
    id: uuid("id").primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    reason: reportReason("reason").notNull(),
    details: text("details"),
    status: reportStatus("status").notNull().default("open"),
    decidedBy: uuid("decided_by").references(() => profiles.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("vehicle_reports_open")
      .on(t.vehicleId, t.createdAt)
      .where(sql`${t.status} = 'open'`),
  ],
).enableRLS();

/** Status do vendedor (GLOSSARY, PRD §5.10). */
export const sellerStatus = pgEnum("seller_status", [
  "in_review",
  "active",
  "blocked",
]);

/**
 * Vendedor da Rede Caju (spec 008): 1:1 com a conta. Fotos do documento privadas
 * (`authenticated`, ADR 0011); o código nasce na aprovação e nunca muda.
 */
export const sellers = pgTable(
  "sellers",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .references(() => profiles.id),
    code: text("code").unique(),
    city: text("city").notNull(),
    status: sellerStatus("status").notNull().default("in_review"),
    documentFrontPublicId: text("document_front_public_id"),
    documentFrontFormat: text("document_front_format"),
    documentBackPublicId: text("document_back_public_id"),
    documentBackFormat: text("document_back_format"),
    blockedReason: text("blocked_reason"),
    decidedBy: uuid("decided_by").references(() => profiles.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("sellers_status_created").on(t.status, t.createdAt)],
).enableRLS();

export const partnershipStatus = pgEnum("partnership_status", [
  "pending",
  "active",
  "declined",
  "ended",
]);
export const partnershipOrigin = pgEnum("partnership_origin", [
  "request",
  "invite",
]);

/**
 * Parceria vendedor × loja (GLOSSARY). Uma aberta (pendente ou ativa) por par; o
 * bloqueio do vendedor não muda a parceria, só deixa de valer (008).
 */
export const partnerships = pgTable(
  "partnerships",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.profileId),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    origin: partnershipOrigin("origin").notNull(),
    status: partnershipStatus("status").notNull().default("pending"),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("partnerships_open")
      .on(t.sellerId, t.storeId)
      .where(sql`${t.status} in ('pending', 'active')`),
    index("partnerships_store_status").on(t.storeId, t.status),
  ],
).enableRLS();

/** Cliques no link do vendedor por veículo e dia de São Paulo (SEL-FR-010). */
export const sellerVehicleClicks = pgTable(
  "seller_vehicle_clicks",
  {
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.profileId),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    clicks: integer("clicks").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sellerId, t.vehicleId, t.day] })],
).enableRLS();

/** Quem vendeu na Confirmar venda [7g] (009). */
export const saleAttribution = pgEnum("sale_attribution", [
  "link",
  "other_partner",
  "store",
]);
/** Status da comissão (GLOSSARY): "em análise" é da fase 2. */
export const commissionStatus = pgEnum("commission_status", [
  "to_receive",
  "paid",
]);

/**
 * Venda da Rede Caju (spec 009): valor final, atribuição, comissão e taxa CajuGo
 * guardadas na confirmação (D4). Uma ativa por veículo; desfazer preenche
 * `canceled_at`. A fatura (011) preenche `invoice_id`.
 */
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    finalPriceCents: integer("final_price_cents").notNull(),
    attribution: saleAttribution("attribution").notNull(),
    sellerId: uuid("seller_id").references(() => sellers.profileId),
    commissionCents: integer("commission_cents"),
    commissionStatus: commissionStatus("commission_status"),
    feeBps: integer("fee_bps"),
    feeCents: integer("fee_cents"),
    invoiceId: uuid("invoice_id"),
    /** "Recebi" do vendedor (008b): o desfazer vale por 24 h; nulo se a loja marcou paga. */
    commissionReceivedAt: timestamp("commission_received_at", {
      withTimezone: true,
    }),
    confirmedBy: uuid("confirmed_by")
      .notNull()
      .references(() => profiles.id),
    ...timestamps,
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("sales_vehicle_active")
      .on(t.vehicleId)
      .where(sql`${t.canceledAt} is null`),
    index("sales_store_created").on(t.storeId, t.createdAt),
    index("sales_seller_created").on(t.sellerId, t.createdAt),
  ],
).enableRLS();
