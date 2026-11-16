import { afterEach, describe, expect, it, vi } from "vitest";

const purgeExpired = vi.fn(async () => 2);
const purgeRateLimits = vi.fn(async () => {});
vi.mock("@/domains/buyers/service", () => ({ purgeExpired }));
vi.mock("@/platform/http/rate-limit", () => ({ purgeRateLimits }));
vi.mock("@/platform/db/client", () => ({ getDb: () => ({}) }));
const { GET } = await import("./route");

const call = (auth?: string) =>
  GET(
    new Request("https://cajugo.test/api/v1/cron/daily", {
      headers: auth ? { authorization: auth } : {},
    }),
  );

describe("job diário", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("[ALR-SEC-004] sem o segredo: 401 e nada roda", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    const res = await call("Bearer errado");
    expect(res.status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
  });

  it("[ALR-FR-005] com o segredo: vence alertas e limpa rate limit, sem cache", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    const res = await call("Bearer segredo-do-cron");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).data.expiredAlerts).toBe(2);
    expect(purgeRateLimits).toHaveBeenCalledOnce();
  });
});
