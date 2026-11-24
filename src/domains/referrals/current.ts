import { cacheLife, cacheTag } from "next/cache";
import { SETTINGS_TAG } from "@/domains/settings/service";
import { getDb } from "@/platform/db/client";
import { landing, programBanner } from "./service";

/** Banner da vitrine [9a] em cache, renovado quando as regras mudam (IND-NFR-002). */
export async function cachedProgramBanner() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  return programBanner(getDb());
}

/** Landing do link [8c] em cache por código, renovada quando as regras mudam. */
export async function cachedLanding(code: string) {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  return landing(getDb(), code);
}
