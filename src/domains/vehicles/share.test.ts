import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { shareCaption } from "./captions";
import { saveDraft, setShare } from "./service";
import { storeOwner, vehicleRow } from "./testing/fixtures";
import { vehicles } from "@/platform/db/schema";

describe("Divulgar na CajuGo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[VEH-FR-002] [VEH-FR-010] legenda por estado, com a de loja ainda não ativada", () => {
    const live = { storeLive: true };
    expect(shareCaption({ status: "published", share: true, ...live })).toBe(
      "Visível na vitrine CajuGo",
    );
    expect(shareCaption({ status: "published", share: false, ...live })).toBe(
      "Só no seu catálogo",
    );
    expect(shareCaption({ status: "draft", share: true, ...live })).toBe(
      "Publique para liberar",
    );
    expect(shareCaption({ status: "sold", share: false, ...live })).toBe(
      "Removido de todos os catálogos",
    );
    expect(
      shareCaption({ status: "published", share: true, storeLive: false }),
    ).toBe("Aparece quando a loja for ativada");
  });

  it("[VEH-FR-010] liga e desliga só em publicado; em rascunho, pede para publicar", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {});

    await expect(setShare(deps(), a, vehicleId, false)).rejects.toMatchObject({
      status: 409,
      detail: "Publique para liberar.",
    });
    await t.db.update(vehicles).set({ status: "published" });
    await setShare(deps(), a, vehicleId, false);
    expect((await vehicleRow(t.db, vehicleId)).shareOnCajugo).toBe(false);
  });

  it("[VEH-SEC-001] a loja B não muda a divulgação do veículo da loja A", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const b = await storeOwner(t.db, "loja-b", "b@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {});
    await t.db.update(vehicles).set({ status: "published" });

    await expect(setShare(deps(), b, vehicleId, false)).rejects.toMatchObject({
      status: 404,
    });
    expect((await vehicleRow(t.db, vehicleId)).shareOnCajugo).toBe(true);
  });

  it("[VEH-FR-010] só aceita ligado ou desligado de verdade", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {});
    await t.db.update(vehicles).set({ status: "published" });

    await expect(
      setShare(deps(), a, vehicleId, "false" as unknown as boolean),
    ).rejects.toMatchObject({
      status: 422,
    });
  });
});
