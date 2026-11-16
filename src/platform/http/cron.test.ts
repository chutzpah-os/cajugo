import { afterEach, describe, expect, it, vi } from "vitest";
import { isCronRequest } from "./cron";

const req = (auth?: string) =>
  new Request("https://cajugo.test/api/v1/cron/daily", {
    headers: auth ? { authorization: auth } : {},
  });

describe("chamada do cron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("[ALR-SEC-004] só com o segredo do cron", () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    expect(isCronRequest(req("Bearer segredo-do-cron"))).toBe(true);
    for (const bad of [undefined, "Bearer outro", "segredo-do-cron", "Bearer "])
      expect(isCronRequest(req(bad)), String(bad)).toBe(false);
  });

  it("[ALR-SEC-004] sem CRON_SECRET configurado, nada passa", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronRequest(req("Bearer "))).toBe(false);
    expect(isCronRequest(req("Bearer undefined"))).toBe(false);
  });
});
