import { NextResponse, type NextRequest } from "next/server";
import { gateDecision } from "@/domains/showcase/service";
import { parseRefCode } from "@/domains/showcase/urls";
import { getDb } from "@/platform/db/client";
import { isProtectedPath, loginUrl } from "@/platform/http/protected-paths";
import { createGate } from "@/platform/http/public-gate";
import {
  createSupabaseServerClient,
  withSessionMaxAge,
} from "@/platform/supabase/server";

/**
 * Renova a sessão do Supabase a cada requisição (janela deslizante, AUT-FR-004) e manda
 * para o login quem abre área logada sem sessão (AUT-FR-011). Checagem otimista: papel,
 * loja e senha temporária são conferidos no servidor, em cada página e action.
 */
const gate = createGate((path) => gateDecision(getDb(), path));

const REF_COOKIE = "cajugo_ref";
const REF_MAX_AGE = 30 * 24 * 60 * 60;
const FILTER_PARAMS = [
  "marca",
  "preco_de",
  "preco_ate",
  "ano_de",
  "ano_ate",
  "km_ate",
  "cambio",
  "combustivel",
  "ordem",
  "q",
];

export async function proxy(request: NextRequest) {
  const { pathname: path, searchParams } = request.nextUrl;
  // Status real de loja e veículo, antes de a página responder (ADR 0013).
  if (
    path.startsWith("/loja/") ||
    path.startsWith("/v/") ||
    path.startsWith("/carros/")
  ) {
    const decision = await gate(path);
    if (decision === "not-found")
      return NextResponse.rewrite(new URL("/_nao-encontrado", request.url));
    if (decision !== "ok")
      return NextResponse.redirect(
        new URL(`${decision.redirect}${request.nextUrl.search}`, request.url),
        308,
      );
  }

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
  // Vitrine com filtros numa rota interna: a `/` fica pré-renderizada (ADR 0013).
  if (path === "/" && FILTER_PARAMS.some((p) => searchParams.has(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/vitrine";
    const rewrite = NextResponse.rewrite(url);
    for (const cookie of response.cookies.getAll()) rewrite.cookies.set(cookie);
    response = rewrite;
  }
  // Código do vendedor: 30 dias, vale o último (SHW-FR-009).
  const ref = path.startsWith("/v/")
    ? parseRefCode(searchParams.get("ref"))
    : null;
  if (ref)
    response.cookies.set(REF_COOKIE, ref, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: REF_MAX_AGE,
      path: "/",
    });
  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
