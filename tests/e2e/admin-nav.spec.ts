import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

test('[ADM-FR-014] menu do admin no celular: itens fora da barra ficam no "Mais"', async ({
  page,
}) => {
  await page.goto("/entrar?next=%2Fadmin");
  await signIn(page, accounts.support.email);
  await expect(heading(page)).toHaveText(/^Olá, /);

  const bar = page.getByRole("navigation", {
    name: "Menu do painel (celular)",
  });
  await bar.getByRole("button", { name: "Mais" }).click();
  const drawer = page.getByRole("dialog", { name: "Mais opções do painel" });
  await expect(drawer).toBeVisible();
  await page.screenshot({ path: "test-results/admin-mais-aberto.png" });

  await drawer.getByRole("link", { name: "Pagamentos Pix" }).click();
  await expect(page).toHaveURL(/\/admin\/pagamentos$/);
  await expect(heading(page)).toHaveText("Pagamentos Pix");
  await expect(drawer).toBeHidden();
  await expect(bar.getByRole("button", { name: "Mais" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("[ADM-FR-001] [ADM-FR-003] [ADM-NFR-001] painel do admin no celular: saudação, KPIs e Precisa de atenção", async ({
  page,
}) => {
  await page.goto("/entrar?next=%2Fadmin");
  await signIn(page, accounts.admin.email);
  await expect(heading(page)).toHaveText(/^Olá, /);
  await expect(page.getByText("Lojas ativas").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Precisa de atenção" }),
  ).toBeVisible();
  expect(await audit(page)).toEqual({
    horizontalScroll: false,
    small: [],
    unlabeled: [],
  });
});

test("[ADM-FR-013] [ADM-NFR-001] Visão geral no desktop: KPIs, Comprovantes Pix inline e contadores na sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/entrar?next=%2Fadmin");
  await signIn(page, accounts.admin.email);
  await expect(
    page.getByRole("heading", { name: "Visão geral", level: 1 }),
  ).toBeVisible();
  for (const kpi of ["Lojas ativas", "Receita mensal", "Em atraso"])
    await expect(page.getByText(kpi, { exact: true }).first()).toBeVisible();
  const pix = page.getByRole("region", { name: "Comprovantes Pix" });
  await expect(pix.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
    "href",
    "/admin/pagamentos",
  );
  const sidebar = page.getByRole("navigation", {
    name: "Menu do painel",
    exact: true,
  });
  await expect(sidebar.getByTestId("nav-count").first()).toBeAttached();
  expect(await audit(page)).toEqual({
    horizontalScroll: false,
    small: [],
    unlabeled: [],
  });
});
