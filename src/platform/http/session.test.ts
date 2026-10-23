import { describe, expect, it } from "vitest";
import { authorize, authorizeStore, type Session } from "./session";

const owner: Session = {
  userId: "u1",
  role: "store_owner",
  storeId: "s1",
  mustChangePassword: false,
};

describe("authorize", () => {
  it("sem sessão responde 401", () => {
    expect(() => authorize(null, ["store_owner"])).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("papel errado responde 403", () => {
    expect(() => authorize(owner, ["admin"])).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("com senha temporária só libera a troca de senha", () => {
    expect(() =>
      authorize({ ...owner, mustChangePassword: true }, ["store_owner"]),
    ).toThrow(expect.objectContaining({ type: "must-change-password" }));
  });

  it("papel permitido devolve a sessão", () => {
    expect(authorize(owner, ["store_owner", "admin"])).toBe(owner);
  });

  it("authorizeStore exige loja na sessão", () => {
    expect(authorizeStore(owner).storeId).toBe("s1");
    expect(() => authorizeStore({ ...owner, storeId: null })).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });
});
