"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { errorMessage, logger } from "@/platform/http/logger";
import { loginUrl } from "@/platform/http/protected-paths";
import { requestAuthProvider } from "@/platform/supabase/next";
import { currentSession } from "./current";
import {
  changePassword,
  findAccountByEmail,
  getSession,
  inviteTeamMember,
  removeTeamMember,
  setTemporaryPassword,
  signIn,
  signOut,
  switchPanel,
  updatePassword,
  type AccountSummary,
} from "./service";

/** `email` volta para a tela não apagar o que a pessoa digitou. */
/** Falha inesperada: vai para o log (sem senha, `logger` redige) e a tela mostra mensagem neutra. */
function logUnexpected(event: string, error: unknown) {
  logger.error(event, {
    error: errorMessage(error),
  });
}

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
      { db: getDb(), auth: await requestAuthProvider() },
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
    logUnexpected("auth.sign_in_failed", error);
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
  const deps = { db: getDb(), auth: await requestAuthProvider() };
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
    logUnexpected("auth.update_password_failed", error);
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
    { db: getDb(), auth: await requestAuthProvider() },
    await currentSession(),
    form.get("role"),
  );
  redirect(redirectTo);
}

/** Sair deste aparelho e voltar à vitrine (AUT-FR-005). */
export async function signOutAction(): Promise<void> {
  const { redirectTo } = await signOut({
    db: getDb(),
    auth: await requestAuthProvider(),
  });
  redirect(redirectTo);
}

export type AccountSearchState = {
  account: AccountSummary | null;
  message?: string;
} | null;

/** Busca de conta por e-mail na tela "Senha temporária" (admin e suporte). */
export async function findAccountAction(
  _prev: AccountSearchState,
  form: FormData,
): Promise<AccountSearchState> {
  try {
    const account = await findAccountByEmail(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      form.get("email"),
    );
    return { account };
  } catch (error) {
    if (error instanceof AppError)
      return { account: null, message: error.title };
    throw error;
  }
}

export type TemporaryPasswordState = {
  password?: string;
  message?: string;
} | null;

/** Admin define a senha temporária (AUT-FR-014); a senha volta só nesta resposta. */
export async function setTemporaryPasswordAction(
  _prev: TemporaryPasswordState,
  form: FormData,
): Promise<TemporaryPasswordState> {
  try {
    const { password } = await setTemporaryPassword(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      form.get("userId"),
    );
    return { password };
  } catch (error) {
    if (error instanceof AppError) return { message: error.title };
    logUnexpected("auth.temp_password_failed", error);
    return { message: "Não foi possível definir a senha agora." };
  }
}

export type ChangePasswordState = {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
} | null;

/** Troca da própria senha em /conta/senha (CFG-FR-010, CFG-SEC-006). */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  form: FormData,
): Promise<ChangePasswordState> {
  try {
    await changePassword(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      {
        current: String(form.get("current") ?? ""),
        password: String(form.get("password") ?? ""),
        confirmation: String(form.get("confirmation") ?? ""),
      },
      { ipHash: hashIp(clientIp(await headers())) },
    );
    return {
      ok: true,
      message: "Senha alterada. Os outros aparelhos foram desconectados.",
      errors: {},
    };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
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
    logUnexpected("auth.change_password_failed", error);
    return {
      ok: false,
      message: "Não foi possível salvar agora. Tente de novo em instantes.",
      errors: {},
    };
  }
}

export type InviteState = {
  ok: boolean;
  /** Senha temporária da conta nova: aparece uma única vez (ADM-SEC-003). */
  password?: string | null;
  email?: string;
  message?: string;
  errors: Record<string, string>;
} | null;

/** **Convidar** para a Equipe CajuGo na Conta admin [4c] (ADM-FR-012): só admin. */
export async function inviteTeamMemberAction(
  _prev: InviteState,
  form: FormData,
): Promise<InviteState> {
  const email = String(form.get("email") ?? "");
  try {
    const { temporaryPassword } = await inviteTeamMember(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      {
        name: String(form.get("name") ?? ""),
        email,
        role: String(form.get("role") ?? ""),
      },
    );
    return { ok: true, password: temporaryPassword, email, errors: {} };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
        message: error.errors.length ? undefined : error.title,
        errors: Object.fromEntries(
          error.errors.map((e) => [e.field, e.message]),
        ),
      };
    logUnexpected("auth.team_invite_failed", error);
    return {
      ok: false,
      message: "Não foi possível convidar agora.",
      errors: {},
    };
  }
}

/** **Remover** da Equipe CajuGo (ADM-FR-012): só admin; não a si mesmo nem o último admin. */
export async function removeTeamMemberAction(input: {
  profileId: string;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    await removeTeamMember(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      input,
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.title };
    logUnexpected("auth.team_remove_failed", error);
    return { ok: false, message: "Não foi possível remover agora." };
  }
}
