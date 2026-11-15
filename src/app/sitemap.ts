import type { MetadataRoute } from "next";
import { cachedSitemap } from "@/domains/showcase/current";
import { appUrl } from "@/platform/http/urls";
import { SITEMAP_IDS, staticSitemap } from "@/platform/seo/indexing";

export function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

/** Um sitemap por tipo (SHW-FR-015, DSC-FR-010): fixas, lojas, veículos e descoberta. */
export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  if (id !== "stores" && id !== "vehicles" && id !== "discovery")
    return staticSitemap();
  const base = appUrl();
  const entries = await cachedSitemap(id);
  return entries.map((e) => ({
    url: `${base}${e.path}`,
    lastModified: e.lastModified,
  }));
}
