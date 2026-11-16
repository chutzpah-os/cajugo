import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchAlerts, settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { alertIdFromToken } from "./alert-token";
import { alertInbox } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const TORO = {
  make: "Fiat",
  model: "Toro",
  version: "TORO VOLCANO 2.0",
  transmission: "automatic" as const,
};

describe("alertas para o admin", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let store: string;

  const alert = async (over: Partial<typeof searchAlerts.$inferInsert>) => {
    const [row] = await t.db
      .insert(searchAlerts)
      .values({
        name: "Ana",
        phone: "5579999990000",
        query: "cambio=automatico&q=fiat+toro",
        consentAt: daysAgo(1),
        createdAt: daysAgo(1),
        ...over,
      })
      .returning();
    return row;
  };

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
    store = (await liveStore(t.db, "loja-a")).storeId;
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ALR-FR-002] com veículo: card e WhatsApp da pessoa com nome, veículo e cancelar", async () => {
    // Arrange
    const ana = await alert({});
    const bia = await alert({
      name: "Bia",
      phone: "5579988887777",
      query: "q=onix",
    });
    const toro = await car(t.db, store, { ...TORO, publishedAt: daysAgo(0) });

    // Act
    const inbox = await alertInbox(t.db, NOW);

    // Assert
    expect(inbox.matched).toHaveLength(1);
    const [m] = inbox.matched;
    expect(m).toMatchObject({
      alertId: ana.id,
      name: "Ana",
      label: "“fiat toro” · Automático",
      vehicle: { vehicleId: toro.id },
    });
    const url = new URL(m.whatsappUrl);
    expect(url.pathname).toBe("/5579999990000");
    const text = url.searchParams.get("text")!;
    expect(text).toContain("Olá, Ana!");
    expect(text).toContain(`https://cajugo.test${m.vehicle.path}`);
    const token = text.match(/\/alertas\/cancelar\/(\S+)/)![1];
    expect(alertIdFromToken(token)).toBe(ana.id);
    expect(inbox.waiting.map((w) => w.alertId)).toEqual([bia.id]);
    expect(JSON.stringify(inbox.waiting)).not.toContain("5579988887777");
  });

  it("[ALR-FR-005] vencido some; mudar a validade nas regras muda o vencimento", async () => {
    // Arrange
    const old = await alert({ createdAt: daysAgo(91), consentAt: daysAgo(91) });
    const recent = await alert({
      query: "q=onix",
      createdAt: daysAgo(40),
      consentAt: daysAgo(40),
    });

    // Act / Assert
    let inbox = await alertInbox(t.db, NOW);
    expect(inbox.waiting.map((w) => w.alertId)).toEqual([recent.id]);
    expect(inbox.waiting[0].expiresAt).toEqual(
      new Date(daysAgo(40).getTime() + 90 * 86_400_000),
    );
    await t.db.insert(settingValues).values({
      key: "search_alert_validity_days",
      value: 30,
      validFrom: daysAgo(0.5),
    });
    inbox = await alertInbox(t.db, NOW);
    expect(inbox.waiting).toEqual([]);
    expect(old.id).toBeTruthy();
  });

  it("[ALR-SEC-004] avisado e cancelado não entram", async () => {
    await alert({ status: "notified", name: null, phone: null });
    await alert({ status: "canceled", name: null, phone: null, query: "q=x" });
    await car(t.db, store, { ...TORO, publishedAt: daysAgo(0) });
    const inbox = await alertInbox(t.db, NOW);
    expect(inbox).toEqual({ matched: [], waiting: [] });
  });
});
