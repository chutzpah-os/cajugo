import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";

const LCP_LIMIT_MS = 2500;
const CLS_LIMIT = 0.1;
/** 4G do Lighthouse móvel: 1,6 Mbps, 150 ms de latência. */
const MOBILE_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

async function vitals(page: Page, path: string) {
  await page.addInitScript(() => {
    const w = window as unknown as { lcp: number; cls: number };
    w.lcp = 0;
    w.cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[])
        if (!e.hadRecentInput) w.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", MOBILE_4G);
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const w = window as unknown as { lcp: number; cls: number };
    return { lcp: w.lcp, cls: w.cls };
  });
}

test.describe("build de produção · vitrine", () => {
  test("[SHW-FR-014] endereço desatualizado de veículo e endereço antigo respondem 308", async ({
    request,
  }) => {
    const stale = await request.get(`/v/${S.fullId}-texto-antigo`, {
      maxRedirects: 0,
    });
    expect(stale.status()).toBe(308);
    expect(stale.headers().location).toContain(`/v/${S.fullId}-fiat-argo`);

    const nested = await request.get(`/loja/${S.slug}/v/${S.fullId}`, {
      maxRedirects: 0,
    });
    expect(nested.status()).toBe(308);
    expect(nested.headers().location).toContain(`/v/${S.fullId}-fiat-argo`);
  });

  test("[SHW-NFR-002] vitrine filtrada vem no HTML; vendido e suspensa respondem 200", async ({
    request,
  }) => {
    // A reescrita para /vitrine passa de novo pelo proxy no build de produção: sem laço.
    const filtered = await request.get("/?marca=bmw", { maxRedirects: 0 });
    expect(filtered.status()).toBe(200);
    expect(await filtered.text()).toContain("X1");

    const sold = await request.get(`/v/${S.soldId}`);
    expect(sold.status()).toBe(200);
    expect(await sold.text()).toContain("noindex");

    const suspended = await request.get(`/loja/${S.suspendedSlug}`);
    expect(suspended.status()).toBe(200);
    expect(await suspended.text()).toContain(
      "Catálogo temporariamente indisponível",
    );
  });

  for (const [id, name, path] of [
    ["SHW-NFR-003", "vitrine", "/"],
    ["SHW-NFR-003", "catálogo", `/loja/${S.slug}`],
    ["SHW-NFR-003", "veículo", `/v/${S.fullId}`],
    ["DSC-NFR-003", "descoberta", "/carros/fiat"],
  ])
    test(`[${id}] ${name}: LCP e CLS em 4G dentro do limite`, async ({
      page,
      request,
    }) => {
      // Cache já preenchido: é o caso comum e o que o limite mede.
      await request.get(path);
      const { lcp, cls } = await vitals(page, path);
      console.log(`${name}: LCP ${Math.round(lcp)} ms · CLS ${cls.toFixed(3)}`);

      expect(lcp).toBeGreaterThan(0);
      expect(lcp).toBeLessThan(LCP_LIMIT_MS);
      expect(cls).toBeLessThan(CLS_LIMIT);
    });

  test("[DSC-SEC-004] descoberta: 404 real para o que nunca existiu; página vazia responde", async ({
    request,
  }) => {
    expect((await request.get("/carros/marca-que-nao-existe")).status()).toBe(
      404,
    );
    expect((await request.get("/carros/fiat/uno")).status()).toBe(200);
    expect((await request.get("/carros")).status()).toBe(200);
  });

  test("[SHW-NFR-002] nenhuma rota pública gera erro de pré-renderização", () => {
    expect(readFileSync(".next/production-server.log", "utf8")).not.toContain(
      "during prerendering",
    );
  });
});
