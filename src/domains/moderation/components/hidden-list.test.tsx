import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HiddenList } from "./hidden-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({ showVehicleAction: vi.fn() }));

describe("aba Ocultados [14e]", () => {
  it("[RPT-FR-008] mostra o anúncio, o motivo, quando foi ocultado e Mostrar de novo", () => {
    // Act
    const html = renderToStaticMarkup(
      <HiddenList
        cloudName="demo"
        cards={[
          {
            vehicle: {
              id: "v1",
              title: "Fiat Argo",
              priceCents: 6500000,
              storeName: "Silva Autos",
              path: "/v/v1-fiat-argo",
              coverPublicId: null,
            },
            reason: "Preço não real",
            hiddenAt: new Date("2026-11-16T15:00:00Z"),
          },
        ]}
      />,
    );

    // Assert
    expect(html).toContain("Fiat Argo");
    expect(html).toContain("Preço não real");
    expect(html).toContain("16/11/2026");
    expect(html).toContain("Mostrar de novo");
  });
});
