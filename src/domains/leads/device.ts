import { brDay } from "@/platform/br/date";
import type { LeadOrigin } from "./status";

/**
 * Marcas no aparelho do visitante (plano 007, D1 e D2): sem cookie, sem dado pessoal e
 * nunca enviadas ao servidor. Navegador sem armazenamento (aba anônima, bloqueio): o
 * registro segue e o limite por IP do servidor segura o abuso.
 */
type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const WHATSAPP_KEY = "cajugo:lead-whatsapp:v1";
const VIEWS_KEY = "cajugo:views:v1";
const CATALOG_KEY = "cajugo:catalog-store:v1";
const DAY_MS = 86_400_000;

function read(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(storage: KeyValueStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento: nada a guardar.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Pode criar o lead de WhatsApp deste veículo? No máximo um por aparelho a cada 24 horas
 * (LED-FR-013); a conversa abre de qualquer jeito.
 */
export function claimWhatsappLead(
  storage: KeyValueStorage,
  vehicleId: string,
  now: Date,
): boolean {
  const saved = read(storage, WHATSAPP_KEY);
  const recent: Record<string, number> = {};
  if (isRecord(saved))
    for (const [id, at] of Object.entries(saved))
      if (typeof at === "number" && now.getTime() - at < DAY_MS)
        recent[id] = at;
  if (vehicleId in recent) return false;
  write(storage, WHATSAPP_KEY, { ...recent, [vehicleId]: now.getTime() });
  return true;
}

/** Conta a visualização deste veículo hoje (dia de São Paulo)? Uma por dia (LED-FR-015). */
export function claimView(
  storage: KeyValueStorage,
  vehicleId: string,
  now: Date,
): boolean {
  const day = brDay(now);
  const saved = read(storage, VIEWS_KEY);
  const ids =
    isRecord(saved) && saved.day === day && Array.isArray(saved.ids)
      ? saved.ids.filter((x): x is string => typeof x === "string")
      : [];
  if (ids.includes(vehicleId)) return false;
  write(storage, VIEWS_KEY, { day, ids: [...ids, vehicleId] });
  return true;
}

/** O catálogo `/loja/{slug}` aberto nesta aba (`sessionStorage`) marca a origem (D1). */
export function markCatalogVisit(storage: KeyValueStorage, storeId: string) {
  write(storage, CATALOG_KEY, storeId);
}

/**
 * Origem do lead (LED-FR-004): "Seu catálogo" quando o catálogo desta loja foi aberto na
 * aba ou o veículo não é divulgado na CajuGo; senão, "via CajuGo".
 */
export function leadOrigin(
  storage: KeyValueStorage,
  storeId: string,
  shared: boolean,
): LeadOrigin {
  if (!shared) return "store_catalog";
  return read(storage, CATALOG_KEY) === storeId ? "store_catalog" : "cajugo";
}
