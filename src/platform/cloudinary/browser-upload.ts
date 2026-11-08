import type { SignedUpload } from "./cloudinary";

/**
 * Envio direto do navegador ao Cloudinary com a assinatura do servidor (API.md §4).
 * Devolve o `public_id` completo; o servidor confere e grava. A URL que o Cloudinary
 * devolve não é usada nem guardada (ADR 0011).
 */
export async function uploadSigned(
  signed: SignedUpload,
  file: File,
  failMessage: string,
): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signed.apiKey);
  for (const [k, v] of Object.entries(signed.fields)) body.set(k, v);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: "POST", body },
  );
  const json = (await res.json().catch(() => ({}))) as { public_id?: string };
  if (!res.ok || !json.public_id) throw new Error(failMessage);
  return json.public_id;
}
