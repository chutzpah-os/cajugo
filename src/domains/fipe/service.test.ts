import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FipeUnavailable, type FipeClient } from "@/platform/fipe/client";
import { brands, models, reference, years } from "./service";

const DAY = 86_400_000;

/** Cliente falso: conta consultas e pode "cair". */
function fakeClient() {
  const state = { calls: 0, down: false, price: 5835800 };
  const guard = () => {
    state.calls++;
    if (state.down) throw new FipeUnavailable("fora");
  };
  const client: FipeClient = {
    async brands() {
      guard();
      return [{ id: "23", name: "GM - Chevrolet" }];
    },
    async models() {
      guard();
      return [
        { id: "1", name: "ONIX HATCH LT 1.0 12V Flex 5p Mec." },
        { id: "2", name: "ONIX SEDAN Plus 1.0 Turbo Aut." },
        { id: "3", name: "S10 Pick-Up LTZ 2.8 4x4 Diesel Aut." },
      ];
    },
    async years() {
      guard();
      return [{ code: "2020-1", label: "2020 Gasolina" }];
    },
    async price() {
      guard();
      return {
        fipeCode: "004413-0",
        priceCents: state.price,
        month: "novembro de 2026",
      };
    },
  };
  return { client, state };
}

describe("tabela FIPE guardada (ADR 0012)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let now: Date;
  let fake: ReturnType<typeof fakeClient>;
  const deps = () => ({ db: t.db, fipe: fake.client, now: () => now });

  beforeEach(async () => {
    t = await createTestDb();
    now = new Date("2026-11-08T12:00:00Z");
    fake = fakeClient();
  });
  afterEach(() => t.close());

  it("[VEH-FR-005] busca na API só na primeira vez e depois lê do banco", async () => {
    expect(await brands(deps())).toEqual([
      { id: "23", name: "GM - Chevrolet" },
    ]);
    await brands(deps());

    expect(fake.state.calls).toBe(1);
  });

  it("[VEH-FR-005] modelos agrupados por família (Modelo) com as versões da FIPE", async () => {
    const list = await models(deps(), "23");

    expect(list.map((f) => f.family)).toEqual(["ONIX", "S10"]);
    expect(list[0].versions.map((v) => v.id)).toEqual(["1", "2"]);
    expect(await years(deps(), "23", "1")).toEqual([
      { id: "1:2020-1", label: "2020 Gasolina" },
    ]);
  });

  it("[VEH-FR-007] referência do mês guardada; renova depois de 30 dias", async () => {
    expect(await reference(deps(), "23", "1", "2020-1")).toEqual({
      fipeCode: "004413-0",
      priceCents: 5835800,
      month: "novembro de 2026",
    });
    await reference(deps(), "23", "1", "2020-1");
    expect(fake.state.calls).toBe(1);

    fake.state.price = 5900000;
    now = new Date(now.getTime() + 31 * DAY);
    expect((await reference(deps(), "23", "1", "2020-1"))?.priceCents).toBe(
      5900000,
    );
  });

  it("[VEH-NFR-004] API fora do ar: usa o guardado, mesmo vencido; sem nada guardado, avisa", async () => {
    await brands(deps());
    await reference(deps(), "23", "1", "2020-1");
    fake.state.down = true;
    now = new Date(now.getTime() + 40 * DAY);

    expect(await brands(deps())).toHaveLength(1);
    expect((await reference(deps(), "23", "1", "2020-1"))?.priceCents).toBe(
      5835800,
    );
    await expect(models(deps(), "23")).rejects.toMatchObject({
      status: 503,
      detail: "Lista indisponível agora. Tente de novo em instantes.",
    });
    expect(await reference(deps(), "23", "9", "2020-1")).toBeNull();
  });
});
