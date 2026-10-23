import { describe, expect, it } from "vitest";
import type { StoreStatus } from "./landing";
import { storeAccess } from "./store-access";

const owner = ["store_owner"] as const;
const staff = ["store_staff"] as const;

describe("storeAccess", () => {
  it("[AUT-FR-009] loja ativa, atrasada ou suspensa: painel liberado", () => {
    for (const status of [
      "active",
      "past_due",
      "suspended",
      "cancel_scheduled",
    ] satisfies StoreStatus[]) {
      expect(storeAccess(owner, status, "/painel/veiculos")).toEqual({
        ok: true,
      });
      expect(storeAccess(staff, status, "/painel/veiculos")).toEqual({
        ok: true,
      });
    }
  });

  it("[AUT-FR-010] loja cancelada ou arquivada: lojista só abre a Conta", () => {
    for (const status of ["canceled", "archived"] satisfies StoreStatus[]) {
      expect(storeAccess(owner, status, "/painel/veiculos")).toEqual({
        ok: false,
        redirectTo: "/painel/conta",
      });
      expect(storeAccess(owner, status, "/painel/conta")).toEqual({
        ok: true,
      });
    }
  });

  it("[AUT-FR-008] loja sem 1º pagamento: lojista vai para o pagamento", () => {
    expect(storeAccess(owner, "registered", "/painel/veiculos")).toEqual({
      ok: false,
      redirectTo: "/lojistas/pagamento",
    });
    expect(storeAccess(owner, "registered", "/lojistas/pagamento")).toEqual({
      ok: true,
    });
  });

  it("[AUT-FR-008] pagamento em análise: lojista usa o painel (rascunhos, 10a)", () => {
    expect(storeAccess(owner, "payment_review", "/painel/veiculos")).toEqual({
      ok: true,
    });
    expect(storeAccess(owner, "payment_review", "/lojistas/pagamento")).toEqual(
      { ok: false, redirectTo: "/painel/pagamento" },
    );
  });

  it("[AUT-FR-016] usuário da loja com loja indisponível só vê o aviso", () => {
    for (const status of [
      "registered",
      "payment_review",
      "canceled",
      "archived",
    ] satisfies StoreStatus[]) {
      expect(storeAccess(staff, status, "/painel/veiculos")).toEqual({
        ok: false,
        redirectTo: "/painel/loja-indisponivel",
      });
      expect(storeAccess(staff, status, "/painel/loja-indisponivel")).toEqual({
        ok: true,
      });
    }
  });

  it("[AUT-FR-016] aviso de loja indisponível não serve a quem pode usar o painel", () => {
    expect(storeAccess(staff, "active", "/painel/loja-indisponivel")).toEqual({
      ok: false,
      redirectTo: "/painel/veiculos",
    });
    expect(storeAccess(owner, "canceled", "/painel/loja-indisponivel")).toEqual(
      { ok: false, redirectTo: "/painel/conta" },
    );
  });

  it("pagamento do 1º mês só existe para loja recém-cadastrada", () => {
    expect(storeAccess(owner, "active", "/lojistas/pagamento")).toEqual({
      ok: false,
      redirectTo: "/painel/veiculos",
    });
  });
});
