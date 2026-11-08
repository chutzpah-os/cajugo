"use server";

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
import { requestAuthProvider } from "@/platform/supabase/next";
import {
  checkReferralCode,
  registerStore,
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
