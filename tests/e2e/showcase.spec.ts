import type { Page } from "@playwright/test";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { audit, expect, heading, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const CATALOG = `/loja/${S.slug}`;
const cards = (page: Page) => page.locator('[data-testid="catalog-list"] > li');
const robots = (page: Page) =>
  page.locator('meta[name="robots"]').first().getAttribute("content");

test.describe("vitrine e catálogo (390 px)", () => {
  test.setTimeout(120_000);

  test("[SHW-FR-001] [SHW-FR-003] vitrine mostra contador, cards e quem anuncia", async ({
    page,
  }) => {
    await page.goto("/veiculos");

    await expect(heading(page)).toHaveText("Veículos novos e usados à venda");
    await expect(page.getByTestId("catalog-count")).toHaveText(
      /\d+ anúncios de \d+ lojas?/,
    );
    await expect(cards(page).first()).toContainText(S.storeName);
    expect(await audit(page), "[1a] vitrine").toEqual(CLEAN);
  });

  test("[SHW-FR-002] [SHW-SEC-002] catálogo lista os publicados da loja, divulgados ou não", async ({
    page,
  }) => {
    await page.goto(CATALOG);

    await expect(heading(page)).toHaveText(`Estoque ${S.storeName}`);
    await expect(page.getByTestId("catalog-count")).toHaveText(
      `${S.total} veículos disponíveis`,
    );
    expect(await audit(page), "[1a] catálogo").toEqual(CLEAN);

    await page.goto("/veiculos?q=c3+v44");
    await expect(page.getByTestId("no-results")).toBeVisible();
    await page.goto(`${CATALOG}?q=c3+v44`);
    await expect(cards(page)).toHaveCount(1);
  });

  test("[SHW-FR-005] filtros contam ao vivo, ficam no endereço e reabrem igual", async ({
    page,
    browser,
  }) => {
    await page.goto(CATALOG);
    await page.getByTestId("filters-chip").click();
    const sheet = page.getByTestId("filters-sheet");
    await expect(sheet).toBeVisible();
    expect(await audit(page), "[6d]").toEqual(CLEAN);

    // Filtros em checkbox, com tipo e subtipo (DSG-FR-018).
    await sheet.getByText("BMW", { exact: true }).click();
    await sheet.getByText("Automático", { exact: true }).click();
    const apply = sheet.getByTestId("filters-apply");
    await expect(apply).toHaveText(`Ver ${S.bmwAutomatic} veículos`);
    await apply.click();

    await expect(page).toHaveURL(/\?marca=bmw&cambio=automatico$/);
    await expect(cards(page)).toHaveCount(S.bmwAutomatic);
    await expect(page.getByTestId("filters-chip")).toContainText("2");

    const other = await browser.newPage({
      baseURL: new URL(page.url()).origin,
    });
    await other.goto(new URL(page.url()).pathname + new URL(page.url()).search);
    await expect(cards(other)).toHaveCount(S.bmwAutomatic);
    await other.close();
  });

  test("[SHW-FR-005] Limpar zera a folha e a vitrine aceita filtro na / ", async ({
    page,
  }) => {
    await page.goto("/?marca=bmw");
    // Endereço antigo: 308 para a vitrine em /veiculos (017).
    await expect(page).toHaveURL(/\/veiculos\?marca=bmw$/);
    await expect(cards(page).first()).toContainText("BMW");

    await page.getByTestId("filters-chip").click();
    const sheet = page.getByTestId("filters-sheet");
    await sheet.getByRole("button", { name: "Limpar" }).click();
    await expect(sheet.getByTestId("filters-apply")).toHaveText(
      /^Ver \d+ veículos$/,
    );
    await sheet.getByTestId("filters-apply").click();
    await expect(page).toHaveURL(/\/veiculos$/);
  });

  test("[SHW-FR-004] busca ignora acento e maiúscula", async ({ page }) => {
    await page.goto(CATALOG);
    const box = page.getByRole("searchbox", { name: "Buscar veículos" });
    await box.fill("CITROEN");
    await box.press("Enter");

    await expect(page).toHaveURL(/q=CITROEN/);
    await expect(page.getByTestId("catalog-count")).toHaveText(
      `${S.citroen} veículos disponíveis`,
    );
  });

  test("[SHW-FR-006] ordena do mais barato para o mais caro", async ({
    page,
  }) => {
    await page.goto(CATALOG);
    await page
      .getByTestId("sort-select")
      .selectOption({ label: "Menor preço" });

    await expect(page).toHaveURL(/ordem=menor-preco/);
    await expect(cards(page).first()).toContainText("R$ 30.000");
    await expect(cards(page).nth(1)).toContainText("R$ 31.000");
  });

  test("[SHW-FR-007] carrega de 20 em 20, sem repetir, até acabar", async ({
    page,
  }) => {
    await page.goto(CATALOG);
    await expect(cards(page)).toHaveCount(20);

    await page.getByTestId("load-more").click();
    await expect(cards(page)).toHaveCount(40);
    await page.getByTestId("load-more").click();
    await expect(cards(page)).toHaveCount(S.total);
    await expect(page.getByTestId("load-more")).toHaveCount(0);

    const links = await cards(page)
      .locator('a[href^="/v/"]')
      .evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    expect(new Set(links).size).toBe(S.total);
  });

  test("[SHW-FR-012] busca sem resultado sugere caminhos e sai do Google", async ({
    page,
  }) => {
    await page.goto(`${CATALOG}?marca=bmw&cambio=cvt`);

    await expect(page.getByTestId("no-results")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Limpar filtros" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Buscar só por/ }),
    ).toBeVisible();
    expect(await robots(page)).toContain("noindex");
    expect(await audit(page), "[12a]").toEqual(CLEAN);
  });
});

test.describe("página do veículo (390 px)", () => {
  test.setTimeout(120_000);

  test("[SHW-FR-008] [SHW-SEC-001] mostra a ficha e nunca a placa inteira", async ({
    page,
  }) => {
    await page.goto(`/v/${S.fullId}`);

    await expect(page).toHaveURL(new RegExp(`/v/${S.fullId}-fiat-argo`));
    await expect(page.getByTestId("gallery-counter")).toHaveText("1/3");
    const specs = page.getByTestId("vehicle-specs");
    await expect(specs).toContainText("Final de placa");
    await expect(specs).toContainText("IPVA pago");
    await expect(page.getByText("Abaixo da FIPE")).toBeVisible();
    await expect(page.getByText("Carro de garagem, revisado.")).toBeVisible();
    const whatsapp = await page
      .getByTestId("whatsapp")
      .filter({ visible: true })
      .first()
      .getAttribute("href");
    expect(whatsapp).toContain("5579999990000");
    expect(decodeURIComponent(whatsapp!)).toContain(`/v/${S.fullId}-fiat-argo`);
    const html = await page.content();
    expect(html).not.toContain(S.plate);
    expect(html).not.toContain(S.chassis);
    expect(await audit(page), "[1b]").toEqual(CLEAN);

    await page.getByTestId("store-link").click();
    await expect(page).toHaveURL(new RegExp(`${CATALOG}$`));
  });

  test("[SHW-FR-008] não divulgado abre no mesmo formato, com a loja no cabeçalho", async ({
    page,
  }) => {
    await page.goto(`/v/${S.hiddenId}`);

    await expect(page).toHaveURL(new RegExp(`/v/${S.hiddenId}-citroen-c3`));
    await expect(page.locator("header").first()).toContainText(S.storeName);
  });

  test("[SHW-FR-009] [SHW-SEC-005] guarda o código do vendedor; vale o último", async ({
    page,
    context,
  }) => {
    const ref = async () =>
      (await context.cookies()).find((c) => c.name === "cajugo_ref");

    await page.goto(`/v/${S.fullId}?ref=ANA10`);
    expect((await ref())?.value).toBe("ANA10");
    expect((await ref())?.httpOnly).toBe(true);
    await page.goto(`/v/${S.hiddenId}`);
    expect((await ref())?.value).toBe("ANA10");
    await page.goto(`/v/${S.fullId}?ref=BIA20`);
    expect((await ref())?.value).toBe("BIA20");

    // Com o cookie gravado e sem o código no endereço, a página não o revela.
    await page.goto(`/v/${S.fullId}`);
    expect(await page.content()).not.toContain("BIA20");
  });

  test("[SHW-FR-009] compartilhar usa o aparelho, sem o código de quem compartilha", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        value: (data: ShareData) => {
          (window as unknown as { shared: ShareData }).shared = data;
          return Promise.resolve();
        },
      });
    });
    await page.goto(`/v/${S.fullId}?ref=ANA10`);
    await page.getByRole("button", { name: "Compartilhar" }).click();

    const url = await page.evaluate(
      () => (window as unknown as { shared: ShareData }).shared.url,
    );
    expect(url).toContain(`/v/${S.fullId}-fiat-argo`);
    expect(url).not.toContain("ref=");
  });

  test("[SHW-FR-009] sem compartilhamento no aparelho, copia o link", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: baseURL,
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
    });
    await page.goto(`/v/${S.fullId}`);
    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect(page.getByText("Link copiado")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      `/v/${S.fullId}-fiat-argo`,
    );
  });

  test("[SHW-FR-010] vendido avisa, mostra parecidos e sai do Google", async ({
    page,
  }) => {
    await page.goto(`/v/${S.soldId}`);

    await expect(heading(page)).toHaveText("Este veículo já foi vendido");
    await expect(
      page.getByTestId("similar-list").locator("li").first(),
    ).toBeVisible();
    expect(await robots(page)).toContain("noindex");
    expect(await audit(page), "[12d]").toEqual(CLEAN);
  });

  test("[SHW-FR-011] loja suspensa: aviso igual no catálogo e no veículo", async ({
    page,
  }) => {
    for (const path of [`/loja/${S.suspendedSlug}`, `/v/${S.suspendedId}`]) {
      await page.goto(path);
      await expect(heading(page)).toHaveText(
        "Catálogo temporariamente indisponível",
      );
      expect(await robots(page)).toContain("noindex");
      expect(await audit(page), path).toEqual(CLEAN);
    }
  });
});

