import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.example).");

// Pooler do Supabase em modo transação não suporta prepared statements.
const sql = postgres(url, { prepare: false });

export const db = drizzle(sql, { schema });
