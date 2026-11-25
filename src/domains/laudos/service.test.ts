import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configurePix } from "@/domains/billing/testing/fixtures";
import { laudoRequests, settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { laudoPix, requestLaudo } from "./service";

const NOW = new Date("2026-11-25T12:00:00Z");
const VALID = {
  name: "Carla Souza",
  whatsapp: "(79) 99999-0000",
  email: "Carla@Exemplo.com",
  plate: "abc-1d23",
  vehicle: "Toyota Corolla 2025",
  consent: true,
};

describe("LaudoCaju: pedido e Pix (016)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db, now: () => NOW });
  const ctx = { ipHash: "rede-a" };

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    await configurePix(t.db);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[LAU-FR-003] [LAU-FR-007] cria o pedido com o código, a placa limpa e o preço da época", async () => {
    // Act
    const r = await requestLaudo(deps(), VALID, ctx);

    // Assert
    expect(r).toMatchObject({ ok: true, code: expect.stringMatching(/^LC-/) });
    const [row] = await t.db.select().from(laudoRequests);
    expect(row).toMatchObject({
      status: "awaiting_pix",
      plate: "ABC1D23",
      email: "carla@exemplo.com",
      whatsapp: "5579999990000",
      priceCents: 7000,
    });
  });

  it("[LAU-FR-003] sem placa ou sem o aceite, erro no campo e nada gravado", async () => {
    const r = await requestLaudo(
      deps(),
      { ...VALID, plate: "12", consent: false },
      ctx,
    );

    expect(r).toMatchObject({ ok: false });
    if (r.ok) throw new Error("esperado erro");
    expect(r.errors.map((e) => e.field).sort()).toEqual(["consent", "plate"]);
    expect(await t.db.select().from(laudoRequests)).toHaveLength(0);
  });

  it("[LAU-FR-004] Pix com o valor, a chave e o código do pedido no BR Code, sem contatos", async () => {
    // Arrange
    const r = await requestLaudo(deps(), VALID, ctx);
    if (!r.ok) throw new Error("pedido falhou");

    // Act
    const pix = await laudoPix(deps(), r.code.toLowerCase());

    // Assert
    expect(pix).toMatchObject({ priceCents: 7000, status: "awaiting_pix" });
    expect(pix!.brCode).toContain("70.00");
    expect(pix!.brCode).toContain(r.code.replace("-", ""));
    expect(JSON.stringify(pix)).not.toContain("ABC1D23");
    expect(JSON.stringify(pix)).not.toContain("carla@exemplo.com");
    expect(await laudoPix(deps(), "LC-0000")).toBeNull();
  });

  it("[LAU-FR-007] preço novo vale só para os pedidos novos", async () => {
    const before = await requestLaudo(deps(), VALID, ctx);
    await t.db.insert(settingValues).values({
      key: "laudo_price_cents",
      value: 8000,
      validFrom: new Date("2026-11-25T11:00:00Z"),
    });
    const after = await requestLaudo(deps(), VALID, ctx);
    if (!before.ok || !after.ok) throw new Error("pedido falhou");

    expect((await laudoPix(deps(), after.code))?.priceCents).toBe(8000);
  });

  it("[LAU-SEC-001] campo isca finge sucesso sem gravar; a mesma rede passa do limite", async () => {
    const bot = await requestLaudo(
      deps(),
      { ...VALID, website: "http://spam" },
      ctx,
    );
    expect(bot.ok).toBe(true);
    expect(await t.db.select().from(laudoRequests)).toHaveLength(0);

    let last = bot;
    for (let i = 0; i < 10; i++) last = await requestLaudo(deps(), VALID, ctx);
    expect(last).toMatchObject({ ok: false });
  });
});
