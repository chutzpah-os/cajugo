import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadMoreButton, mergePage } from "./load-more";

const id = (x: { id: number }) => String(x.id);

describe("Carregar mais", () => {
  it("[SHW-FR-007] junta a página nova sem repetir o que já está na lista", () => {
    // Act
    const list = mergePage([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }], id);

    // Assert
    expect(list.map(id)).toEqual(["1", "2", "3"]);
  });

  it("[SHW-FR-007] mostra o texto do botão", () => {
    expect(
      renderToStaticMarkup(
        <LoadMoreButton busy={false} failed={false} onClick={() => {}} />,
      ),
    ).toContain("Carregar mais veículos");
  });

  it("[SHW-FR-012] erro avisa e oferece Tentar de novo, sem sair da tela", () => {
    // Act
    const html = renderToStaticMarkup(
      <LoadMoreButton busy={false} failed onClick={() => {}} />,
    );

    // Assert
    expect(html).toContain('role="alert"');
    expect(html).toContain("Tentar de novo");
  });
});
