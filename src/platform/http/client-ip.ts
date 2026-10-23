import { createHmac } from "node:crypto";

/**
 * IP do visitante. Na Vercel, `x-forwarded-for` é preenchido pela própria plataforma;
 * o primeiro valor é o cliente. Nunca use o IP cru em log ou banco: use `hashIp`.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Hash do IP com segredo (LGPD: IP de denúncia e rate limit guardado só como hash). */
export function hashIp(ip: string, secret = process.env.HASH_SECRET): string {
  if (!secret) throw new Error("HASH_SECRET não definida (veja .env.example).");
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}
