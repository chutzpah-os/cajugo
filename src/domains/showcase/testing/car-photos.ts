/**
 * Fotos de carro dos dados de teste (012, DSG-NFR-004): `pnpm e2e:photos` sobe as
 * imagens de `docs/design/carexamplesimages` para o Cloudinary do staging com estes
 * nomes, uma vez. O seed nunca as apaga (são compartilhadas entre as lojas de teste).
 */
export const E2E_CAR_PHOTOS = [
  "car-1",
  "car-2",
  "car-3",
  "car-4",
  "car-5",
  "car-6",
  "car-7",
] as const;

const folder = () => process.env.CLOUDINARY_FOLDER || "staging";

/** Id completo da N-ésima foto de carro (gira pela lista). */
export function carPhoto(n: number): string {
  return `${folder()}/e2e/cars/${E2E_CAR_PHOTOS[n % E2E_CAR_PHOTOS.length]}`;
}

/** É uma foto compartilhada dos testes? (o seed não apaga do Cloudinary). */
export function isCarPhoto(publicId: string): boolean {
  return publicId.includes("/e2e/cars/");
}
