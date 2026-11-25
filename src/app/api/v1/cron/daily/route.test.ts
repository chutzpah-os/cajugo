import { afterEach, describe, expect, it, vi } from "vitest";

const purgeExpired = vi.fn(async () => 2);
const purgeRateLimits = vi.fn(async () => {});
vi.mock("@/domains/buyers/service", () => ({ purgeExpired }));
vi.mock("@/platform/http/rate-limit", () => ({ purgeRateLimits }));
const purgeExpiredContacts = vi.fn(async () => 1);
vi.mock("@/domains/contacts/service", () => ({ purgeExpiredContacts }));
const purgeOldLeads = vi.fn(async () => 3);
vi.mock("@/domains/leads/service", () => ({ purgeOldLeads }));
const runBillingCycle = vi.fn(async () => ({
  opened: 4,
  pastDue: 2,
  suspended: 1,
  ended: 0,
  archived: 0,
  slugsReleased: 0,
}));
vi.mock("@/domains/billing/service", () => ({ runBillingCycle }));
vi.mock("@/platform/db/client", () => ({ getDb: () => ({}) }));
const cloudinary = { destroy: vi.fn() };
vi.mock("@/platform/cloudinary/cloudinary", () => ({
  getCloudinary: () => cloudinary,
}));
const accounts = { adminDeleteUser: vi.fn() };
vi.mock("@/platform/supabase/server", () => ({
  adminAccounts: () => accounts,
}));
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));
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
    expect(purgeOldLeads).not.toHaveBeenCalled();
  });

  it("[ALR-FR-005] com o segredo: vence alertas e limpa rate limit, sem cache", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    const res = await call("Bearer segredo-do-cron");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).data.expiredAlerts).toBe(2);
    expect(purgeRateLimits).toHaveBeenCalledOnce();
    // Os vencidos saem também da lista em cache do admin (ALR-SEC-004)
    expect(revalidateTag).toHaveBeenCalledWith("search-alerts", { expire: 0 });
  });
});

describe("job diário › leads", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("[LED-SEC-006] apaga os dados pessoais dos leads com mais de 2 anos", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    const res = await call("Bearer segredo-do-cron");
    expect(res.status).toBe(200);
    expect(purgeOldLeads).toHaveBeenCalledOnce();
    expect((await res.json()).data.purgedLeads).toBe(3);
  });
});

describe("job diário › ciclo de cobrança", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("[SUB-NFR-002] [SUB-NFR-003] roda o ciclo, devolve os números e tira a loja suspensa do ar", async () => {
    // Arrange
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");

    // Act
    const res = await call("Bearer segredo-do-cron");

    // Assert
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({
      opened: 4,
      pastDue: 2,
      suspended: 1,
    });
    expect(revalidateTag).toHaveBeenCalledWith("stores", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("vehicles", { expire: 0 });
  });

  it("[SUB-NFR-003] sem suspensão, o cache público fica como está", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    runBillingCycle.mockResolvedValueOnce({
      opened: 1,
      pastDue: 0,
      suspended: 0,
      ended: 0,
      archived: 0,
      slugsReleased: 0,
    });

    await call("Bearer segredo-do-cron");

    expect(revalidateTag).not.toHaveBeenCalledWith("stores", { expire: 0 });
  });

  it("[CAN-FR-005] [CAN-NFR-002] loja cancelada no fim do período: devolve `ended` e tira a loja do ar", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    runBillingCycle.mockResolvedValueOnce({
      opened: 0,
      pastDue: 0,
      suspended: 0,
      ended: 2,
      archived: 0,
      slugsReleased: 0,
    });

    const res = await call("Bearer segredo-do-cron");

    expect((await res.json()).data.ended).toBe(2);
    expect(revalidateTag).toHaveBeenCalledWith("stores", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("vehicles", { expire: 0 });
  });

  it("[CAN-FR-007] arquiva com os clientes de login e de arquivos; devolve `archived` e tira do ar", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");
    runBillingCycle.mockResolvedValueOnce({
      opened: 0,
      pastDue: 0,
      suspended: 0,
      ended: 0,
      archived: 1,
      slugsReleased: 0,
    });

    const res = await call("Bearer segredo-do-cron");

    expect((await res.json()).data.archived).toBe(1);
    expect(runBillingCycle).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Date),
      {},
      { auth: accounts, cloudinary },
    );
    expect(revalidateTag).toHaveBeenCalledWith("stores", { expire: 0 });
  });

  it("[SUB-NFR-002] sem o segredo, o ciclo não roda", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-do-cron");

    await call("Bearer errado");

    expect(runBillingCycle).not.toHaveBeenCalled();
  });
});
