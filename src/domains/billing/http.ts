import { AppError, problemResponse } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { receiptFile, type FileDeps } from "./service";

/**
 * `GET /api/v1/payments/{id}/receipt` (contract.md): o arquivo vem do servidor, nunca
 * por URL do Cloudinary, sem cache em lugar nenhum (ADR 0011).
 */
export async function receiptResponse(
  deps: FileDeps,
  session: Session | null,
  paymentId: string,
): Promise<Response> {
  try {
    const file = await receiptFile(deps, session, paymentId);
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
    if (error instanceof AppError) {
      // 403 (papel sem acesso) responde como 404: não revela que o pagamento existe.
      return problemResponse(
        error.status === 403 ? AppError.notFound() : error,
      );
    }
    throw error;
  }
}
