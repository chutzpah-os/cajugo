import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores, storeSlugRedirects } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { gateDecision } from "./service";
import { car, liveStore } from "./testing/fixtures";
import { parseRefCode, vehiclePath } from "./urls";

describe("status real no proxy", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const pathOf = (v: {
    id: string;
    make: string | null;
    model: string | null;
    yearModel: number | null;
  }) => vehiclePath({ ...v, city: "Aracaju", state: "SE" });

  it("[SHW-FR-014] loja: atual passa, antiga redireciona, inexistente é 404", async () => {
    const a = await liveStore(t.db, "loja-nova");
    await t.db.insert(storeSlugRedirects).values({
      oldSlug: "loja-velha",
      storeId: a.storeId,
      expiresAt: new Date("2099-01-01"),
    });

    expect(await gateDecision(t.db, "/loja/loja-nova")).toBe("ok");
    expect(await gateDecision(t.db, "/loja/loja-velha")).toEqual({
      redirect: "/loja/loja-nova",
    });
    expect(await gateDecision(t.db, "/loja/nao-existe")).toBe("not-found");
  });

  it("[SHW-FR-014] veículo: endereço atual passa; texto desatualizado e formato antigo redirecionam", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const path = pathOf(v);

    expect(await gateDecision(t.db, path)).toBe("ok");
    expect(await gateDecision(t.db, `/v/${v.id}-texto-velho`)).toEqual({
      redirect: path,
    });
    expect(await gateDecision(t.db, `/v/${v.id}`)).toEqual({ redirect: path });
    expect(await gateDecision(t.db, `/loja/loja-a/v/${v.id}`)).toEqual({
      redirect: path,
    });
  });

  it("[SHW-FR-014] veículo inexistente, rascunho ou id inválido é 404; vendido e suspensa passam para a página avisar", async () => {
    const a = await liveStore(t.db, "loja-a");
    const draft = await car(t.db, a.storeId, { status: "draft" });
    const sold = await car(t.db, a.storeId, { status: "sold" });

    expect(await gateDecision(t.db, `/v/${crypto.randomUUID()}-x`)).toBe(
      "not-found",
    );
    expect(await gateDecision(t.db, `/v/${draft.id}`)).toBe("not-found");
    expect(await gateDecision(t.db, "/v/abc")).toBe("not-found");
    expect(await gateDecision(t.db, pathOf(sold))).toBe("ok");

    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, a.storeId));
    expect(await gateDecision(t.db, "/loja/loja-a")).toBe("ok");
  });

  it("[SHW-FR-009] [SHW-SEC-005] código do vendedor: só o formato esperado, em maiúsculas", () => {
    expect(parseRefCode("ana10")).toBe("ANA10");
    expect(parseRefCode("a")).toBeNull();
    expect(parseRefCode("<script>")).toBeNull();
    expect(parseRefCode(null)).toBeNull();
  });
});
