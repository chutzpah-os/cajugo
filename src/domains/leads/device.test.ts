import { describe, expect, it } from "vitest";
import {
  claimView,
  claimWhatsappLead,
  leadOrigin,
  markCatalogVisit,
} from "./device";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}
const broken = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
};

const A = "0192f1e0-0000-7000-8000-00000000000a";
const B = "0192f1e0-0000-7000-8000-00000000000b";
const at = (iso: string) => new Date(iso);

describe("marcas no aparelho", () => {
  it("[LED-FR-013] um lead de WhatsApp por veículo a cada 24 horas", () => {
    // Arrange
    const store = memory();

    // Act / Assert
    expect(claimWhatsappLead(store, A, at("2026-11-16T10:00:00Z"))).toBe(true);
    expect(claimWhatsappLead(store, A, at("2026-11-16T11:00:00Z"))).toBe(false);
    expect(claimWhatsappLead(store, B, at("2026-11-16T11:00:00Z"))).toBe(true);
    expect(claimWhatsappLead(store, A, at("2026-11-17T11:00:00Z"))).toBe(true);
  });

  it("[LED-FR-015] uma visualização por veículo por dia de São Paulo", () => {
    // Arrange
    const store = memory();

    // Act / Assert: 23h de São Paulo e 1h do dia seguinte são dias diferentes
    expect(claimView(store, A, at("2026-11-16T12:00:00Z"))).toBe(true);
    expect(claimView(store, A, at("2026-11-17T02:00:00Z"))).toBe(false);
    expect(claimView(store, A, at("2026-11-17T04:00:00Z"))).toBe(true);
    expect(claimView(store, B, at("2026-11-17T04:00:00Z"))).toBe(true);
  });

  it("[LED-FR-004] Seu catálogo quando o catálogo da loja foi aberto na aba ou o veículo não é divulgado", () => {
    // Arrange
    const tab = memory();
    const store = "0192f1e0-0000-7000-8000-000000000001";
    const other = "0192f1e0-0000-7000-8000-000000000002";

    // Act / Assert
    expect(leadOrigin(tab, store, true)).toBe("cajugo");
    expect(leadOrigin(tab, store, false)).toBe("store_catalog");
    markCatalogVisit(tab, store);
    expect(leadOrigin(tab, store, true)).toBe("store_catalog");
    expect(leadOrigin(tab, other, true)).toBe("cajugo");
  });

  it("[LED-FR-013] sem armazenamento no navegador, registra e segue (o limite por IP segura)", () => {
    // Arrange / Act / Assert
    expect(claimWhatsappLead(broken, A, at("2026-11-16T10:00:00Z"))).toBe(true);
    expect(claimView(broken, A, at("2026-11-16T10:00:00Z"))).toBe(true);
    expect(leadOrigin(broken, A, true)).toBe("cajugo");
    expect(() => markCatalogVisit(broken, A)).not.toThrow();
  });
});
