"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import { loginUrl } from "@/platform/http/protected-paths";
import { requestAuthProvider } from "@/platform/supabase/next";
import { currentSession } from "./current";
import {
  getSession,
  signIn,
  signOut,
  switchPanel,
  updatePassword,
} from "./service";

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

export type NewPasswordState = {
  message?: string;
  errors: Record<string, string>;
} | null;

/** Nova senha (AUT-FR-015): única ação liberada com senha temporária. */
export async function updatePasswordAction(
  _prev: NewPasswordState,
  form: FormData,
): Promise<NewPasswordState> {
  const deps = { db, auth: await requestAuthProvider() };
  const session = await getSession(deps);
  if (!session) redirect(loginUrl("/nova-senha", ""));

  let redirectTo: string;
  try {
    const result = await updatePassword(deps, session, {
      password: String(form.get("password") ?? ""),
      confirmation: String(form.get("confirmation") ?? ""),
    });
    redirectTo = result.redirectTo;
  } catch (error) {
    if (error instanceof AppError)
      return {
        message: error.errors.length ? undefined : error.title,
        errors: Object.fromEntries(
          error.errors.map((e) => [e.field, e.message]),
        ),
      };
    logger.error("auth.update_password_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      message: "Não foi possível salvar agora. Tente de novo em instantes.",
      errors: {},
    };
  }
  redirect(redirectTo);
}

/** Troca de painel (AUT-FR-007); papel fora da conta → 403, tratado no serviço. */
export async function switchPanelAction(form: FormData): Promise<void> {
  const { redirectTo } = await switchPanel(
    { db, auth: await requestAuthProvider() },
    await currentSession(),
    form.get("role"),
  );
  redirect(redirectTo);
}

/** Sair deste aparelho e voltar à vitrine (AUT-FR-005). */
export async function signOutAction(): Promise<void> {
  const { redirectTo } = await signOut({
    db,
    auth: await requestAuthProvider(),
  });
  redirect(redirectTo);
}
