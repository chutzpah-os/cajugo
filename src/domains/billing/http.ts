import { AppError, problemResponse } from "@/platform/http/errors";
import { errorMessage, logger } from "@/platform/http/logger";
import type { Session } from "@/platform/http/session";
import { receiptFile, type FileDeps } from "./service";

/**
 * `GET /api/v1/payments/{id}/receipt` (contract.md): o arquivo vem do servidor, nunca
 * por URL do Cloudinary, sem cache em lugar nenhum (ADR 0011). A sessão é conferida
 * antes de montar as dependências: sem login é 401 mesmo se faltar configuração.
 */
export async function receiptResponse(
  makeDeps: () => FileDeps,
  session: Session | null,
  paymentId: string,
): Promise<Response> {
  if (!session) return problemResponse(AppError.unauthorized());
  try {
    const file = await receiptFile(makeDeps(), session, paymentId);
    return new Response(file.body, {
      status: 200,
      headers: {
        "content-type": file.contentType,
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="${file.filename}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AppError)
      // 403 (papel sem acesso) responde como 404: não revela que o pagamento existe.
      return problemResponse(
        error.status === 403 ? AppError.notFound() : error,
      );
    logger.error("billing.receipt_failed", {
      error: errorMessage(error),
    });
    return problemResponse(
      new AppError(
        "internal",
        "Não foi possível abrir o comprovante",
        500,
        "Tente de novo em instantes.",
      ),
    );
  }
}
