import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = new Date("2026-11-16T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;

describe("relativeTime", () => {
  it("[LED-FR-007] agora, minutos, horas, dias e a data depois de uma semana", () => {
    // Act / Assert
    expect(relativeTime(ago(20_000), NOW)).toBe("agora");
    expect(relativeTime(ago(5 * MIN), NOW)).toBe("há 5 min");
    expect(relativeTime(ago(2 * 60 * MIN), NOW)).toBe("há 2 h");
    expect(relativeTime(ago(26 * 60 * MIN), NOW)).toBe("há 1 dia");
    expect(relativeTime(ago(3 * 24 * 60 * MIN), NOW)).toBe("há 3 dias");
    expect(relativeTime(ago(10 * 24 * 60 * MIN), NOW)).toBe("06/11/2026");
  });
});
