import { z } from "zod";

/**
 * API pública gratuita da FIPE (Parallelum, não oficial; 500 consultas/dia), só
 * leitura. Quem usa é o domínio `fipe`, que guarda tudo no nosso banco (ADR 0012).
 * Trocar de fonte muda só este arquivo.
 */
const BASE = "https://parallelum.com.br/fipe/api/v1/carros";

/** A API não respondeu a tempo, deu erro ou mudou de formato. */
export class FipeUnavailable extends Error {}

const code = z.union([z.string(), z.number()]).transform(String);
const item = z.object({ codigo: code, nome: z.string() });
const brandsSchema = z.array(item);
const modelsSchema = z.object({ modelos: z.array(item) });
const yearsSchema = z.array(item);
const priceSchema = z.object({
  Valor: z.string().regex(/^R\$ [\d.]+,\d{2}$/),
  CodigoFipe: z.string(),
  MesReferencia: z.string(),
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
      return (await get("/marcas", brandsSchema)).map((b) => ({
        id: b.codigo,
        name: b.nome,
      }));
    },
    async models(brandId: string) {
      const { modelos } = await get(`/marcas/${brandId}/modelos`, modelsSchema);
      return modelos.map((m) => ({ id: m.codigo, name: m.nome }));
    },
    async years(brandId: string, modelId: string) {
      return (
        await get(`/marcas/${brandId}/modelos/${modelId}/anos`, yearsSchema)
      ).map((y) => ({
        code: y.codigo,
        label: y.nome,
      }));
    },
    async price(brandId: string, modelId: string, yearCode: string) {
      const p = await get(
        `/marcas/${brandId}/modelos/${modelId}/anos/${yearCode}`,
        priceSchema,
      );
      return {
        fipeCode: p.CodigoFipe,
        priceCents: toCents(p.Valor),
        month: p.MesReferencia,
      };
    },
  };
}
