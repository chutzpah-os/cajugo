import list from "./cities.json";

/** Cidade do IBGE (lista em `cities.json`, gerada por `scripts/generate-cities.ts`). */
export type City = { name: string; state: string; label: string };

/** Sem acento e em minúsculas, para buscar "sao jose" e achar "São José". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const CITIES: (City & { key: string })[] = (list as string[]).map((entry) => {
  const [name, state] = entry.split("|");
  return { name, state, label: `${name}/${state}`, key: fold(name) };
});

/** Sugestões pelo começo do nome (a partir de 2 letras), sem acento (STO-FR-004). */
export function searchCities(query: string, limit = 8): City[] {
  const q = fold(query);
  if (q.length < 2) return [];
  const found: City[] = [];
  for (const c of CITIES) {
    if (c.key.startsWith(q))
      found.push({ name: c.name, state: c.state, label: c.label });
    if (found.length === limit) break;
  }
  return found;
}

/** A cidade existe com essa UF? Devolve o nome oficial (com acento). */
export function findCity(name: string, state: string): City | null {
  const key = fold(name);
  const uf = state.trim().toUpperCase();
  const c = CITIES.find((x) => x.key === key && x.state === uf);
  return c ? { name: c.name, state: c.state, label: c.label } : null;
}
