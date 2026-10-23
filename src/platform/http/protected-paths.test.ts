import { describe, expect, it } from "vitest";
import { isProtectedPath, loginUrl } from "./protected-paths";

describe("áreas logadas", () => {
  it("[AUT-FR-011] painéis, pagamento do lojista e nova senha exigem login", () => {
    for (const path of [
      "/painel",
      "/painel/leads",
      "/rede",
      "/rede/extrato",
      "/indica",
      "/indica/resgate",
      "/admin",
      "/admin/lojas/1",
      "/lojistas/pagamento",
      "/lojistas/pagamento/pix",
      "/nova-senha",
    ]) {
      expect(isProtectedPath(path), path).toBe(true);
    }
  });

  it("páginas públicas e cadastros não exigem login", () => {
    for (const path of [
      "/",
      "/loja/silvautocar",
      "/v/123-fiat-500",
      "/lojistas",
      "/lojistas/cadastro",
      "/rede/cadastro",
      "/indica/cadastro",
      "/i/ABC123",
      "/entrar",
      "/recuperar",
      "/redes-sociais",
      "/administrativo",
    ]) {
      expect(isProtectedPath(path), path).toBe(false);
    }
  });

  it("[AUT-FR-011] o login guarda a página pedida, com a query", () => {
    expect(loginUrl("/painel/leads", "?status=novo")).toBe(
      "/entrar?next=%2Fpainel%2Fleads%3Fstatus%3Dnovo",
    );
    expect(loginUrl("/painel", "")).toBe("/entrar?next=%2Fpainel");
  });
});
