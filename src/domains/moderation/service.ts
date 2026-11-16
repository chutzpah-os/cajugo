import { contactTarget } from "@/domains/showcase/service";
import { vehicleReports } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { fieldErrorsFromZod, type FieldError } from "@/platform/http/errors";
import { isHoneypotFilledIn } from "@/platform/http/honeypot";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import { reportSchema } from "./schemas";

export type ReportResult =
  { ok: true } | { ok: false; message: string; errors: FieldError[] };

const fail = (message: string, errors: FieldError[] = []) =>
  ({ ok: false, message, errors }) as const;

/**
 * "Denunciar anúncio" em [14d] (RPT-FR-001, RPT-SEC-002, 006): limite por IP, honeypot
 * que finge sucesso, schema estrito, veículo visível ao público. A chave do envio vira o
 * id (repetir não duplica). Nada de quem denunciou: nem conta, nem contato, nem IP.
 */
export async function reportVehicle(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: Date },
): Promise<ReportResult> {
  const now = ctx.now ?? new Date();
  if (!(await withinPublicFormLimits(db, "report", ctx.ipHash, now)))
    return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  if (isHoneypotFilledIn(raw)) return { ok: true };

  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Confira os campos destacados.",
      fieldErrorsFromZod(parsed.error),
    );
  const { requestId, vehicleId, reason, details } = parsed.data;
  if (!(await contactTarget(db, vehicleId)))
    return fail("Este veículo não está mais disponível.");

  await db
    .insert(vehicleReports)
    .values({
      id: requestId,
      vehicleId,
      reason,
      details: details || null,
      createdAt: now,
    })
    .onConflictDoNothing({ target: vehicleReports.id });
  return { ok: true };
}
