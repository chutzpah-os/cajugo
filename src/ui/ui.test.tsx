import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { Chip } from "./chip";
import { cn } from "./cn";
import { TextField } from "./text-field";
import { Toggle } from "./toggle";
import { YesNo } from "./yes-no";

describe("componentes base", () => {
  it("cn ignora valores falsos", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("Toggle é um switch nativo ligado ao título", () => {
    // Act
    const html = renderToStaticMarkup(
      <Toggle
        title="Divulgar na CajuGo"
        caption="Visível na vitrine CajuGo"
        defaultChecked
      />,
    );

    // Assert
    expect(html).toContain('role="switch"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toMatch(/<label[^>]*>.*Divulgar na CajuGo.*<input/);
  });

  it("TextField com erro marca aria-invalid e aponta para a mensagem", () => {
    // Act
    const html = renderToStaticMarkup(
      <TextField
        id="slug"
        label="Endereço do catálogo"
        prefix="cajugo.com.br/"
        error="Indisponível"
      />,
    );

    // Assert
    expect(html).toContain('for="slug"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="slug-error"');
    expect(html).toContain('id="slug-error"');
    expect(html).toContain("cajugo.com.br/");
  });

  it("TextField sem erro aponta para a ajuda", () => {
    const html = renderToStaticMarkup(
      <TextField id="placa" label="Placa" help="Só o final é exibido." />,
    );
    expect(html).toContain('aria-describedby="placa-help"');
    expect(html).not.toContain("aria-invalid");
  });

  it("Chip ativo informa aria-pressed e mostra a contagem", () => {
    const html = renderToStaticMarkup(
      <Chip active count={4}>
        Todos
      </Chip>,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain(">4<");
  });

  it("YesNo é um radiogroup que envia true/false", () => {
    const html = renderToStaticMarkup(
      <YesNo name="acceptsTrade" label="Aceita troca" defaultValue />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('value="true"');
    expect(html).toContain('value="false"');
  });

  it("Badge mostra o texto do status", () => {
    expect(renderToStaticMarkup(<Badge tone="ok">Publicado</Badge>)).toContain(
      "Publicado",
    );
  });
});
