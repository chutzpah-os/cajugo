/**
 * Memória das decisões do proxy (ADR 0013): cada caminho é decidido no máximo uma vez
 * por minuto, para não consultar o banco a cada acesso (cota gratuita). Decisão que
 * falha deixa passar: a página decide de novo, como segunda barreira.
 */
export type GateDecision = "ok" | "not-found" | { redirect: string };

const TTL_MS = 60_000;

export function createGate(
  decide: (path: string) => Promise<GateDecision>,
  {
    now = Date.now,
    maxEntries = 5000,
  }: { now?: () => number; maxEntries?: number } = {},
) {
  const memory = new Map<string, { decision: GateDecision; until: number }>();
  return async (path: string): Promise<GateDecision> => {
    const hit = memory.get(path);
    if (hit && hit.until > now()) return hit.decision;
    let decision: GateDecision;
    try {
      decision = await decide(path);
    } catch {
      return "ok";
    }
    if (memory.size >= maxEntries) memory.clear();
    memory.set(path, { decision, until: now() + TTL_MS });
    return decision;
  };
}
