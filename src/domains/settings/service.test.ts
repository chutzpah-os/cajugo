import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, profiles, settingValues } from "@/platform/db/schema";
import type { Role, Session } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { createTestDb } from "@/platform/db/testing/test-db";
import { signIn } from "@/domains/auth/service";
import {
  getSettings,
  publicSettings,
  settingHistory,
  updateSettings,
} from "./service";
import { pixReady } from "./definitions";

describe("settings", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
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
        membership_cents: 10000,
        review_business_days: 1,
        past_due_tolerance_days: 5,
        installment_down_bps: 2000,
        installment_months: 48,
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

    it("[CFG-FR-003] data anterior a qualquer alteração recebe o valor provisório", async () => {
      const settings = await getSettings(
        t.db,
        new Date("1990-01-01T00:00:00Z"),
      );

      expect(settings.min_photos).toBe(6);
    });

    it("[CFG-FR-009] alteração agendada para depois ainda não vale agora", async () => {
      await t.db.insert(settingValues).values({
        key: "min_photos",
        value: 8,
        validFrom: new Date(Date.now() + 60 * 60_000),
      });

      expect((await getSettings(t.db)).min_photos).toBe(6);
    });

    it("[CFG-FR-003] chave que não está na lista é ignorada", async () => {
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

  it("[PIX-FR-001] a mensalidade do Plano Catálogo é uma regra editável, com o valor da época", async () => {
    // Arrange
    const before = await getSettings(t.db);
    await t.db.insert(settingValues).values({
      key: "membership_cents",
      value: 12000,
      validFrom: new Date("2030-01-01T00:00:00Z"),
    });

    // Act
    const now = await getSettings(t.db, new Date("2030-02-01T00:00:00Z"));
    const past = await getSettings(t.db, new Date("2029-12-31T00:00:00Z"));

    // Assert
    expect(before.membership_cents).toBe(10000);
    expect(now.membership_cents).toBe(12000);
    expect(past.membership_cents).toBe(10000);
  });

  describe("updateSettings com chave Pix", () => {
    const PASSWORD = "senha-admin-1";
    const PIX = {
      type: "cpf",
      key: "529.982.247-25",
      beneficiary: "CajuGo Ltda",
      city: "Aracaju",
    };
    let auth: FakeAuthProvider;
    const deps = () => ({ db: t.db, auth });
    const ctx = { ipHash: "rede-admin" };

    async function admin(): Promise<Session> {
      auth = new FakeAuthProvider();
      const user = await auth.adminCreateUser("admin@x.com", PASSWORD);
      await t.db.insert(profiles).values({
        id: user.id,
        name: "Admin",
        email: "admin@x.com",
        roles: ["admin"],
      });
      return {
        userId: user.id,
        roles: ["admin"],
        activeRole: "admin",
        storeId: null,
        mustChangePassword: false,
      };
    }

    it("[CFG-FR-008] com a senha certa, a nova chave Pix passa a valer, já normalizada", async () => {
      // Arrange
      const session = await admin();

      // Act
      await updateSettings(
        deps(),
        session,
        { pix: PIX, password: PASSWORD },
        ctx,
      );

      // Assert
      expect((await getSettings(t.db)).pix).toEqual({
        type: "cpf",
        key: "52998224725",
        beneficiary: "CajuGo Ltda",
        city: "Aracaju",
      });
    });

    it("[PIX-FR-004] a chave nova exige a cidade do favorecido (vai no QR do Pix)", async () => {
      const session = await admin();
      const withoutCity = {
        type: PIX.type,
        key: PIX.key,
        beneficiary: PIX.beneficiary,
      };

      await expect(
        updateSettings(
          deps(),
          session,
          { pix: withoutCity, password: PASSWORD },
          ctx,
        ),
      ).rejects.toMatchObject({
        status: 422,
        errors: [
          expect.objectContaining({
            field: "pix.city",
            message: "Informe a cidade do favorecido.",
          }),
        ],
      });
      expect((await getSettings(t.db)).pix).toBeNull();
    });

    it("[PIX-FR-004] chave gravada antes da cidade existir continua legível, e sem QR pronto", async () => {
      // Arrange: valor do histórico (só de inserção) sem a cidade
      await t.db.insert(settingValues).values({
        key: "pix",
        value: { type: "email", key: "a@b.com", beneficiary: "CajuGo" },
      });

      // Act
      const { pix } = await getSettings(t.db);

      // Assert
      expect(pix).toEqual({
        type: "email",
        key: "a@b.com",
        beneficiary: "CajuGo",
      });
      expect(pixReady(pix)).toBe(false);
      expect(pixReady({ ...pix!, city: "Aracaju" })).toBe(true);
    });

    it("[CFG-FR-008] sem a senha, a chave não muda", async () => {
      const session = await admin();

      await expect(
        updateSettings(deps(), session, { pix: PIX }, ctx),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field: "password" })],
      });
      expect((await getSettings(t.db)).pix).toBeNull();
    });

    it("[CFG-SEC-005] senha errada não salva e conta para o bloqueio da conta", async () => {
      // Arrange
      const session = await admin();

      // Act: 5 tentativas com a senha errada
      for (let i = 0; i < 5; i++) {
        await expect(
          updateSettings(
            deps(),
            session,
            { pix: PIX, password: "errada-123" },
            { ipHash: `rede-${i}` },
          ),
        ).rejects.toMatchObject({ status: 422 });
      }

      // Assert: nada salvo e a conta bloqueada (nem o login passa)
      expect((await getSettings(t.db)).pix).toBeNull();
      await expect(
        signIn(
          deps(),
          { email: "admin@x.com", password: PASSWORD },
          { ipHash: "rede-x" },
        ),
      ).rejects.toMatchObject({ type: "too-many-requests" });
    });

    it("[CFG-SEC-004] a auditoria registra a troca sem o valor da chave", async () => {
      const session = await admin();

      await updateSettings(
        deps(),
        session,
        { pix: PIX, password: PASSWORD },
        ctx,
      );

      const logs = await t.db.select().from(activityLog);
      expect(logs).toEqual([
        expect.objectContaining({ data: { keys: ["pix"] } }),
      ]);
      expect(JSON.stringify(logs)).not.toContain("52998224725");
    });

    it("[CFG-FR-004] chave Pix inválida é recusada no campo", async () => {
      const session = await admin();

      await expect(
        updateSettings(
          deps(),
          session,
          { pix: { ...PIX, key: "111.111.111-11" }, password: PASSWORD },
          ctx,
        ),
      ).rejects.toMatchObject({
        status: 422,
        errors: [
          expect.objectContaining({
            field: "pix.key",
            message: "CPF inválido.",
          }),
        ],
      });
    });
  });

  describe("settingHistory", () => {
    async function person(name: string, role: Role): Promise<Session> {
      const id = crypto.randomUUID();
      await t.db
        .insert(profiles)
        .values({ id, name, email: `${id}@x.com`, roles: [role] });
      return {
        userId: id,
        roles: [role],
        activeRole: role,
        storeId: null,
        mustChangePassword: false,
      };
    }
    const deps = (at: Date) => ({
      db: t.db,
      auth: new FakeAuthProvider(),
      now: () => at,
    });

    it("[CFG-FR-006] mostra cada alteração com de/para, quem e quando, da mais recente à mais antiga", async () => {
      // Arrange: admin A muda 1% → 1,5%; depois admin B muda 1,5% → 2%
      const a = await person("Ana", "admin");
      const b = await person("Bruno", "admin");
      const t1 = new Date("2026-11-01T10:00:00Z");
      const t2 = new Date("2026-11-02T15:30:00Z");
      await updateSettings(deps(t1), a, { cajugo_fee_bps: 150 });
      await updateSettings(deps(t2), b, { cajugo_fee_bps: 200 });

      // Act
      const history = await settingHistory(t.db, a, "cajugo_fee_bps");

      // Assert
      expect(history).toEqual([
        { at: t2, by: "Bruno", from: 150, to: 200 },
        { at: t1, by: "Ana", from: 100, to: 150 },
      ]);
    });

    it('[CFG-FR-006] volta ao provisório feita pelo sistema aparece no histórico como "Sistema"', async () => {
      // Arrange: admin muda 6 → 8; depois o sistema volta ao provisório
      const admin = await person("Ana", "admin");
      await updateSettings(deps(new Date("2026-11-01T10:00:00Z")), admin, {
        min_photos: 8,
      });
      await t.db.insert(settingValues).values({
        key: "min_photos",
        value: 6,
        validFrom: new Date("2026-11-02T10:00:00Z"),
      });

      // Act
      const history = await settingHistory(t.db, admin, "min_photos");

      // Assert
      expect(history.map((h) => [h.by, h.from, h.to])).toEqual([
        ["Sistema", 8, 6],
        ["Ana", 6, 8],
      ]);
    });

    it("[CFG-FR-006] regra nunca alterada não tem histórico (o valor inicial não conta)", async () => {
      const admin = await person("Ana", "admin");

      expect(await settingHistory(t.db, admin, "min_photos")).toEqual([]);
    });

    it("[CFG-SEC-001] suporte lê o histórico", async () => {
      const admin = await person("Ana", "admin");
      const support = await person("Sol", "support");
      await updateSettings(deps(new Date()), admin, { min_photos: 8 });

      const history = await settingHistory(t.db, support, "min_photos");

      expect(history).toHaveLength(1);
    });

    it("[CFG-SEC-002] lojista não lê; visitante precisa entrar", async () => {
      const owner = await person("Lia", "store_owner");

      await expect(
        settingHistory(t.db, owner, "min_photos"),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        settingHistory(t.db, null, "min_photos"),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("regra desconhecida responde 404", async () => {
      const admin = await person("Ana", "admin");

      await expect(
        settingHistory(t.db, admin, "regra_inventada"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
