import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ whatsappClickAction: vi.fn() }));
const { WhatsappButton, onWhatsappTap } = await import("./whatsapp-button");

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}
const VEHICLE = {
  vehicleId: "0192f1e0-0000-7000-8000-00000000000a",
  storeSlug: "silva-autos",
  shared: true,
};

describe("botão WhatsApp", () => {
  it("[LED-FR-003] abre a conversa num link comum, em outra aba", () => {
    // Act
    const html = renderToStaticMarkup(
      <WhatsappButton href="https://wa.me/5579999990000?text=oi" lead={VEHICLE}>
        WhatsApp
      </WhatsappButton>,
    );

    // Assert
    expect(html).toContain('href="https://wa.me/5579999990000?text=oi"');
    expect(html).toContain('target="_blank"');
  });

  it("[LED-FR-013] registra o lead no 1º toque e não nos seguintes em 24 h", () => {
    // Arrange
    const send = vi.fn(async () => {});
    const deps = {
      local: memory(),
      session: memory(),
      now: () => new Date("2026-11-16T10:00:00Z"),
      send,
    };

    // Act
    onWhatsappTap(VEHICLE, deps);
    onWhatsappTap(VEHICLE, deps);

    // Assert
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({
      vehicleId: VEHICLE.vehicleId,
      origin: "cajugo",
    });
  });

  it("[LED-FR-003] falha no registro não interrompe a conversa", async () => {
    // Arrange
    const send = vi.fn(async () => {
      throw new Error("sem rede");
    });

    // Act / Assert
    expect(() =>
      onWhatsappTap(VEHICLE, {
        local: memory(),
        session: memory(),
        now: () => new Date(),
        send,
      }),
    ).not.toThrow();
    await Promise.resolve();
  });
});
