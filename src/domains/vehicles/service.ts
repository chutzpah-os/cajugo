import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { authorizeTo } from "@/domains/auth/service";
import { identify } from "@/domains/fipe/service";
import { storeIsLive, vehicleDefaults } from "@/domains/stores/service";
import { parsePlate } from "@/platform/br/plate";
import type { FipeClient } from "@/platform/fipe/client";
import { vehicleHistory, vehiclePhotos, vehicles } from "@/platform/db/schema";
import type {
  Cloudinary,
  SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import type { Db } from "@/platform/db/types";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { MAX_PHOTOS, UNDO_SALE_DAYS } from "./lists";
import { shareCaption, STATUS_LABEL } from "./captions";
import { logActivity } from "@/platform/http/activity-log";
import { draftSchema } from "./schemas";

/**
 * Veículos da loja (spec 005). `storeId` sempre da sessão; veículo de outra loja
 * responde 404 (a posse vai no `where`, SECURITY.md §4).
 */
export type VehicleDeps = { db: Db; fipe?: FipeClient; now?: () => Date };

const clock = (deps: VehicleDeps) => deps.now?.() ?? new Date();

/** Loja da sessão de quem pode cuidar de veículos (lojista e usuário da loja). */
function storeOf(session: Session | null): { userId: string; storeId: string } {
  const s = authorizeTo(session, "vehicles.manage");
  if (!s.storeId) throw AppError.forbidden();
  return { userId: s.userId, storeId: s.storeId };
}

/** Status em que o veículo ainda pode ser editado pela tela [2a]/[6e]. */
const EDITABLE = ["draft", "pending_approval", "published"] as const;

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  return parsed.data;
}

/**
 * Autosave do formulário [2a] (VEH-FR-003): o 1º salvamento cria o rascunho com a
 * divulgação e o WhatsApp da loja (VEH-FR-008); os seguintes gravam só os campos
 * enviados. Veículo vendido ou excluído não é editado (409).
 */
export async function saveDraft(
  deps: VehicleDeps,
  session: Session | null,
  input: unknown,
): Promise<{ vehicleId: string; savedAt: Date }> {
  const { userId, storeId } = storeOf(session);
  const { vehicleId, ...parsed } = parse(draftSchema, input);
  const now = clock(deps);
  const existing = vehicleId
    ? await deps.db
        .select({
          status: vehicles.status,
          yearModel: vehicles.yearModel,
          yearManufacture: vehicles.yearManufacture,
          priceCents: vehicles.priceCents,
        })
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.storeId, storeId)))
        .then((r) => r[0])
    : undefined;
  if (vehicleId && (!existing || existing.status === "deleted"))
    throw AppError.notFound();
  const fields = await resolveFields(deps, parsed, existing);

  if (!vehicleId) {
    const defaults = await vehicleDefaults(deps.db, storeId);
    const [created] = await deps.db
      .insert(vehicles)
      .values({ storeId, ...defaults, ...fields, updatedAt: now })
      .returning({ id: vehicles.id });
    return { vehicleId: created.id, savedAt: now };
  }

  if (!(EDITABLE as readonly string[]).includes(existing!.status))
    throw AppError.conflict("Este veículo não pode mais ser editado.");
  const newPrice = fields.priceCents as number | undefined;
  const priceChanged =
    existing!.status === "published" &&
    newPrice !== undefined &&
    newPrice !== existing!.priceCents;
  await deps.db.transaction(async (tx) => {
    await tx
      .update(vehicles)
      .set({ ...fields, updatedAt: now })
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.storeId, storeId),
          inArray(vehicles.status, [...EDITABLE]),
        ),
      );
    if (!priceChanged) return;
    // Histórico de preço do publicado (VEH-FR-012), base do "Baixou R$ X" (006).
    await tx.insert(vehicleHistory).values({
      vehicleId,
      field: "price",
      oldValue:
        existing!.priceCents === null ? null : String(existing!.priceCents),
      newValue: String(newPrice),
      userId,
      createdAt: now,
    });
    await logActivity(tx, {
      userId,
      action: "vehicle.price_changed",
      entity: "vehicle",
      entityId: vehicleId,
      data: { oldCents: existing!.priceCents, newCents: newPrice },
    });
  });
  return { vehicleId, savedAt: now };
}

