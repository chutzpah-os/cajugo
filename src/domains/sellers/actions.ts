"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentSession, signIn } from "@/domains/auth/service";
import {
  getCloudinary,
  type SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { isHoneypotFilled } from "@/platform/http/honeypot";
import { errorMessage, logger } from "@/platform/http/logger";
import { requestAuthProvider } from "@/platform/supabase/next";
import { filtersFromQuery } from "@/domains/showcase/service";
import {
  attachDocument,
  documentUpload,
  recordSellerClick,
  registerSeller,
  requestPartnership,
  updatePixKey,
  sellerShowcase,
  type SellerCard,
} from "./service";
import type { PartnerState } from "./status";

const ipHash = async () => hashIp(clientIp(await headers()));

export type SellerSignupState = {
  /** Envio do robô (campo isca): confirmação sem conta. */
  sent?: boolean;
  message?: string;
  errors: Record<string, string>;
} | null;

const FIELDS = [
  "name",
  "cpf",
  "phone",
  "email",
  "city",
  "pixType",
  "pixKey",
  "password",
] as const;
const ACCOUNT_FIELDS = ["name", "phone", "email", "password"];

/** Erro do serviço → estado da tela (mensagem geral ou por campo). */
function stateOf(error: unknown, fallback: string) {
  if (error instanceof AppError)
    return {
      message:
        error.type === "too-many-requests"
          ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
          : error.errors.length
            ? undefined
            : (error.detail ?? error.title),
      errors: Object.fromEntries(error.errors.map((e) => [e.field, e.message])),
    };
  logger.error("sellers.action_failed", { error: errorMessage(error) });
  return { message: fallback, errors: {} };
}

/**
 * Cadastro do vendedor [7a] (SEL-FR-001, 016): cria a conta (ou acrescenta o papel à
 * conta conectada), entra e segue para as fotos do documento.
 */
export async function registerSellerAction(
  _prev: SellerSignupState,
  form: FormData,
): Promise<SellerSignupState> {
  const session = await currentSession();
  const input: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = form.get(f);
    if (typeof v === "string" && v !== "") input[f] = v;
  }
  if (session) for (const f of ACCOUNT_FIELDS) delete input[f];
  input.terms = form.get("terms") === "on";
  const hash = await ipHash();
  const deps = { db: getDb(), auth: await requestAuthProvider() };
  try {
    const { userId } = await registerSeller(deps, session, input, {
      ipHash: hash,
      honeypotFilled: isHoneypotFilled(form),
    });
    if (!userId) return { sent: true, errors: {} };
    if (!session)
      await signIn(
        deps,
        { email: String(input.email), password: String(input.password) },
        { ipHash: hash },
      );
  } catch (error) {
    return stateOf(error, "Não foi possível concluir agora. Tente de novo.");
  }
  redirect("/rede/cadastro/documento");
}

/** Assinatura para enviar a foto do documento (SEL-FR-001, SEL-SEC-009). */
export async function sellerDocumentUploadAction(
  side: "front" | "back",
): Promise<
  { ok: true; upload: SignedUpload } | { ok: false; message: string }
> {
  try {
    return {
      ok: true,
      upload: await documentUpload(
        { db: getDb(), cloudinary: getCloudinary() },
        await currentSession(),
        side,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        stateOf(error, "Não foi possível enviar agora.").message ??
        "Não foi possível enviar agora.",
    };
  }
}

/** Guarda a foto enviada (SEL-FR-001). */
export async function attachSellerDocumentAction(input: {
  side: "front" | "back";
  publicId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await attachDocument(
      { db: getDb(), cloudinary: getCloudinary() },
      await currentSession(),
      input,
    );
    return { ok: true };
  } catch (error) {
    const s = stateOf(error, "Não foi possível enviar agora.");
    return {
      ok: false,
      message:
        s.message ?? Object.values(s.errors)[0] ?? "Não foi possível enviar.",
    };
  }
}

/** Abertura do link do vendedor (SEL-FR-010): a tela não espera nem mostra erro. */
export async function sellerClickAction(raw: unknown): Promise<void> {
  try {
    const h = await headers();
    await recordSellerClick(getDb(), raw, {
      ipHash: hashIp(clientIp(h)),
      userAgent: h.get("user-agent"),
    });
  } catch (error) {
    logger.error("sellers.click_failed", { error: errorMessage(error) });
  }
}

/** "Pedir parceria" em [7c] (SEL-FR-009): devolve o estado novo da parceria. */
export async function requestPartnershipAction(input: {
  storeId: string;
}): Promise<
  { ok: true; state: PartnerState } | { ok: false; message: string }
> {
  try {
    return {
      ok: true,
      state: await requestPartnership(getDb(), await currentSession(), input),
    };
  } catch (error) {
    const s = stateOf(error, "Não foi possível pedir agora.");
    return { ok: false, message: s.message ?? "Não foi possível pedir agora." };
  }
}

/** Próxima página da vitrine do vendedor (SEL-NFR-003); `null` em falha. */
export async function loadMoreSellerShowcaseAction(input: {
  query: string;
  cursor: string;
}): Promise<{ items: SellerCard[]; nextCursor: string | null } | null> {
  try {
    const page = await sellerShowcase(getDb(), await currentSession(), {
      filters: filtersFromQuery(String(input.query).slice(0, 500)),
      cursor: String(input.cursor).slice(0, 300),
    });
    return { items: page.items, nextCursor: page.nextCursor };
  } catch (error) {
    logger.error("sellers.load_more_failed", { error: errorMessage(error) });
    return null;
  }
}

/** Trocar a chave Pix [13c] (SEL-FR-014). */
export async function updatePixKeyAction(input: {
  pixType: string;
  pixKey: string;
}): Promise<
  { ok: true } | { ok: false; message?: string; errors: Record<string, string> }
> {
  try {
    await updatePixKey(getDb(), await currentSession(), input);
    return { ok: true };
  } catch (error) {
    return { ok: false, ...stateOf(error, "Não foi possível salvar agora.") };
  }
}
