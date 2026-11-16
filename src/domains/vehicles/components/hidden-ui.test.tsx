import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { VehicleCard as Card, VehicleSummary } from "../service";
import { VehicleActions } from "./vehicle-actions";
import { VehicleCard } from "./vehicle-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("../actions", () => ({}));

const MARK = { reason: "unreal_price" as const, note: null };

const CARD: Card = {
  vehicleId: "v1",
  name: "ARGO DRIVE 1.0",
  status: "hidden",
  statusLabel: "Oculto",
  yearModel: 2022,
  mileageKm: 12000,
  priceCents: 6500000,
  coverPublicId: null,
  shareOnCajugo: true,
  shareCaption: "Oculto da vitrine pela CajuGo",
  canShare: false,
  canSell: true,
  moderation: MARK,
};

const SUMMARY: VehicleSummary = {
  vehicleId: "v1",
  name: "ARGO DRIVE 1.0",
  status: "hidden",
  statusLabel: "Oculto",
  yearModel: 2022,
  mileageKm: 12000,
  priceCents: 6500000,
  coverPublicId: null,
  shareOnCajugo: true,
  shareCaption: "Oculto da vitrine pela CajuGo",
  daysOnAir: null,
  canUndoSale: false,
  canSell: true,
  moderation: MARK,
};

describe("veículo oculto no painel", () => {
  it("[RPT-FR-006] [1c] selo Oculto e o motivo, sem Divulgar; Vendido continua", () => {
    // Act
    const html = renderToStaticMarkup(
      <VehicleCard v={CARD} cloudName="demo" />,
    );

    // Assert
    expect(html).toContain("Oculto");
    expect(html).toContain("Preço não real");
    expect(html).not.toContain("Divulgar na CajuGo");
    expect(html).toContain("Vendido");
    expect(html).not.toContain("Editar");
  });

  it("[RPT-FR-009] [6e] vende, despublica e exclui; sem Divulgar na CajuGo", () => {
    // Act
    const html = renderToStaticMarkup(<VehicleActions v={SUMMARY} />);

    // Assert
    expect(html).toContain("Marcar como vendido");
    expect(html).toContain("Despublicar");
    expect(html).toContain("Excluir veículo");
    expect(html).not.toContain("Divulgar na CajuGo");
  });

  it("[RPT-SEC-001] o painel não mostra nada das denúncias", () => {
    // Act
    const html =
      renderToStaticMarkup(<VehicleCard v={CARD} cloudName="demo" />) +
      renderToStaticMarkup(<VehicleActions v={SUMMARY} />);

    // Assert
    expect(html).not.toMatch(/denúncia/i);
  });
});
