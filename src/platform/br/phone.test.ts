import { describe, expect, it } from "vitest";
import { brMobileSchema } from "./phone";

describe("celular brasileiro", () => {
  it("[ALR-FR-001] aceita celular com DDD, com máscara ou +55, e guarda como 55 + dígitos", () => {
    for (const input of [
      "(79) 99999-0000",
      "79999990000",
      "+55 79 99999-0000",
      "55 (79) 9 9999-0000",
    ])
      expect(brMobileSchema.parse(input), input).toBe("5579999990000");
  });

  it("[ALR-FR-001] recusa fixo, sem DDD e número curto, com a mensagem do celular", () => {
    for (const input of [
      "(79) 3211-0000",
      "99999-0000",
      "7999999",
      "",
      "(00) 99999-0000",
    ]) {
      const r = brMobileSchema.safeParse(input);
      expect(r.success, input).toBe(false);
      expect(r.error?.issues[0]?.message, input).toBe(
        "Informe um celular com WhatsApp, com DDD.",
      );
    }
  });
});