type DraftInput = ReturnType<typeof draftSchema.parse>;

const fieldError = (field: string, message: string) =>
  AppError.validation([{ field, code: "invalid", message }]);

/**
 * Converte a entrada da tela nas colunas: identificação pela FIPE guardada (nomes,
 * ano modelo, referência), regra dos anos e placa com final (VEH-FR-005, VEH-FR-007).
 */
async function resolveFields(
  deps: VehicleDeps,
  input: Omit<DraftInput, "vehicleId">,
  existing?: { yearModel: number | null; yearManufacture: number | null },
) {
  const { fipeBrandId, fipeModelId, fipeYearId, plate, ...rest } = input;
  const out: Record<string, unknown> = { ...rest };

  let yearModel = existing?.yearModel ?? null;
  if (fipeBrandId !== undefined) {
    const id = fipeBrandId
      ? await identify(deps, {
          brandId: fipeBrandId,
          modelId: fipeModelId,
          yearId: fipeYearId,
        })
      : null;
    yearModel = id?.yearModel ?? null;
    Object.assign(out, {
      fipeBrandId: fipeBrandId ?? null,
      fipeModelId: id?.version ? fipeModelId : null,
      fipeYearId: id?.yearModel ? fipeYearId : null,
      make: id?.make ?? null,
      model: id?.model || null,
      version: id?.version ?? null,
      yearModel,
      fipeCode: id?.reference?.fipeCode ?? null,
      fipePriceCents: id?.reference?.priceCents ?? null,
      fipeMonth: id?.reference?.month ?? null,
    });
  }

  const yearManufacture =
    input.yearManufacture ?? existing?.yearManufacture ?? null;
  if (
    yearModel &&
    yearManufacture &&
    (yearModel < yearManufacture || yearModel > yearManufacture + 1)
  )
    throw fieldError(
      "yearManufacture",
      "O ano modelo deve ser o de fabricação ou o seguinte.",
    );

  if (plate !== undefined) {
    if (!plate.trim()) Object.assign(out, { plate: null, plateEnd: null });
    else {
      const p = parsePlate(plate);
      if (!p)
        throw fieldError("plate", "Placa inválida (ex.: ABC1D23 ou ABC1234).");
      Object.assign(out, { plate: p.plate, plateEnd: p.end });
    }
  }
  return out;
}

export type VehicleFormView = {
  vehicleId: string;
  status: string;
  make: string | null;
  model: string | null;
  version: string | null;
  fipeBrandId: string | null;
  fipeModelId: string | null;
  fipeYearId: string | null;
  yearManufacture: number | null;
  yearModel: number | null;
  plate: string | null;
  mileageKm: number | null;
  transmission: string | null;
  fuel: string | null;
  body: string | null;
  color: string | null;
  doors: number | null;
  engine: string | null;
  priceCents: number | null;
  fipePriceCents: number | null;
  fipeMonth: string | null;
  showInstallment: boolean;
  conditions: Record<string, boolean>;
  features: string[];
  description: string | null;
  contactWhatsapp: string | null;
  shareOnCajugo: boolean;
  photos: PhotoView[];
  updatedAt: Date;
};

export type PhotoView = {
  id: string;
  publicId: string;
  position: number;
  width: number | null;
  height: number | null;
};

