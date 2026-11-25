import type { Page } from "@playwright/test";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { audit, expect, heading, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const cards = (page: Page) => page.locator('[data-testid="catalog-list"] > li');
const robots = (page: Page) =>
  page.locator('meta[name="robots"]').first().getAttribute("content");
const count = (page: Page) => page.getByTestId("catalog-count");

/** Fiat na vitrine: 15 em Aracaju (loja de vitrine) e 2 em Recife. */
const FIAT = 17;
const FIAT_AUTOMATIC = 8;
const ARACAJU = S.total - 1;

test.describe("páginas de descoberta (390 px)", () => {
  test.setTimeout(120_000);

  test("[DSC-FR-001] [DSC-FR-006] [DSC-FR-007] marca: lista, contador, parágrafo e caminho", async ({
    page,
  }) => {
    await page.goto("/carros/fiat");

    await expect(heading(page)).toHaveText("Fiat usados à venda");
    await expect(count(page)).toHaveText(`${FIAT} anúncios de 2 lojas`);
    await expect(page.getByTestId("discovery-intro")).toContainText(
      `${FIAT} Fiat usados à venda em 2 cidades`,
    );
    const trail = page.getByRole("navigation", { name: "Caminho" });
    await expect(trail.getByRole("link", { name: "Carros" })).toHaveAttribute(
      "href",
      "/carros",
    );
    await expect(cards(page).first()).toContainText("Fiat");
    expect(await audit(page), "descoberta: marca").toEqual(CLEAN);
  });

  test("[DSC-FR-002] [DSC-FR-003] modelo, cidade e marca na cidade", async ({
    page,
  }) => {
    await page.goto("/carros/fiat/argo");
    await expect(heading(page)).toHaveText("Fiat Argo usados à venda");
    await expect(count(page)).toHaveText(`${FIAT} anúncios de 2 lojas`);

    await page.goto("/carros/recife-pe");
    await expect(heading(page)).toHaveText(
      "Carros usados à venda em Recife/PE",
    );
    await expect(cards(page)).toHaveCount(2);

    await page.goto("/carros/aracaju-se/bmw");
    await expect(heading(page)).toHaveText("BMW usados à venda em Aracaju/SE");
    await expect(cards(page).first()).toContainText("BMW");
  });

  test("[DSC-FR-004] carrega de 20 em 20 e filtra com a marca fixa", async ({
    page,
  }) => {
    await page.goto("/carros/aracaju-se");
    await expect(cards(page)).toHaveCount(20);
    await page.getByTestId("load-more").click();
    await expect(cards(page)).toHaveCount(40);
    await page.getByTestId("load-more").click();
    await expect(cards(page)).toHaveCount(ARACAJU);

    await page.goto("/carros/fiat");
    await page.getByTestId("filters-chip").click();
    const sheet = page.getByTestId("filters-sheet");
    await expect(sheet.getByRole("heading", { name: "Marca" })).toHaveCount(0);
    await sheet.getByText("Automático", { exact: true }).click();
    await expect(sheet.getByTestId("filters-apply")).toHaveText(
      `Ver ${FIAT_AUTOMATIC} veículos`,
    );
    await sheet.getByTestId("filters-apply").click();
    await expect(page).toHaveURL(/\/carros\/fiat\?cambio=automatico$/);
    await expect(cards(page)).toHaveCount(FIAT_AUTOMATIC);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/carros\/fiat$/,
    );
  });

  test("[DSC-FR-005] modelo que ficou sem veículos mostra alternativas e sai do Google", async ({
    page,
  }) => {
    await page.goto("/carros/fiat/uno");

    await expect(page.getByTestId("discovery-empty")).toContainText(
      "Nenhum Fiat Uno à venda agora",
    );
    await expect(cards(page).first()).toContainText("Fiat");
    expect(await robots(page)).toContain("noindex");
    expect(await audit(page), "descoberta: vazia").toEqual(CLEAN);
  });

  test("[DSC-FR-013] [DSG-FR-018] índice /carros no ar para o Google, sem link a partir da vitrine", async ({
    page,
  }) => {
    // A busca por marca e por cidade é filtro da própria vitrine (DSG-FR-018).
    await page.goto("/veiculos");
    await expect(
      page.getByRole("link", { name: "Buscar por marca" }),
    ).toHaveCount(0);

    await page.goto("/carros#cidades");
    const cities = page.locator("#cidades");
    await expect(
      cities.getByRole("link", { name: /Recife\/PE/ }),
    ).toBeVisible();
    await expect(
      cities.getByRole("link", { name: /Aracaju\/SE/ }),
    ).toContainText(String(ARACAJU));
    await expect(
      page.locator("#marcas").getByRole("link", { name: /Fiat/ }),
    ).toContainText(String(FIAT));
    expect(await audit(page), "/carros").toEqual(CLEAN);
  });

  test("[DSC-FR-008] [DSC-FR-009] veículo e catálogo levam às páginas de descoberta", async ({
    page,
  }) => {
    await page.goto(`/v/${S.fullId}`);
    const related = page.getByRole("navigation", { name: "Veja também" });
    await expect(related.getByRole("link")).toHaveText([
      "Fiat usados",
      "Fiat Argo usados",
      "Carros usados em Aracaju/SE",
    ]);
    await related.getByRole("link", { name: "Fiat Argo usados" }).click();
    await expect(page).toHaveURL(/\/carros\/fiat\/argo$/);

    await page.goto(`/loja/${S.slug}`);
    await page
      .getByRole("link", { name: "Carros usados em Aracaju/SE" })
      .click();
    await expect(page).toHaveURL(/\/carros\/aracaju-se$/);
  });

  test("[DSC-SEC-004] endereço que nunca existiu é 404", async ({
    request,
  }) => {
    for (const path of [
      "/carros/marca-que-nao-existe",
      "/carros/fiat/xyz",
      "/carros/natal-rn",
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(404);
    }
  });
});

test.describe("descoberta sem JavaScript", () => {
  test("[DSC-NFR-002] [DSC-FR-006] [DSC-FR-007] HTML completo, com SEO e sem placa", async ({
    request,
  }) => {
    const html = await (await request.get("/carros/fiat/argo")).text();

    expect(html).toContain("<title>Fiat Argo usados à venda | CajuGo</title>");
    expect(html).toMatch(/rel="canonical" href="[^"]*\/carros\/fiat\/argo"/);
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain("Fiat Argo usados à venda em 2 cidades");
    expect(html).not.toContain(S.plate);
    expect(html).not.toContain(S.chassis);

    // Prévia do link com foto também no índice e na página vazia (SEO.md §6)
    for (const path of ["/carros/fiat/argo", "/carros", "/carros/fiat/uno"]) {
      const body = await (await request.get(path)).text();
      expect(body, path).toMatch(/property="og:image" content="https:\/\//);
    }
    expect(await (await request.get("/carros/fiat/uno")).text()).toContain(
      'name="description" content="Nenhum Fiat Uno à venda agora.',
    );
  });

  test("[DSC-FR-010] [DSC-SEC-003] sitemap de descoberta e robots.txt", async ({
    request,
  }) => {
    const xml = await (await request.get("/sitemap/discovery.xml")).text();
    for (const path of [
      "/carros</loc>",
      "/carros/fiat</loc>",
      "/carros/fiat/argo</loc>",
      "/carros/recife-pe</loc>",
      "/carros/recife-pe/fiat</loc>",
    ])
      expect(xml).toContain(path);
    expect(xml).not.toContain("/carros/fiat/uno<");
    expect(xml).not.toContain(S.plate);
    expect(await (await request.get("/robots.txt")).text()).toContain(
      "/sitemap/discovery.xml",
    );
  });
});

test.describe("descoberta no desktop [15a] (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[DSC-NFR-001] filtros laterais sem marca na página da marca", async ({
    page,
  }) => {
    await page.goto("/carros/fiat");

    const side = page.getByTestId("filters-side");
    await expect(side).toBeVisible();
    await expect(side.getByRole("heading", { name: "Marca" })).toHaveCount(0);
    await expect(side.getByRole("heading", { name: "Câmbio" })).toBeVisible();
    expect(await audit(page), "descoberta: desktop").toEqual(CLEAN);

    await page.goto("/carros/recife-pe");
    await expect(
      page.getByTestId("filters-side").getByRole("heading", { name: "Marca" }),
    ).toBeVisible();
  });
});
