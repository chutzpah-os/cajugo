import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { z } from "zod";
import { authorizeTo } from "@/domains/auth/service";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { identify, reference } from "@/domains/fipe/service";
import {
  LIVE_STATUSES,
  storeIsLive,
  vehicleDefaults,
} from "@/domains/stores/service";
import { parsePlate } from "@/platform/br/plate";
import { plainText, slugify } from "@/platform/br/slug";
import type { FipeClient } from "@/platform/fipe/client";
import {
  stores,
  vehicleHistory,
  vehiclePhotos,
  vehicles,
} from "@/platform/db/schema";
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
import { shareCaption, STATUS_LABEL, vehicleName } from "./captions";
import { logActivity } from "@/platform/http/activity-log";
import { PHOTO_REQUIRED, PUBLISH_REQUIRED } from "./publish-rules";
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
const NOT_EDITABLE = "Este veículo não pode mais ser editado.";
const isEditable = (status: string) =>
  (EDITABLE as readonly string[]).includes(status);

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

  if (!vehicleId) {
    const fields = await resolveFields(deps, parsed);
    const defaults = await vehicleDefaults(deps.db, storeId);
    const created = await deps.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(vehicles)
        .values({ storeId, ...defaults, ...fields, updatedAt: now })
        .returning({ id: vehicles.id });
      await syncSearchFields(tx, row.id);
      return row;
    });
    return { vehicleId: created.id, savedAt: now };
  }

  const mine = and(eq(vehicles.id, vehicleId), eq(vehicles.storeId, storeId));
  const [existing] = await deps.db
    .select({
      status: vehicles.status,
      yearModel: vehicles.yearModel,
      yearManufacture: vehicles.yearManufacture,
    })
    .from(vehicles)
    .where(mine);
  if (!existing || existing.status === "deleted") throw AppError.notFound();
  if (!isEditable(existing.status)) throw AppError.conflict(NOT_EDITABLE);
  // Fora da transação: pode consultar a FIPE, e a linha não fica travada na rede.
  const fields = await resolveFields(deps, parsed, existing);

  await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .select({ status: vehicles.status, priceCents: vehicles.priceCents })
      .from(vehicles)
      .where(mine)
      .for("update");
    if (!row || !isEditable(row.status)) throw AppError.conflict(NOT_EDITABLE);
    await tx
      .update(vehicles)
      .set({ ...fields, updatedAt: now })
      .where(mine);
    await syncSearchFields(tx, vehicleId);
    const newPrice = fields.priceCents as number | null | undefined;
    if (row.status !== "published" || typeof newPrice !== "number") return;
    if (newPrice === row.priceCents) return;
    // Histórico de preço do publicado (VEH-FR-012), base do "Baixou R$ X" (006).
    await tx.insert(vehicleHistory).values({
      vehicleId,
      field: "price",
      oldValue: row.priceCents === null ? null : String(row.priceCents),
      newValue: String(newPrice),
      userId,
      createdAt: now,
    });
    await logActivity(tx, {
      userId,
      action: "vehicle.price_changed",
      entity: "vehicle",
      entityId: vehicleId,
      data: { oldCents: row.priceCents, newCents: newPrice },
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
  existing?: {
    status: string;
    yearModel: number | null;
    yearManufacture: number | null;
  },
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
    input.yearManufacture !== undefined
      ? input.yearManufacture
      : (existing?.yearManufacture ?? null);
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

  // Publicado não perde o que é obrigatório (VEH-FR-009).
  if (existing?.status === "published") {
    const missing = PUBLISH_REQUIRED.filter(
      ([field]) => field in out && (out[field] === null || out[field] === ""),
    );
    if (missing.length)
      throw AppError.validation(
        missing.map(([field, message]) => ({
          field,
          code: "required",
          message,
        })),
      );
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
  if (!UUID.test(vehicleId)) throw AppError.notFound();
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

/** Veículo da loja que ainda pode mudar (vendido ou oculto: 409). */
async function editableVehicle(
  db: Db,
  session: Session | null,
  vehicleId: string,
) {
  const own = await ownVehicle(db, session, vehicleId);
  if (!isEditable(own.vehicle.status)) throw AppError.conflict(NOT_EDITABLE);
  return own;
}

/** Trava o veículo na transação: fotos e publicar não correm em paralelo. */
async function lockVehicle(tx: Db, vehicleId: string) {
  const [v] = await tx
    .select({ status: vehicles.status })
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .for("update");
  if (!v || !isEditable(v.status)) throw AppError.conflict(NOT_EDITABLE);
  return v;
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
  const { vehicle } = await editableVehicle(deps.db, session, vehicleId);
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
  const { vehicle } = await editableVehicle(deps.db, session, vehicleId);
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
    await lockVehicle(tx, vehicle.id);
    const [already] = (await photosOf(tx, vehicle.id)).filter(
      (p) => p.publicId === publicId,
    );
    if (already) return already;
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
    await syncSearchFields(tx, vehicle.id);
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
  const { vehicle } = await editableVehicle(deps.db, session, vehicleId);
  if (!UUID.test(photoId)) throw AppError.notFound();
  const removed = await deps.db.transaction(async (tx) => {
    const { status } = await lockVehicle(tx, vehicle.id);
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
    if (status === "published" && rest.length === 0)
      throw AppError.conflict(
        "O veículo publicado precisa de pelo menos 1 foto.",
      );
    await renumber(
      tx,
      vehicle.id,
      rest.map((p) => p.id),
    );
    await syncSearchFields(tx, vehicle.id);
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
  const { vehicle } = await editableVehicle(deps.db, session, vehicleId);
  const ids = Array.isArray(photoIds) ? photoIds.map(String) : [];
  await deps.db.transaction(async (tx) => {
    await lockVehicle(tx, vehicle.id);
    const current = (await photosOf(tx, vehicle.id)).map((p) => p.id);
    if (
      ids.length !== current.length ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => current.includes(id))
    )
      throw fieldError("photos", "Envie a ordem de todas as fotos do veículo.");
    await renumber(tx, vehicle.id, ids);
  });
}

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
  const { userId, storeId, vehicle } = await ownVehicle(
    deps.db,
    session,
    vehicleId,
  );
  if (vehicle.status === "published") return;
  if (vehicle.status !== "draft")
    throw AppError.conflict("Este veículo não pode ser publicado agora.");
  const now = clock(deps);
  await deps.db.transaction(async (tx) => {
    // Travado: uma foto removida em paralelo não passa por esta conferência.
    const [v] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicle.id), eq(vehicles.storeId, storeId)))
      .for("update");
    if (!v || v.status === "published") return;
    if (v.status !== "draft")
      throw AppError.conflict("Este veículo não pode ser publicado agora.");
    const errors: FieldError[] = PUBLISH_REQUIRED.filter(
      ([field]) => v[field] === null || v[field] === "",
    ).map(([field, message]) => ({ field, code: "required", message }));
    if ((await photoCount(tx, v.id)) === 0)
      errors.unshift({
        field: "photos",
        code: "required",
        message: PHOTO_REQUIRED,
      });
    if (errors.length) throw AppError.validation(errors);
    await tx
      .update(vehicles)
      .set({ status: "published", publishedAt: now, updatedAt: now })
      .where(eq(vehicles.id, v.id));
    await syncSearchFields(tx, v.id);
    await logActivity(tx, {
      userId,
      action: "vehicle.published",
      entity: "vehicle",
      entityId: v.id,
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
  const { storeId, vehicle } = await ownVehicle(deps.db, session, vehicleId);
  if (typeof on !== "boolean")
    throw fieldError("shareOnCajugo", "Valor inválido.");
  const done = await deps.db
    .update(vehicles)
    .set({ shareOnCajugo: on, updatedAt: clock(deps) })
    .where(
      and(
        eq(vehicles.id, vehicle.id),
        eq(vehicles.storeId, storeId),
        eq(vehicles.status, "published"),
      ),
    )
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
    .where(and(eq(vehicles.id, vehicle.id), eq(vehicles.storeId, storeId)));
  const [cover] = await photosOf(deps.db, v.id);
  const now = clock(deps);
  return {
    vehicleId: v.id,
    // A versão da FIPE já traz o modelo ("ONIX HATCH LT 1.0…").
    name: vehicleName(v),
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

/**
 * Muda o status só a partir do esperado (repetição ou corrida não estraga), grava o
 * log e diz se mudou.
 */
async function transition(
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
  rule: {
    from: (typeof vehicles.$inferSelect.status)[];
    set: (
      v: typeof vehicles.$inferSelect,
      now: Date,
    ) => Partial<typeof vehicles.$inferInsert>;
    action: string;
    conflict: string;
    allowed?: (v: typeof vehicles.$inferSelect, now: Date) => boolean;
  },
): Promise<void> {
  const { userId, storeId, vehicle } = await ownVehicle(
    deps.db,
    session,
    vehicleId,
  );
  const now = clock(deps);
  await deps.db.transaction(async (tx) => {
    const [v] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicle.id), eq(vehicles.storeId, storeId)))
      .for("update");
    if (
      !rule.from.includes(v.status) ||
      (rule.allowed && !rule.allowed(v, now))
    )
      throw AppError.conflict(rule.conflict);
    await tx
      .update(vehicles)
      .set({ ...rule.set(v, now), updatedAt: now })
      .where(eq(vehicles.id, v.id));
    await logActivity(tx, {
      userId,
      action: rule.action,
      entity: "vehicle",
      entityId: v.id,
    });
  });
}

/** Vendido (VEH-FR-013): sai de todos os lugares; a divulgação é guardada e desligada. */
export const markSold = (
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
) =>
  transition(deps, session, vehicleId, {
    from: ["published"],
    set: (v, now) => ({
      status: "sold",
      soldAt: now,
      shareBeforeSale: v.shareOnCajugo,
      shareOnCajugo: false,
    }),
    action: "vehicle.sold",
    conflict: "Só um veículo publicado pode ser marcado como vendido.",
  });

/** Desfazer venda em até 7 dias: volta publicado, com a divulgação de antes. */
export const undoSold = (
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
) =>
  transition(deps, session, vehicleId, {
    from: ["sold"],
    allowed: (v, now) =>
      !!v.soldAt &&
      now.getTime() - v.soldAt.getTime() <= UNDO_SALE_DAYS * DAY_MS,
    set: (v) => ({
      status: "published",
      soldAt: null,
      shareOnCajugo: v.shareBeforeSale ?? v.shareOnCajugo,
      shareBeforeSale: null,
    }),
    action: "vehicle.sale_undone",
    conflict: `A venda só pode ser desfeita em até ${UNDO_SALE_DAYS} dias.`,
  });

/** Despublicar (VEH-FR-014): volta a rascunho e sai do catálogo. */
export const unpublish = (
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
) =>
  transition(deps, session, vehicleId, {
    from: ["published"],
    set: () => ({ status: "draft" }),
    action: "vehicle.unpublished",
    conflict: "Só um veículo publicado pode ser despublicado.",
  });

/** Excluir (VEH-FR-014): definitivo para a loja; guardado 90 dias para o admin. */
export const remove = (
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
) =>
  transition(deps, session, vehicleId, {
    from: ["draft", "pending_approval", "published", "hidden", "sold"],
    set: (_, now) => ({ status: "deleted", deletedAt: now }),
    action: "vehicle.deleted",
    conflict: "Este veículo já foi excluído.",
  });

export type VehicleCard = {
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
  canShare: boolean;
  canSell: boolean;
};

export type VehicleList = {
  items: VehicleCard[];
  counts: { all: number; published: number; draft: number; sold: number };
  kpis: { published: number; onCajugo: number; soldThisMonth: number };
};

const FILTERS = ["all", "published", "draft", "sold"] as const;

/**
 * Meus veículos [1c] (VEH-FR-001, 002): indicadores, contagem por filtro, busca por
 * modelo ou placa (só a loja vê a placa) e cards. Excluído não aparece nem conta.
 */
export async function listVehicles(
  deps: VehicleDeps,
  session: Session | null,
  input: { status?: string; q?: string },
): Promise<VehicleList> {
  const { storeId } = storeOf(session);
  const status = (FILTERS as readonly string[]).includes(input.status ?? "")
    ? (input.status as (typeof FILTERS)[number])
    : "all";
  const now = clock(deps);
  const mine = and(
    eq(vehicles.storeId, storeId),
    ne(vehicles.status, "deleted"),
  );

  const [c] = await deps.db
    .select({
      all: count(),
      published:
        sql<number>`count(*) filter (where ${vehicles.status} = 'published')`.mapWith(
          Number,
        ),
      draft:
        sql<number>`count(*) filter (where ${vehicles.status} = 'draft')`.mapWith(
          Number,
        ),
      sold: sql<number>`count(*) filter (where ${vehicles.status} = 'sold')`.mapWith(
        Number,
      ),
      onCajugo:
        sql<number>`count(*) filter (where ${vehicles.status} = 'published' and ${vehicles.shareOnCajugo})`.mapWith(
          Number,
        ),
      soldThisMonth:
        sql<number>`count(*) filter (where ${vehicles.status} = 'sold' and ${vehicles.soldAt} >= ${saoPauloMonthStart(now).toISOString()}::timestamptz)`.mapWith(
          Number,
        ),
    })
    .from(vehicles)
    .where(mine);

  const q = input.q?.trim().slice(0, 40) ?? "";
  const like = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const plate = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rows = await deps.db
    .select()
    .from(vehicles)
    .where(
      and(
        mine,
        status === "all" ? undefined : eq(vehicles.status, status),
        q
          ? or(
              ilike(vehicles.make, like),
              ilike(vehicles.model, like),
              ilike(vehicles.version, like),
              plate ? ilike(vehicles.plate, `%${plate}%`) : undefined,
            )
          : undefined,
      ),
    )
    .orderBy(desc(vehicles.updatedAt));

  const live = await storeIsLive(deps.db, storeId);
  const covers = rows.length
    ? await deps.db
        .select({
          vehicleId: vehiclePhotos.vehicleId,
          publicId: vehiclePhotos.publicId,
        })
        .from(vehiclePhotos)
        .where(
          and(
            inArray(
              vehiclePhotos.vehicleId,
              rows.map((r) => r.id),
            ),
            eq(vehiclePhotos.position, 0),
          ),
        )
    : [];
  const coverOf = new Map(covers.map((p) => [p.vehicleId, p.publicId]));

  return {
    counts: {
      all: c.all,
      published: c.published,
      draft: c.draft,
      sold: c.sold,
    },
    kpis: {
      published: c.published,
      onCajugo: c.onCajugo,
      soldThisMonth: c.soldThisMonth,
    },
    items: rows.map((v) => ({
      vehicleId: v.id,
      name: vehicleName(v),
      status: v.status,
      statusLabel: STATUS_LABEL[v.status],
      yearModel: v.yearModel,
      mileageKm: v.mileageKm,
      priceCents: v.priceCents,
      coverPublicId: coverOf.get(v.id) ?? null,
      shareOnCajugo: v.shareOnCajugo,
      shareCaption: shareCaption({
        status: v.status,
        share: v.shareOnCajugo,
        storeLive: live,
      }),
      canShare: v.status === "published",
      canSell: v.status === "published",
    })),
  };
}

export type PublicVehicleCard = {
  vehicleId: string;
  name: string;
  yearModel: number | null;
  mileageKm: number | null;
  priceCents: number | null;
  coverPublicId: string | null;
};

/**
 * Veículos do catálogo público da loja (VEH-FR-010, VEH-SEC-004): só publicados de
 * loja no ar. Saída montada à mão, sem placa nem chassi (VEH-SEC-002).
 */
export async function publicVehicles(
  db: Db,
  storeId: string,
): Promise<PublicVehicleCard[]> {
  const rows = await db
    .select({
      vehicleId: vehicles.id,
      version: vehicles.version,
      model: vehicles.model,
      yearModel: vehicles.yearModel,
      mileageKm: vehicles.mileageKm,
      priceCents: vehicles.priceCents,
      coverPublicId: vehiclePhotos.publicId,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .leftJoin(
      vehiclePhotos,
      and(
        eq(vehiclePhotos.vehicleId, vehicles.id),
        eq(vehiclePhotos.position, 0),
      ),
    )
    .where(
      and(
        eq(vehicles.storeId, storeId),
        eq(vehicles.status, "published"),
        inArray(stores.status, [...LIVE_STATUSES]),
      ),
    )
    .orderBy(desc(vehicles.publishedAt));
  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    name: vehicleName(r),
    yearModel: r.yearModel,
    mileageKm: r.mileageKm,
    priceCents: r.priceCents,
    coverPublicId: r.coverPublicId,
  }));
}

/** A loja já tem veículo publicado? (primeiros passos, VEH-FR-015) */
export async function hasPublishedVehicle(
  db: Db,
  storeId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.storeId, storeId), eq(vehicles.status, "published")))
    .limit(1);
  return !!row;
}

