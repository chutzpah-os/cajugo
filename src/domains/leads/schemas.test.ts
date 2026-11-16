import { describe, expect, it } from "vitest";
import { fieldErrorsFromZod } from "@/platform/http/errors";
import { leadFormSchema } from "./schemas";

const VALID = {
  vehicleId: "0192f1e0-0000-7000-8000-00000000000a",
  origin: "cajugo",
  name: "Ana",
  email: "ana@exemplo.com",
  phone: "(79) 99999-0000",
  message: "Olá, tenho interesse no veículo.",
  website: "",
};

const fields = (input: unknown) => {
  const r = leadFormSchema.safeParse(input);
  return r.success ? [] : fieldErrorsFromZod(r.error).map((e) => e.field);
};

describe("formulário de mensagem à loja", () => {
  it("[LED-FR-001] aceita os dados e guarda o telefone com 55", () => {
    // Arrange / Act
    const r = leadFormSchema.parse(VALID);

    // Assert
    expect(r.phone).toBe("5579999990000");
    expect(r.email).toBe("ana@exemplo.com");
  });

  it("[LED-FR-002] recusa e-mail inválido e telefone que não é brasileiro, no campo", () => {
    // Arrange / Act / Assert
    expect(fields({ ...VALID, email: "ana@" })).toEqual(["email"]);
    expect(fields({ ...VALID, phone: "1234" })).toEqual(["phone"]);
    expect(fields({ ...VALID, phone: "(79) 3211-0000" })).toEqual([]);
  });

  it("[LED-SEC-004] limita a mensagem a 1.000 caracteres e não aceita campo a mais", () => {
    // Arrange / Act / Assert
    expect(fields({ ...VALID, message: "a".repeat(1000) })).toEqual([]);
    expect(fields({ ...VALID, message: "a".repeat(1001) })).toEqual([
      "message",
    ]);
    expect(leadFormSchema.safeParse({ ...VALID, storeId: "x" }).success).toBe(
      false,
    );
    expect(leadFormSchema.safeParse({ ...VALID, status: "sold" }).success).toBe(
      false,
    );
  });
});
