/**
 * Fotos de carro dos e2e e da comparação com o design (012, DSG-NFR-004), no
 * Cloudinary de STAGING (`.env.local`):
 *   pnpm e2e:photos
 * Sobe as imagens de `docs/design/carexamplesimages` como `e2e/cars/car-1…N` (upload
 * assinado pela API). Idempotente: o que já existe fica. Recusa rodar contra a produção.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { E2E_CAR_PHOTOS } from "@/domains/showcase/testing/car-photos";
import { getCloudinary } from "@/platform/cloudinary/cloudinary";

const SOURCE = path.join(process.cwd(), "docs/design/carexamplesimages");

async function main() {
  if ((process.env.CLOUDINARY_FOLDER || "staging") === "production") {
    console.error("Recusado: CLOUDINARY_FOLDER aponta para a produção.");
    process.exit(1);
  }
  const cloudinary = getCloudinary();
  const files = (await readdir(SOURCE))
    .filter((f) => f.endsWith(".jpg"))
    .sort();
  for (const [i, publicId] of E2E_CAR_PHOTOS.entries()) {
    const file = files[i % files.length];
    const full = cloudinary.fullPublicId("e2e/cars", publicId);
    if (await cloudinary.verifyUpload(full)) {
      console.log(`já existe: ${full}`);
      continue;
    }
    const signed = cloudinary.signUpload({
      folder: "e2e/cars",
      publicId,
      allowedFormats: ["jpg"],
    });
    const form = new FormData();
    for (const [k, v] of Object.entries(signed.fields)) form.append(k, v);
    form.append("api_key", signed.apiKey);
    form.append(
      "file",
      new Blob([await readFile(path.join(SOURCE, file))], {
        type: "image/jpeg",
      }),
      file,
    );
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      console.error(`Falhou ${full}: ${res.status}`);
      process.exit(1);
    }
    console.log(`enviada: ${full}`);
  }
}

main();