/** Formulário [2a] preenchido, só da loja da sessão (VEH-SEC-001). */
export async function vehicleForm(
  db: Db,
  session: Session | null,
  vehicleId: string,
): Promise<VehicleFormView> {
  const { storeId } = storeOf(session);
  const [v] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.storeId, storeId)));
  if (!v || v.status === "deleted") throw AppError.notFound();
  const photos = await photosOf(db, v.id);
  return {
    vehicleId: v.id,
    photos,
    status: v.status,
    make: v.make,
    model: v.model,
    version: v.version,
    fipeBrandId: v.fipeBrandId,
    fipeModelId: v.fipeModelId,
    fipeYearId: v.fipeYearId,
    yearManufacture: v.yearManufacture,
    yearModel: v.yearModel,
    plate: v.plate,
    mileageKm: v.mileageKm,
    transmission: v.transmission,
    fuel: v.fuel,
    body: v.body,
    color: v.color,
    doors: v.doors,
    engine: v.engine,
    priceCents: v.priceCents,
    fipePriceCents: v.fipePriceCents,
    fipeMonth: v.fipeMonth,
    showInstallment: v.showInstallment,
    conditions: v.conditions as Record<string, boolean>,
    features: v.features,
    description: v.description,
    contactWhatsapp: v.contactWhatsapp,
    shareOnCajugo: v.shareOnCajugo,
    updatedAt: v.updatedAt,
  };
}

async function photosOf(db: Db, vehicleId: string): Promise<PhotoView[]> {
  return db
    .select({
      id: vehiclePhotos.id,
      publicId: vehiclePhotos.publicId,
      position: vehiclePhotos.position,
      width: vehiclePhotos.width,
      height: vehiclePhotos.height,
    })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId))
    .orderBy(asc(vehiclePhotos.position));
}

export type PhotoDeps = VehicleDeps & { cloudinary: Cloudinary };

/** Fotos públicas: formatos e tamanho (VEH-SEC-003, SECURITY.md §5). */
const PHOTO_FORMATS = ["jpg", "png", "webp", "heic"];
const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
/** Reduz e regrava sem metadados ao guardar (VEH-SEC-003, VEH-NFR-002). */
const PHOTO_TRANSFORMATION = "c_limit,w_1600,h_1600";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Veículo editável da loja da sessão; de outra loja ou excluído → 404. */
async function ownVehicle(db: Db, session: Session | null, vehicleId: string) {
  const { userId, storeId } = storeOf(session);
  if (!UUID.test(vehicleId)) throw AppError.notFound();
  const [v] = await db
    .select({ id: vehicles.id, status: vehicles.status })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.storeId, storeId)));
  if (!v || v.status === "deleted") throw AppError.notFound();
  return { userId, storeId, vehicle: v };
}

const photoFolder = (vehicleId: string) => `vehicles/${vehicleId}`;
const LIMIT = `Limite de ${MAX_PHOTOS} fotos por veículo.`;

async function photoCount(db: Db, vehicleId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId));
  return n;
}

/** Assinatura do envio de foto (VEH-FR-004): pasta do veículo, nome gerado aqui. */
export async function photoUpload(
  deps: PhotoDeps,
  session: Session | null,
  vehicleId: string,
): Promise<SignedUpload> {
  const { vehicle } = await ownVehicle(deps.db, session, vehicleId);
  if ((await photoCount(deps.db, vehicle.id)) >= MAX_PHOTOS)
    throw AppError.conflict(LIMIT);
  return deps.cloudinary.signUpload({
    folder: photoFolder(vehicle.id),
    publicId: `photo-${crypto.randomUUID()}`,
    allowedFormats: PHOTO_FORMATS,
    transformation: PHOTO_TRANSFORMATION,
  });
}

/**
 * Grava a foto enviada (VEH-FR-004): nome exatamente o assinado para este veículo
 * (outro → 404), arquivo conferido no Cloudinary (formato, 15 MB; recusado é
 * apagado, VEH-SEC-003) e posição no fim da lista.
 */
