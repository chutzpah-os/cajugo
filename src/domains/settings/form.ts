import {
  SETTINGS,
  SETTING_KEYS,
  type SettingGroup,
  type SettingInput,
  type SettingKey,
  type Settings,
} from "./definitions";
import {
  bpsToPercent,
  centsToReais,
  percentToBps,
  reaisToCents,
} from "./format";

type FormValue = string | boolean | Record<string, boolean>;

/** Valor guardado → como aparece no campo da tela (pt-BR). */
export function settingFormValue<K extends SettingKey>(
  key: K,
  value: Settings[K],
): FormValue {
  switch (SETTINGS[key].input) {
    case "percent":
      return bpsToPercent(value as number);
    case "money":
      return centsToReais(value as number);
    case "int":
      return String(value);
    case "bool":
      return value as boolean;
    case "who":
      return value as Record<string, boolean>;
    default:
      return String(value ?? "");
  }
}

const integer = (text: string) =>
  /^\s*-?\d+\s*$/.test(text) ? Number(text) : NaN;

/**
 * Formulário → entrada de `updateSettings`. Não valida: texto inválido vira `NaN`
 * e a validação de cada regra recusa com a mensagem do campo (CFG-FR-004).
 * Checkbox desmarcado não vem no formulário: vira `false`.
 */
export function formToSettings(
  keys: readonly SettingKey[],
  form: FormData,
): Record<string, unknown> {
  const text = (name: string) => String(form.get(name) ?? "");
  const input: Record<string, unknown> = {};
  for (const key of keys) {
    switch (SETTINGS[key].input) {
      case "percent":
        input[key] = percentToBps(text(key));
        break;
      case "money":
        input[key] = reaisToCents(text(key));
        break;
      case "int":
        input[key] = integer(text(key));
        break;
      case "bool":
        input[key] = form.get(key) === "on";
        break;
      case "who":
        input[key] = {
          store_owner: form.get(`${key}.store_owner`) === "on",
          seller: form.get(`${key}.seller`) === "on",
          referrer: form.get(`${key}.referrer`) === "on",
        };
        break;
      case "phone":
        input[key] = text(key);
        break;
      case "pix":
        break; // fluxo próprio com senha (CFG-FR-008)
    }
  }
  return input;
}

/** Campos de um grupo para a tela (a chave Pix tem bloco próprio). */
export function groupFields(
  settings: Settings,
  group: SettingGroup,
): { key: SettingKey; label: string; input: SettingInput; value: FormValue }[] {
  return SETTING_KEYS.filter(
    (k) => SETTINGS[k].group === group && SETTINGS[k].input !== "pix",
  ).map((key) => ({
    key,
    label: SETTINGS[key].label,
    input: SETTINGS[key].input,
    value: settingFormValue(key, settings[key]),
  }));
}
