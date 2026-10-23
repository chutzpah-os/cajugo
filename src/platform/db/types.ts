import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Banco aceito pelos serviços: Supabase (postgres.js) em runtime, PGlite nos testes. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
