import { describe, expect, it } from "vitest";
import { authorize, authorizeStore, type Session } from "./session";

const owner: Session = {
  userId: "u1",
  roles: ["store_owner"],
  activeRole: "store_owner",
  storeId: "s1",
  mustChangePassword: false,
};

describe("authorize", () => {
  it("[AUT-FR-011] sem sessão responde 401", () => {
    expect(() => authorize(null, ["store_owner"])).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("[AUT-FR-012] papel que a conta não tem responde 403", () => {
    // Arrange
    const referrer: Session = {
      ...owner,
      roles: ["referrer"],
      activeRole: "referrer",
      storeId: null,
    };

    // Act / Assert
    expect(() => authorize(referrer, ["admin", "support"])).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("[AUT-FR-015] com senha temporária só libera a troca de senha", () => {
    expect(() =>
      authorize({ ...owner, mustChangePassword: true }, ["store_owner"]),
    ).toThrow(expect.objectContaining({ type: "must-change-password" }));
  });

  it("[AUT-FR-012] papel permitido devolve a sessão", () => {
    expect(authorize(owner, ["store_owner", "admin"])).toBe(owner);
  });

  it("[AUT-FR-012] conta com vários papéis passa por qualquer um deles, seja qual for o painel ativo", () => {
    // Arrange
    const ownerAndSeller: Session = {
      ...owner,
      roles: ["store_owner", "seller"],
      activeRole: "store_owner",
    };

    // Act / Assert
    expect(authorize(ownerAndSeller, ["seller"])).toBe(ownerAndSeller);
  });

  it("[AUT-SEC-001] authorizeStore exige papel de loja e loja na sessão", () => {
    expect(authorizeStore(owner).storeId).toBe("s1");
    expect(() => authorizeStore({ ...owner, storeId: null })).toThrow(
      expect.objectContaining({ status: 403 }),
    );
    expect(() =>
      authorizeStore({ ...owner, roles: ["seller"], activeRole: "seller" }),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("[AUT-SEC-007] authorizeStore aceita o usuário da loja, salvo quando a ação é só do lojista", () => {
    // Arrange
    const staff: Session = {
      ...owner,
      roles: ["store_staff"],
      activeRole: "store_staff",
    };

    // Act / Assert
    expect(authorizeStore(staff).storeId).toBe("s1");
    expect(() => authorizeStore(staff, ["store_owner"])).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });
});
