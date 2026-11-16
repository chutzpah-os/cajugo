import { describe, expect, it } from "vitest";
import { fieldErrorsFromZod } from "@/platform/http/errors";
import { commissionFor } from "./commission";
import { addSellerSchema, sellerSignupSchema } from "./schemas";
import { codeCandidates, SELLER_STATUS_LABEL } from "./status";

const VALID = {
  name: "Ana Souza",
  cpf: "529.982.247-25",
  phone: "(79) 99999-0000",
  email: "Ana@Exemplo.com",
  city: "Aracaju",
  pixType: "email",
  pixKey: "ana@exemplo.com",
  password: "senha-forte-1",
  terms: true,
};
const fields = (v: unknown) => {
  const r = sellerSignupSchema.safeParse(v);
  return r.success ? [] : fieldErrorsFromZod(r.error).map((e) => e.field);
};

describe("regras do vendedor", () => {
  it("[SEL-FR-001] cadastro aceita os dados e normaliza CPF, celular, e-mail e Pix", () => {
    // Act
    const r = sellerSignupSchema.parse(VALID);

    // Assert
    expect(r).toMatchObject({
      cpf: "52998224725",
      phone: "5579999990000",
      email: "ana@exemplo.com",
      pix: { type: "email", key: "ana@exemplo.com" },
    });
  });

  it("[SEL-FR-001] recusa CPF inválido, Pix inválido e sem os termos, no campo", () => {
    // Act / Assert
    expect(fields({ ...VALID, cpf: "111.111.111-11" })).toEqual(["cpf"]);
    expect(fields({ ...VALID, pixKey: "ana@" })).toEqual(["pixKey"]);
    expect(fields({ ...VALID, terms: false })).toEqual(["terms"]);
  });

  it("[SEL-SEC-008] não aceita status, código nem comissão vindos da tela", () => {
    // Act / Assert
    for (const extra of [
      { status: "active" },
      { code: "ANA" },
      { commission: 1 },
    ])
      expect(sellerSignupSchema.safeParse({ ...VALID, ...extra }).success).toBe(
        false,
      );
    expect(
      addSellerSchema.safeParse({
        cpf: VALID.cpf,
        city: "Aracaju",
        pixType: "cpf",
        pixKey: VALID.cpf,
        terms: true,
        email: "x@x.com",
      }).success,
    ).toBe(false);
  });

  it("[SEL-FR-008] comissão: % sobre o preço ou valor fixo; sem regra, nenhuma", () => {
    // Act / Assert
    expect(commissionFor({ type: "pct", value: 200 }, 6_000_000)).toBe(120_000);
    expect(commissionFor({ type: "fixed", value: 50_000 }, 6_000_000)).toBe(
      50_000,
    );
    expect(commissionFor({ type: null, value: null }, 6_000_000)).toBeNull();
    expect(commissionFor({ type: "pct", value: 200 }, null)).toBeNull();
  });

  it("[SEL-FR-004] código do vendedor: primeiro nome sem acento, em maiúsculas, depois com número", () => {
    // Act
    const c = codeCandidates("Ângela Maria", 3);

    // Assert
    expect(c).toEqual(["ANGELA", "ANGELA10", "ANGELA11"]);
    expect(codeCandidates("Li", 1)).toEqual(["LICAJU"]);
    expect(c.every((x) => /^[A-Z0-9]{3,20}$/.test(x))).toBe(true);
    expect(SELLER_STATUS_LABEL.in_review).toBe("Em análise");
  });
});
