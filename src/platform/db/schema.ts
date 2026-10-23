import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
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
]);

/** 1:1 com auth.users do Supabase Auth (mesmo id). */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: userRole("role").notNull(),
  storeId: uuid("store_id").references((): AnyPgColumn => stores.id),
  notifyEmail: boolean("notify_email").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  ...timestamps,
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}).enableRLS();

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  name: text("name").notNull(),
  // Só [a-z0-9-], validado na entrada; por isso não precisa de citext.
  slug: text("slug").notNull().unique(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  whatsapp: text("whatsapp").notNull(),
  address: text("address"),
  about: text("about"),
  instagram: text("instagram"),
  logoPublicId: text("logo_public_id"),
  coverPublicId: text("cover_public_id"),
  hours: jsonb("hours"),
  shareByDefault: boolean("share_by_default").notNull().default(true),
  ownerId: uuid("owner_id")
    .notNull()
    .references((): AnyPgColumn => profiles.id),
  ...timestamps,
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

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
