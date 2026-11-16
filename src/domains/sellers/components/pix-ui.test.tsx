import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PixKeyForm } from "./pix-key-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({ updatePixKeyAction: vi.fn() }));

describe("chave Pix na conta [13c]", () => {
  it("[SEL-FR-014] mostra a chave atual e o botão Trocar", () => {
    // Act
    const html = renderToStaticMarkup(
      <PixKeyForm current={{ type: "email", key: "ana@exemplo.com" }} />,
    );

    // Assert
    expect(html).toContain("ana@exemplo.com");
    expect(html).toContain("Trocar");
  });
});
