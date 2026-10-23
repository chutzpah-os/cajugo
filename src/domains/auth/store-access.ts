import type { Role } from "@/platform/http/session";
import { landingFor, type StoreStatus } from "./landing";

/** Páginas que cada situação da loja libera; o resto volta ao painel inicial. */
function allowedPaths(
  role: "store_owner" | "store_staff",
  status: StoreStatus | null,
): readonly string[] | "all" {
  if (role === "store_staff") {
    if (
      status === "active" ||
      status === "past_due" ||
      status === "suspended" ||
      status === "cancel_scheduled"
    )
      return "all";
    return ["/painel/loja-indisponivel"];
  }
  switch (status) {
    case "registered":
      return ["/lojistas/pagamento"];
    case "payment_review":
    case "active":
    case "past_due":
    case "suspended":
    case "cancel_scheduled":
      return "all";
    default:
      return ["/painel/conta"];
  }
}

const within = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

/** Telas de situação: só aparecem para quem está nela. */
const SITUATION_PATHS = ["/lojistas/pagamento", "/painel/loja-indisponivel"];

/**
 * Pode abrir `path` com a loja nesse status? (AUT-FR-008, 009, 010, 016).
 * Papel e permissão da tela são checados à parte (`authorizeArea` / `authorizeTo`).
 */
export function storeAccess(
  roles: readonly Role[],
  status: StoreStatus | null,
  path: string,
): { ok: true } | { ok: false; redirectTo: string } {
  const role = roles.includes("store_owner") ? "store_owner" : "store_staff";
  const allowed = allowedPaths(role, status);
  const ok =
    allowed === "all"
      ? !SITUATION_PATHS.some((p) => within(path, p))
      : allowed.some((p) => within(path, p));
  if (ok) return { ok: true };
  return {
    ok: false,
    redirectTo: landingFor(
      { roles: [role], mustChangePassword: false },
      { lastPanel: role, storeStatus: status },
    ),
  };
}
