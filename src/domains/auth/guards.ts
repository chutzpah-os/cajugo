import { redirect } from "next/navigation";
import { getDb } from "@/platform/db/client";
import { loginUrl } from "@/platform/http/protected-paths";
import type { Session } from "@/platform/http/session";
import { currentSession } from "./current";
import { landingFor } from "./landing";
import { AREAS, can, type Area, type Permission } from "./permissions";
import { storeStatusOf } from "./service";
import { storeAccess } from "./store-access";

/**
 * Sessão para uma tela logada: sem sessão → login; senha temporária → nova senha (AUT-FR-015).
 * `allowed` diz se a conta tem papel para a área (AUT-FR-012); se não, a própria página
 * mostra "Sem permissão" com o link `home` (o layout sempre renderiza a página).
 */
export async function requireArea(
  area: Area,
  path: string,
): Promise<{ session: Session; allowed: boolean; home: string }> {
  const session = await currentSession();
  if (!session) redirect(loginUrl(path, ""));
  if (session.mustChangePassword) redirect("/nova-senha");
  const roles: readonly string[] = AREAS[area];
  const home = landingFor(session, {
    lastPanel: session.activeRole,
    storeStatus: await storeStatusOf(getDb(), session.storeId),
  });
  return {
    session,
    allowed: session.roles.some((r) => roles.includes(r)),
    home,
  };
}

/**
 * Tela do painel da loja: além da área, aplica a situação da loja (AUT-FR-008, 010, 016)
 * e, se informada, a permissão da tela (AUT-SEC-007).
 */
export async function requireStorePage(
  path: string,
  permission?: Permission,
): Promise<{ session: Session; allowed: boolean; home: string }> {
  const area = await requireArea("painel", path);
  const { session, allowed, home } = area;
  if (!allowed) return area;
  const access = storeAccess(
    session.roles,
    await storeStatusOf(getDb(), session.storeId),
    path,
  );
  if (!access.ok) redirect(access.redirectTo);
  return { session, allowed: !permission || can(session, permission), home };
}
