import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmSheet } from "./confirm-sheet";
import { SelectField } from "./select-field";
import { TextAreaField } from "./textarea-field";

describe("componentes de veículos", () => {
  it("[VEH-NFR-001] SelectField tem rótulo ligado, opções e erro apontado", () => {
    const html = renderToStaticMarkup(
      <SelectField
        id="fuel"
        label="Combustível"
        options={[
          ["flex", "Flex"],
          ["diesel", "Diesel"],
        ]}
        placeholder="Escolha"
        error="Escolha o combustível."
      />,
    );

    expect(html).toContain('<label for="fuel"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="fuel-error"');
    expect(html).toContain(">Flex</option>");
    expect(html).toContain("Escolha o combustível.");
  });

  it("[VEH-FR-006] TextAreaField mostra o contador e limita o tamanho", () => {
    const html = renderToStaticMarkup(
      <TextAreaField
        id="description"
        label="Descrição"
        max={2000}
        value="Revisado."
        readOnly
      />,
    );

    expect(html).toContain('maxLength="2000"');
    expect(html).toContain("9/2000");
    expect(html).toContain('<label for="description"');
  });

  it("[VEH-NFR-001] ConfirmSheet é um diálogo com título, efeito e os dois botões", () => {
    const html = renderToStaticMarkup(
      <ConfirmSheet
        open
        title="Marcar como vendido?"
        confirmLabel="Marcar como vendido"
        onConfirm={() => {}}
        onClose={() => {}}
      >
        Sai do catálogo e da vitrine na hora.
      </ConfirmSheet>,
    );

    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="confirm-title"');
    expect(html).toContain("Marcar como vendido?");
    expect(html).toContain("Sai do catálogo e da vitrine na hora.");
    expect(html).toContain(">Voltar</button>");
  });

  it("[DSG-FR-011] [6f]: alça, ícone de 48 px na cor do tipo e confirmar em cima, contorno embaixo", () => {
    const sold = renderToStaticMarkup(
      <ConfirmSheet
        open={false}
        kind="sold"
        title="Marcar BMW 420i como vendido?"
        confirmLabel="Marcar como vendido"
        onConfirm={() => {}}
        onClose={() => {}}
      >
        O veículo sai do seu catálogo.
      </ConfirmSheet>,
    );
    const cancel = renderToStaticMarkup(
      <ConfirmSheet
        open={false}
        kind="cancel"
        confirmVariant="danger"
        cancelLabel="Manter assinatura"
        title="Cancelar assinatura?"
        confirmLabel="Cancelar assinatura"
        onConfirm={() => {}}
        onClose={() => {}}
      >
        Não há multa.
      </ConfirmSheet>,
    );

    expect(sold).toContain("bg-ok-soft");
    expect(sold).toContain("size-12");
    expect(sold).toContain("w-10 rounded-full bg-field");
    expect(sold.indexOf("Marcar como vendido")).toBeLessThan(
      sold.indexOf(">Voltar<"),
    );
    expect(cancel).toContain("bg-caju-soft");
    expect(cancel).toContain("bg-caju-deep");
    expect(cancel).toContain(">Manter assinatura<");
  });
});
