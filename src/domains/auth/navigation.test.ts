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
      "Avisos",
    ]);
    expect(
      AREA_NAV.painel?.filter((i) => i.mobile).map((i) => i.label),
    ).toEqual(["Veículos", "Leads", "Minha loja", "Conta"]);
    expect(AREA_NAV.painel?.find((i) => i.label === "Leads")?.href).toBe(
      "/painel/leads",
    );
  });

  it("[LED-FR-011] usuário da loja vê só o que pode abrir (AUT-SEC-007)", () => {
    // Act / Assert
    expect(itemsFor("store_staff")).toEqual(["Veículos", "Leads", "Avisos"]);
  });
});

describe("menu do admin", () => {
  it("[RPT-FR-007] Denúncias para admin e suporte, na gaveta Mais do celular e na barra lateral", () => {
    // Arrange
    const item = AREA_NAV.admin?.find((i) => i.label === "Denúncias");

    // Assert
    expect(item).toMatchObject({
      href: "/admin/denuncias",
      permission: "admin.moderate",
    });
    expect(item?.mobile).toBeFalsy();
    expect(can(as("admin"), "admin.moderate")).toBe(true);
    expect(can(as("support"), "admin.moderate")).toBe(true);
  });
});

describe("menu do vendedor", () => {
  it("[SEL-FR-015] Início · Vitrine · Extrato · Conta, todos na barra do celular", () => {
    // Assert
    expect(AREA_NAV.rede?.map((i) => [i.label, i.href])).toEqual([
      ["Início", "/rede-caju"],
      ["Vitrine", "/rede-caju/vitrine"],
      ["Extrato", "/rede-caju/extrato"],
      ["Conta", "/rede-caju/conta"],
      ["Avisos", "/rede-caju/avisos"],
    ]);
    expect(AREA_NAV.rede?.filter((i) => i.mobile)).toHaveLength(4);
  });

  it("[DSG-FR-020] cada painel tem o item Avisos, o único lugar dos avisos", () => {
    for (const area of ["painel", "rede", "indica", "admin"] as const)
      expect(AREA_NAV[area]?.find((i) => i.label === "Avisos")?.href).toBe(
        `/${area === "rede" ? "rede-caju" : area}/avisos`,
      );
  });
});