/** O veículo da loja da sessão está publicado? (para renovar as páginas públicas) */
export async function isPublished(
  db: Db,
  session: Session | null,
  vehicleId: string,
): Promise<boolean> {
  const { vehicle } = await ownVehicle(db, session, vehicleId);
  return vehicle.status === "published";
}

/**
 * Só testes (`pnpm e2e:seed`, que recusa a produção): apaga veículos, fotos e histórico
 * das lojas dos e2e e devolve as fotos para o seed apagar no Cloudinary.
 */
export async function removeVehiclesForTests(
  db: Db,
  storeIds: string[],
): Promise<string[]> {
  if (!storeIds.length) return [];
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(inArray(vehicles.storeId, storeIds));
    const ids = rows.map((r) => r.id);
    if (!ids.length) return [];
    const photos = await tx
      .delete(vehiclePhotos)
      .where(inArray(vehiclePhotos.vehicleId, ids))
      .returning({ publicId: vehiclePhotos.publicId });
    await tx
      .delete(vehicleHistory)
      .where(inArray(vehicleHistory.vehicleId, ids));
    await tx.delete(vehicles).where(inArray(vehicles.id, ids));
    return photos.map((p) => p.publicId);
  });
}

/**
 * Renova a referência FIPE guardada no veículo quando a tabela muda de mês
 * (VEH-FR-007), ao abrir a edição. A API fora do ar não atrapalha: fica a anterior.
 */
