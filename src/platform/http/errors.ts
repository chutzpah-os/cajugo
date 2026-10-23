import { z } from "zod";

export type FieldError = { field: string; code: string; message: string };

/**
 * Erro de negócio com tudo o que a resposta precisa (API.md §3).
 * `title` e `detail` vão para o usuário (pt-BR); nunca coloque detalhe interno aqui.
 */
export class AppError extends Error {
  constructor(
    readonly type: string,
    readonly title: string,
    readonly status: number,
    readonly detail?: string,
    readonly errors: FieldError[] = [],
  ) {
    super(title);
  }

  /** Recurso inexistente ou de outra loja: sempre 404, sem revelar qual dos dois. */
  static notFound(detail = "Não encontramos o que você procurou.") {
    return new AppError("not-found", "Não encontrado", 404, detail);
  }

  static unauthorized() {
    return new AppError("unauthorized", "Faça login para continuar", 401);
  }

  static forbidden() {
    return new AppError("forbidden", "Você não tem permissão para isso", 403);
  }

  static tooManyRequests(retryAfterSeconds: number) {
    const error = new AppError(
      "too-many-requests",
      "Muitas tentativas",
      429,
      "Aguarde um pouco e tente de novo.",
    );
    error.retryAfterSeconds = retryAfterSeconds;
    return error;
  }

  static validation(errors: FieldError[]) {
    return new AppError(
      "validation",
      "Confira os campos",
      422,
      undefined,
      errors,
    );
  }

  retryAfterSeconds?: number;
}

/** Converte os problemas do zod no formato `errors` do projeto. */
export function fieldErrorsFromZod(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    code: issue.code,
    message: issue.message,
  }));
}

/** Resultado de Server Action: a tela mostra `errors` abaixo de cada campo. */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; message: string; errors: FieldError[] };

export function actionError(error: AppError): ActionResult<never> {
  return {
    ok: false,
    message: error.detail ?? error.title,
    errors: error.errors,
  };
}

/** Resposta `application/problem+json` (RFC 9457) para Route Handlers. */
export function problemResponse(error: AppError, instance?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/problem+json",
  };
  if (error.retryAfterSeconds)
    headers["retry-after"] = String(error.retryAfterSeconds);
  return new Response(
    JSON.stringify({
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      instance,
      errors: error.errors.length ? error.errors : undefined,
    }),
    { status: error.status, headers },
  );
}
