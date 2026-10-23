import { cookies } from "next/headers";
import type { AuthProvider } from "./auth-provider";
import {
  createSupabaseServerClient,
  SupabaseAuthProvider,
  withSessionMaxAge,
} from "./server";

/**
 * `AuthProvider` da requisição atual (Server Components, Server Actions, Route Handlers).
 * Em Server Component não dá para gravar cookie: a renovação fica com o `proxy.ts`.
 */
export async function requestAuthProvider(): Promise<AuthProvider> {
  const store = await cookies();
  return new SupabaseAuthProvider(
    createSupabaseServerClient({
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list)
            store.set(name, value, withSessionMaxAge(options));
        } catch {
          // Server Component: só leitura; o proxy.ts já renovou a sessão.
        }
      },
    }),
  );
}
