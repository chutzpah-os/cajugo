import { brDay } from "@/platform/br/date";
import {
  claimOncePer,
  isRecord,
  readMark,
  writeMark,
  type KeyValueStorage,
} from "@/platform/browser/marks";
import type { LeadOrigin } from "./status";

/** Marcas do lead no aparelho (plano 007, D1 e D2); a mecânica fica em `platform/browser`. */
const WHATSAPP_KEY = "cajugo:lead-whatsapp:v1";
const VIEWS_KEY = "cajugo:views:v1";
const CATALOG_KEY = "cajugo:catalog-store:v1";
const DAY_MS = 86_400_000;

/**
 * Pode criar o lead de WhatsApp deste veículo? No máximo um por aparelho a cada 24 horas
 * (LED-FR-013); a conversa abre de qualquer jeito.
 */
export const claimWhatsappLead = (
  storage: KeyValueStorage,
  vehicleId: string,
  now: Date,
): boolean => claimOncePer(storage, WHATSAPP_KEY, vehicleId, now, DAY_MS);

/** Conta a visualização deste veículo hoje (dia de São Paulo)? Uma por dia (LED-FR-015). */
export function claimView(
  storage: KeyValueStorage,
  vehicleId: string,
  now: Date,
): boolean {
  const day = brDay(now);
  const saved = readMark(storage, VIEWS_KEY);
  const ids =
    isRecord(saved) && saved.day === day && Array.isArray(saved.ids)
      ? saved.ids.filter((x): x is string => typeof x === "string")
      : [];
  if (ids.includes(vehicleId)) return false;
  writeMark(storage, VIEWS_KEY, { day, ids: [...ids, vehicleId] });
  return true;
}

/**
 * O catálogo `/loja/{slug}` aberto nesta aba (`sessionStorage`) marca a origem (D1). A
 * chave da loja é o `slug`, que já é público.
 */
export function markCatalogVisit(storage: KeyValueStorage, storeKey: string) {
  writeMark(storage, CATALOG_KEY, storeKey);
}

/**
 * Origem do lead (LED-FR-004): "Seu catálogo" quando o catálogo desta loja foi aberto na
 * aba ou o veículo não é divulgado na CajuGo; senão, "via CajuGo".
 */
export function leadOrigin(
  storage: KeyValueStorage,
  storeKey: string,
  shared: boolean,
): LeadOrigin {
  if (!shared) return "store_catalog";
  return readMark(storage, CATALOG_KEY) === storeKey
    ? "store_catalog"
    : "cajugo";
}
