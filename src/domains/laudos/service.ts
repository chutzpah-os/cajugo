import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { getSettings, pixReady } from "@/domains/settings/service";
import { laudoRequests } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import { isHoneypotFilledIn } from "@/platform/http/honeypot";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import { brCode } from "@/platform/pix/br-code";
import { laudoRequestSchema } from "./schemas";

export type LaudoDeps = { db: Db; now?: () => Date };

export type RequestResult =
  | { ok: true; code: string }
  | { ok: false; message: string; errors: FieldError[] };

/** Sem 0/O e 1/I, para ditar o código sem erro. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () =>
  `LC-${Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

/**
 * Pedido do LaudoCaju (LAU-FR-003, LAU-SEC-001): limite por rede, campo isca que finge
 * sucesso sem gravar, schema estrito e o preço da época (LAU-FR-007). Devolve o código
 * que leva à tela do Pix.
 */
export async function requestLaudo(
  deps: LaudoDeps,
  raw: unknown,
  ctx: { ipHash: string },
): Promise<RequestResult> {
  const now = deps.now?.() ?? new Date();
  if (!(await withinPublicFormLimits(deps.db, "laudo", ctx.ipHash, now)))
    return {
      ok: false,
      message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
      errors: [],
    };
  if (isHoneypotFilledIn(raw)) return { ok: true, code: newCode() };

  const parsed = laudoRequestSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      message: "Confira os campos destacados.",
      errors: fieldErrorsFromZod(parsed.error),
    };
  const d = parsed.data;
  const settings = await getSettings(deps.db, now);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const [row] = await deps.db
      .insert(laudoRequests)
      .values({
        code,
        name: d.name,
        whatsapp: d.whatsapp,
        email: d.email,
        plate: d.plate,
        vehicle: d.vehicle,
        vehicleId: d.vehicleId ?? null,
        priceCents: settings.laudo_price_cents,
        consentAt: now,
      })
      .onConflictDoNothing({ target: laudoRequests.code })
      .returning({ code: laudoRequests.code });
    if (row) return { ok: true, code: row.code };
  }
  throw new Error("Não foi possível gerar o código do pedido.");
}

export type LaudoPix = {
  code: string;
  status: "awaiting_pix" | "paid" | "sent";
  priceCents: number;
  key: string;
  beneficiary: string;
  brCode: string;
};

/**
 * Tela do Pix do pedido (LAU-FR-004): valor, chave, favorecido e o BR Code com o código
 * do pedido como identificador. Só o que o Pix precisa: nunca os contatos nem a placa.
 * `null` para código que não existe; chave Pix não pronta → 409.
 */
export async function laudoPix(
  deps: LaudoDeps,
  rawCode: string,
): Promise<LaudoPix | null> {
  const code = rawCode.toUpperCase();
  if (!/^LC-[2-9A-HJ-NP-Z]{4}$/.test(code)) return null;
  const [r] = await deps.db
    .select({
      code: laudoRequests.code,
      status: laudoRequests.status,
      priceCents: laudoRequests.priceCents,
    })
    .from(laudoRequests)
    .where(eq(laudoRequests.code, code));
  if (!r) return null;
  const settings = await getSettings(deps.db, deps.now?.() ?? new Date());
  if (!pixReady(settings.pix))
    throw AppError.conflict(
      "O pagamento por Pix está indisponível agora. Tente de novo mais tarde.",
    );
  const { key, beneficiary, city } = settings.pix;
  return {
    ...r,
    key,
    beneficiary,
    brCode: brCode({
      key,
      name: beneficiary,
      city,
      amountCents: r.priceCents,
      txid: r.code,
    }),
  };
}
