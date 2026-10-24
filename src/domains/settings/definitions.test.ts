import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  parseSettingValue,
  SETTINGS,
  SETTING_KEYS,
  settingValueJson,
  type SettingKey,
} from "./definitions";
import {
  bpsToPercent,
  centsToReais,
  maskPixKey,
  percentToBps,
  reaisToCents,
} from "./format";

const parse = (key: SettingKey, value: unknown) =>
  SETTINGS[key].schema.safeParse(value);
const message = (key: SettingKey, value: unknown) => {
  const r = parse(key, value);
  return r.success ? null : r.error.issues[0].message;
};

describe("lista de regras", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[CFG-FR-005] tem as 14 regras da spec, cada uma com grupo e rótulo", () => {
    expect([...SETTING_KEYS].sort()).toEqual(
      [
        "cajugo_fee_bps",
        "installment_rate_bps",
        "min_photos",
        "past_due_tolerance_days",
        "payout_min_cents",
        "pix",
        "referral_enabled",
        "referral_months",
        "referral_pct_bps",
        "referral_who",
        "require_approval",
        "retention_days",
        "review_business_days",
        "support_whatsapp",
      ].sort(),
    );
    for (const key of SETTING_KEYS) {
      expect(SETTINGS[key].group).toBeTruthy();
      expect(SETTINGS[key].label).toBeTruthy();
    }
  });

  it("[CFG-FR-003] o valor provisório de cada regra é válido e igual ao da migration", async () => {
    // Act
    const rows = await t.db
      .select({ key: settingValues.key, value: settingValueJson })
      .from(settingValues);

    // Assert
    const seeded = Object.fromEntries(
      rows.map((r) => [r.key, parseSettingValue(r.value)]),
    );
    for (const key of SETTING_KEYS) {
      expect(parse(key, SETTINGS[key].initial).success, key).toBe(true);
      expect(seeded[key], key).toEqual(SETTINGS[key].initial);
    }
  });
});

describe("limites das regras", () => {
  it("[CFG-FR-004] recusa valores fora da faixa, com a mensagem do campo", () => {
    expect(message("cajugo_fee_bps", 15000)).toBe(
      "Use um valor entre 0% e 20%.",
    );
    expect(message("min_photos", 0)).toBe("Use um valor entre 1 e 20.");
    expect(message("past_due_tolerance_days", -1)).toBe(
      "Use um valor entre 0 e 30 dias.",
    );
    expect(message("support_whatsapp", "79981")).toBe(
      "Informe o WhatsApp com DDI e DDD, só números (ex.: 5579981360206).",
    );
    expect(message("payout_min_cents", 50)).toBe(
      "Use um valor entre R$ 1,00 e R$ 1.000,00.",
    );
    expect(message("referral_months", 2.5)).toBe("Use um número inteiro.");
  });

  it("[CFG-FR-004] aceita os extremos de cada faixa", () => {
    expect(parse("cajugo_fee_bps", 0).success).toBe(true);
    expect(parse("cajugo_fee_bps", 2000).success).toBe(true);
    expect(parse("installment_rate_bps", 1000).success).toBe(true);
    expect(parse("referral_pct_bps", 10000).success).toBe(true);
    expect(parse("retention_days", 3650).success).toBe(true);
    expect(parse("payout_min_cents", 100000).success).toBe(true);
  });

  it("[CFG-FR-004] chave Pix: valida o formato conforme o tipo e normaliza", () => {
    const pix = (type: string, key: string) =>
      parse("pix", { type, key, beneficiary: "CajuGo Ltda" });

    expect(pix("cpf", "529.982.247-25")).toMatchObject({
      success: true,
      data: { key: "52998224725" },
    });
    expect(
      message("pix", {
        type: "cpf",
        key: "111.111.111-11",
        beneficiary: "X Y",
      }),
    ).toBe("CPF inválido.");
    expect(pix("cnpj", "11.222.333/0001-81").success).toBe(true);
    expect(pix("cnpj", "11.222.333/0001-00").success).toBe(false);
    expect(pix("email", "Pix@CajuGo.com.br")).toMatchObject({
      success: true,
      data: { key: "pix@cajugo.com.br" },
    });
    expect(pix("phone", "(79) 98136-0206")).toMatchObject({
      success: true,
      data: { key: "+5579981360206" },
    });
    expect(pix("random", "123e4567-e89b-12d3-a456-426614174000").success).toBe(
      true,
    );
    expect(pix("random", "abc").success).toBe(false);
    expect(
      parse("pix", { type: "email", key: "a@b.com", beneficiary: "" }).success,
    ).toBe(false);
    expect(parse("pix", null).success).toBe(true);
  });
});

describe("formatos da tela", () => {
  it("[CFG-FR-005] converte porcentagem e dinheiro entre a tela e o valor guardado", () => {
    expect(bpsToPercent(179)).toBe("1,79");
    expect(bpsToPercent(100)).toBe("1");
    expect(bpsToPercent(3000)).toBe("30");
    expect(percentToBps("1,79")).toBe(179);
    expect(percentToBps("30")).toBe(3000);
    expect(percentToBps("1,5")).toBe(150);
    expect(percentToBps("abc")).toBeNaN();
    expect(centsToReais(5000)).toBe("50,00");
    expect(centsToReais(123456)).toBe("1.234,56");
    expect(reaisToCents("50")).toBe(5000);
    expect(reaisToCents("1.234,56")).toBe(123456);
  });

  it("[CFG-SEC-004] a chave Pix aparece mascarada na tela", () => {
    expect(
      maskPixKey({ type: "cpf", key: "52998224725", beneficiary: "X" }),
    ).toBe("***.982.247-**");
    expect(
      maskPixKey({ type: "cnpj", key: "11222333000181", beneficiary: "X" }),
    ).toBe("**.222.333/0001-**");
    expect(
      maskPixKey({ type: "email", key: "pix@cajugo.com.br", beneficiary: "X" }),
    ).toBe("p***@cajugo.com.br");
    expect(
      maskPixKey({ type: "phone", key: "+5579981360206", beneficiary: "X" }),
    ).toBe("+55 (79) *****-0206");
    expect(
      maskPixKey({
        type: "random",
        key: "123e4567-e89b-12d3-a456-426614174000",
        beneficiary: "X",
      }),
    ).toBe("123e…4000");
  });
});
