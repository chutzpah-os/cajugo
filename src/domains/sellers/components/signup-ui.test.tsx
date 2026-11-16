import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SellerSignupForm } from "./seller-signup-form";

vi.mock("../actions", () => ({ registerSellerAction: vi.fn() }));

describe("cadastro do vendedor [7a]", () => {
  it("[SEL-FR-001] visitante preenche conta, CPF, cidade, Pix, senha e termos, com honeypot", () => {
    // Act
    const html = renderToStaticMarkup(<SellerSignupForm signedIn={false} />);

    // Assert
    for (const label of [
      "Nome completo",
      "E-mail",
      "Celular",
      "CPF",
      "Cidade",
      "Tipo da chave Pix",
      "Chave Pix",
      "Senha",
    ])
      expect(html).toContain(`>${label}</label>`);
    expect(html).toContain('name="terms"');
    expect(html).toContain('name="website"');
  });

  it("[SEL-FR-016] conectado, só CPF, cidade e Pix: sem nome, e-mail nem senha", () => {
    // Act
    const html = renderToStaticMarkup(<SellerSignupForm signedIn />);

    // Assert
    expect(html).toContain(">CPF</label>");
    expect(html).not.toContain(">Senha</label>");
    expect(html).not.toContain(">E-mail</label>");
  });
});
