import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, referralCodes, referrals } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { checkoutView, startCheckout } from "./service";
import { configurePix, storeOwner } from "./testing/fixtures";

const CNPJ = "12.345.678/0001-95";

describe("autoindicação por CPF/CNPJ", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    await configurePix(t.db);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  /** Lojista que indica (loja A) e a loja indicada pelo código dele (B). */
  async function referred() {
    const referrer = await storeOwner(t.db, "loja-a", "a@x.com", {
      name: "Ricardo",
    });
    const [{ code }] = await t.db
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(eq(referralCodes.profileId, referrer.userId));
    const store = await storeOwner(t.db, "loja-b", "b@x.com", {
      referralCode: code,
    });
    return { referrer, store };
  }

  const status = async () =>
    (
      await t.db
        .select({ status: referrals.status, reason: referrals.rejectReason })
        .from(referrals)
    )[0];

  it("[PIX-FR-003] mesmo documento de quem indicou: a indicação não vale, e o indicado segue sem aviso", async () => {
    // Arrange
    const { referrer, store } = await referred();
    await startCheckout(deps(), referrer, { taxId: CNPJ });

    // Act
    await startCheckout(deps(), store, { taxId: CNPJ });

    // Assert
    expect(await status()).toEqual({
      status: "rejected",
      reason: "self_referral",
    });
    const view = await checkoutView(deps(), store);
    expect(JSON.stringify(view)).not.toMatch(/indica|referral/i);
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "referral.rejected"));
    expect(log.data).toEqual({ reason: "self_referral" });
    expect(JSON.stringify(log.data)).not.toContain("12345678");
  });

  it("[PIX-FR-003] quem indicou informa o documento depois: a comparação acontece nessa hora", async () => {
    // Arrange: o indicado paga primeiro
    const { referrer, store } = await referred();
    await startCheckout(deps(), store, { taxId: CNPJ });
    expect((await status()).status).toBe("registered");

    // Act
    await startCheckout(deps(), referrer, { taxId: CNPJ });

    // Assert
    expect(await status()).toEqual({
      status: "rejected",
      reason: "self_referral",
    });
  });

  it("[PIX-FR-003] documentos diferentes: a indicação continua Cadastrada", async () => {
    const { referrer, store } = await referred();

    await startCheckout(deps(), referrer, { taxId: CNPJ });
    await startCheckout(deps(), store, { taxId: "529.982.247-25" });

    expect(await status()).toEqual({ status: "registered", reason: null });
  });
});
