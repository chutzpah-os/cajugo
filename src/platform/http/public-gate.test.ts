import { describe, expect, it } from "vitest";
import { createGate } from "./public-gate";

describe("memória das decisões do proxy", () => {
  it("[SHW-NFR-005] decide uma vez por caminho e guarda por 60 s", async () => {
    let calls = 0;
    let now = 0;
    const gate = createGate(
      async () => {
        calls++;
        return "ok" as const;
      },
      { now: () => now },
    );

    await gate("/loja/a");
    await gate("/loja/a");
    expect(calls).toBe(1);

    now = 61_000;
    await gate("/loja/a");
    expect(calls).toBe(2);
  });

  it("[SHW-FR-014] se a decisão falhar, deixa passar: a página decide", async () => {
    const gate = createGate(async () => {
      throw new Error("banco fora");
    });

    expect(await gate("/loja/a")).toBe("ok");
  });

  it("[SHW-NFR-005] a memória tem limite", async () => {
    let calls = 0;
    const gate = createGate(
      async () => {
        calls++;
        return "ok" as const;
      },
      { maxEntries: 2 },
    );

    await gate("/a");
    await gate("/b");
    await gate("/c");
    await gate("/a");
    expect(calls).toBe(4);
  });
});
