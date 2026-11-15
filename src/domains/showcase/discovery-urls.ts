/**
 * Endereços das páginas de descoberta (ADR 0014): `/carros/{marca}`,
 * `/carros/{marca}/{modelo}`, `/carros/{cidade}-{uf}` e `/carros/{cidade}-{uf}/{marca}`.
 * O que não segue o formato é `null` e nunca chega ao banco (DSC-SEC-004).
 */
export type DiscoveryKey = {
  makeSlug?: string;
  modelSlug?: string;
  citySlug?: string;
};

const UFS = new Set(
  "ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to".split(
    " ",
  ),
);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SEGMENT = 60;

const valid = (s: string) => s.length <= MAX_SEGMENT && SEGMENT.test(s);

function isCity(s: string): boolean {
  const cut = s.lastIndexOf("-");
  return cut > 0 && UFS.has(s.slice(cut + 1));
}

export function parseDiscoveryPath(segments: string[]): DiscoveryKey | null {
  if (!segments.length || segments.length > 2 || !segments.every(valid))
    return null;
  const [first, second] = segments;
  if (isCity(first)) {
    if (second === undefined) return { citySlug: first };
    return isCity(second) ? null : { citySlug: first, makeSlug: second };
  }
  return second === undefined
    ? { makeSlug: first }
    : { makeSlug: first, modelSlug: second };
}

export function discoveryPath(key: DiscoveryKey): string {
  const parts = key.citySlug
    ? [key.citySlug, key.makeSlug]
    : [key.makeSlug, key.modelSlug];
  const path = parts.filter(Boolean).join("/");
  // Sem recorte é o índice.
  return path ? `/carros/${path}` : "/carros";
}
