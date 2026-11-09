import { stores, vehiclePhotos, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { plainText, slugify } from "@/platform/br/slug";
import { eq } from "drizzle-orm";
import { storeOwner } from "@/domains/vehicles/testing/fixtures";

const NOW = new Date("2026-11-09T12:00:00Z");

/** Só testes: loja no ar, com um nome. */
export async function liveStore(
  db: Db,
  slug: string,
  set: Partial<typeof stores.$inferInsert> = {},
) {
  const owner = await storeOwner(db, slug, `${slug}@x.com`);
  await db
    .update(stores)
    .set({ status: "active", name: `Loja ${slug}`, ...set })
    .where(eq(stores.id, owner.storeId));
  return owner;
}

let seq = 0;

/** Só testes: veículo publicado completo, sem passar pelo formulário. */
export async function car(
  db: Db,
  storeId: string,
  set: Partial<typeof vehicles.$inferInsert> = {},
  photos = 1,
) {
  seq += 1;
  const make = set.make ?? "GM - Chevrolet";
  const model = set.model ?? "ONIX";
  const version = set.version ?? `ONIX HATCH LT ${seq}`;
  const [row] = await db
    .insert(vehicles)
    .values({
      storeId,
      status: "published",
      make,
      model,
      version,
      makeSlug: slugify(make),
      modelSlug: slugify(model),
      searchText: plainText(`${make} ${model} ${version}`),
      yearManufacture: 2020,
      yearModel: 2020,
      mileageKm: 40000,
      transmission: "manual",
      fuel: "flex",
      priceCents: 5000000,
      contactWhatsapp: "5579999990000",
      shareOnCajugo: true,
      publishedAt: NOW,
      rankScore: 20000 + seq,
      plate: "ABC1D23",
      plateEnd: "3",
      chassis: "9BWZZZ377VT004251",
      ...set,
    })
    .returning();
  for (let position = 0; position < photos; position++)
    await db.insert(vehiclePhotos).values({
      vehicleId: row.id,
      publicId: `staging/vehicles/${row.id}/photo-${position}`,
      position,
    });
  return row;
}