export async function refreshFipeReference(
  deps: VehicleDeps,
  session: Session | null,
  vehicleId: string,
): Promise<void> {
  const { storeId } = storeOf(session);
  if (!UUID.test(vehicleId)) return;
  const mine = and(eq(vehicles.id, vehicleId), eq(vehicles.storeId, storeId));
  const [v] = await deps.db
    .select({
      brand: vehicles.fipeBrandId,
      model: vehicles.fipeModelId,
      year: vehicles.fipeYearId,
      month: vehicles.fipeMonth,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(mine);
  if (!v?.brand || !v.model || !v.year || !isEditable(v.status)) return;
  const ref = await reference(deps, v.brand, v.model, v.year.split(":")[1]);
  if (!ref || ref.month === v.month) return;
  await deps.db
    .update(vehicles)
    .set({
      fipeCode: ref.fipeCode,
      fipePriceCents: ref.priceCents,
      fipeMonth: ref.month,
    })
    .where(mine);
}

const COMPLETE_PHOTOS = 6;

/**
 * Campos que a vitrine usa para filtrar, buscar e ordenar (spec 006), recalculados na
 * transação de quem mudou o veículo. Relevância: dia da publicação + até 7 pontos de
 * anúncio completo (6 fotos ou mais, descrição, itens); rascunho fica com 0.
 */
async function syncSearchFields(tx: Db, vehicleId: string) {
  const [v] = await tx
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId));
  const photos = await photoCount(tx, vehicleId);
  const points =
    (photos >= COMPLETE_PHOTOS ? 3 : 0) +
    (v.description?.trim() ? 2 : 0) +
    (v.features.length ? 2 : 0);
  await tx
    .update(vehicles)
    .set({
      makeSlug: v.make ? slugify(v.make) : null,
      modelSlug: v.model ? slugify(v.model) : null,
      searchText: plainText(
        [v.make, v.model, v.version].filter(Boolean).join(" "),
      ),
      rankScore: v.publishedAt
        ? Math.floor(v.publishedAt.getTime() / DAY_MS) + points
        : 0,
    })
    .where(eq(vehicles.id, vehicleId));
}
