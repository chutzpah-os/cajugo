import { describe, expect, it } from "vitest";
import { createFipeClient, FipeUnavailable } from "./client";

/** fetch falso: responde pelo caminho pedido. */
function fake(routes: Record<string, unknown>, status = 200) {
  const calls: string[] = [];
  const fetchFn = (async (input: string | URL) => {
    const path = new URL(String(input)).pathname.replace(
      "/fipe/api/v1/carros",
      "",
    );
    calls.push(path);
    if (!(path in routes)) return new Response("not found", { status: 404 });
    return Response.json(routes[path], { status });
  }) as typeof fetch;
  return { calls, fetchFn };
}

describe("cliente da API pública da FIPE", () => {
  it("[VEH-FR-005] lista marcas, modelos e anos com códigos em texto", async () => {
    const { fetchFn } = fake({
      "/marcas": [{ codigo: "23", nome: "GM - Chevrolet" }],
      "/marcas/23/modelos": {
        modelos: [{ codigo: 5940, nome: "ONIX HATCH LT 1.0 12V Flex 5p Mec." }],
        anos: [],
      },
      "/marcas/23/modelos/5940/anos": [
        { codigo: "2020-1", nome: "2020 Gasolina" },
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

  it("[VEH-FR-007] preço da versão em centavos, com código FIPE e mês de referência", async () => {
    const { fetchFn } = fake({
      "/marcas/23/modelos/5940/anos/2020-1": {
        Valor: "R$ 58.358,00",
        CodigoFipe: "004413-0",
        MesReferencia: "novembro de 2026",
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
    const bad = createFipeClient(fake({ "/marcas": { erro: "x" } }).fetchFn);
    await expect(bad.brands()).rejects.toBeInstanceOf(FipeUnavailable);

    const down = createFipeClient(fake({ "/marcas": [] }, 503).fetchFn);
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
