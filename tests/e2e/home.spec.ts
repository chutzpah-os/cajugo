import { accounts, audit, expect, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

test("[HOM-FR-001] [HOM-NFR-001] página inicial: abertura, Buscar · Vender e produtos, sem lista de veículos (390 px)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/venda e cuide do seu veículo/)).toBeVisible();
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

test("[PRC-FR-009] [HOM-FR-007] rodapé com os menus, Em breve, Instagram e Topo nas páginas públicas", async ({
  page,
}) => {
  for (const path of ["/", "/veiculos", "/entrar", "/conheca/lojistas"]) {
    await page.goto(path);
    const footer = page.getByTestId("site-footer");
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("navigation", { name: "Mapa do site" }),
    ).toContainText("Descobrir");
    await expect(footer.getByText("(em breve)").first()).toBeAttached();
    await expect(
      footer.getByRole("link", { name: /Instagram @caju\.go/ }),
    ).toHaveAttribute("href", "https://www.instagram.com/caju.go/");
  }
});

test("[HOM-FR-002] endereço antigo com filtros responde 308 para /veiculos", async ({
  request,
}) => {
  const res = await request.get("/?marca=bmw", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toMatch(/\/veiculos\?marca=bmw$/);
});

test("[HOM-FR-004] [HOM-FR-005] menu do celular: as mesmas seções, cada uma abre as opções", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  for (const label of ["Comprar", "Vender", "Serviços", "Descobrir"])
    await expect(menu.getByText(label, { exact: true })).toBeVisible();

  await menu.getByTestId("menu-financiar").locator("summary").click();
  await expect(menu.getByText("Simular financiamento")).toBeVisible();
  await expect(
    menu.getByRole("link", { name: /Simular financiamento/ }),
  ).toHaveCount(0);

  await menu.getByTestId("menu-comprar").locator("summary").click();
  await menu.getByRole("link", { name: "Motos" }).click();
  await expect(page).toHaveURL(/\/motos$/);
});

test("[HOM-FR-006] Entrar e cadastros: painel à esquerda e formulário à direita no desktop; formulário primeiro no celular", async ({
  page,
}) => {
  for (const path of ["/entrar", "/lojistas/cadastro"]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    const form = page.locator("main form").first();
    const panel = page.locator("main aside").first();
    const [f, p] = [await form.boundingBox(), await panel.boundingBox()];
    expect(p!.x).toBeLessThan(f!.x);

    await page.setViewportSize({ width: 390, height: 844 });
    const [fm, pm] = [await form.boundingBox(), await panel.boundingBox()];
    expect(fm!.y).toBeLessThan(pm!.y);
  }
});

test("[HOM-FR-008] [HOM-FR-009] Quero ser avisado do leilão vira pedido em Contatos, sem número da CajuGo", async ({
  page,
}) => {
  const name = `Leilão E2E ${Date.now()}`;
  await page.goto("/conheca/leilao");
  await page.getByRole("link", { name: "Quero ser avisado" }).first().click();
  await expect(page).toHaveURL(/\/conheca\/leilao\/avisar$/);
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Celular com WhatsApp").fill("(79) 99999-0000");
  await page.getByLabel(/Aceito que a CajuGo/).check();
  await page.getByRole("button", { name: "Quero ser avisado" }).click();
  await expect(page.getByTestId("contact-done")).toBeVisible();

  await page.goto("/entrar?next=%2Fadmin%2Fcontatos");
  await signIn(page, accounts.support.email);
  const card = page.getByTestId("contact-request").filter({ hasText: name });
  await expect(card).toContainText("Leilão · quer ser avisado");
  await card.getByRole("button", { name: "Marcar como atendido" }).click();
  await expect(card).toHaveCount(0);
});
