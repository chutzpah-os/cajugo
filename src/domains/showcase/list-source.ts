import { z } from "zod";
import { parseDiscoveryPath, type DiscoveryKey } from "./discovery-urls";

/**
 * De onde vem uma lista pública, para as actions de contagem e "Carregar mais": a
 * vitrine (`null`), o catálogo de uma loja ou uma página de descoberta. O servidor
 * resolve o escopo; o navegador nunca manda `storeId` nem condição de consulta.
 */
export type ListSource =
  null | { kind: "store"; slug: string } | { kind: "discovery"; path: string };

export const listSourceSchema = z.union([
  z.null(),
  z.object({ kind: z.literal("store"), slug: z.string().max(60) }).strict(),
  z
    .object({ kind: z.literal("discovery"), path: z.string().max(200) })
    .strict(),
]);

/** `/carros/fiat/argo` → recorte; o que não é página de descoberta → `null`. */
export function discoveryKeyOf(path: string): DiscoveryKey | null {
  if (!path.startsWith("/carros/")) return null;
  return parseDiscoveryPath(path.slice("/carros/".length).split("/"));
}
