import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { notices } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { liveStore } from "@/domains/showcase/testing/fixtures";
import { noticesFor, notifyStore } from "./service";

const AT = new Date("2026-11-16T12:00:00Z");

describe("aviso para a loja", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RPT-FR-006] o dono e os usuários da loja recebem o aviso do veículo ocultado, com o motivo", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const staff = await personWith(t.db, "store_staff", a.storeId);

    // Act
    await notifyStore(
      t.db,
      a.storeId,
      {
        kind: "vehicle_hidden",
        vehicle: "Fiat Argo",
        reason: "Preço não real",
      },
      AT,
    );

    // Assert
    for (const who of [a, staff])
      expect(await noticesFor(t.db, who)).toEqual([
        expect.objectContaining({
          text: "Fiat Argo foi ocultado da vitrine: Preço não real. Ele continua no seu catálogo. Para revisar, fale com a CajuGo.",
          tone: "alert",
        }),
      ]);
  });

  it("[RPT-FR-008] o aviso de que o veículo voltou à vitrine", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");

    // Act
    await notifyStore(
      t.db,
      a.storeId,
      { kind: "vehicle_shown", vehicle: "Fiat Argo" },
      AT,
    );

    // Assert
    expect(await noticesFor(t.db, a)).toEqual([
      expect.objectContaining({
        text: "Fiat Argo voltou à vitrine CajuGo.",
        tone: "ok",
      }),
    ]);
  });

  it("[RPT-SEC-004] a loja B não recebe o aviso da loja A, nem a equipe da CajuGo", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const admin = await personWith(t.db, "admin");

    // Act
    await notifyStore(
      t.db,
      a.storeId,
      {
        kind: "vehicle_hidden",
        vehicle: "Fiat Argo",
        reason: "Suspeita de golpe",
      },
      AT,
    );

    // Assert
    expect(await noticesFor(t.db, b)).toEqual([]);
    expect(await noticesFor(t.db, admin)).toEqual([]);
    expect(await t.db.select().from(notices)).toHaveLength(1);
  });
});
