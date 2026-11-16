/**
 * Marcas no aparelho do visitante (007 D1/D2, 007b D4): sem cookie, sem dado pessoal e
 * nunca enviadas ao servidor. Navegador sem armazenamento (aba anônima, bloqueio): a
 * ação segue e o limite por IP do servidor segura o abuso.
 */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function readMark(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeMark(
  storage: KeyValueStorage,
  key: string,
  value: unknown,
) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento: nada a guardar.
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Ids marcados dentro da janela; os vencidos ficam de fora. */
function recentClaims(
  storage: KeyValueStorage,
  key: string,
  now: Date,
  windowMs: number,
): Record<string, number> {
  const saved = readMark(storage, key);
  const recent: Record<string, number> = {};
  if (isRecord(saved))
    for (const [k, at] of Object.entries(saved))
      if (typeof at === "number" && now.getTime() - at < windowMs)
        recent[k] = at;
  return recent;
}

/** Este `id` já foi marcado na janela? Só confere, não grava. */
export const claimedWithin = (
  storage: KeyValueStorage,
  key: string,
  id: string,
  now: Date,
  windowMs: number,
): boolean => id in recentClaims(storage, key, now, windowMs);

/**
 * Pode fazer de novo com este `id`? No máximo uma vez por aparelho a cada `windowMs`
 * (lead de WhatsApp, LED-FR-013; denúncia, RPT-FR-010). Ids vencidos saem da marca.
 */
export function claimOncePer(
  storage: KeyValueStorage,
  key: string,
  id: string,
  now: Date,
  windowMs: number,
): boolean {
  const recent = recentClaims(storage, key, now, windowMs);
  if (id in recent) return false;
  writeMark(storage, key, { ...recent, [id]: now.getTime() });
  return true;
}

const NOWHERE: KeyValueStorage = { getItem: () => null, setItem: () => {} };

/**
 * Armazenamento do navegador: `local` (o aparelho) ou `session` (a aba). Sem acesso
 * (servidor, bloqueio), um armazenamento vazio: as marcas só não ficam guardadas.
 */
export function browserStorage(kind: "local" | "session"): KeyValueStorage {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return NOWHERE;
  }
}
