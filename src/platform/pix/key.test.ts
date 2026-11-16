import { describe, expect, it } from "vitest";
import { pixKeySchema } from "./key";

const parse = (type: string, key: string) =>
  pixKeySchema.safeParse({ type, key });

describe("chave Pix", () => {
  it("[SEL-FR-014] normaliza cada tipo de chave", () => {
    // Act / Assert
    expect(parse("cpf", "529.982.247-25").data).toEqual({
      type: "cpf",
      key: "52998224725",
    });
    expect(parse("email", "Ana@Exemplo.com").data?.key).toBe("ana@exemplo.com");
    expect(parse("phone", "(79) 99999-0000").data?.key).toBe("+5579999990000");
    expect(
      parse("random", "0192F1E0-0000-7000-8000-00000000000A").data?.key,
    ).toBe("0192f1e0-0000-7000-8000-00000000000a");
  });

  it("[SEL-FR-014] recusa chave inválida no campo da chave", () => {
    // Act
    const bad = [
      parse("cpf", "111.111.111-11"),
      parse("email", "ana@"),
      parse("phone", "1234"),
      parse("random", "abc"),
      parse("boleto", "x"),
    ];

    // Assert
    expect(bad.every((r) => !r.success)).toBe(true);
    expect(bad[0].error?.issues[0].path).toEqual(["key"]);
  });
});
