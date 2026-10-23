/**
 * Cria um admin com senha temporária (AUT-SEC-009). Só na máquina do dono:
 *   pnpm admin:create <email> [nome]
 * Usa o banco e a chave secreta do Supabase do `.env.local`. A senha aparece uma vez aqui.
 */
import { createAdmin } from "@/domains/auth/create-admin";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import {
  createSupabaseServerClient,
  SupabaseAuthProvider,
} from "@/platform/supabase/server";

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  if (!email) {
    console.error("Uso: pnpm admin:create <email> [nome]");
    process.exit(1);
  }
  // Sem cookies: o script só usa as ações de admin (chave secreta).
  const auth = new SupabaseAuthProvider(
    createSupabaseServerClient({ getAll: () => [], setAll: () => {} }),
  );
  const { password } = await createAdmin(
    { db: getDb(), auth },
    { email, name: nameParts.join(" ") || undefined },
  );
  console.log(`Admin criado: ${email.trim().toLowerCase()}`);
  console.log(`Senha temporária (vale 24 h, aparece só agora): ${password}`);
  console.log("Entre em /entrar e crie a sua senha.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      error instanceof AppError
        ? error.title
        : `Falhou: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
