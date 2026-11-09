import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoDealerJsonLd,
  breadcrumbJsonLd,
  carJsonLd,
  itemListJsonLd,
  storeTitle,
  vehicleAlt,
  vehicleDescription,
  vehicleTitle,
  websiteJsonLd,
} from "./catalog";

const CAR = {
  make: "GM - Chevrolet",
  model: "ONIX",
  version: "ONIX HATCH LT 1.0 12V Flex 5p Mec.",
  yearModel: 2020,
  city: "Aracaju",
  state: "SE",
};

describe("SEO do catálogo", () => {
  beforeEach(() => vi.stubEnv("APP_URL", "https://cajugo.test"));
  afterEach(() => vi.unstubAllEnvs());

  it("[SHW-FR-013] título e descrição do veículo, sem repetir o modelo que já está na versão", () => {
    expect(vehicleTitle(CAR)).toBe(
      "GM - Chevrolet ONIX HATCH LT 1.0 12V Flex 5p Mec. 2020 – Aracaju/SE",
    );
    expect(
      vehicleDescription({
        ...CAR,
        priceCents: 5000000,
        mileageKm: 42000,
        transmission: "Manual",
        storeName: "Silva Autocar",
      }),
    ).toBe(
      "GM - Chevrolet ONIX HATCH LT 1.0 12V Flex 5p Mec. 2020 por R$ 50.000,00, 42.000 km, câmbio Manual. Anunciado por Silva Autocar em Aracaju/SE.",
    );
    expect(
      storeTitle({ name: "Silva Autocar", city: "Aracaju", state: "SE" }),
    ).toBe("Silva Autocar – Carros usados e seminovos em Aracaju/SE");
  });

  it("[SHW-FR-013] alt da imagem com marca, modelo, ano e cor", () => {
    expect(vehicleAlt({ ...CAR, color: "Prata" })).toBe(
      "GM - Chevrolet ONIX 2020 Prata",
    );
    expect(vehicleAlt({ ...CAR, color: null })).toBe(
      "GM - Chevrolet ONIX 2020",
    );
  });

  it("[SHW-FR-013] [SHW-FR-010] Car + Offer com disponibilidade; vendido é SoldOut", () => {
    const base = {
      ...CAR,
      path: "/v/1-onix",
      image: "https://img.test/a.jpg",
      mileageKm: 42000,
      priceCents: 5000000,
      storeName: "Silva Autocar",
    };

    expect(carJsonLd({ ...base, sold: false })).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Car",
      url: "https://cajugo.test/v/1-onix",
      brand: { "@type": "Brand", name: "GM - Chevrolet" },
      mileageFromOdometer: {
        "@type": "QuantitativeValue",
        value: 42000,
        unitCode: "KMT",
      },
      offers: {
        "@type": "Offer",
        price: "50000.00",
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        seller: { "@type": "AutoDealer", name: "Silva Autocar" },
      },
    });
    expect(carJsonLd({ ...base, sold: true }).offers.availability).toBe(
      "https://schema.org/SoldOut",
    );
  });

  it("[SHW-FR-013] AutoDealer, ItemList, BreadcrumbList, Organization e WebSite", () => {
    expect(
      autoDealerJsonLd({
        name: "Silva",
        path: "/loja/silva",
        city: "Aracaju",
        state: "SE",
        telephone: "557932110000",
      }),
    ).toMatchObject({
      "@type": "AutoDealer",
      url: "https://cajugo.test/loja/silva",
      telephone: "+557932110000",
      address: {
        addressLocality: "Aracaju",
        addressRegion: "SE",
        addressCountry: "BR",
      },
    });
    expect(itemListJsonLd(["/v/a", "/v/b"])).toMatchObject({
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, url: "https://cajugo.test/v/a" },
        { "@type": "ListItem", position: 2, url: "https://cajugo.test/v/b" },
      ],
    });
    expect(
      breadcrumbJsonLd([
        { name: "Início", path: "/" },
        { name: "Silva", path: "/loja/silva" },
      ]),
    ).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Início", item: "https://cajugo.test/" },
        { position: 2 },
      ],
    });
    const site = websiteJsonLd();
    expect(site["@graph"].map((n) => n["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
    expect(JSON.stringify(site)).toContain(
      "https://cajugo.test/?q={search_term_string}",
    );
  });
});
