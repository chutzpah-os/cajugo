import { describe, expect, it } from "vitest";
import { whatsappLink } from "./link";

describe("whatsappLink", () => {
  it("[AUT-FR-013] abre a conversa com a mensagem pronta", () => {
    expect(whatsappLink("557999990000", "Olá! Preciso de ajuda.")).toBe(
      "https://wa.me/557999990000?text=Ol%C3%A1!%20Preciso%20de%20ajuda.",
    );
  });

  it("[AUT-FR-013] aceita número com máscara e sem mensagem", () => {
    expect(whatsappLink("+55 (79) 9999-0000")).toBe(
      "https://wa.me/557999990000",
    );
  });

  it("[AUT-FR-013] sem número válido, falha em vez de gerar link quebrado", () => {
    expect(() => whatsappLink("")).toThrow(/WhatsApp/);
  });
});
