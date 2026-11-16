import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ cancelSearchAlertAction: vi.fn() }));
vi.mock("../actions", () => actions);
const { CancelAlert } = await import("./cancel-alert");

describe("cancelar o aviso pelo link", () => {
  it("[ALR-FR-004] abrir o link só mostra a confirmação; nada é cancelado sem o toque", () => {
    const html = renderToStaticMarkup(<CancelAlert token="abc.def" />);
    expect(html).toContain("Cancelar aviso");
    expect(html).toContain("seu nome e celular são");
    expect(actions.cancelSearchAlertAction).not.toHaveBeenCalled();
  });
});
