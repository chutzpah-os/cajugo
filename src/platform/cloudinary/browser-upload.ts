import type { SignedUpload } from "./cloudinary";

/**
 * Envio direto do navegador ao Cloudinary com a assinatura do servidor (API.md §4).
 * Devolve o `public_id` completo; o servidor confere e grava. A URL que o Cloudinary
 * devolve não é usada nem guardada (ADR 0011).
 */
export async function uploadSigned(
  signed: SignedUpload,
  file: Blob,
  failMessage: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signed.apiKey);
  for (const [k, v] of Object.entries(signed.fields)) body.set(k, v);
  const url = `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`;
  if (onProgress) return uploadWithProgress(url, body, failMessage, onProgress);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: "POST", body },
  );
  const json = (await res.json().catch(() => ({}))) as { public_id?: string };
  if (!res.ok || !json.public_id) throw new Error(failMessage);
  return json.public_id;
}

/** Igual ao envio comum, com progresso (o `fetch` não informa o progresso de envio). */
function uploadWithProgress(
  url: string,
  body: FormData,
  failMessage: string,
  onProgress: (fraction: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error(failMessage));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as { public_id?: string };
        if (xhr.status < 300 && json.public_id) return resolve(json.public_id);
      } catch {
        // resposta inválida: cai no erro abaixo
      }
      reject(new Error(failMessage));
    };
    xhr.send(body);
  });
}

/**
 * Reduz a foto no navegador para no máximo `max` px no maior lado (economia de banda;
 * a proteção de verdade é a transformação de entrada no Cloudinary, VEH-SEC-003).
 * Formato que o navegador não abre (ex.: HEIC) vai como está.
 */
export async function shrinkImage(file: File, max = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
