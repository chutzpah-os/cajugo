import {
  createCloudinary,
  type Cloudinary,
  type SignedUpload,
  type UploadedImage,
} from "./cloudinary";

/** Cloudinary em memória, só para testes: guarda os "envios" feitos com assinatura dele. */
export class FakeCloudinary implements Cloudinary {
  private readonly real = createCloudinary({
    cloudName: "test",
    apiKey: "test-key",
    apiSecret: "test-secret",
    folder: "staging",
  });
  private readonly uploads = new Map<string, UploadedImage>();

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
    this.uploads.set(
      `${signed.fields.folder}/${signed.fields.public_id}`,
      image,
    );
  }

  async verifyUpload(fullPublicId: string) {
    return this.uploads.get(fullPublicId) ?? null;
  }
}
