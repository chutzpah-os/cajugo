import type { Role } from "@/platform/http/session";

/** Nome de cada papel/painel na tela (GLOSSARY.md). */
export const PANEL_LABEL: Record<Role, string> = {
  store_owner: "Minha loja",
  store_staff: "Loja",
  seller: "Rede Caju",
  referrer: "Caju Indica",
  admin: "Admin",
  support: "Suporte",
};

/** Endereço de entrada de cada painel (o painel decide a tela inicial). */
export const PANEL_HREF: Record<Role, string> = {
  store_owner: "/painel",
  store_staff: "/painel",
  seller: "/rede",
  referrer: "/indica",
  admin: "/admin",
  support: "/admin",
};
