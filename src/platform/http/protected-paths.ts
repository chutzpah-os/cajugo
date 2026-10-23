/** Áreas que exigem login (AUT-FR-011). Os cadastros públicos ficam de fora. */
const PROTECTED = [
  "/painel",
  "/rede",
  "/indica",
  "/admin",
  "/lojistas/pagamento",
  "/nova-senha",
];
const PUBLIC_EXCEPTIONS = ["/rede/cadastro", "/indica/cadastro"];

const within = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

/** Checagem otimista do `proxy.ts`; papel e loja são checados no servidor, perto dos dados. */
export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_EXCEPTIONS.some((p) => within(pathname, p))) return false;
  return PROTECTED.some((p) => within(pathname, p));
}

/** `/entrar?next=` com a página pedida; a volta passa por `safeNext`. */
export function loginUrl(pathname: string, search: string): string {
  return `/entrar?next=${encodeURIComponent(pathname + search)}`;
}