test.describe("HTML sem JavaScript", () => {
  test("[SHW-NFR-002] [SHW-FR-013] catálogo e veículo chegam completos, com SEO", async ({
    request,
  }) => {
    const catalog = await (await request.get(CATALOG)).text();
    expect(catalog).toContain(`Estoque ${S.storeName}`);
    expect(catalog).toContain('"@type":"AutoDealer"');
    expect(catalog).toContain('"@type":"ItemList"');
    expect(catalog).toContain("R$");

    const vehicle = await (await request.get(`/v/${S.fullId}`)).text();
    expect(vehicle).toContain('"@type":"Car"');
    expect(vehicle).toContain('"@type":"Offer"');
    expect(vehicle).toContain('"@type":"BreadcrumbList"');
    expect(vehicle).toMatch(/rel="canonical" href="[^"]*\/v\/[^"?]*-fiat-argo/);
    expect(vehicle).toContain("Final de placa");
    expect(vehicle).not.toContain(S.plate);
    expect(vehicle).not.toContain(S.chassis);

    const sold = await (await request.get(`/v/${S.soldId}`)).text();
    expect(sold).toContain("SoldOut");
  });

  test("[SHW-FR-015] [SHW-SEC-001] sitemap tem o veículo divulgado e nada vendido", async ({
    request,
  }) => {
    const xml = await (await request.get("/sitemap/vehicles.xml")).text();
    expect(xml).toContain(S.fullId);
    expect(xml).not.toContain(S.soldId);
    expect(xml).not.toContain(S.suspendedId);
    expect(xml).not.toContain(S.plate);
  });
});

test.describe("desktop [15a] (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.setTimeout(120_000);

  test("[SHW-NFR-001] filtros laterais e grade de 3 colunas", async ({
    page,
  }) => {
    await page.goto(CATALOG);

    await expect(page.getByTestId("filters-side")).toBeVisible();
    await expect(page.getByTestId("filters-chip")).toBeHidden();
    const columns = await page
      .getByTestId("catalog-list")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
    expect(columns).toBe(3);
    expect(await audit(page), "[15a]").toEqual(CLEAN);

    const side = page.getByTestId("filters-side");
    await side.getByText("BMW", { exact: true }).click();
    await side.getByText("Automático", { exact: true }).click();
    const apply = side.getByTestId("filters-apply");
    await expect(apply).toHaveText(`Ver ${S.bmwAutomatic} veículos`);
    await apply.click();
    await expect(page).toHaveURL(/\?marca=bmw&cambio=automatico$/);
    await expect(cards(page)).toHaveCount(S.bmwAutomatic);
  });

  test("[SHW-NFR-001] veículo no desktop sem rolagem lateral", async ({
    page,
  }) => {
    await page.goto(`/v/${S.fullId}`);

    await expect(page.getByTestId("vehicle-specs")).toBeVisible();
    expect(await audit(page), "[1b] desktop").toEqual(CLEAN);
  });
});

test("[TIP-FR-007] [TIP-FR-020] faixa de tipos só na página inicial; na vitrine, o tipo vem pelo chip e pela folha", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("showcase-panel").getByTestId("type-moto").click();
  await expect(page).toHaveURL(/\/motos$/);
  await expect(heading(page)).toHaveText("Motos novas e usadas à venda");
  // O Next guarda a página anterior oculta no DOM: o que vale é não estar visível.
  await expect(page.getByTestId("type-carro")).toBeHidden();

  // Tirar o tipo pelo chip; a escolha volta pela folha de Filtros.
  await page.getByTestId("type-chip").click();
  await expect(page).toHaveURL(/\/veiculos$/);
  await page.getByTestId("filters-chip").filter({ visible: true }).click();
  const sheet = page.getByTestId("filters-sheet").filter({ visible: true });
  await sheet.getByRole("link", { name: "Carro" }).click();
  await expect(page).toHaveURL(/\/carros$/);

  await page
    .getByRole("tab", { name: "Vender" })
    .filter({ visible: true })
    .click();
  await page
    .getByRole("link", { name: "Quero anunciar" })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/lojistas$/);
});
