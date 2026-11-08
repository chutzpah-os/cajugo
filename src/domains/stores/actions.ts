"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentSession, signIn } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { searchCities, type City } from "@/platform/geo/cities";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { isHoneypotFilled } from "@/platform/http/honeypot";
import { logger } from "@/platform/http/logger";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import {
  getCloudinary,
  type SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import { requestAuthProvider } from "@/platform/supabase/next";
import { STORES_TAG } from "./current";
import { hoursFromForm } from "./hours-form";
import {
  checkReferralCode,
  registerStore,
  changeSlug,
  setStoreImage,
  storeImageUpload,
  updateStore,
  type CodeCheckView,
} from "./service";
import { checkSlug, type SlugCheck } from "./slug";

async function ipHash() {
  return hashIp(clientIp(await headers()));
}

/** Limite das checagens ao vivo por rede (STO-SEC-002). */
async function liveCheckAllowed(): Promise<boolean> {
  const { ok } = await consumeRateLimit(
    getDb(),
    `live:ip:${await ipHash()}`,
    RATE_LIMITS.liveCheck,
  );
  return ok;
}

/** "Disponível"/"Indisponível" enquanto digita (STO-FR-005). */
export async function checkSlugAction(slug: string): Promise<SlugCheck | null> {
  if (!(await liveCheckAllowed())) return null;
  return checkSlug(getDb(), String(slug).slice(0, 60));
}

export type { CodeCheckView };

/** Código de indicação ao vivo (STO-FR-007): só o nome de quem indicou. */
export async function checkCodeAction(input: {
  code: string;
  email: string;
  phone: string;
}): Promise<CodeCheckView> {
  if (!(await liveCheckAllowed())) return null;
  return checkReferralCode(getDb(), await currentSession(), input);
}

/** Sugestões de cidade (STO-FR-004). */
export async function searchCitiesAction(query: string): Promise<City[]> {
  if (!(await liveCheckAllowed())) return [];
  return searchCities(String(query).slice(0, 60));
}

export type RegisterStoreState = {
  message?: string;
  errors: Record<string, string>;
} | null;

const FIELDS = [
  "storeName",
  "city",
  "state",
  "whatsapp",
  "slug",
  "name",
  "email",
  "phone",
  "password",
  "referralCode",
] as const;

/** Cadastro [5c] (STO-FR-003, 015): cria a loja, entra (visitante) e segue para o pagamento. */
export async function registerStoreAction(
  _prev: RegisterStoreState,
  form: FormData,
): Promise<RegisterStoreState> {
  const session = await currentSession();
  const input: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = form.get(f);
    if (typeof v === "string" && v !== "") input[f] = v;
  }
  if (session)
    for (const f of ["name", "email", "phone", "password"]) delete input[f];
  input.terms = form.get("terms") === "on";
  const hash = await ipHash();
  const deps = { db: getDb(), auth: await requestAuthProvider() };

  try {
    await registerStore(deps, session, input, {
      ipHash: hash,
      honeypotFilled: isHoneypotFilled(form),
    });
    if (!session)
      await signIn(
        deps,
        { email: String(input.email), password: String(input.password) },
        { ipHash: hash },
      );
  } catch (error) {
    if (error instanceof AppError)
      return {
        message:
          error.type === "too-many-requests"
            ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
            : error.errors.length
              ? undefined
              : error.title,
        errors: Object.fromEntries(
          error.errors.map((e) => [e.field, e.message]),
        ),
      };
    logger.error("stores.register_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      message: "Não foi possível concluir agora. Tente de novo em instantes.",
      errors: {},
    };
  }
  redirect("/lojistas/pagamento");
}

export type StoreFormState = {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
} | null;

/** Erros do serviço → estado da tela (mensagem geral ou por campo). */
function formError(error: unknown): StoreFormState {
  if (error instanceof AppError)
    return {
      ok: false,
      message: error.errors.length ? undefined : error.title,
      errors: Object.fromEntries(
        error.errors.map((e) => [
          // Horário: o erro fica no dia (hours.tue); o resto, no campo.
          e.field.startsWith("hours.")
            ? e.field.split(".").slice(0, 2).join(".")
            : e.field.split(".")[0],
          e.message,
        ]),
      ),
    };
  logger.error("stores.save_failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  return {
    ok: false,
    message: "Não foi possível salvar agora. Tente de novo em instantes.",
    errors: {},
  };
}

/** Minha loja [3b] (STO-FR-008, 009, 012): só a loja da sessão. */
export async function updateStoreAction(
  _prev: StoreFormState,
  form: FormData,
): Promise<StoreFormState> {
  const text = (k: string) => String(form.get(k) ?? "");
  const hours = hoursFromForm(form);
  const noHours = Object.values(hours).every(
    (d) =>
      !("closed" in (d as object)) &&
      !(d as { ranges: unknown[] }).ranges.length,
  );
  try {
    await updateStore(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      {
        name: text("name"),
        about: text("about"),
        whatsapp: text("whatsapp"),
        instagram: text("instagram"),
        addressStreet: text("addressStreet"),
        addressNumber: text("addressNumber"),
        addressComplement: text("addressComplement"),
        addressDistrict: text("addressDistrict"),
        addressZip: text("addressZip"),
        hours: noHours ? null : hours,
        shareByDefault: form.get("shareByDefault") === "on",
      },
    );
    updateTag(STORES_TAG);
    return { ok: true, message: "Alterações salvas.", errors: {} };
  } catch (error) {
    return formError(error);
  }
}

async function imageDeps() {
  return {
    db: getDb(),
    auth: await requestAuthProvider(),
    cloudinary: getCloudinary(),
  };
}

/** Assinatura para enviar logo ou capa direto ao Cloudinary (STO-FR-010). */
export async function storeImageUploadAction(
  kind: string,
): Promise<
  { ok: true; upload: SignedUpload } | { ok: false; message: string }
> {
  try {
    return {
      ok: true,
      upload: await storeImageUpload(
        await imageDeps(),
        await currentSession(),
        kind,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message: formError(error)?.message ?? "Não foi possível enviar.",
    };
  }
}

/** Salva o logo ou a capa enviada, depois de conferir no Cloudinary (STO-SEC-004). */
export async function setStoreImageAction(
  kind: string,
  publicId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await setStoreImage(
      await imageDeps(),
      await currentSession(),
      kind,
      publicId,
    );
    updateTag(STORES_TAG);
    return { ok: true };
  } catch (error) {
    const state = formError(error);
    return {
      ok: false,
      message:
        state?.message ??
        Object.values(state?.errors ?? {})[0] ??
        "Não foi possível salvar a imagem.",
    };
  }
}

/** Troca do endereço do catálogo (STO-FR-013): 1 vez a cada 30 dias, com aviso. */
export async function changeSlugAction(
  _prev: StoreFormState,
  form: FormData,
): Promise<StoreFormState> {
  if (form.get("confirm") !== "on")
    return {
      ok: false,
      errors: { confirm: "Confirme que entendeu o aviso." },
    };
  try {
    const { slug } = await changeSlug(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      String(form.get("slug") ?? ""),
    );
    updateTag(STORES_TAG);
    return { ok: true, message: `Endereço alterado para ${slug}.`, errors: {} };
  } catch (error) {
    return formError(error);
  }
}
