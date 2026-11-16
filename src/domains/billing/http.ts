import type { Session } from "@/platform/http/session";
import { privateFileResponse } from "@/platform/http/private-file";
import { receiptFile, type FileDeps } from "./service";

/**
 * `GET /api/v1/payments/{id}/receipt` (contract.md): o arquivo vem do servidor, nunca
 * por URL do Cloudinary, sem cache (ADR 0011). A sessão é conferida antes de montar as
 * dependências: sem login é 401 mesmo se faltar configuração.
 */
export const receiptResponse = (
  makeDeps: () => FileDeps,
  session: Session | null,
  paymentId: string,
): Promise<Response> =>
  privateFileResponse(
    session,
    () => receiptFile(makeDeps(), session, paymentId),
    "billing.receipt_failed",
  );
