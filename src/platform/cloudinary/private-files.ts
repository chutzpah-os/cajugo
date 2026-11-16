import { AppError } from "@/platform/http/errors";
import type { Cloudinary } from "./cloudinary";

/**
 * Arquivo privado (comprovante da 004, documento do vendedor da 008; ADR 0011): foto ou
 * PDF, até 10 MB, guardado como `authenticated`.
 */
export const PRIVATE_FORMATS = ["jpg", "png", "webp", "heic", "pdf"];
export const PRIVATE_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  pdf: "pdf",
};

export const privateExtension = (format: string) => EXTENSION[format] ?? "bin";

/**
 * Confere o arquivo enviado com a assinatura: existe, é foto ou PDF e tem até 10 MB.
 * Recusado é apagado na hora; o erro vai no `field` do formulário.
 */
export async function checkPrivateUpload(
  cloudinary: Cloudinary,
  publicId: string,
  field: string,
  missing: string,
): Promise<{ format: string }> {
  const file = await cloudinary.verifyUpload(publicId, "authenticated");
  const fail = (code: string, message: string) =>
    AppError.validation([{ field, code, message }]);
  if (!file) throw fail("not_uploaded", missing);
  const refusal = !PRIVATE_FORMATS.includes(file.format)
    ? fail("format", "Envie uma foto (JPG, PNG, WEBP ou HEIC) ou um PDF.")
    : file.bytes > PRIVATE_MAX_BYTES
      ? fail("too_large", "O arquivo pode ter no máximo 10 MB.")
      : null;
  if (refusal) {
    await cloudinary.destroy(publicId, "authenticated");
    throw refusal;
  }
  return { format: file.format };
}
