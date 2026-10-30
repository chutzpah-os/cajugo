import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { getSettings, publicSettings } from "./service";

describe("settings", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  describe("getSettings", () => {
    it("[CFG-FR-003] ambiente novo: todas as regras com o valor provisório, já tipadas", async () => {
      // Act
      const settings = await getSettings(t.db);

      // Assert
      expect(settings).toEqual({
        support_whatsapp: "557981360206",
        pix: null,
        review_business_days: 1,
        past_due_tolerance_days: 5,
        installment_rate_bps: 179,
        cajugo_fee_bps: 100,
        require_approval: false,
        min_photos: 6,
        retention_days: 90,
        referral_enabled: true,
        referral_who: { store_owner: true, seller: true, referrer: true },
        referral_pct_bps: 3000,
        referral_months: 3,
        payout_min_cents: 5000,
      });
    });

    it("[CFG-FR-009] devolve o valor que valia em cada data", async () => {
      // Arrange: 1% até 10:00, 1,5% das 10:00 às 11:00, 2% depois
      const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 24, h, m));
      await t.db.insert(settingValues).values([
        { key: "cajugo_fee_bps", value: 150, validFrom: at(10) },
        { key: "cajugo_fee_bps", value: 200, validFrom: at(11) },
      ]);

      // Act
      const [before, between, after] = await Promise.all([
        getSettings(t.db, at(9)),
        getSettings(t.db, at(10, 30)),
        getSettings(t.db, at(12)),
      ]);

      // Assert
      expect(before.cajugo_fee_bps).toBe(100);
      expect(between.cajugo_fee_bps).toBe(150);
      expect(after.cajugo_fee_bps).toBe(200);
      expect(after.min_photos).toBe(6);
    });

    it("[CFG-FR-009] alteração agendada para depois ainda não vale agora", async () => {
      await t.db.insert(settingValues).values({
        key: "min_photos",
        value: 8,
        validFrom: new Date(Date.now() + 60 * 60_000),
      });

      expect((await getSettings(t.db)).min_photos).toBe(6);
    });

    it("chave que não está na lista é ignorada", async () => {
      await t.db
        .insert(settingValues)
        .values({ key: "regra_antiga", value: 1 });

      const settings = await getSettings(t.db);

      expect(settings).not.toHaveProperty("regra_antiga");
    });
  });

  describe("publicSettings", () => {
    it("[CFG-SEC-004] só leva o que pode ir para página pública, nunca a chave Pix", async () => {
      // Arrange: chave Pix configurada
      await t.db.insert(settingValues).values({
        key: "pix",
        value: { type: "cpf", key: "52998224725", beneficiary: "CajuGo" },
      });

      // Act
      const pub = publicSettings(await getSettings(t.db));

      // Assert
      expect(pub).toEqual({
        supportWhatsapp: "557981360206",
        installmentRateBps: 179,
        referral: { enabled: true, pctBps: 3000, months: 3 },
      });
      expect(JSON.stringify(pub)).not.toContain("52998224725");
    });
  });
});
