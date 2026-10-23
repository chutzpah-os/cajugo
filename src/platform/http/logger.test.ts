import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redactForLog } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("remove dados pessoais, inclusive aninhados", () => {
    expect(
      redactForLog({
        storeId: "s1",
        email: "a@b.com",
        lead: { phone: "19999999999", vehicleId: "v1" },
        clientIp: "200.1.1.1",
      }),
    ).toEqual({
      storeId: "s1",
      email: "[redacted]",
      lead: { phone: "[redacted]", vehicleId: "v1" },
      clientIp: "[redacted]",
    });
  });

  it("escreve uma linha JSON com nível e evento", () => {
    // Arrange
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    logger.warn("ratelimit.hit", { key: "lead", token: "abc" });

    // Assert
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toMatchObject({
      level: "warn",
      event: "ratelimit.hit",
      key: "lead",
      token: "[redacted]",
    });
  });
});
