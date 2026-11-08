import type { MetadataRoute } from "next";
import { robotsRules } from "@/platform/seo/indexing";

export default function robots(): MetadataRoute.Robots {
  return robotsRules();
}
