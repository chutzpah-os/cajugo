import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  actionError,
  AppError,
  fieldErrorsFromZod,
  problemResponse,
} from "./errors";

describe("erros", () => {
  it("converte erro do zod em erros por campo", () => {
    // Arrange
    const schema = z.object({
      slug: z.string().min(3, "Mínimo de 3 caracteres."),
    });

    // Act
    const parsed = schema.safeParse({ slug: "ab" });

    // Assert
    expect(parsed.success).toBe(false);
    expect(fieldErrorsFromZod(parsed.error!)).toEqual([
      { field: "slug", code: "too_small", message: "Mínimo de 3 caracteres." },
    ]);
  });

  it("problemResponse gera problem+json sem campos vazios", async () => {
    const response = problemResponse(AppError.notFound(), "/api/v1/x");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe(
      "application/problem+json",
    );
    expect(await response.json()).toEqual({
      type: "not-found",
      title: "Não encontrado",
      status: 404,
      detail: "Não encontramos o que você procurou.",
      instance: "/api/v1/x",
    });
  });

  it("429 leva Retry-After", () => {
    const response = problemResponse(AppError.tooManyRequests(30));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
  });

  it("actionError devolve mensagem e erros para a tela", () => {
    const errors = [
      { field: "email", code: "invalid", message: "E-mail inválido." },
    ];
    expect(actionError(AppError.validation(errors))).toEqual({
      ok: false,
      message: "Confira os campos",
      errors,
    });
  });
});
