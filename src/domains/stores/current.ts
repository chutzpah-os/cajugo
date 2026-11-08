import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/platform/db/client";
import { publicStore } from "./service";
import { STORES_TAG } from "./tags";

export { STORES_TAG };

/**
 * Loja do endereço `/loja/{slug}` com cache (cota gratuita, SEO): a página decide
 * 404 / 308 antes de enviar conteúdo. Alteração de loja chama `updateTag(STORES_TAG)`.
 */
export async function cachedPublicStore(slug: string) {
  "use cache";
  cacheTag(STORES_TAG);
  cacheLife("hours");
  return publicStore(getDb(), slug);
}
