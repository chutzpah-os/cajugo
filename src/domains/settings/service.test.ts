import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog, profiles, settingValues } from "@/platform/db/schema";
import type { Role, Session } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { createTestDb } from "@/platform/db/testing/test-db";
import { getSettings, publicSettings, updateSettings } from "./service";

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

  describe("updateSettings", () => {
    const deps = () => ({ db: t.db, auth: new FakeAuthProvider() });
    async function sessionAs(role: Role): Promise<Session> {
      const id = crypto.randomUUID();
      await t.db
        .insert(profiles)
        .values({ id, name: role, email: `${id}@x.com`, roles: [role] });
      return {
        userId: id,
        roles: [role],
        activeRole: role,
        storeId: null,
        mustChangePassword: false,
      };
    }
    const rowCount = async () =>
      (await t.db.select().from(settingValues)).length;

    it("[CFG-FR-002] admin altera uma regra e o sistema passa a usar o novo valor", async () => {
      // Arrange
      const admin = await sessionAs("admin");

      // Act
      const result = await updateSettings(deps(), admin, {
        past_due_tolerance_days: 7,
      });

      // Assert
      expect(result.changed).toEqual(["past_due_tolerance_days"]);
      expect((await getSettings(t.db)).past_due_tolerance_days).toBe(7);
      const [log] = await t.db.select().from(activityLog);
      expect(log).toMatchObject({
        userId: admin.userId,
        action: "settings.updated",
        data: { keys: ["past_due_tolerance_days"] },
      });
    });

    it("[CFG-FR-002] salva várias regras juntas e só grava o que mudou", async () => {
      const admin = await sessionAs("admin");
      const before = await rowCount();

      const result = await updateSettings(deps(), admin, {
        min_photos: 6, // igual ao atual
        require_approval: true,
        cajugo_fee_bps: 150,
      });

      expect(result.changed.sort()).toEqual([
        "cajugo_fee_bps",
        "require_approval",
      ]);
      expect(await rowCount()).toBe(before + 2);
      const settings = await getSettings(t.db);
      expect(settings).toMatchObject({
        require_approval: true,
        cajugo_fee_bps: 150,
      });
    });

    it("[CFG-FR-002] salvar sem mudar nada não grava nem audita", async () => {
      const admin = await sessionAs("admin");
      const before = await rowCount();

      const result = await updateSettings(deps(), admin, { min_photos: 6 });

      expect(result.changed).toEqual([]);
      expect(await rowCount()).toBe(before);
      expect(await t.db.select().from(activityLog)).toHaveLength(0);
    });

    it("[CFG-FR-004] valor fora da faixa é recusado com a mensagem no campo e nada muda", async () => {
      // Arrange
      const admin = await sessionAs("admin");
      const before = await rowCount();

      // Act
      const error = await updateSettings(deps(), admin, {
        cajugo_fee_bps: 15000,
        min_photos: 0,
        past_due_tolerance_days: 7,
      }).catch((e: unknown) => e);

      // Assert
      expect(error).toMatchObject({
        status: 422,
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: "cajugo_fee_bps",
            message: "Use um valor entre 0% e 20%.",
          }),
          expect.objectContaining({ field: "min_photos" }),
        ]),
      });
      expect(await rowCount()).toBe(before);
      expect((await getSettings(t.db)).past_due_tolerance_days).toBe(5);
    });

    it("[CFG-FR-004] regra desconhecida é recusada", async () => {
      const admin = await sessionAs("admin");

      await expect(
        updateSettings(deps(), admin, { taxa_inventada: 1 }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it("[CFG-SEC-001] suporte não salva regras", async () => {
      const support = await sessionAs("support");
      const before = await rowCount();

      await expect(
        updateSettings(deps(), support, { min_photos: 8 }),
      ).rejects.toMatchObject({ status: 403 });
      expect(await rowCount()).toBe(before);
    });

    it("[CFG-SEC-002] lojista, usuário da loja, vendedor e indicador não salvam; visitante precisa entrar", async () => {
      for (const role of [
        "store_owner",
        "store_staff",
        "seller",
        "referrer",
      ] as const) {
        const session = await sessionAs(role);
        await expect(
          updateSettings(deps(), session, { min_photos: 8 }),
        ).rejects.toMatchObject({ status: 403 });
      }
      await expect(
        updateSettings(deps(), null, { min_photos: 8 }),
      ).rejects.toMatchObject({ status: 401 });
      expect((await getSettings(t.db)).min_photos).toBe(6);
    });
  });
});
