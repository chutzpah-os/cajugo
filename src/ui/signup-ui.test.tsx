import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AutocompleteField } from "./autocomplete-field";
import { AvailabilityHint } from "./availability-hint";
import { Drawer } from "./drawer";
import { ImageField } from "./image-field";

const noop = () => {};

describe("componentes do cadastro e de Minha loja", () => {
  it("[STO-NFR-002] campo com sugestões é um combobox com rótulo e lista ligada", () => {
    const html = renderToStaticMarkup(
      <AutocompleteField
        id="city"
        label="Cidade"
        value="Ara"
        suggestions={[{ value: "Aracaju|SE", label: "Aracaju/SE" }]}
        onQuery={noop}
        onSelect={noop}
      />,
    );
    expect(html).toMatch(/<label[^>]*for="city"/);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-controls="city-list"');
    expect(html).toContain('role="option"');
  });

  it("[STO-FR-005] disponibilidade é anunciada ao leitor de tela", () => {
    expect(
      renderToStaticMarkup(<AvailabilityHint id="s" status="available" />),
    ).toMatch(/role="status".*Disponível/);
    expect(
      renderToStaticMarkup(<AvailabilityHint id="s" status="taken" />),
    ).toContain("Indisponível");
  });

  it("[STO-NFR-002] campo de imagem: só formatos de imagem, com rótulo e botão", () => {
    const html = renderToStaticMarkup(
      <ImageField
        id="logo"
        label="Logo"
        imageUrl={null}
        maxBytes={15 * 1024 * 1024}
        onFile={noop}
      />,
    );
    expect(html).toContain(
      'accept="image/jpeg,image/png,image/webp,image/heic,.heic"',
    );
    expect(html).toContain('aria-labelledby="logo-label"');
    expect(html).toContain("Enviar logo");
  });

  it("[STO-NFR-002] gaveta é um diálogo com nome e botão de fechar", () => {
    const html = renderToStaticMarkup(
      <Drawer label="Menu" triggerLabel="Abrir menu">
        <p>Itens</p>
      </Drawer>,
    );
    expect(html).toMatch(/<dialog[^>]*aria-label="Menu"/);
    expect(html).toContain("Fechar");
    expect(html).toMatch(/aria-haspopup="dialog"[^>]*>Abrir menu/);
  });
});
