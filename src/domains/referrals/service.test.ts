import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { profiles, referralCodes, settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { canRefer, checkCode, getOrCreateCode } from "./service";

describe("referrals", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function person(
    name: string,
    email: string,
    phone: string | null = null,
  ) {
    const id = crypto.randomUUID();
    await t.db
      .insert(profiles)
      .values({ id, name, email, phone, roles: ["referrer"] });
    return id;
  }

  describe("getOrCreateCode", () => {
    it("[STO-FR-014] código pessoal: primeiro nome sem acento, em maiúsculas, com 2 dígitos", async () => {
      // Arrange
      const id = await person("Ricardo Souza", "r@x.com");

      // Act
      const code = await getOrCreateCode(t.db, id, "Ricardo Souza");

      // Assert
      expect(code).toBe("RICARDO10");
      expect(await getOrCreateCode(t.db, id, "Ricardo Souza")).toBe(
        "RICARDO10",
      );
    });

    it("[STO-FR-014] nomes iguais ganham códigos diferentes; nome sem letras vira CAJU", async () => {
      const a = await person("Joana", "a@x.com");
      const b = await person("Joana Lima", "b@x.com");
      const c = await person("123", "c@x.com");

      expect(await getOrCreateCode(t.db, a, "Joana")).toBe("JOANA10");
      expect(await getOrCreateCode(t.db, b, "Joana Lima")).toBe("JOANA11");
      expect(await getOrCreateCode(t.db, c, "123")).toBe("CAJU10");
    });
  });

  describe("checkCode", () => {
    it("[STO-FR-007] código válido mostra só o primeiro nome de quem indicou", async () => {
      // Arrange
      const id = await person("Ricardo Souza", "r@x.com", "79988887777");
      await getOrCreateCode(t.db, id, "Ricardo Souza");

      // Act
      const result = await checkCode(t.db, " ricardo10 ", {
        email: "novo@x.com",
        phone: "79999990000",
      });

      // Assert
      expect(result).toEqual({
        status: "ok",
        code: "RICARDO10",
        referrerName: "Ricardo",
      });
    });

    it("[STO-FR-007] código inexistente ou desativado", async () => {
      const id = await person("Ana", "a@x.com");
      await getOrCreateCode(t.db, id, "Ana");
      await t.db
        .insert(referralCodes)
        .values({ code: "VELHO10", campaignName: "Antiga", active: false });

      expect(
        await checkCode(t.db, "NAOEXISTE", { email: "n@x.com", phone: "" }),
      ).toEqual({
        status: "not-found",
      });
      expect(
        await checkCode(t.db, "VELHO10", { email: "n@x.com", phone: "" }),
      ).toEqual({
        status: "not-found",
      });
    });

    it("[STO-FR-007] [STO-SEC-005] autoindicação por e-mail ou celular, sem revelar o dado", async () => {
      // Arrange
      const id = await person("Ricardo", "Ricardo@X.com", "5579988887777");
      await getOrCreateCode(t.db, id, "Ricardo");

      // Act
      const byEmail = await checkCode(t.db, "RICARDO10", {
        email: "ricardo@x.com",
        phone: "",
      });
      const byPhone = await checkCode(t.db, "RICARDO10", {
        email: "outro@x.com",
        phone: "(79) 98888-7777",
      });

      // Assert
      expect(byEmail).toEqual({ status: "self-referral" });
      expect(byPhone).toEqual({ status: "self-referral" });
      expect(JSON.stringify([byEmail, byPhone])).not.toMatch(/ricardo@|98888/i);
    });

    it("link de campanha (sem dono) é aceito com o nome da campanha", async () => {
      await t.db
        .insert(referralCodes)
        .values({ code: "FEIRA10", campaignName: "Feira de Aracaju" });

      expect(
        await checkCode(t.db, "feira10", { email: "n@x.com", phone: "" }),
      ).toEqual({
        status: "ok",
        code: "FEIRA10",
        referrerName: "Feira de Aracaju",
      });
    });
  });

  describe("regras do programa", () => {
    const rule = (key: string, value: unknown) =>
      t.db
        .insert(settingValues)
        .values({ key, value, validFrom: new Date("2026-01-01") });

    it("[IND-FR-015] programa desligado: código não vale em novo cadastro", async () => {
      // Arrange
      const id = await person("Ricardo Souza", "r@x.com");
      await getOrCreateCode(t.db, id, "Ricardo Souza");
      await rule("referral_enabled", false);

      // Act
      const result = await checkCode(t.db, "RICARDO10", {
        email: "n@x.com",
        phone: "",
      });

      // Assert
      expect(result).toEqual({ status: "not-found" });
    });

    it("[IND-FR-015] papel fora de 'quem pode indicar': código do indicador não vale; o do lojista sim", async () => {
      const ind = await person("Júlia", "j@x.com");
      await getOrCreateCode(t.db, ind, "Júlia");
      const owner = crypto.randomUUID();
      await t.db.insert(profiles).values({
        id: owner,
        name: "Ricardo",
        email: "r@x.com",
        roles: ["store_owner"],
      });
      await getOrCreateCode(t.db, owner, "Ricardo");
      await rule("referral_who", {
        store_owner: true,
        seller: true,
        referrer: false,
      });

      expect(
        (await checkCode(t.db, "JULIA10", { email: "n@x.com", phone: "" }))
          .status,
      ).toBe("not-found");
      expect(
        (await checkCode(t.db, "RICARDO10", { email: "n@x.com", phone: "" }))
          .status,
      ).toBe("ok");
    });

    it("[IND-FR-002] [IND-FR-015] canRefer: algum papel da pessoa precisa estar liberado, com o programa ativo", () => {
      const on = {
        referral_enabled: true,
        referral_who: { store_owner: false, seller: true, referrer: false },
      };

      expect(canRefer(on, ["seller", "referrer"])).toBe(true);
      expect(canRefer(on, ["referrer"])).toBe(false);
      expect(canRefer({ ...on, referral_enabled: false }, ["seller"])).toBe(
        false,
      );
    });
  });
});
