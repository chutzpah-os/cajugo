import { randomBytes } from "node:crypto";

/**
 * UUID v7 (RFC 9562): ordenável por tempo, sem expor sequência.
 * O Postgres 17 do Supabase não gera v7, então a aplicação gera.
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);
  const ms = Date.now(); // 48 bits nos 6 primeiros bytes
  for (let i = 0; i < 6; i++) {
    bytes[i] = Math.floor(ms / 2 ** (8 * (5 - i))) % 256;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // versão 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 9562
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
