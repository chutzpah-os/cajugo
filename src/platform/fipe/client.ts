import { z } from "zod";

/**
 * API pública gratuita da FIPE (fipe.api.br v2, sem chave; 500 consultas/dia), só
 * leitura. Quem usa é o domínio `fipe`, que guarda tudo no nosso banco (ADR 0012).
 * Trocar de fonte muda só este arquivo.
 */
const BASE = "https://fipe.api.br/api/v2/cars";

/** A API não respondeu a tempo, deu erro ou mudou de formato. */
export class FipeUnavailable extends Error {}

const code = z.union([z.string(), z.number()]).transform(String);
const item = z.object({ code, name: z.string() });
const listSchema = z.array(item);
const priceSchema = z.object({
  price: z.string().regex(/^R\$ [\d.]+,\d{2}$/),
  codeFipe: z.string(),
  referenceMonth: z.string(),
});

/** "R$ 58.358,00" → 5835800. */
const toCents = (valor: string) =>
  Number(valor.replace(/[^\d,]/g, "").replace(",", ""));

export type FipeClient = ReturnType<typeof createFipeClient>;

export function createFipeClient(
  fetchFn: typeof fetch = fetch,
  { timeoutMs = 5000 }: { timeoutMs?: number } = {},
) {
  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    let body: unknown;
    try {
      const res = await fetchFn(`${BASE}${path}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`FIPE respondeu ${res.status}`);
      body = await res.json();
    } catch (error) {
      throw new FipeUnavailable(
        error instanceof Error ? error.message : String(error),
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new FipeUnavailable("FIPE mudou o formato da resposta");
    return parsed.data;
  }

  return {
    async brands() {
      return (await get("/brands", listSchema)).map((b) => ({
        id: b.code,
        name: b.name,
      }));
    },
    async models(brandId: string) {
      return (await get(`/brands/${brandId}/models`, listSchema)).map((m) => ({
        id: m.code,
        name: m.name,
      }));
    },
    async years(brandId: string, modelId: string) {
      return (
        await get(`/brands/${brandId}/models/${modelId}/years`, listSchema)
      ).map((y) => ({ code: y.code, label: y.name }));
    },
    async price(brandId: string, modelId: string, yearCode: string) {
      const p = await get(
        `/brands/${brandId}/models/${modelId}/years/${yearCode}`,
        priceSchema,
      );
      return {
        fipeCode: p.codeFipe,
        priceCents: toCents(p.price),
        month: p.referenceMonth,
      };
    },
  };
}
