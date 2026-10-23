import { describe, expect, it } from "vitest";
import type { Role } from "@/platform/http/session";
import { landingFor, pickPanel, type StoreStatus } from "./landing";

function account(roles: Role[], extra: { mustChangePassword?: boolean } = {}) {
  return { roles, mustChangePassword: extra.mustChangePassword ?? false };
}

describe("landingFor", () => {
  it("[AUT-FR-006] cada papel único vai para o seu painel", () => {
    const active = { lastPanel: null, storeStatus: "active" as const };
    expect(landingFor(account(["store_owner"]), active)).toBe(
      "/painel/veiculos",
    );
    expect(landingFor(account(["store_staff"]), active)).toBe(
      "/painel/veiculos",
    );
    expect(
      landingFor(account(["seller"]), { lastPanel: null, storeStatus: null }),
    ).toBe("/rede");
    expect(
      landingFor(account(["referrer"]), { lastPanel: null, storeStatus: null }),
    ).toBe("/indica");
    expect(
      landingFor(account(["admin"]), { lastPanel: null, storeStatus: null }),
    ).toBe("/admin");
    expect(
      landingFor(account(["support"]), { lastPanel: null, storeStatus: null }),
    ).toBe("/admin");
  });

  it("[AUT-FR-006] no primeiro acesso segue a ordem lojista → vendedor → indicador", () => {
    expect(
      landingFor(account(["referrer", "seller"]), {
        lastPanel: null,
        storeStatus: null,
      }),
    ).toBe("/rede");
    expect(
      landingFor(account(["referrer", "seller", "store_owner"]), {
        lastPanel: null,
        storeStatus: "active",
      }),
    ).toBe("/painel/veiculos");
  });

  it("[AUT-FR-006] volta ao último painel usado", () => {
    expect(
      landingFor(account(["seller", "referrer"]), {
        lastPanel: "referrer",
        storeStatus: null,
      }),
    ).toBe("/indica");
  });

  it("[AUT-FR-006] ignora último painel de um papel que a conta não tem mais", () => {
    expect(
      landingFor(account(["seller"]), {
        lastPanel: "store_owner",
        storeStatus: null,
      }),
    ).toBe("/rede");
  });

  it("[AUT-FR-008] lojista sem 1º pagamento vai para pagamento ou pagamento em análise", () => {
    expect(
      landingFor(account(["store_owner"]), {
        lastPanel: null,
        storeStatus: "registered",
      }),
    ).toBe("/lojistas/pagamento");
    expect(
      landingFor(account(["store_owner"]), {
        lastPanel: null,
        storeStatus: "payment_review",
      }),
    ).toBe("/painel/pagamento");
  });

  it("[AUT-FR-009] loja suspensa ou em atraso continua indo para Meus veículos", () => {
    for (const storeStatus of [
      "suspended",
      "past_due",
      "cancel_scheduled",
    ] satisfies StoreStatus[]) {
      expect(
        landingFor(account(["store_owner"]), { lastPanel: null, storeStatus }),
      ).toBe("/painel/veiculos");
    }
  });

  it("[AUT-FR-010] loja cancelada ou arquivada só abre a Conta", () => {
    for (const storeStatus of [
      "canceled",
      "archived",
    ] satisfies StoreStatus[]) {
      expect(
        landingFor(account(["store_owner"]), { lastPanel: null, storeStatus }),
      ).toBe("/painel/conta");
    }
  });

  it("[AUT-FR-010] loja indisponível não prende quem também é vendedor", () => {
    expect(
      landingFor(account(["store_owner", "seller"]), {
        lastPanel: "seller",
        storeStatus: "canceled",
      }),
    ).toBe("/rede");
  });

  it("[AUT-FR-015] com senha temporária vai para a nova senha antes de tudo", () => {
    expect(
      landingFor(account(["admin"], { mustChangePassword: true }), {
        lastPanel: null,
        storeStatus: null,
      }),
    ).toBe("/nova-senha");
  });
});

describe("pickPanel", () => {
  it("[AUT-FR-006] usa o último painel se a conta ainda tem o papel; senão a ordem", () => {
    expect(pickPanel(["seller", "referrer"], "referrer")).toBe("referrer");
    expect(pickPanel(["referrer", "seller"], "admin")).toBe("seller");
    expect(pickPanel(["store_staff", "seller"], null)).toBe("store_staff");
  });

  it("conta sem papel não tem painel", () => {
    expect(pickPanel([], null)).toBeNull();
  });
});
