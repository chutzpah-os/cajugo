/**
 * Contas e loja dos testes ponta a ponta, no Supabase de STAGING (`.env.local`):
 *   pnpm e2e:seed
 * Senha de todas: `E2E_PASSWORD` do `.env.local`. Recusa rodar contra a produção.
 */
import { seedE2E } from "@/domains/auth/e2e-seed";
import { getDb } from "@/platform/db/client";
import {
  createSupabaseServerClient,
  SupabaseAuthProvider,
} from "@/platform/supabase/server";

/** Ref do projeto `cajugo-prod` (DEPLOYMENT.md): contas de teste nunca vão para lá. */
const PRODUCTION_REF = "bomhlbnniwdxavtsipkx";

async function main() {
  const password = process.env.E2E_PASSWORD;
  if (!password || password.length < 8) {
    console.error("Defina E2E_PASSWORD (8+ caracteres) no .env.local.");
    process.exit(1);
  }
  const target = `${process.env.SUPABASE_URL} ${process.env.DATABASE_URL}`;
  if (target.includes(PRODUCTION_REF)) {
    console.error("Recusado: as variáveis apontam para a produção.");
    process.exit(1);
  }
  const auth = new SupabaseAuthProvider(
    createSupabaseServerClient({ getAll: () => [], setAll: () => {} }),
  );
  await seedE2E({ db: getDb(), auth }, password);
  console.log("Contas de teste prontas no staging.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      `Falhou: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
