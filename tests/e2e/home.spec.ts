import { audit, expect, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

test("[HOM-FR-001] [HOM-NFR-001] página inicial: abertura, Buscar · Vender e produtos, sem lista de veículos (390 px)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText(/compre, venda e cuide do seu veículo/),
  ).toBeVisible();
  await expect(page.getByTestId("showcase-panel")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Produtos CajuGo" }),
  ).toBeVisible();
  await expect(page.getByTestId("catalog-list")).toHaveCount(0);
  expect(await audit(page)).toEqual(CLEAN);

  await page.getByTestId("type-moto").click();
  await expect(page).toHaveURL(/\/motos$/);
});

test("[HOM-FR-003] [HOM-FR-005] menus do desktop: Comprar leva à vitrine filtrada; Em breve não é link (1280 px)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Site", exact: true });

  await nav.getByText("Financiar", { exact: true }).click();
  const soon = nav.getByText("Simular financiamento");
  await expect(soon).toBeVisible();
  await expect(
    nav.getByRole("link", { name: /Simular financiamento/ }),
  ).toHaveCount(0);

  await nav.getByText("Comprar", { exact: true }).click();
  await nav.getByRole("link", { name: "Veículos usados" }).click();
  await expect(page).toHaveURL(/\/veiculos\?estado=usado$/);
  await expect(page.locator("main h1").first()).toHaveText(
    "Veículos usados à venda",
  );
});

test("[HOM-FR-003] o menu aparece também nas páginas públicas de cadastro e login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const path of ["/entrar", "/lojistas/cadastro", "/indica/cadastro"]) {
    await page.goto(path);
    await expect(
      page
        .getByRole("navigation", { name: "Site", exact: true })
        .getByText("Comprar"),
    ).toBeVisible();
  }
});
