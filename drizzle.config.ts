import { defineConfig } from "drizzle-kit";

// Banco vindo de fora (ex.: `pnpm db:migrate:prod` com o `.env.prod`): não completa
// com o `.env.local`, para nunca misturar staging e produção.
if (!process.env.DATABASE_URL_MIGRATIONS && !process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sem .env.local: usa as variáveis já definidas no ambiente.
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/platform/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
});
