import type { MetadataRoute } from "next";
import { staticSitemap } from "@/platform/seo/indexing";

export default function sitemap(): MetadataRoute.Sitemap {
  return staticSitemap();
}
