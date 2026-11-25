import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { brl } from "@/platform/br/money";
import type { VehiclePage } from "../service";
import { VehicleDetails, VehicleSold } from "./vehicle-details";

type Live = Extract<VehiclePage, { kind: "vehicle" }>;

const PAGE: Live = {
  kind: "vehicle",
  vehicleId: "v1",
  path: "/v/v1-fiat-argo-2022-aracaju-se",
  shared: true,
  indexable: true,
  make: "Fiat",
  model: "Argo",
  version: "Drive 1.0",
  yearManufacture: 2021,
  yearModel: 2022,
  mileageKm: 12000,
  priceCents: 6500000,
  transmission: "Manual",
  fuel: "Flex",
  body: "Hatch",
  color: "Branco",
  doors: 4,
  engine: "1.0",
  plateEnd: "3",
  description: "Carro de garagem.",
  photos: ["a", "b"],
  badges: ["Abaixo da FIPE", "Único dono"],
  conditions: ["Único dono", "IPVA pago"],
  features: ["Ar-condicionado"],
  whatsappUrl: "https://wa.me/5579999990000?text=oi",
  makeSlug: "fiat",
  modelSlug: "argo",
  store: {
    name: "Silva Autos",
    slug: "silva-autos",
    city: "Aracaju",
    state: "SE",
    citySlug: "aracaju-se",
    initials: "SA",
    logoPublicId: null,
  },
};

const render = (page: Live = PAGE) =>
  renderToStaticMarkup(<VehicleDetails page={page} cloudName="demo" />);

describe("página do veículo [1b]", () => {
  it("[SHW-FR-008] mostra galeria com contador, selos, preço, ficha e itens", () => {
    // Act
    const html = render();

    // Assert
    expect(html).toContain('data-testid="gallery-counter"');
    expect(html).toContain("1/2");
    expect(html).toContain("Abaixo da FIPE");
    expect(html).toContain("Único dono");
    expect(html).toContain(brl(6500000));
    expect(html).toContain("Final de placa");
    expect(html).toContain("IPVA pago");
    expect(html).toContain("Carro de garagem.");
    expect(html).toContain("Ar-condicionado");
  });

  it("[SHW-FR-008] barra do WhatsApp abre a conversa do anúncio e o card leva ao estoque", () => {
    // Act
    const html = render();

    // Assert
    expect(html).toContain(`href="${PAGE.whatsappUrl}"`);
    expect(html).toContain('href="/loja/silva-autos"');
    expect(html).toContain("Ver estoque da loja");
  });

  it("[PRC-FR-003] nenhuma parcela estimada nem simulador na página", () => {
    const html = render();
    expect(html).not.toContain("/mês");
    expect(html).not.toContain('id="simulador"');
  });

  it("[BUY-FR-004] coração na galeria, ao lado de compartilhar, desmarcado no servidor", () => {
    const html = render();
    expect(html).toContain('aria-label="Favoritar Fiat Argo 2022"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("[SHW-FR-009] compartilhar existe sem código de vendedor no link", () => {
    // Act
    const html = render();

    // Assert
    expect(html).toContain("Compartilhar");
    expect(html).not.toContain("?ref=");
  });

  it("[SHW-FR-013] a foto principal é prioritária e as demais são preguiçosas", () => {
    // Act
    const html = render();

    // Assert
    expect(html).toMatch(/fetchPriority="high"/i);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="Fiat Argo 2022 Branco');
  });

  it("[LED-FR-001] [LED-SEC-004] formulário de mensagem à loja com texto padrão, limite e privacidade", () => {
    // Act
    const html = render();

    // Assert
    expect(html).toContain('aria-label="Envie uma mensagem à loja"');
    expect(html).toContain(
      "Olá, tenho interesse no veículo. Por favor entre em contato.",
    );
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain('href="/termos#privacidade"');
    expect(html).toContain('name="website"');
  });

  it("[RPT-FR-001] [RPT-NFR-002] Denunciar anúncio abre [14d] pelo HTML, com os 4 motivos, descrição e honeypot", () => {
    // Act
    const html = render();

    // Assert
    expect(html).toContain('data-testid="report-open"');
    expect(html).toMatch(/commandfor="denunciar"[^>]*command="show-modal"/);
    expect(html).toContain('<dialog id="denunciar"');
    for (const r of [
      "Já vendido",
      "Preço não real",
      "Fotos de outro carro",
      "Suspeita de golpe",
    ])
      expect(html).toContain(r);
    expect(html).not.toContain("Outro");
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain('name="website"');
  });

  it("[SHW-FR-010] vendido avisa e mostra parecidos", () => {
    // Act
    const html = renderToStaticMarkup(
      <VehicleSold similar={[]} cloudName="demo" />,
    );

    // Assert
    expect(html).toContain("Este veículo já foi vendido");
  });
});
