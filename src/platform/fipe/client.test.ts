import { describe, expect, it } from "vitest";
import { createFipeClient, FipeUnavailable } from "./client";

/** fetch falso: responde pelo caminho pedido. */
function fake(routes: Record<string, unknown>, status = 200) {
  const calls: string[] = [];
  const fetchFn = (async (input: string | URL) => {
    const path = new URL(String(input)).pathname.replace("/api/v2/cars", "");
    calls.push(path);
    if (!(path in routes)) return new Response("not found", { status: 404 });
    return Response.json(routes[path], { status });
  }) as typeof fetch;
  return { calls, fetchFn };
}

describe("cliente da API pública da FIPE (fipe.api.br v2)", () => {
  it("[VEH-FR-005] [PRC-FR-002] lista marcas, modelos e anos com códigos em texto", async () => {
    const { fetchFn } = fake({
      "/brands": [{ code: "23", name: "GM - Chevrolet" }],
      "/brands/23/models": [
        { code: "5940", name: "ONIX HATCH LT 1.0 12V Flex 5p Mec." },
      ],
      "/brands/23/models/5940/years": [
        { code: "2020-1", name: "2020 Gasolina" },
      ],
    });
    const fipe = createFipeClient(fetchFn);

    expect(await fipe.brands()).toEqual([{ id: "23", name: "GM - Chevrolet" }]);
    expect(await fipe.models("23")).toEqual([
      { id: "5940", name: "ONIX HATCH LT 1.0 12V Flex 5p Mec." },
    ]);
    expect(await fipe.years("23", "5940")).toEqual([
      { code: "2020-1", label: "2020 Gasolina" },
    ]);
  });

  it("[VEH-FR-007] [PRC-FR-002] preço da versão em centavos, com código FIPE e mês de referência", async () => {
    const { fetchFn } = fake({
      "/brands/23/models/5940/years/2020-1": {
        vehicleType: 1,
        price: "R$ 58.358,00",
        brand: "GM - Chevrolet",
        model: "ONIX HATCH LT 1.0 12V Flex 5p Mec.",
        modelYear: 2020,
        fuel: "Gasolina",
        codeFipe: "004413-0",
        referenceMonth: "novembro de 2026",
        fuelAcronym: "G",
      },
    });

    expect(
      await createFipeClient(fetchFn).price("23", "5940", "2020-1"),
    ).toEqual({
      fipeCode: "004413-0",
      priceCents: 5835800,
      month: "novembro de 2026",
    });
  });

  it("[VEH-NFR-004] resposta fora do formato, erro ou demora viram FipeUnavailable", async () => {
    const bad = createFipeClient(fake({ "/brands": { error: "x" } }).fetchFn);
    await expect(bad.brands()).rejects.toBeInstanceOf(FipeUnavailable);

    const down = createFipeClient(fake({ "/brands": [] }, 503).fetchFn);
    await expect(down.brands()).rejects.toBeInstanceOf(FipeUnavailable);

    const slow = createFipeClient(
      ((_: unknown, init?: RequestInit) =>
        new Promise((_r, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("abort")),
          ),
        )) as typeof fetch,
      { timeoutMs: 20 },
    );
    await expect(slow.brands()).rejects.toBeInstanceOf(FipeUnavailable);
  });
});