export async function addPhoto(
  deps: PhotoDeps,
  session: Session | null,
  vehicleId: string,
  publicId: unknown,
): Promise<PhotoView> {
  const { vehicle } = await ownVehicle(deps.db, session, vehicleId);
  const prefix = deps.cloudinary.fullPublicId(
    photoFolder(vehicle.id),
    "photo-",
  );
  if (
    typeof publicId !== "string" ||
    !publicId.startsWith(prefix) ||
    !UUID.test(publicId.slice(prefix.length))
  )
    throw AppError.notFound();

  const file = await deps.cloudinary.verifyUpload(publicId);
  if (!file)
    throw fieldError(
      "photos",
      "Não encontramos a foto enviada. Tente de novo.",
    );
  const refusal = !PHOTO_FORMATS.includes(file.format)
    ? fieldError("photos", "Use fotos JPG, PNG, WEBP ou HEIC.")
    : file.bytes > PHOTO_MAX_BYTES
      ? fieldError("photos", "Cada foto pode ter no máximo 15 MB.")
      : null;
  if (refusal) {
    await deps.cloudinary.destroy(publicId);
    throw refusal;
  }

  return deps.db.transaction(async (tx) => {
    const n = await photoCount(tx, vehicle.id);
    if (n >= MAX_PHOTOS) {
      await deps.cloudinary.destroy(publicId);
      throw AppError.conflict(LIMIT);
    }
    const [row] = await tx
      .insert(vehiclePhotos)
      .values({
        vehicleId: vehicle.id,
        publicId,
        position: n,
        width: file.width ?? null,
        height: file.height ?? null,
      })
      .returning();
    return {
      id: row.id,
      publicId: row.publicId,
      position: row.position,
      width: row.width,
      height: row.height,
    };
  });
}

/** Renumera as posições 0..n-1 na ordem dada (sem colidir no índice único). */
async function renumber(db: Db, vehicleId: string, ids: string[]) {
  for (const [i, id] of ids.entries())
    await db
      .update(vehiclePhotos)
      .set({ position: 1000 + i })
      .where(
        and(eq(vehiclePhotos.id, id), eq(vehiclePhotos.vehicleId, vehicleId)),
      );
  for (const [i, id] of ids.entries())
    await db
      .update(vehiclePhotos)
      .set({ position: i })
      .where(
        and(eq(vehiclePhotos.id, id), eq(vehiclePhotos.vehicleId, vehicleId)),
      );
}

/** Remove a foto e fecha o buraco nas posições (VEH-FR-004). */
export async function removePhoto(
  deps: PhotoDeps,
  session: Session | null,
  vehicleId: string,
  photoId: string,
): Promise<void> {
  const { vehicle } = await ownVehicle(deps.db, session, vehicleId);
  if (!UUID.test(photoId)) throw AppError.notFound();
  const removed = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .delete(vehiclePhotos)
      .where(
        and(
          eq(vehiclePhotos.id, photoId),
          eq(vehiclePhotos.vehicleId, vehicle.id),
        ),
      )
      .returning({ publicId: vehiclePhotos.publicId });
    if (!row) throw AppError.notFound();
    const rest = await photosOf(tx, vehicle.id);
    await renumber(
      tx,
      vehicle.id,
      rest.map((p) => p.id),
    );
    return row.publicId;
  });
  await deps.cloudinary.destroy(removed);
}

/** Nova ordem das fotos; a primeira é a capa (VEH-FR-004). Tem que ser a lista inteira. */
export async function reorderPhotos(
  deps: PhotoDeps,
  session: Session | null,
  vehicleId: string,
  photoIds: unknown,
): Promise<void> {
  const { vehicle } = await ownVehicle(deps.db, session, vehicleId);
  const current = (await photosOf(deps.db, vehicle.id)).map((p) => p.id);
  const ids = Array.isArray(photoIds) ? photoIds.map(String) : [];
  if (
    ids.length !== current.length ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => current.includes(id))
  )
    throw fieldError("photos", "Envie a ordem de todas as fotos do veículo.");
  await deps.db.transaction((tx) => renumber(tx, vehicle.id, ids));
}

/** O que falta para publicar (VEH-FR-009), campo a campo. */
const REQUIRED: [field: keyof typeof vehicles.$inferSelect, message: string][] =
  [
    ["fipeBrandId", "Escolha a marca."],
    ["fipeModelId", "Escolha o modelo e a versão."],
    ["fipeYearId", "Escolha o ano modelo."],
    ["yearManufacture", "Informe o ano de fabricação."],
    ["mileageKm", "Informe a quilometragem."],
    ["transmission", "Escolha o câmbio."],
    ["fuel", "Escolha o combustível."],
    ["priceCents", "Informe o preço."],
  ];

