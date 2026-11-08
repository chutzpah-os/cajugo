import { createHash } from "node:crypto";

/** Assinatura do Cloudinary: SHA-1 dos parâmetros em ordem alfabética + segredo. */
export function signParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(payload + apiSecret)
    .digest("hex");
}

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Pasta do ambiente (`staging` ou `prod`, DEPLOYMENT.md). */
  folder: string;
};

export type SignedUpload = {
  cloudName: string;
  apiKey: string;
  /** Campos que o navegador envia junto do arquivo para `.../image/upload`. */
  fields: Record<string, string>;
};

export type UploadedImage = { format: string; bytes: number };

export type Cloudinary = {
  signUpload(input: {
    folder: string;
    publicId: string;
    allowedFormats: string[];
    now?: Date;
  }): SignedUpload;
  fullPublicId(folder: string, publicId: string): string;
  /** Imagem existe? Devolve formato e tamanho reais (Admin API). */
  verifyUpload(fullPublicId: string): Promise<UploadedImage | null>;
  imageUrl(fullPublicId: string, opts?: { width?: number }): string;
};

/**
 * Upload assinado direto do navegador (SECURITY.md §5, API.md §4): o servidor fixa
 * pasta, nome e formatos; o nome original do arquivo é ignorado. Sem SDK.
 */
export function createCloudinary(
  config: CloudinaryConfig,
  fetchFn: typeof fetch = fetch,
): Cloudinary {
  const prefixed = (folder: string) => `${config.folder}/${folder}`;
  return {
    signUpload({ folder, publicId, allowedFormats, now = new Date() }) {
      const params = {
        allowed_formats: allowedFormats.join(","),
        folder: prefixed(folder),
        public_id: publicId,
        timestamp: Math.floor(now.getTime() / 1000),
      };
      return {
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        fields: {
          ...Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ),
          signature: signParams(params, config.apiSecret),
        },
      };
    },
    fullPublicId: (folder, publicId) => `${prefixed(folder)}/${publicId}`,
    async verifyUpload(fullPublicId) {
      const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString(
        "base64",
      );
      const res = await fetchFn(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload/${fullPublicId}`,
        { headers: { authorization: `Basic ${auth}` } },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Cloudinary respondeu ${res.status}`);
      const body = (await res.json()) as UploadedImage;
      return { format: body.format, bytes: body.bytes };
    },
    imageUrl(fullPublicId, opts = {}) {
      const t = ["f_auto", "q_auto", opts.width && `w_${opts.width}`]
        .filter(Boolean)
        .join(",");
      return `https://res.cloudinary.com/${config.cloudName}/image/upload/${t}/${fullPublicId}`;
    },
  };
}

/** Cloudinary do ambiente atual (variáveis de servidor; `.env.example`). */
export function getCloudinary(): Cloudinary {
  const env = (name: string) => {
    const v = process.env[name];
    if (!v) throw new Error(`${name} não definida (veja .env.example).`);
    return v;
  };
  return createCloudinary({
    cloudName: env("CLOUDINARY_CLOUD_NAME"),
    apiKey: env("CLOUDINARY_API_KEY"),
    apiSecret: env("CLOUDINARY_API_SECRET"),
    folder: process.env.CLOUDINARY_FOLDER || "staging",
  });
}
