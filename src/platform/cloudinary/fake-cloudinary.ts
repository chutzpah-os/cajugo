import {
  createCloudinary,
  type Cloudinary,
  type DeliveryType,
  type SignedUpload,
  type UploadedImage,
} from "./cloudinary";

const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
};

/** Cloudinary em memória, só para testes: guarda os "envios" feitos com assinatura dele. */
export class FakeCloudinary implements Cloudinary {
  private readonly real = createCloudinary({
    cloudName: "test",
    apiKey: "test-key",
    apiSecret: "test-secret",
    folder: "staging",
  });
  private readonly uploads = new Map<string, UploadedImage>();
  /** Arquivos apagados, na ordem. */
  readonly destroyed: string[] = [];

  signUpload(input: Parameters<Cloudinary["signUpload"]>[0]) {
    return this.real.signUpload(input);
  }

  fullPublicId(folder: string, publicId: string) {
    return this.real.fullPublicId(folder, publicId);
  }

  imageUrl(fullPublicId: string, opts?: { width?: number }) {
    return this.real.imageUrl(fullPublicId, opts);
  }

  /** O navegador enviou o arquivo com esta assinatura. */
  simulateUpload(signed: SignedUpload, image: UploadedImage) {
    const type = (signed.fields.type as DeliveryType | undefined) ?? "upload";
    this.uploads.set(
      `${type}:${signed.fields.folder}/${signed.fields.public_id}`,
      image,
    );
  }

  async verifyUpload(fullPublicId: string, type: DeliveryType = "upload") {
    return this.uploads.get(`${type}:${fullPublicId}`) ?? null;
  }

  async destroy(fullPublicId: string, type: DeliveryType = "upload") {
    this.uploads.delete(`${type}:${fullPublicId}`);
    this.destroyed.push(fullPublicId);
  }

  async fetchPrivate(fullPublicId: string, format: string) {
    const file = this.uploads.get(`authenticated:${fullPublicId}`);
    if (!file) return null;
    return {
      body: new Uint8Array(Math.min(file.bytes, 16)).buffer,
      contentType: CONTENT_TYPE[format] ?? "application/octet-stream",
    };
  }
}
