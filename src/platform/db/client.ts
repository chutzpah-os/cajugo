import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let instance: ReturnType<typeof connect> | undefined;

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida (veja .env.example).");
  // Pooler do Supabase em modo transação não suporta prepared statements.
  return drizzle(postgres(url, { prepare: false }), { schema });
}

/**
 * Banco da aplicação. Conecta no primeiro uso, não ao importar: o build
 * (que só carrega as páginas) não depende das variáveis do banco.
 */
export function getDb() {
  instance ??= connect();
  return instance;
}
