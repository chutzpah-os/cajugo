import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReportCard } from "../service";
import { ReportQueue } from "./report-queue";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({ keepReportsAction: vi.fn() }));

const CARD: ReportCard = {
  vehicle: {
    id: "v1",
    title: "Fiat Argo",
    priceCents: 6500000,
    storeName: "Silva Autos",
    path: "/v/v1-fiat-argo",
    coverPublicId: "cover",
  },
  open: 2,
  byReason: [
    { reason: "unreal_price", count: 1 },
    { reason: "scam", count: 1 },
  ],
  details: ["Metade da FIPE"],
  firstAt: new Date("2026-11-15T10:00:00Z"),
  lastAt: new Date("2026-11-15T11:00:00Z"),
};

describe("fila [14e]", () => {
  it("[RPT-FR-002] card com foto, veículo, loja, preço, link, contagens e descrições", () => {
    // Act
    const html = renderToStaticMarkup(
      <ReportQueue cards={[CARD]} cloudName="demo" />,
    );

    // Assert
    expect(html).toContain('href="/v/v1-fiat-argo"');
    expect(html).toContain("Silva Autos");
    expect(html).toContain("R$");
    expect(html).toContain("2 denúncias");
    expect(html).toContain("Preço não real 1");
    expect(html).toContain("Suspeita de golpe 1");
    expect(html).toContain("Metade da FIPE");
    expect(html).toContain("Manter");
  });

  it("[RPT-FR-003] uma denúncia no singular; fila vazia avisa", () => {
    // Act
    const one = renderToStaticMarkup(
      <ReportQueue cards={[{ ...CARD, open: 1 }]} cloudName="demo" />,
    );
    const none = renderToStaticMarkup(
      <ReportQueue cards={[]} cloudName="demo" />,
    );

    // Assert
    expect(one).toContain("1 denúncia<");
    expect(none).toContain("Nenhuma denúncia aberta");
  });
});
