import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import {
  hideVehicle,
  markSold,
  publish,
  remove,
  saveDraft,
  setShare,
  showVehicle,
  undoSold,
  unpublish,
} from "./service";
import { vehicleRow } from "./testing/fixtures";

const MARK = { reason: "unreal_price" as const, note: null };

describe("veículo oculto pela CajuGo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let now: Date;
  const deps = () => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    now = new Date("2026-11-16T12:00:00Z");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function hidden() {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, {
      fipeBrandId: "21",
      fipeModelId: "8000",
      fipeYearId: "8000:2022-1",
    });
    const admin = await personWith(t.db, "admin");
    await hideVehicle(t.db, admin, v.id, MARK, now);
    return { a, admin, vehicleId: v.id };
  }

  it("[RPT-FR-004] ocultar põe o veículo publicado em oculto com a marca; só admin e suporte", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const support = await personWith(t.db, "support");

    // Act
    await expect(hideVehicle(t.db, a, v.id, MARK, now)).rejects.toMatchObject({
      status: 403,
    });
    const done = await hideVehicle(
      t.db,
      support,
      v.id,
      { reason: "other", note: "Anúncio duplicado" },
      now,
    );
    const again = await hideVehicle(t.db, support, v.id, MARK, now);

    // Assert
    expect(done).toEqual({ storeId: a.storeId, title: expect.any(String) });
    expect(again).toBeNull();
    expect(await vehicleRow(t.db, v.id)).toMatchObject({
      status: "hidden",
      hiddenReason: "other",
      hiddenNote: "Anúncio duplicado",
      hiddenAt: now,
      hiddenBy: support.userId,
    });
  });

  it("[RPT-FR-009] com o veículo oculto, o lojista vende e exclui", async () => {
    // Arrange
    const { a, vehicleId } = await hidden();
    const other = await car(t.db, a.storeId);
    const admin = await personWith(t.db, "admin");
    await hideVehicle(t.db, admin, other.id, MARK, now);

    // Act
    await markSold(deps(), a, vehicleId);
    await remove(deps(), a, other.id);

    // Assert
    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      status: "sold",
      hiddenReason: "unreal_price",
    });
    expect((await vehicleRow(t.db, other.id)).status).toBe("deleted");
  });

  it("[RPT-FR-009] não edita nem divulga o veículo oculto (409)", async () => {
    // Arrange
    const { a, vehicleId } = await hidden();

    // Act / Assert
    await expect(
      saveDraft(deps(), a, { vehicleId, priceCents: 7500000 }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(setShare(deps(), a, vehicleId, false)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("[RPT-FR-009] despublicar e publicar de novo mantém oculto; desfazer a venda também", async () => {
    // Arrange
    const { a, vehicleId } = await hidden();

    // Act
    await unpublish(deps(), a, vehicleId);
    const draft = await vehicleRow(t.db, vehicleId);
    await publish(deps(), a, vehicleId);
    const republished = await vehicleRow(t.db, vehicleId);
    await markSold(deps(), a, vehicleId);
    await undoSold(deps(), a, vehicleId);

    // Assert
    expect(draft).toMatchObject({
      status: "draft",
      hiddenReason: "unreal_price",
    });
    expect(republished.status).toBe("hidden");
    expect((await vehicleRow(t.db, vehicleId)).status).toBe("hidden");
  });

  it("[RPT-FR-008] mostrar de novo volta a publicado e limpa a marca; só admin e suporte", async () => {
    // Arrange
    const { a, admin, vehicleId } = await hidden();

    // Act
    await expect(showVehicle(t.db, a, vehicleId)).rejects.toMatchObject({
      status: 403,
    });
    const shown = await showVehicle(t.db, admin, vehicleId);
    const again = await showVehicle(t.db, admin, vehicleId);

    // Assert
    expect(shown).toEqual({ storeId: a.storeId, title: expect.any(String) });
    expect(again).toBeNull();
    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      status: "published",
      hiddenReason: null,
      hiddenNote: null,
      hiddenAt: null,
      hiddenBy: null,
    });
  });

  it("[RPT-SEC-004] ocultar o veículo da loja A não muda o da loja B; a loja B não mexe no da A", async () => {
    // Arrange
    const { vehicleId } = await hidden();
    const b = await liveStore(t.db, "loja-b");
    const onix = await car(t.db, b.storeId);

    // Act / Assert
    expect((await vehicleRow(t.db, onix.id)).status).toBe("published");
    await expect(markSold(deps(), b, vehicleId)).rejects.toMatchObject({
      status: 404,
    });
  });
});
