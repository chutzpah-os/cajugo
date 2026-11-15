import { describe, expect, it } from "vitest";
import { slugify } from "@/platform/br/slug";
import { brandName } from "./service";

/** Nomes guardados da tabela FIPE em 2026-11-15 (108 marcas). */
const FIPE_BRANDS =
  "Acura|Agrale|Alfa Romeo|AM Gen|ARROW|Asia Motors|ASTON MARTIN|Audi|Baby|BMW|BRM|Bugre|BYD|CAB Motors|Cadillac|Caoa Changan|Caoa Chery|Caoa Chery/Chery|CBT Jipe|CHANA|CHANGAN|Chrysler|Citroën|Cross Lander|D2D Motors|Daewoo|Daihatsu|Denza|DFSK|Dodge|EFFA|Engesa|Envemo|Ferrari|FEVER|Fiat|Fibravan|Ford|FOTON|Fyber|GAC|GEELY|GM - Chevrolet|GREAT WALL|Gurgel|GWM|HAFEI|HITECH ELECTRIC|Honda|Hyundai|Isuzu|IVECO|JAC|Jaecoo|Jaguar|Jeep|Jetour|JINBEI|JPX|Kia Motors|Lada|LAMBORGHINI|Land Rover|Leapmotor|Lexus|LIFAN|LOBINI|Lotus|Mahindra|Maserati|Matra|Mazda|Mclaren|Mercedes-Benz|Mercury|MG|MINI|Mitsubishi|Miura|NETA|Nissan|Omoda|Peugeot|Plymouth|Pontiac|Porsche|RAM|RELY|Renault|Rolls-Royce|Rover|Saab|Saturn|Seat|SERES|SHINERAY|smart|SSANGYONG|Subaru|Suzuki|TAC|Toyota|Troller|Volvo|VW - VolksWagen|Wake|Walk|ZEEKR".split(
    "|",
  );

const UFS =
  "ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to".split(
    "|",
  );

describe("nome conhecido da marca", () => {
  it("[DSC-FR-011] corrige os nomes da FIPE que o comprador não usa", () => {
    // Act / Assert
    expect(brandName("GM - Chevrolet")).toBe("Chevrolet");
    expect(brandName("VW - VolksWagen")).toBe("Volkswagen");
    expect(brandName("ASTON MARTIN")).toBe("Aston Martin");
    expect(brandName("GREAT WALL")).toBe("Great Wall");
    expect(brandName("Kia Motors")).toBe("Kia");
    expect(brandName("Caoa Chery/Chery")).toBe("Caoa Chery");
    expect(brandName("Mclaren")).toBe("McLaren");
  });

  it("[DSC-FR-011] siglas e nomes certos ficam como estão", () => {
    for (const name of [
      "BMW",
      "BYD",
      "GWM",
      "MG",
      "MINI",
      "RAM",
      "Fiat",
      "Citroën",
    ])
      expect(brandName(name)).toBe(name);
  });

  it("[DSC-FR-012] nenhuma marca guardada vira endereço que parece cidade", () => {
    // Act
    const looksLikeCity = FIPE_BRANDS.map((b) => slugify(brandName(b))).filter(
      (slug) => UFS.some((uf) => slug.endsWith(`-${uf}`)),
    );

    // Assert
    expect(looksLikeCity).toEqual([]);
  });
});
