/**
 * Título, descrição e parágrafo das páginas de descoberta (`docs/SEO.md` §2,
 * DSC-FR-006): `{Marca} {Modelo} usados à venda {em Cidade}`.
 */
export type DiscoveryNames = {
  make?: string;
  model?: string;
  city?: string;
  state?: string;
};

export type DiscoveryStats = {
  total: number;
  stores: number;
  cities: number;
  minPriceCents: number | null;
  maxPriceCents: number | null;
};

const reais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
/** Sem centavos e com espaço comum: "R$ 50.000". */
const money = (cents: number) =>
  reais.format(Math.round(cents / 100)).replace(/\s/g, " ");

const subject = (n: DiscoveryNames) =>
  [n.make, n.model].filter(Boolean).join(" ");
const place = (n: DiscoveryNames) => (n.city ? ` em ${n.city}/${n.state}` : "");
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function discoveryTitle(n: DiscoveryNames): string {
  return `${subject(n) || "Carros"} usados à venda${place(n)}`;
}

function priceRange(s: DiscoveryStats): string {
  if (s.minPriceCents === null || s.maxPriceCents === null) return "";
  return s.minPriceCents === s.maxPriceCents
    ? `por ${money(s.minPriceCents)}`
    : `de ${money(s.minPriceCents)} a ${money(s.maxPriceCents)}`;
}

/** "3 Fiat Argo usados à venda em 2 cidades, de R$ 50.000 a R$ 70.000." */
export function discoveryIntro(n: DiscoveryNames, s: DiscoveryStats): string {
  const what = subject(n);
  const head = what
    ? `${s.total} ${what} ${s.total === 1 ? "usado" : "usados"} à venda`
    : `${plural(s.total, "carro usado", "carros usados")} à venda`;
  // Na cidade, as lojas vêm depois do lugar; fora dela, as cidades são o lugar.
  const where = n.city
    ? `${head}${place(n)}, em ${plural(s.stores, "loja", "lojas")}`
    : `${head} em ${plural(s.cities, "cidade", "cidades")}`;
  const parts = [where, priceRange(s)].filter(Boolean);
  return `${parts.join(", ")}.`;
}

/** "Nenhum Fiat Mobi à venda agora em Campinas/SP" (DSC-FR-005). */
export function discoveryEmptyHeading(n: DiscoveryNames): string {
  return `Nenhum ${subject(n) || "carro"} à venda agora${place(n)}`;
}

export function discoveryDescription(
  n: DiscoveryNames,
  s: DiscoveryStats,
): string {
  if (!s.total)
    return `${discoveryEmptyHeading(n)}. Veja outros veículos usados na CajuGo, com contato direto com a loja pelo WhatsApp.`;
  const intro = discoveryIntro(n, s).slice(0, -1);
  return `${intro}. Fotos, preço e contato direto com a loja pelo WhatsApp.`;
}
