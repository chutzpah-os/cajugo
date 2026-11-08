import { and, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { authorizeTo } from "@/domains/auth/service";
import { identify } from "@/domains/fipe/service";
import { vehicleDefaults } from "@/domains/stores/service";
import { parsePlate } from "@/platform/br/plate";
import type { FipeClient } from "@/platform/fipe/client";
import { vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
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
  const { storeId } = storeOf(session);
  const { vehicleId, ...parsed } = parse(draftSchema, input);
  const now = clock(deps);
  const existing = vehicleId
    ? await deps.db
        .select({
          status: vehicles.status,
          yearModel: vehicles.yearModel,
          yearManufacture: vehicles.yearManufacture,
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
  await deps.db
    .update(vehicles)
    .set({ ...fields, updatedAt: now })
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(vehicles.storeId, storeId),
        inArray(vehicles.status, [...EDITABLE]),
      ),
    );
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
  updatedAt: Date;
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
  return {
    vehicleId: v.id,
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
