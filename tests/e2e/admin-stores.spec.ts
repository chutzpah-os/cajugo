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