/**
 * Publicar (VEH-FR-009, VEH-FR-010): pelo menos 1 foto e os campos obrigatórios; o
 * que faltar volta como erro em cada campo e o veículo continua rascunho. Loja ainda
 * não ativada também publica: o veículo aparece quando ela for ativada. Repetir não
 * faz nada.
 */
export async function publish(
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
): Promise<void> {
  const { userId, vehicle } = await ownVehicle(deps.db, session, vehicleId);
  if (vehicle.status === "published") return;
  if (vehicle.status !== "draft")
    throw AppError.conflict("Este veículo não pode ser publicado agora.");
  const [v] = await deps.db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicle.id));
  const errors: FieldError[] = REQUIRED.filter(
    ([field]) => v[field] === null || v[field] === "",
  ).map(([field, message]) => ({ field, code: "required", message }));
  if ((await photoCount(deps.db, vehicle.id)) === 0)
    errors.unshift({
      field: "photos",
      code: "required",
      message: "Envie pelo menos 1 foto.",
    });
  if (errors.length) throw AppError.validation(errors);

  const now = clock(deps);
  await deps.db.transaction(async (tx) => {
    const done = await tx
      .update(vehicles)
      .set({ status: "published", publishedAt: now, updatedAt: now })
      .where(and(eq(vehicles.id, vehicle.id), eq(vehicles.status, "draft")))
      .returning({ id: vehicles.id });
    if (!done.length) return;
    await logActivity(tx, {
      userId,
      action: "vehicle.published",
      entity: "vehicle",
      entityId: vehicle.id,
    });
  });
}

/** "Divulgar na CajuGo" no card (VEH-FR-010): só em veículo publicado. */
export async function setShare(
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
  on: boolean,
): Promise<void> {
  const { vehicle } = await ownVehicle(deps.db, session, vehicleId);
  const done = await deps.db
    .update(vehicles)
    .set({ shareOnCajugo: !!on, updatedAt: clock(deps) })
    .where(and(eq(vehicles.id, vehicle.id), eq(vehicles.status, "published")))
    .returning({ id: vehicles.id });
  if (!done.length) throw AppError.conflict("Publique para liberar.");
}

const DAY_MS = 86_400_000;

export type VehicleSummary = {
  vehicleId: string;
  name: string;
  status: string;
  statusLabel: string;
  yearModel: number | null;
  mileageKm: number | null;
  priceCents: number | null;
  coverPublicId: string | null;
  shareOnCajugo: boolean;
  shareCaption: string;
  /** Dias desde a publicação (VEH-FR-011); `null` se não publicado. */
  daysOnAir: number | null;
  /** "Desfazer venda" ainda vale (VEH-FR-013)? */
  canUndoSale: boolean;
};

/** Resumo do veículo [6e] (VEH-FR-011), só da loja da sessão. */
export async function vehicleSummary(
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
): Promise<VehicleSummary> {
  const { storeId, vehicle } = await ownVehicle(deps.db, session, vehicleId);
  const [v] = await deps.db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicle.id));
  const [cover] = await photosOf(deps.db, v.id);
  const now = clock(deps);
  return {
    vehicleId: v.id,
    name:
      [
        v.model,
        v.version?.replace(new RegExp(`^${v.model ?? ""}\\s*`, "i"), ""),
      ]
        .filter(Boolean)
        .join(" ") || "Veículo sem nome",
    status: v.status,
    statusLabel: STATUS_LABEL[v.status],
    yearModel: v.yearModel,
    mileageKm: v.mileageKm,
    priceCents: v.priceCents,
    coverPublicId: cover?.publicId ?? null,
    shareOnCajugo: v.shareOnCajugo,
    shareCaption: shareCaption({
      status: v.status,
      share: v.shareOnCajugo,
      storeLive: await storeIsLive(deps.db, storeId),
    }),
    daysOnAir:
      v.status === "published" && v.publishedAt
        ? Math.floor((now.getTime() - v.publishedAt.getTime()) / DAY_MS)
        : null,
    canUndoSale:
      v.status === "sold" &&
      !!v.soldAt &&
      now.getTime() - v.soldAt.getTime() <= UNDO_SALE_DAYS * DAY_MS,
  };
}
