import { describe, expect, it } from "vitest";
import type { Role, Session } from "@/platform/http/session";
import { AREA_NAV } from "./navigation";
import { can } from "./permissions";

const as = (role: Role): Session => ({
  userId: "u",
  roles: [role],
  activeRole: role,
  storeId: "s",
  mustChangePassword: false,
});
const itemsFor = (role: Role) =>
  (AREA_NAV.painel ?? [])
    .filter((i) => !i.permission || can(as(role), i.permission))
    .map((i) => i.label);

describe("menu do painel do lojista", () => {
  it("[LED-FR-011] Veículos · Leads · Minha loja · Conta, todos na barra do celular", () => {
    // Act / Assert
    expect(itemsFor("store_owner")).toEqual([
      "Veículos",
      "Leads",
      "Minha loja",
      "Conta",
    ]);
    expect(AREA_NAV.painel?.every((i) => i.mobile)).toBe(true);
    expect(AREA_NAV.painel?.find((i) => i.label === "Leads")?.href).toBe(
      "/painel/leads",
    );
  });

  it("[LED-FR-011] usuário da loja vê só o que pode abrir (AUT-SEC-007)", () => {
    // Act / Assert
    expect(itemsFor("store_staff")).toEqual(["Veículos", "Leads"]);
  });
});
