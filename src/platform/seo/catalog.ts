import { brl } from "../br/money";
import { appUrl } from "../http/urls";

/**
 * Títulos, descrições e dados estruturados da vitrine, da loja e do veículo
 * (`docs/SEO.md` §2, SHW-FR-013). Recebem só dados públicos: placa e chassi nunca
 * passam por aqui (SHW-SEC-001).
 */
type CarName = {
  make: string | null;
  model: string | null;
  version: string | null;
  yearModel: number | null;
};

const CONTEXT = "https://schema.org";
const abs = (path: string) => `${appUrl()}${path}`;
const km = new Intl.NumberFormat("pt-BR");

/** A versão da FIPE já começa pelo modelo: não repete. */
function carName(c: CarName): string {
  const model =
    c.version &&
    c.model &&
    c.version.toUpperCase().startsWith(c.model.toUpperCase())
      ? null
      : c.model;
  return [c.make, model, c.version, c.yearModel].filter(Boolean).join(" ");
}

export function vehicleTitle(c: CarName & { city: string; state: string }) {
  return `${carName(c)} – ${c.city}/${c.state}`;
}

export function vehicleDescription(
  c: CarName & {
    city: string;
    state: string;
    priceCents: number | null;
    mileageKm: number | null;
    transmission: string | null;
    storeName: string;
  },
) {
  const facts = [
    c.priceCents !== null && `por ${brl(c.priceCents)}`,
    c.mileageKm !== null && `${km.format(c.mileageKm)} km`,
    c.transmission && `câmbio ${c.transmission}`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${carName(c)}${facts ? ` ${facts}` : ""}. Anunciado por ${c.storeName} em ${c.city}/${c.state}.`;
}

export function storeTitle(s: { name: string; city: string; state: string }) {
  return `${s.name} – Carros usados e seminovos em ${s.city}/${s.state}`;
}

export function vehicleAlt(
  c: Pick<CarName, "make" | "model" | "yearModel"> & { color: string | null },
) {
  return [c.make, c.model, c.yearModel, c.color].filter(Boolean).join(" ");
}

export function carJsonLd(
  c: CarName & {
    path: string;
    image: string | null;
    mileageKm: number | null;
    priceCents: number | null;
    storeName: string;
    sold: boolean;
  },
) {
  return {
    "@context": CONTEXT,
    "@type": "Car",
    name: carName(c),
    url: abs(c.path),
    ...(c.image ? { image: c.image } : {}),
    brand: { "@type": "Brand", name: c.make ?? "" },
    ...(c.yearModel ? { vehicleModelDate: String(c.yearModel) } : {}),
    ...(c.mileageKm !== null
      ? {
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: c.mileageKm,
            unitCode: "KMT",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: abs(c.path),
      price: ((c.priceCents ?? 0) / 100).toFixed(2),
      priceCurrency: "BRL",
      availability: `${CONTEXT}/${c.sold ? "SoldOut" : "InStock"}`,
      seller: { "@type": "AutoDealer", name: c.storeName },
    },
  };
}

export function autoDealerJsonLd(s: {
  name: string;
  path: string;
  city: string;
  state: string;
  telephone: string;
  image?: string | null;
}) {
  return {
    "@context": CONTEXT,
    "@type": "AutoDealer",
    name: s.name,
    url: abs(s.path),
    telephone: `+${s.telephone}`,
    ...(s.image ? { image: s.image } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: s.city,
      addressRegion: s.state,
      addressCountry: "BR",
    },
  };
}

export function itemListJsonLd(paths: string[]) {
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    itemListElement: paths.map((path, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(path),
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": CONTEXT,
    "@graph": [
      { "@type": "Organization", name: "CajuGo", url: abs("/") },
      {
        "@type": "WebSite",
        name: "CajuGo",
        url: abs("/"),
        potentialAction: {
          "@type": "SearchAction",
          target: `${abs("/")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
