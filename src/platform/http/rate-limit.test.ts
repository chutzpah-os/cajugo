import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/testing/test-db";
import { rateLimits } from "../db/schema";
import { consumeRateLimit, purgeRateLimits } from "./rate-limit";

describe("rate limit", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  const rule = { limit: 2, windowSeconds: 60 };
  const now = new Date("2026-10-23T12:00:10Z");

  it("libera até o limite e bloqueia a tentativa seguinte", async () => {
    // Act
    const first = await consumeRateLimit(t.db, "lead:ip1", rule, now);
    const second = await consumeRateLimit(t.db, "lead:ip1", rule, now);
    const third = await consumeRateLimit(t.db, "lead:ip1", rule, now);

    // Assert
    expect([first.ok, second.ok, third.ok]).toEqual([true, true, false]);
    expect(third.retryAfterSeconds).toBe(50);
  });

  it("chaves diferentes não se afetam", async () => {
    await consumeRateLimit(t.db, "lead:ip1", rule, now);
    await consumeRateLimit(t.db, "lead:ip1", rule, now);
    expect((await consumeRateLimit(t.db, "lead:ip2", rule, now)).ok).toBe(true);
  });

  it("a contagem zera na janela seguinte", async () => {
    for (let i = 0; i < 3; i++)
      await consumeRateLimit(t.db, "lead:ip1", rule, now);
    const next = await consumeRateLimit(
      t.db,
      "lead:ip1",
      rule,
      new Date("2026-10-23T12:01:00Z"),
    );
    expect(next.ok).toBe(true);
  });

  it("purge apaga só janelas antigas", async () => {
    await consumeRateLimit(t.db, "a", rule, new Date("2026-10-20T00:00:00Z"));
    await consumeRateLimit(t.db, "b", rule, now);
    await purgeRateLimits(t.db, new Date("2026-10-22T00:00:00Z"));
    const keys = (await t.db.select().from(rateLimits)).map((r) => r.key);
    expect(keys).toEqual(["b"]);
  });
});
