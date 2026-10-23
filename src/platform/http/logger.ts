/** Chaves cujo valor nunca vai para log (SECURITY.md §11). */
const SENSITIVE =
  /pass|token|secret|authorization|cookie|cpf|cnpj|taxid|phone|whatsapp|email|plate|ip$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1),
    ]),
  );
}

type Level = "info" | "warn" | "error";

function write(
  level: Level,
  event: string,
  fields: Record<string, unknown> = {},
) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...(redact(fields) as object),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Log estruturado em JSON, com dados pessoais removidos (OBSERVABILITY.md). */
export const logger = {
  info: (event: string, fields?: Record<string, unknown>) =>
    write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) =>
    write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) =>
    write("error", event, fields),
};

export { redact as redactForLog };
