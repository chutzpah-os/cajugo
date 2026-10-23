"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import { requestAuthProvider } from "@/platform/supabase/next";
import { signIn } from "./service";

/** `email` volta para a tela não apagar o que a pessoa digitou. */
export type SignInState = {
  message: string;
  email: string;
} | null;

/** Login [9f]. Sucesso redireciona; falha volta a mensagem para a tela (AUT-FR-001–003). */
export async function signInAction(
  _prev: SignInState,
  form: FormData,
): Promise<SignInState> {
  const email = String(form.get("email") ?? "").slice(0, 254);
  let redirectTo: string;
  try {
    const result = await signIn(
      { db, auth: await requestAuthProvider() },
      {
        email,
        password: String(form.get("password") ?? ""),
        next: String(form.get("next") ?? "") || undefined,
      },
      { ipHash: hashIp(clientIp(await headers())) },
    );
    redirectTo = result.redirectTo;
  } catch (error) {
    if (error instanceof AppError)
      return {
        message:
          error.type === "too-many-requests"
            ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
            : error.title,
        email,
      };
    logger.error("auth.sign_in_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      message: "Não foi possível entrar agora. Tente de novo em instantes.",
      email,
    };
  }
  redirect(redirectTo);
}
