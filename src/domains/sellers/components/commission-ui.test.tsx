import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommissionForm } from "./commission-form";
import { VehicleOverrides } from "./vehicle-overrides";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({
  setNetworkRulesAction: vi.fn(),
  setCommissionOverrideAction: vi.fn(),
}));

describe("Configurar comissão [7e]", () => {
  it("[RCL-FR-001] [RCL-FR-002] toggle, comissão padrão e a prévia com a taxa CajuGo", () => {
    // Act
    const html = renderToStaticMarkup(
      <CommissionForm
        acceptsSellers
        commission={{ type: "pct", value: 200 }}
        feeBps={100}
      />,
    );

    // Assert
    expect(html).toContain("Aceitar vendedores independentes");
    expect(html).toContain('value="2"');
    expect(html).toContain("Comissão do vendedor: R$ 1.200,00");
    expect(html).toContain("Taxa CajuGo (1%): R$ 600,00");
    expect(html).toContain("Até 10%.");
  });

  it("[RCL-FR-003] lista os ajustes com Remover e permite adicionar", () => {
    // Act
    const html = renderToStaticMarkup(
      <VehicleOverrides
        overrides={[
          { vehicleId: "a", title: "Fiat ARGO", type: "fixed", value: 150_000 },
        ]}
        vehicles={[{ vehicleId: "a", title: "Fiat ARGO · DRIVE" }]}
      />,
    );

    // Assert
    expect(html).toContain("Fiat ARGO · <strong>R$ 1.500,00</strong>");
    expect(html).toContain("Remover");
    expect(html).toContain("Adicionar ajuste");
  });
});
