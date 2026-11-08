import type { FipeClient } from "@/platform/fipe/client";

/** Só testes: FIPE falsa com uma marca, duas versões do Onix e um S10. */
export function fakeFipe(): FipeClient {
  return {
    brands: async () => [{ id: "23", name: "GM - Chevrolet" }],
    models: async () => [
      { id: "1", name: "ONIX HATCH LT 1.0 12V Flex 5p Mec." },
      { id: "2", name: "ONIX SEDAN Plus 1.0 Turbo Aut." },
      { id: "3", name: "S10 Pick-Up LTZ 2.8 4x4 Diesel Aut." },
    ],
    years: async () => [
      { code: "2020-1", label: "2020 Gasolina" },
      { code: "32000-1", label: "Zero KM" },
    ],
    price: async () => ({
      fipeCode: "004413-0",
      priceCents: 8000000,
      month: "novembro de 2026",
    }),
  };
}
