import { eq } from "drizzle-orm";
import { plainText, slugify } from "@/platform/br/slug";
import {
  profiles,
  stores,
  vehiclePhotos,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { removeVehiclesForTests } from "@/domains/vehicles/service";

/** Vitrine dos testes ponta a ponta (spec 006). Só no staging, nunca na produção. */
export const E2E_SHOWCASE = {
  slug: "e2e-vitrine",
  storeName: "Vitrine E2E",
  suspendedSlug: "e2e-suspensa",
  total: 45,
  bmwAutomatic: 7,
  citroen: 15,
  plate: "E2E1A23",
  chassis: "9BWZZZ377VT004999",
  /** Veículo completo: selos, condições, itens e 3 fotos. */
  fullId: "00000000-0000-4000-8000-00000000e201",
  /** Publicado, mas não divulgado na vitrine CajuGo. */
  hiddenId: "00000000-0000-4000-8000-00000000e202",
  soldId: "00000000-0000-4000-8000-00000000e203",
  suspendedId: "00000000-0000-4000-8000-00000000e204",
} as const;

/** Imagem que já existe em toda conta Cloudinary: o seed nunca a apaga. */
const SAMPLE_PHOTO = "sample";
const MODELS = [
  ["Fiat", "Argo"],
  ["BMW", "X1"],
  ["Citroën", "C3"],
] as const;

function row(storeId: string, i: number, now: Date) {
  const [make, model] = MODELS[i % MODELS.length];
  const version = `${model} V${i}`;
  return {
    storeId,
    status: "published" as const,
    make,
    model,
    version,
    makeSlug: slugify(make),
    modelSlug: slugify(model),
    searchText: plainText(`${make} ${model} ${version}`),
    yearManufacture: 2015 + (i % 8),
    yearModel: 2015 + (i % 8),
    mileageKm: 10_000 + i * 1_000,
    transmission: i % 2 === 0 ? "automatic" : "manual",
    fuel: "flex",
    color: "Branco",
    priceCents: 3_000_000 + i * 100_000,
    contactWhatsapp: "5579999990000",
    shareOnCajugo: true,
    publishedAt: new Date(now.getTime() - i * 60_000),
    rankScore: 30_000 - i,
    plate: E2E_SHOWCASE.plate,
    plateEnd: "3",
    chassis: E2E_SHOWCASE.chassis,
  };
}

async function ownStore(
  db: Db,
  ownerId: string,
  set: { name: string; slug: string; status: "active" | "suspended" },
) {
  const values = {
    ...set,
    city: "Aracaju",
    state: "SE",
    whatsapp: "557932110000",
  };
  let [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.ownerId, ownerId));
  if (store) await db.update(stores).set(values).where(eq(stores.id, store.id));
  else
    [store] = await db
      .insert(stores)
      .values({ ...values, ownerId })
      .returning({ id: stores.id });
  await db
    .update(profiles)
    .set({ storeId: store.id })
    .where(eq(profiles.id, ownerId));
  return store.id;
}

/** 45 veículos numa loja no ar, 1 vendido e 1 loja suspensa, sempre iguais. */
export async function seedShowcase(
  db: Db,
  owners: { active: string; suspended: string },
  now: Date,
) {
  const S = E2E_SHOWCASE;
  const storeId = await ownStore(db, owners.active, {
    name: S.storeName,
    slug: S.slug,
    status: "active",
  });
  const suspendedId = await ownStore(db, owners.suspended, {
    name: "Suspensa E2E",
    slug: S.suspendedSlug,
    status: "active",
  });
  // A lista devolvida fica sem uso de propósito: a foto é a `sample`, não é dos testes.
  await removeVehiclesForTests(db, [storeId, suspendedId]);

  const list = Array.from({ length: S.total }, (_, i) => row(storeId, i, now));
  const rows = [
    ...list.map((v, i) =>
      i === 0
        ? {
            ...v,
            id: S.fullId,
            fipePriceCents: v.priceCents + 500_000,
            conditions: {
              singleOwner: true,
              acceptsTrade: true,
              ipvaPaid: true,
            },
            features: ["airConditioning", "abs"],
            description: "Carro de garagem, revisado.",
          }
        : i === S.total - 1
          ? { ...v, id: S.hiddenId, shareOnCajugo: false }
          : v,
    ),
    { ...row(storeId, 100, now), id: S.soldId, status: "sold" as const },
    {
      ...row(suspendedId, 1, now),
      id: S.suspendedId,
    },
  ];
  const created = await db
    .insert(vehicles)
    .values(rows)
    .returning({ id: vehicles.id });
  await db.insert(vehiclePhotos).values(
    created.flatMap(({ id }) =>
      Array.from({ length: id === S.fullId ? 3 : 1 }, (_, position) => ({
        vehicleId: id,
        publicId: SAMPLE_PHOTO,
        position,
      })),
    ),
  );
  // Fica no ar até ter veículo: a suspensão é o último passo.
  await db
    .update(stores)
    .set({ status: "suspended" })
    .where(eq(stores.id, suspendedId));
}
