import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../schema";

/**
 * Postgres em memória (PGlite) com todas as migrations de `drizzle/` aplicadas.
 * Cada chamada devolve um banco novo e vazio: nenhum teste vê dados de outro.
 */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, client, close: () => client.close() };
}
