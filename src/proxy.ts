import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath, loginUrl } from "@/platform/http/protected-paths";
import {
  createSupabaseServerClient,
  withSessionMaxAge,
} from "@/platform/supabase/server";

/**
 * Renova a sessão do Supabase a cada requisição (janela deslizante, AUT-FR-004) e manda
 * para o login quem abre área logada sem sessão (AUT-FR-011). Checagem otimista: papel,
 * loja e senha temporária são conferidos no servidor, em cada página e action.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClient({
    getAll: () => request.cookies.getAll(),
    setAll: (list, headers) => {
      for (const { name, value } of list) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of list)
        response.cookies.set(name, value, withSessionMaxAge(options));
      for (const [key, value] of Object.entries(headers))
        response.headers.set(key, value);
    },
  });

  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  if (!data?.claims && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(
      new URL(loginUrl(pathname, search), request.url),
    );
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
