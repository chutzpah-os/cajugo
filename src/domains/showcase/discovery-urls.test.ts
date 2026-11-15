import { describe, expect, it } from "vitest";
import { discoveryPath, parseDiscoveryPath } from "./discovery-urls";

describe("endereços de descoberta", () => {
  it("[DSC-FR-012] lê marca, modelo, cidade e marca na cidade", () => {
    expect(parseDiscoveryPath(["fiat"])).toEqual({ makeSlug: "fiat" });
    expect(parseDiscoveryPath(["fiat", "argo"])).toEqual({
      makeSlug: "fiat",
      modelSlug: "argo",
    });
    expect(parseDiscoveryPath(["campinas-sp"])).toEqual({
      citySlug: "campinas-sp",
    });
    expect(parseDiscoveryPath(["sao-jose-do-rio-preto-sp", "fiat"])).toEqual({
      citySlug: "sao-jose-do-rio-preto-sp",
      makeSlug: "fiat",
    });
  });

  it("[DSC-FR-012] só as 27 UFs fazem uma cidade; o resto é marca", () => {
    expect(parseDiscoveryPath(["land-rover"])).toEqual({
      makeSlug: "land-rover",
    });
    expect(parseDiscoveryPath(["cidade-xx"])).toEqual({
      makeSlug: "cidade-xx",
    });
    expect(parseDiscoveryPath(["-sp"])).toBeNull();
  });

  it("[DSC-FR-012] monta o endereço de volta, cidade antes da marca", () => {
    for (const segments of [
      ["fiat"],
      ["fiat", "argo"],
      ["campinas-sp"],
      ["campinas-sp", "fiat"],
    ])
      expect(discoveryPath(parseDiscoveryPath(segments)!)).toBe(
        `/carros/${segments.join("/")}`,
      );
  });

  it("[DSC-SEC-004] segmento inválido, vazio ou a mais não vira consulta", () => {
    for (const segments of [
      [],
      ["Fiat"],
      ["fiat", "<script>"],
      ["fi at"],
      ["fiat--argo"],
      ["fiat", "argo", "2020"],
      ["campinas-sp", "fiat", "argo"],
      ["campinas-sp", "rio-de-janeiro-rj"],
      ["a".repeat(61)],
    ])
      expect(parseDiscoveryPath(segments), segments.join("/")).toBeNull();
  });
});
