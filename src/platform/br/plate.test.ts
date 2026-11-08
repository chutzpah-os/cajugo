import { describe, expect, it } from "vitest";
import { parsePlate } from "./plate";

describe("placa", () => {
  it("[VEH-FR-005] aceita Mercosul e antiga, com ou sem hífen e em minúsculas, e deriva o final", () => {
    expect(parsePlate("ABC1D23")).toEqual({ plate: "ABC1D23", end: "3" });
    expect(parsePlate("abc-1234")).toEqual({ plate: "ABC1234", end: "4" });
    expect(parsePlate(" rio2a18 ")).toEqual({ plate: "RIO2A18", end: "8" });
  });

  it("[VEH-FR-005] recusa formatos que não são placa", () => {
    for (const p of ["", "AB1234", "ABCD123", "1234ABC", "ABC12345", "ABC1DD3"])
      expect(parsePlate(p), p).toBeNull();
  });
});
