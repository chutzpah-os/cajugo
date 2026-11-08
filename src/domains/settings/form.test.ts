import { describe, expect, it } from "vitest";
import { SETTINGS } from "./definitions";
import { displaySettingValue, formToSettings, settingFormValue } from "./form";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("formulário das regras", () => {
  it("[CFG-FR-001] mostra cada regra no formato da tela", () => {
    expect(settingFormValue("cajugo_fee_bps", 150)).toBe("1,5");
    expect(settingFormValue("installment_rate_bps", 179)).toBe("1,79");
    expect(settingFormValue("payout_min_cents", 5000)).toBe("50,00");
    expect(settingFormValue("min_photos", 6)).toBe("6");
    expect(settingFormValue("require_approval", true)).toBe(true);
    expect(settingFormValue("support_whatsapp", "557981360206")).toBe(
      "557981360206",
    );
  });

  it("[CFG-FR-002] converte o que foi digitado de volta para o valor guardado", () => {
    // Act
    const input = formToSettings(
      [
        "cajugo_fee_bps",
        "payout_min_cents",
        "min_photos",
        "require_approval",
        "referral_who",
      ],
      form({
        cajugo_fee_bps: "1,5",
        payout_min_cents: "1.234,56",
        min_photos: "8",
        // require_approval desmarcado: checkbox não vem no formulário
        "referral_who.store_owner": "on",
        "referral_who.referrer": "on",
      }),
    );

    // Assert
    expect(input).toEqual({
      cajugo_fee_bps: 150,
      payout_min_cents: 123456,
      min_photos: 8,
      require_approval: false,
      referral_who: { store_owner: true, seller: false, referrer: true },
    });
  });

  it("[CFG-FR-004] texto que não é número vira valor inválido para a validação recusar", () => {
    const input = formToSettings(
      ["min_photos", "cajugo_fee_bps"],
      form({ min_photos: "abc", cajugo_fee_bps: "" }),
    );

    expect(SETTINGS.min_photos.schema.safeParse(input.min_photos).success).toBe(
      false,
    );
    expect(
      SETTINGS.cajugo_fee_bps.schema.safeParse(input.cajugo_fee_bps).success,
    ).toBe(false);
  });

  it("[CFG-FR-006] o histórico mostra cada valor por extenso (chave Pix mascarada)", () => {
    expect(displaySettingValue("cajugo_fee_bps", 150)).toBe("1,5%");
    expect(displaySettingValue("payout_min_cents", 5000)).toBe("R$ 50,00");
    expect(displaySettingValue("past_due_tolerance_days", 7)).toBe("7");
    expect(displaySettingValue("require_approval", true)).toBe("Sim");
    expect(
      displaySettingValue("referral_who", {
        store_owner: true,
        seller: false,
        referrer: true,
      }),
    ).toBe("Lojistas, Indicadores");
    expect(
      displaySettingValue("pix", {
        type: "cpf",
        key: "52998224725",
        beneficiary: "CajuGo",
      }),
    ).toBe("***.982.247-** (CajuGo)");
    expect(displaySettingValue("pix", null)).toBe("Não configurada");
  });
});
