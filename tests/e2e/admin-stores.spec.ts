import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

/** Lojas [1d] do admin com as abas (012b): 390 e 1280 px, com a auditoria. */
for (const width of [390, 1280]) {
  test(`[ADM-FR-004] [ADM-FR-006] [ADM-FR-007] [ADM-NFR-001] Lojas, Veículos CajuGo e Usuários em ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/entrar?next=%2Fadmin%2Flojas");
    await signIn(page, accounts.admin.email);
    await expect(heading(page)).toHaveText("Lojas");

    // Lojas: KPIs, busca, filtros e cards com Gerenciar
    await expect(page.getByTestId("kpi-active")).toBeVisible();
    await expect(page.getByTestId("kpi-mrr")).toBeVisible();
    await expect(page.getByTestId("admin-store").first()).toBeVisible();
    await page.screenshot({
      path: `test-results/admin-lojas-${width}.png`,
      fullPage: true,
    });
    expect(await audit(page)).toEqual({
      horizontalScroll: false,
      small: [],
      unlabeled: [],
    });

    // Veículos CajuGo
    await page.getByRole("link", { name: "Veículos CajuGo" }).click();
    await expect(page).toHaveURL(/aba=veiculos/);
    await expect(
      page.getByRole("navigation", { name: "Filtrar veículos" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/admin-veiculos-cajugo-${width}.png`,
      fullPage: true,
    });

    // Usuários: busca pelo e-mail da conta de teste
    await page.getByRole("link", { name: "Usuários" }).click();
    await expect(page).toHaveURL(/aba=usuarios/);
    await page
      .getByRole("searchbox", { name: /nome ou e-mail/ })
      .fill(accounts.support.email);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByTestId("admin-user")).toHaveCount(1);
    await expect(page.getByTestId("admin-user")).toContainText("Suporte");
    await page.screenshot({
      path: `test-results/admin-usuarios-${width}.png`,
      fullPage: true,
    });
  });
}

test("[ADM-FR-006] ocultar pede confirmação com motivo, e o veículo volta por Ocultados", async ({
  page,
}) => {
  await page.goto("/entrar?next=%2Fadmin%2Fveiculos");
  await signIn(page, accounts.admin.email);
  await expect(heading(page)).toHaveText("Veículos");

  const card = page.getByTestId("admin-vehicle").first();
  // O endereço do anúncio é único (vários anúncios têm o mesmo nome).
  const href = (await card.getByRole("link").first().getAttribute("href"))!;
  const byHref = (list: ReturnType<typeof page.getByTestId>) =>
    list.filter({ has: page.locator(`a[href="${href}"]`) });
  await card.getByRole("button", { name: "Ocultar" }).click();

  // nada muda antes de confirmar: a confirmação pede o motivo
  const sheet = page.getByRole("dialog", { name: "Ocultar veículo" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Ocultar da vitrine" }).click();
  await expect(sheet.getByRole("alert")).toHaveText("Escolha um motivo.");
  await sheet.getByRole("radio").first().check();
  await sheet.getByRole("button", { name: "Ocultar da vitrine" }).click();
  await expect(sheet).toBeHidden();

  // em Ocultados, com Mostrar de novo
  await page.getByRole("link", { name: /^Ocultados/ }).click();
  const hidden = byHref(page.getByTestId("admin-vehicle"));
  await expect(hidden).toBeVisible();
  await page.screenshot({ path: "test-results/admin-veiculos-ocultados.png" });
  await hidden.getByRole("button", { name: "Mostrar de novo" }).click();
  await expect(byHref(page.getByTestId("admin-vehicle"))).toHaveCount(0);
});

test("[ADM-FR-005] [ADM-SEC-003] Nova loja: cadastrada, com a senha temporária uma vez e Copiar", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  await page.goto("/entrar?next=%2Fadmin%2Flojas");
  await signIn(page, accounts.admin.email);
  await page.getByRole("button", { name: "Nova loja" }).click();

  // erro no campo, sem perder o digitado
  await page.getByRole("button", { name: "Criar loja" }).click();
  await expect(page.getByText("Informe o nome do dono.")).toBeVisible();

  await page.getByLabel("Nome da loja").fill(`E2E Admin ${stamp}`);
  await expect(page.locator("#new-slug-status")).toHaveText("Disponível");
  await page.getByRole("combobox", { name: "Cidade" }).fill("Aracaj");
  await page.getByRole("option", { name: /Aracaju\/SE/ }).click();
  await page.getByLabel("WhatsApp da loja").fill("(79) 99876-5432");
  await page.getByLabel("Nome do dono").fill("Dono E2E");
  await page
    .getByLabel("E-mail do dono")
    .fill(`e2e-cadastro-admin-${stamp}@cajugo.test`);
  await page.getByRole("button", { name: "Criar loja" }).click();

  const done = page.getByTestId("new-store-done");
  await expect(done).toContainText(`E2E Admin ${stamp} cadastrada`);
  await expect(
    done.getByRole("button", { name: "Copiar senha temporária" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/admin-nova-loja.png" });

  // a loja aparece na lista como Cadastrada; a senha não volta ao recarregar
  await page.goto(`/admin/lojas?filtro=cadastradas&q=${stamp}`);
  await expect(page.getByTestId("admin-store")).toContainText("Cadastrada");
  await expect(page.getByTestId("new-store-done")).toHaveCount(0);
});
