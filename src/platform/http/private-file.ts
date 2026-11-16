import { AppError, problemResponse } from "./errors";
import { errorMessage, logger } from "./logger";
import type { Session } from "./session";

export type PrivateFile = {
  body: ArrayBuffer;
  contentType: string;
  filename: string;
};

/**
 * Resposta de arquivo privado (ADR 0011): vem do servidor, nunca por URL do
 * Cloudinary, sem cache em lugar nenhum. Sem sessão é 401 antes de qualquer leitura;
 * 403 responde como 404, para não revelar que o arquivo existe.
 */
export async function privateFileResponse(
  session: Session | null,
  load: () => Promise<PrivateFile>,
  event: string,
): Promise<Response> {
  if (!session) return problemResponse(AppError.unauthorized());
  try {
    const file = await load();
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
      return problemResponse(
        error.status === 403 ? AppError.notFound() : error,
      );
    logger.error(event, { error: errorMessage(error) });
    return problemResponse(
      new AppError(
        "internal",
        "Não foi possível abrir o arquivo",
        500,
        "Tente de novo em instantes.",
      ),
    );
  }
}
