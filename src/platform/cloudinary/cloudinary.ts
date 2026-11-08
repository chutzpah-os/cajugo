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

export type UploadedImage = {
  format: string;
  bytes: number;
  width?: number;
  height?: number;
};

/** `upload`: público (logo, capa, fotos). `authenticated`: privado, sem URL pública (ADR 0011). */
export type DeliveryType = "upload" | "authenticated";

export type PrivateFile = { body: ArrayBuffer; contentType: string };

export type Cloudinary = {
  signUpload(input: {
    folder: string;
    publicId: string;
    allowedFormats: string[];
    type?: DeliveryType;
    /**
     * Transformação de entrada: o Cloudinary guarda já transformado (ex.: reduzir e
     * regravar sem metadados, VEH-SEC-003). O original enviado não fica guardado.
     */
    transformation?: string;
    now?: Date;
  }): SignedUpload;
  fullPublicId(folder: string, publicId: string): string;
  /** Arquivo existe? Devolve formato e tamanho reais (Admin API). */
  verifyUpload(
    fullPublicId: string,
    type?: DeliveryType,
  ): Promise<UploadedImage | null>;
  /** Apaga o arquivo (ex.: recusado no envio por formato ou tamanho). */
  destroy(fullPublicId: string, type?: DeliveryType, now?: Date): Promise<void>;
  /** Arquivo privado lido só pelo servidor (API de download assinada); `null` se não existe. */
  fetchPrivate(
    fullPublicId: string,
    format: string,
    now?: Date,
  ): Promise<PrivateFile | null>;
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
  const api = `https://api.cloudinary.com/v1_1/${config.cloudName}`;
  const seconds = (d: Date) => Math.floor(d.getTime() / 1000);
  const basicAuth = () =>
    `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`;
  return {
    signUpload({
      folder,
      publicId,
      allowedFormats,
      type = "upload",
      transformation,
      now = new Date(),
    }) {
      const params: Record<string, string | number> = {
        allowed_formats: allowedFormats.join(","),
        folder: prefixed(folder),
        public_id: publicId,
        timestamp: seconds(now),
        ...(type === "authenticated" ? { type } : {}),
        ...(transformation ? { transformation } : {}),
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
    async verifyUpload(fullPublicId, type = "upload") {
      const res = await fetchFn(
        `${api}/resources/image/${type}/${fullPublicId}`,
        { headers: { authorization: basicAuth() } },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Cloudinary respondeu ${res.status}`);
      const body = (await res.json()) as UploadedImage;
      return {
        format: body.format,
        bytes: body.bytes,
        ...(body.width ? { width: body.width, height: body.height } : {}),
      };
    },
    async destroy(fullPublicId, type = "upload", now = new Date()) {
      const params = {
        public_id: fullPublicId,
        type,
        invalidate: "true",
        timestamp: seconds(now),
      };
      const res = await fetchFn(`${api}/image/destroy`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          ...Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ),
          api_key: config.apiKey,
          signature: signParams(params, config.apiSecret),
        }).toString(),
      });
      if (!res.ok) throw new Error(`Cloudinary respondeu ${res.status}`);
    },
    async fetchPrivate(fullPublicId, format, now = new Date()) {
      const params = {
        public_id: fullPublicId,
        format,
        type: "authenticated",
        timestamp: seconds(now),
      };
      const url = new URL(`${api}/image/download`);
      for (const [k, v] of Object.entries(params))
        url.searchParams.set(k, String(v));
      url.searchParams.set("api_key", config.apiKey);
      url.searchParams.set("signature", signParams(params, config.apiSecret));
      const res = await fetchFn(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Cloudinary respondeu ${res.status}`);
      return {
        body: await res.arrayBuffer(),
        contentType:
          res.headers.get("content-type") ?? "application/octet-stream",
      };
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
