import { describe, expect, it } from "vitest";
import { clientIp, hashIp } from "./client-ip";

describe("IP do visitante", () => {
  it("usa o primeiro valor de x-forwarded-for", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "200.1.1.1, 10.0.0.1" })),
    ).toBe("200.1.1.1");
  });

  it("cai para x-real-ip e depois para unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "200.2.2.2" }))).toBe(
      "200.2.2.2",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("hash é estável, não contém o IP e muda com o segredo", () => {
    const a = hashIp("200.1.1.1", "s1");
    expect(a).toBe(hashIp("200.1.1.1", "s1"));
    expect(a).not.toContain("200");
    expect(a).not.toBe(hashIp("200.1.1.1", "s2"));
  });

  it("sem segredo, falha em vez de guardar algo reversível", () => {
    expect(() => hashIp("200.1.1.1", "")).toThrow(/HASH_SECRET/);
  });
});
