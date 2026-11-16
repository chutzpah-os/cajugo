import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Link de cancelar o alerta (ALR-SEC-005): `{id}.{hmac}`, com o HMAC do id pelo
 * `HASH_SECRET`. Não guarda token: o admin monta a mensagem com o mesmo link, e
 * ninguém consegue cancelar o alerta de outra pessoa sem o segredo.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function mac(alertId: string): Buffer {
  const secret = process.env.HASH_SECRET;
  if (!secret) throw new Error("HASH_SECRET não definida (veja .env.example).");
  return createHmac("sha256", secret)
    .update(`search-alert:${alertId}`)
    .digest()
    .subarray(0, 18);
}

export function cancelToken(alertId: string): string {
  return `${alertId}.${mac(alertId).toString("base64url")}`;
}

/** Id do alerta quando o link é dele; `null` para qualquer outra coisa. */
export function alertIdFromToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [id, given] = parts;
  if (!UUID.test(id) || !given) return null;
  const expected = mac(id);
  const received = Buffer.from(given, "base64url");
  if (received.length !== expected.length) return null;
  return timingSafeEqual(received, expected) ? id : null;
}
