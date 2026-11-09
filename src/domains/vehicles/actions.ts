"use server";

import { updateTag } from "next/cache";
import { authorizeTo, currentSession } from "@/domains/auth/service";
import { brands, models, years } from "@/domains/fipe/service";
import { getCloudinary } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { errorMessage, logger } from "@/platform/http/logger";
import {
  addPhoto,
  isPublished,
  markSold,
  photoUpload,
  publish,
  remove,
  removePhoto,
  reorderPhotos,
  saveDraft,
  setShare,
  undoSold,
  unpublish,
  vehicleForm,
  type PhotoView,
  type VehicleFormView,
} from "./service";
import { VEHICLES_TAG } from "./tags";

export type ActionError = {
  ok: false;
  message?: string;
  errors: Record<string, string>;
};

function fail(error: unknown): ActionError {
  if (error instanceof AppError)
    return {
      ok: false,
      message: error.errors.length ? undefined : (error.detail ?? error.title),
      errors: Object.fromEntries(error.errors.map((e) => [e.field, e.message])),
    };
  logger.error("vehicles.action_failed", {
    error: errorMessage(error),
  });
  return {
    ok: false,
    message: "Não foi possível salvar agora. Tente de novo em instantes.",
    errors: {},
  };
}

const deps = () => ({ db: getDb() });
const photoDeps = () => ({ db: getDb(), cloudinary: getCloudinary() });

/** Autosave [2a] (VEH-FR-003): grava e devolve o formulário atualizado. */
export async function saveDraftAction(
  input: Record<string, unknown>,
): Promise<{ ok: true; view: VehicleFormView } | ActionError> {
  try {
    const session = await currentSession();
    const { vehicleId } = await saveDraft(deps(), session, input);
    const view = await vehicleForm(getDb(), session, vehicleId);
    if (view.status === "published") updateTag(VEHICLES_TAG);
    return { ok: true, view };
  } catch (error) {
    return fail(error);
  }
}

/** Listas da FIPE guardada (VEH-FR-005); só para quem cuida de veículos. */
export async function fipeAction(
  input:
    | { list: "brands" }
    | { list: "models"; brandId: string }
    | { list: "years"; brandId: string; modelId: string },
): Promise<{ ok: true; items: unknown } | ActionError> {
  try {
    authorizeTo(await currentSession(), "vehicles.manage");
    const d = deps();
    const items =
      input.list === "brands"
        ? await brands(d)
        : input.list === "models"
          ? await models(d, String(input.brandId).slice(0, 12))
          : await years(
              d,
              String(input.brandId).slice(0, 12),
              String(input.modelId).slice(0, 12),
            );
    return { ok: true, items };
  } catch (error) {
    return fail(error);
  }
}

type Done = { ok: true } | ActionError;

/**
 * Executa a ação e renova as páginas públicas só se o veículo é (ou era) público:
 * renovar recarrega a rota, e um rascunho em edição não deve ser remontado.
 */
async function run(
  vehicleId: string,
  fn: () => Promise<unknown>,
): Promise<Done> {
  try {
    const session = await currentSession();
    const wasPublic = await isPublished(getDb(), session, vehicleId);
    await fn();
    if (
      wasPublic ||
      (await isPublished(getDb(), session, vehicleId).catch(() => false))
    )
      updateTag(VEHICLES_TAG);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function publishAction(vehicleId: string): Promise<Done> {
  return run(vehicleId, async () =>
    publish(deps(), await currentSession(), vehicleId),
  );
}
export async function setShareAction(
  vehicleId: string,
  on: boolean,
): Promise<Done> {
  return run(vehicleId, async () =>
    setShare(deps(), await currentSession(), vehicleId, on),
  );
}
export async function markSoldAction(vehicleId: string): Promise<Done> {
  return run(vehicleId, async () =>
    markSold(deps(), await currentSession(), vehicleId),
  );
}
export async function undoSoldAction(vehicleId: string): Promise<Done> {
  return run(vehicleId, async () =>
    undoSold(deps(), await currentSession(), vehicleId),
  );
}
export async function unpublishAction(vehicleId: string): Promise<Done> {
  return run(vehicleId, async () =>
    unpublish(deps(), await currentSession(), vehicleId),
  );
}
export async function removeAction(vehicleId: string): Promise<Done> {
  return run(vehicleId, async () =>
    remove(deps(), await currentSession(), vehicleId),
  );
}

/** Fotos (VEH-FR-004). */
export async function photoUploadAction(vehicleId: string) {
  try {
    return {
      ok: true as const,
      upload: await photoUpload(photoDeps(), await currentSession(), vehicleId),
    };
  } catch (error) {
    return fail(error);
  }
}
export async function addPhotoAction(
  vehicleId: string,
  publicId: string,
): Promise<{ ok: true; photo: PhotoView } | ActionError> {
  try {
    const session = await currentSession();
    const photo = await addPhoto(photoDeps(), session, vehicleId, publicId);
    if (await isPublished(getDb(), session, vehicleId)) updateTag(VEHICLES_TAG);
    return { ok: true, photo };
  } catch (error) {
    return fail(error);
  }
}
export async function removePhotoAction(
  vehicleId: string,
  photoId: string,
): Promise<Done> {
  return run(vehicleId, async () =>
    removePhoto(photoDeps(), await currentSession(), vehicleId, photoId),
  );
}
export async function reorderPhotosAction(
  vehicleId: string,
  photoIds: string[],
): Promise<Done> {
  return run(vehicleId, async () =>
    reorderPhotos(photoDeps(), await currentSession(), vehicleId, photoIds),
  );
}
