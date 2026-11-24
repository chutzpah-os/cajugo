import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  profiles,
  referralCodes,
  referralRewards,
  referrals,
  settingValues,
  stores,
  invoices,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import type { Session } from "@/platform/http/session";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { referralPanel, referralsList } from "./service";

describe("painel e indicações do Caju Indica", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function indicator(name = "Júlia Lima"): Promise<Session> {
    const id = uuidv7();
    await t.db
      .insert(profiles)
      .values({ id, email: `${id}@x.com`, name, roles: ["referrer"] });
    return {
      userId: id,
      roles: ["referrer"],
      activeRole: "referrer",
      storeId: null,
      mustChangePassword: false,
    };
  }

  /** Loja indicada por `who`, no status e com `paid` recompensas de R$ 30. */
  async function referredBy(
    who: Session,
    slug: string,
    status: "active" | "past_due" | "suspended" | "registered",
    paid: number,
    extra: Partial<typeof referrals.$inferInsert> = {},
  ) {
    const s = await storeOwner(t.db, slug, `${slug}@x.com`);
    await t.db.update(stores).set({ status }).where(eq(stores.id, s.storeId));
    const [code] = await t.db
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(eq(referralCodes.profileId, who.userId));
    const [ref] = await t.db
      .insert(referrals)
      .values({
        code: code.code,
        referrerId: who.userId,
        referredStoreId: s.storeId,
        monthsPaid: paid,
        status: paid ? "active" : "registered",
        ...extra,
      })
      .returning();
    for (let i = 0; i < paid; i++) {
      const [inv] = await t.db
        .insert(invoices)
        .values({
          storeId: s.storeId,
          kind: i ? "monthly" : "first",
          period: i ? `2026-1${i}` : null,
          membershipCents: 10_000,
          totalCents: 10_000,
          dueAt: new Date(Date.UTC(2026, 9 + i, 10)),
          status: "paid",
        })
        .returning();
      await t.db.insert(referralRewards).values({
        referralId: ref.id,
        invoiceId: inv.id,
        beneficiaryId: who.userId,
        target: "balance",
        amountCents: 3_000,
      });
    }
  }

  it("[IND-FR-002] [IND-FR-001] o painel cria o código no 1º acesso, com o link e as regras", async () => {
    // Arrange
    const julia = await indicator();

    // Act
    const first = await referralPanel(t.db, julia);
    const again = await referralPanel(t.db, julia);

    // Assert
    expect(first).toEqual({
      enabled: true,
      code: "JULIA10",
      url: "https://cajugo.test/i/julia10",
      pctBps: 3000,
      months: 3,
    });
    expect(again).toEqual(first);
  });

  it("[IND-FR-015] programa desligado: sem código novo", async () => {
    const julia = await indicator();
    await t.db.insert(settingValues).values({
      key: "referral_enabled",
      value: false,
      validFrom: new Date("2026-01-01"),
    });

    const panel = await referralPanel(t.db, julia);

    expect(panel).toEqual({ enabled: false });
    expect(await t.db.select().from(referralCodes)).toHaveLength(0);
  });

  it("[IND-FR-005] [IND-FR-008] [IND-FR-017] filtros e status calculados: rendendo, cadastrada, pausada, encerrada e não válida", async () => {
    // Arrange
    const julia = await indicator();
    await referralPanel(t.db, julia);
    await referredBy(julia, "boa", "active", 1);
    await referredBy(julia, "nova", "registered", 0);
    await referredBy(julia, "atrasada", "past_due", 2);
    await referredBy(julia, "antiga", "active", 3, { status: "ended" });
    await referredBy(julia, "mesma", "active", 0, {
      status: "rejected",
      rejectReason: "self_referral",
    });

    // Act
    const all = await referralsList(t.db, julia, {});
    const earning = await referralsList(t.db, julia, { filtro: "rendendo" });

    // Assert
    expect(all.counts).toEqual({
      all: 5,
      earning: 1,
      registered: 1,
      paused: 1,
    });
    const by = (name: string) => all.items.find((i) => i.store === name)!;
    expect(by("Loja boa")).toMatchObject({
      status: "active",
      earnedCents: 3_000,
      monthsLeft: 2,
    });
    expect(by("Loja nova")).toMatchObject({
      status: "registered",
      earnedCents: 0,
      monthsLeft: 3,
    });
    expect(by("Loja atrasada")).toMatchObject({
      status: "paused",
      monthsLeft: 1,
    });
    expect(by("Loja antiga")).toMatchObject({ status: "ended", monthsLeft: 0 });
    expect(by("Loja mesma")).toEqual({
      store: "Loja mesma",
      status: "invalid",
      earnedCents: 0,
      monthsLeft: null,
    });
    expect(earning.items.map((i) => i.store)).toEqual(["Loja boa"]);
  });

  it("[IND-SEC-001] [IND-SEC-002] quem indica A não vê as de B; nada pessoal da loja indicada", async () => {
    const julia = await indicator("Júlia");
    const pedro = await indicator("Pedro");
    await referralPanel(t.db, julia);
    await referralPanel(t.db, pedro);
    await referredBy(julia, "boa", "active", 1);

    const hers = await referralsList(t.db, julia, {});
    const his = await referralsList(t.db, pedro, {});

    expect(his.items).toEqual([]);
    expect(Object.keys(hers.items[0]).sort()).toEqual(
      ["earnedCents", "monthsLeft", "status", "store"].sort(),
    );
  });

  it("[IND-FR-001] lojista e vendedor também têm painel; suporte não", async () => {
    const owner = await storeOwner(t.db, "loja-r", "r@x.com");
    const support = await personWith(t.db, "support");

    expect((await referralPanel(t.db, owner)).enabled).toBe(true);
    await expect(referralPanel(t.db, support)).rejects.toMatchObject({
      status: 403,
    });
  });
});
