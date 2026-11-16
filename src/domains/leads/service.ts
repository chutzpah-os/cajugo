import { contactTarget } from "@/domains/showcase/service";
import { leads } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { fieldErrorsFromZod, type FieldError } from "@/platform/http/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import { leadFormSchema, whatsappClickSchema } from "./schemas";
import type { LeadOrigin } from "./status";

export type ContactResult =
  { ok: true } | { ok: false; message: string; errors: FieldError[] };

const fail = (message: string, errors: FieldError[] = []) =>
  ({ ok: false, message, errors }) as const;

/** Por IP, com uma chave por tipo de registro (LED-SEC-002). */
async function withinLimits(
  db: Db,
  kind: string,
  ipHash: string,
  now: Date,
): Promise<boolean> {
  for (const rule of [RATE_LIMITS.publicForm, RATE_LIMITS.publicFormDaily]) {
    const { ok } = await consumeRateLimit(
      db,
      `${kind}:ip:${ipHash}:${rule.windowSeconds}`,
      rule,
      now,
    );
    if (!ok) return false;
  }
  return true;
}

/** Veículo não divulgado só pode ter vindo do catálogo da loja (LED-FR-004). */
const finalOrigin = (origin: LeadOrigin, shared: boolean): LeadOrigin =>
  shared ? origin : "store_catalog";

/**
 * "Envie uma mensagem à loja" em [1b] (LED-FR-001, 002, 004, LED-SEC-002, 004): limite
 * por IP, honeypot que finge sucesso, schema estrito; a loja vem do veículo visível.
 */
export async function contactStore(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<ContactResult> {
  const now = ctx.now ?? new Date();
  if (!(await withinLimits(db, "lead", ctx.ipHash, now)))
    return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  const honeypot = (raw as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "")
    return { ok: true };

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Confira os campos destacados.",
      fieldErrorsFromZod(parsed.error),
    );
  const { vehicleId, origin, name, email, phone, message } = parsed.data;
  const target = await contactTarget(db, vehicleId);
  if (!target) return fail("Este veículo não está mais disponível.");

  await db.insert(leads).values({
    storeId: target.storeId,
    vehicleId,
    channel: "form",
    origin: finalOrigin(origin, target.shared),
    status: "new",
    name,
    email,
    phone,
    message: message || null,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true };
}

/**
 * Toque em "WhatsApp" em [1b] ou no simulador (LED-FR-003, 014): lead sem nome nem
 * contato, já Em contato (a conversa começou no WhatsApp da loja). Nunca lança: a
 * conversa abre de qualquer jeito; entrada inválida, veículo fora do ar ou limite do IP
 * só não gravam.
 */
export async function recordWhatsappClick(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<void> {
  const now = ctx.now ?? new Date();
  const parsed = whatsappClickSchema.safeParse(raw);
  if (!parsed.success) return;
  if (!(await withinLimits(db, "lead-whatsapp", ctx.ipHash, now))) return;
  const target = await contactTarget(db, parsed.data.vehicleId);
  if (!target) return;
  await db.insert(leads).values({
    storeId: target.storeId,
    vehicleId: parsed.data.vehicleId,
    channel: "whatsapp",
    origin: finalOrigin(parsed.data.origin, target.shared),
    status: "contacting",
    createdAt: now,
    updatedAt: now,
  });
}
