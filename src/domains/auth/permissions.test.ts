import { describe, expect, it } from "vitest";
import type { Role, Session } from "@/platform/http/session";
import {
  authorizeArea,
  authorizeTo,
  can,
  type Permission,
} from "./permissions";

function sessionWith(...roles: Role[]): Session {
  return {
    userId: "u1",
    roles,
    activeRole: roles[0],
    storeId: roles.some((r) => r === "store_owner" || r === "store_staff")
      ? "s1"
      : null,
    mustChangePassword: false,
  };
}

describe("áreas", () => {
  it("[AUT-FR-012] indicador abrindo o admin recebe 403", () => {
    expect(() => authorizeArea(sessionWith("referrer"), "admin")).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("[AUT-FR-012] cada papel entra na sua área", () => {
    expect(authorizeArea(sessionWith("store_owner"), "painel")).toBeTruthy();
    expect(authorizeArea(sessionWith("store_staff"), "painel")).toBeTruthy();
    expect(authorizeArea(sessionWith("seller"), "rede")).toBeTruthy();
    expect(authorizeArea(sessionWith("referrer"), "indica")).toBeTruthy();
    expect(authorizeArea(sessionWith("admin"), "admin")).toBeTruthy();
    expect(authorizeArea(sessionWith("support"), "admin")).toBeTruthy();
  });

  it("[AUT-FR-012] sem sessão responde 401", () => {
    expect(() => authorizeArea(null, "painel")).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });
});

describe("ações do painel da loja", () => {
  const staffAllowed: Permission[] = [
    "vehicles.manage",
    "leads.view",
    "sales.confirm",
  ];
  const ownerOnly: Permission[] = [
    "store.edit",
    "billing.manage",
    "sellers.manage",
    "store.referral",
  ];

  it("[AUT-SEC-007] usuário da loja usa veículos, leads e confirmar venda", () => {
    const staff = sessionWith("store_staff");
    for (const p of staffAllowed) expect(can(staff, p)).toBe(true);
  });

  it("[AUT-SEC-007] usuário da loja não acessa conta, Minha loja, vendedores nem Caju Indica da loja", () => {
    const staff = sessionWith("store_staff");
    for (const p of ownerOnly) {
      expect(can(staff, p)).toBe(false);
      expect(() => authorizeTo(staff, p)).toThrow(
        expect.objectContaining({ status: 403 }),
      );
    }
  });

  it("[AUT-SEC-007] lojista faz tudo no painel da loja", () => {
    const owner = sessionWith("store_owner");
    for (const p of [...staffAllowed, ...ownerOnly])
      expect(can(owner, p)).toBe(true);
  });
});

describe("ações do admin", () => {
  const adminOnly: Permission[] = [
    "payments.review",
    "stores.suspend",
    "sellers.review",
    "users.temporaryPassword",
    "payouts.markPaid",
    "settings.edit",
    "team.manage",
  ];

  it("[AUT-SEC-008] suporte lê o admin e modera, sem outras ações", () => {
    const support = sessionWith("support");
    expect(can(support, "admin.read")).toBe(true);
    expect(can(support, "admin.moderate")).toBe(true);
    for (const p of adminOnly) expect(can(support, p)).toBe(false);
  });

  it("[AUT-SEC-008] admin faz todas as ações do admin", () => {
    const admin = sessionWith("admin");
    for (const p of [...adminOnly, "admin.read", "admin.moderate"] as const)
      expect(can(admin, p)).toBe(true);
  });

  it("[AUT-SEC-008] lojista não tem nenhuma ação do admin", () => {
    const owner = sessionWith("store_owner");
    for (const p of [...adminOnly, "admin.read", "admin.moderate"] as const)
      expect(can(owner, p)).toBe(false);
  });
});
