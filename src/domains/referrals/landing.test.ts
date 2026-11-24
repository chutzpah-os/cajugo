import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { profiles, referralCodes, settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { getOrCreateCode, landing, programBanner } from "./service";

describe("landing do link [8c] e banner [9a]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  const off = () =>
    t.db.insert(settingValues).values({
      key: "referral_enabled",
      value: false,
      validFrom: new Date("2026-01-01"),
    });

  it("[IND-FR-003] código válido: primeiro nome, mensalidade e o cadastro com o código", async () => {
    // Arrange
    const id = crypto.randomUUID();
    await t.db.insert(profiles).values({
      id,
      email: "r@x.com",
      name: "Ricardo Souza",
      roles: ["referrer"],
    });
    await getOrCreateCode(t.db, id, "Ricardo Souza");

    // Act
    const view = await landing(t.db, "ricardo10");

    // Assert
    expect(view).toEqual({
      referrerName: "Ricardo",
      membershipCents: 10_000,
      signupUrl: "/lojistas/cadastro?codigo=RICARDO10",
    });
  });

  it("[IND-FR-003] [IND-FR-015] código inexistente, desativado ou programa desligado: landing sem indicação", async () => {
    await t.db
      .insert(referralCodes)
      .values({ code: "VELHO10", campaignName: "x", active: false });
    const none = {
      referrerName: null,
      membershipCents: 10_000,
      signupUrl: "/lojistas/cadastro",
    };

    expect(await landing(t.db, "naoexiste")).toEqual(none);
    expect(await landing(t.db, "velho10")).toEqual(none);
    expect(await landing(t.db, "<script>")).toEqual(none);
    const id = crypto.randomUUID();
    await t.db
      .insert(profiles)
      .values({ id, email: "a@x.com", name: "Ana", roles: ["referrer"] });
    await getOrCreateCode(t.db, id, "Ana");
    await off();
    expect(await landing(t.db, "ana10")).toEqual(none);
  });

  it("[IND-FR-014] banner com a recompensa das regras; nenhum com o programa desligado", async () => {
    const on = await programBanner(t.db);
    await off();
    const disabled = await programBanner(t.db);

    expect(on).toEqual({ pctBps: 3000, months: 3, rewardCents: 3_000 });
    expect(disabled).toBeNull();
  });
});
