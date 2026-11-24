"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { VEHICLES_TAG } from "@/domains/vehicles/service";
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
  approve,
  confirmSale,
  saleTerms,
  undoSale,
  type SaleTerms,
  decidePartnership,
  setNetworkRules,
  setVehicleCommission,
  attachDocument,
  block,
  unblock,
  documentUpload,
  recordSellerClick,
  registerSeller,
  requestPartnership,
  updatePixKey,
  sellerShowcase,
  sellerStatement,
  setCommissionReceived,
  type SellerCard,
  type StatementItem,
} from "./service";
import { sellerShowcasePageSchema } from "./schemas";
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
  // Campo vazio vai como "" para a mensagem do próprio campo ("Informe seu nome.").
  for (const f of FIELDS) input[f] = String(form.get(f) ?? "");
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
export async function sellerDocumentUploadAction(input: {
  side: "front" | "back";
}): Promise<
  { ok: true; upload: SignedUpload } | { ok: false; message: string }
> {
  try {
    return {
      ok: true,
      upload: await documentUpload(
        { db: getDb(), cloudinary: getCloudinary() },
        await currentSession(),
        input,
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
export async function loadMoreSellerShowcaseAction(
  input: unknown,
): Promise<{ items: SellerCard[]; nextCursor: string | null } | null> {
  const parsed = sellerShowcasePageSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    const page = await sellerShowcase(getDb(), await currentSession(), {
      filters: filtersFromQuery(parsed.data.query),
      cursor: parsed.data.cursor,
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

export type DecisionResult =
  | { ok: true }
  | { ok: false; message: string; errors?: Record<string, string> };

async function decisionResult(
  run: () => Promise<boolean>,
  stale: string,
): Promise<DecisionResult> {
  try {
    return (await run()) ? { ok: true } : { ok: false, message: stale };
  } catch (error) {
    const s = stateOf(error, "Não foi possível concluir agora.");
    return {
      ok: false,
      message: s.message ?? "Confira os campos.",
      errors: s.errors,
    };
  }
}

/** **Aprovar** em [7h] (SEL-FR-004): só o admin. */
export async function approveSellerAction(input: {
  sellerId: string;
}): Promise<DecisionResult> {
  const session = await currentSession();
  return decisionResult(
    () => approve(getDb(), session, input),
    "Este cadastro já foi analisado.",
  );
}

/** **Bloquear** em [7h] (SEL-FR-005): só o admin, com motivo. */
export async function blockSellerAction(input: {
  sellerId: string;
  reason: string;
}): Promise<DecisionResult> {
  const session = await currentSession();
  return decisionResult(
    () => block(getDb(), session, input),
    "Este vendedor já não está ativo.",
  );
}

/** **Desbloquear** em [7h] (SEL-FR-005): só o admin. */
export async function unblockSellerAction(input: {
  sellerId: string;
}): Promise<DecisionResult> {
  const session = await currentSession();
  return decisionResult(
    () => unblock(getDb(), session, input),
    "Este vendedor já não está bloqueado.",
  );
}

export type FormResult =
  | { ok: true }
  | { ok: false; message?: string; errors: Record<string, string> };

/** "Aceitar vendedores" e comissão padrão [7e] (RCL-FR-001, 002): só o lojista. */
export async function setNetworkRulesAction(
  input: unknown,
): Promise<FormResult> {
  try {
    await setNetworkRules(getDb(), await currentSession(), input);
    return { ok: true };
  } catch (error) {
    return { ok: false, ...stateOf(error, "Não foi possível salvar agora.") };
  }
}

/** Ajuste da comissão de um veículo [7e] (RCL-FR-003): só o lojista. */
export async function setCommissionOverrideAction(
  input: unknown,
): Promise<FormResult> {
  try {
    await setVehicleCommission(getDb(), await currentSession(), input);
    return { ok: true };
  } catch (error) {
    return { ok: false, ...stateOf(error, "Não foi possível salvar agora.") };
  }
}

/** Aprovar, Recusar e Encerrar parceria [7f] (RCL-FR-005, 006): só o lojista. */
export async function decidePartnershipAction(
  input: unknown,
): Promise<DecisionResult> {
  const session = await currentSession();
  return decisionResult(async () => {
    await decidePartnership(getDb(), session, input);
    return true;
  }, "");
}

/** Cálculo ao vivo de [7g] (RCL-FR-010): `null` em entrada inválida ou falha. */
export async function saleTermsAction(
  input: unknown,
): Promise<SaleTerms | null> {
  try {
    return await saleTerms(getDb(), await currentSession(), input);
  } catch (error) {
    if (!(error instanceof AppError))
      logger.error("sellers.sale_terms_failed", { error: errorMessage(error) });
    return null;
  }
}

/** **Confirmar venda** [7g] (RCL-FR-011, 012, RCL-NFR-002): o vendido sai do cache na hora. */
export async function confirmSaleAction(input: unknown): Promise<FormResult> {
  try {
    await confirmSale({ db: getDb() }, await currentSession(), input);
    updateTag(VEHICLES_TAG);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      ...stateOf(error, "Não foi possível confirmar agora."),
    };
  }
}

/** **Desfazer venda** da Rede Caju (RCL-FR-015): o veículo volta ao cache na hora. */
export async function undoSaleAction(input: unknown): Promise<DecisionResult> {
  const session = await currentSession();
  const r = await decisionResult(async () => {
    await undoSale({ db: getDb() }, session, input);
    return true;
  }, "");
  if (r.ok) updateTag(VEHICLES_TAG);
  return r;
}

/** Próxima página do extrato [7d] (EXT-NFR-002); `null` quando falha. */
export async function loadMoreStatementAction(input: {
  filtro: string;
  cursor: string;
}): Promise<{ items: StatementItem[]; nextCursor: string | null } | null> {
  try {
    const page = await sellerStatement(getDb(), await currentSession(), input);
    return { items: page.items, nextCursor: page.nextCursor };
  } catch (error) {
    logger.error("sellers.statement_failed", { error: errorMessage(error) });
    return null;
  }
}

/** **Recebi** e **Desfazer** [7d] (EXT-FR-003, 009). */
export async function setCommissionReceivedAction(input: {
  saleId: string;
  received: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await setCommissionReceived({ db: getDb() }, await currentSession(), input);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError)
      return { ok: false, message: error.detail ?? error.title };
    logger.error("sellers.commission_received_failed", {
      error: errorMessage(error),
    });
    return {
      ok: false,
      message: "Não foi possível salvar agora. Tente de novo.",
    };
  }
}
