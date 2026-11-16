import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  contactStore: vi.fn(async () => ({ ok: true }) as const),
}));
vi.mock("./service", () => service);
vi.mock("@/platform/db/client", () => ({ getDb: () => ({ db: true }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));

const { contactLeadAction } = await import("./actions");

describe("action da mensagem à loja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
  });

  it("[LED-SEC-002] passa o IP só como hash ao serviço", async () => {
    // Act
    await contactLeadAction({ vehicleId: "x" });

    // Assert
    const [, , ctx] = service.contactStore.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { ipHash: string },
    ];
    expect(ctx.ipHash).not.toContain("203.0.113.7");
    expect(ctx.ipHash).toMatch(/^[\w-]{16,}$/);
  });

  it("[LED-FR-001] falha inesperada vira mensagem amigável", async () => {
    // Arrange
    service.contactStore.mockRejectedValueOnce(new Error("banco fora"));

    // Act
    const r = await contactLeadAction({});

    // Assert
    expect(r).toEqual({
      ok: false,
      message: "Não foi possível enviar agora. Tente de novo em instantes.",
      errors: [],
    });
  });
});
