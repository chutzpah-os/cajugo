/**
 * Gera `src/platform/geo/cities.json` a partir da API pública do IBGE (D3 do plano 003).
 * Rodar só quando o IBGE mudar a lista: `node_modules/.bin/tsx scripts/generate-cities.ts`.
 */
import { writeFileSync } from "node:fs";

type IbgeCity = {
  nome: string;
  microrregiao?: { mesorregiao: { UF: { sigla: string } } };
  "regiao-imediata"?: { "regiao-intermediaria": { UF: { sigla: string } } };
};

async function main() {
  const res = await fetch(
    "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
  );
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
  const cities = ((await res.json()) as IbgeCity[]).map((c) => {
    const uf =
      c.microrregiao?.mesorregiao.UF.sigla ??
      c["regiao-imediata"]?.["regiao-intermediaria"].UF.sigla;
    if (!uf) throw new Error(`Cidade sem UF: ${c.nome}`);
    return `${c.nome}|${uf}`;
  });
  cities.sort((a, b) => a.localeCompare(b, "pt-BR"));
  writeFileSync("src/platform/geo/cities.json", JSON.stringify(cities) + "\n");
  console.log(`${cities.length} cidades gravadas.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
