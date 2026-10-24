import { accounts, expect, heading, signIn, test } from "./fixtures";

test('menu do admin no celular: itens fora da barra ficam no "Mais"', async ({
  page,
}) => {
  await page.goto("/entrar?next=%2Fadmin");
  await signIn(page, accounts.support.email);
  await expect(heading(page)).toHaveText("Painel admin");

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
