import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../schema";

/**
 * Banco já migrado, gerado uma vez por arquivo de teste: aplicar todas as migrations
 * em cada teste era o que deixava a suíte lenta. Cada teste recebe um clone dele.
 */
let migratedTemplate: Promise<File | Blob> | undefined;

async function buildTemplate() {
  const client = new PGlite();
  await migrate(drizzle(client, { schema }), { migrationsFolder: "drizzle" });
  const dump = await client.dumpDataDir("none");
  await client.close();
  return dump;
}

/**
 * Postgres em memória (PGlite) com todas as migrations de `drizzle/` aplicadas.
 * Cada chamada devolve um banco novo e vazio: nenhum teste vê dados de outro.
 */
export async function createTestDb() {
  migratedTemplate ??= buildTemplate();
  const client = new PGlite({ loadDataDir: await migratedTemplate });
  const db = drizzle(client, { schema });
  return { db, client, close: () => client.close() };
}
