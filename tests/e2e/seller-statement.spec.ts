import type { Page } from "@playwright/test";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
}

const toReceive = (page: Page) =>
  page.getByTestId("statement-sale").filter({ hasText: "Citroën C3" });

// O seed tem duas vendas da E2EVENDE na loja da vitrine: BMW X1 "Paga" (pela loja,
// há 10 dias) e Citroën C3 "A receber" (ontem), R$ 800 de comissão cada.
test.describe.serial("extrato do vendedor (008b)", () => {
  test("[EXT-FR-005] [EXT-NFR-001] painel com a receber, vendas e últimas vendas", async ({
    page,
  }) => {
    await enterAs(page, accounts.sellerReferrer.email, "/rede-caju");

    await expect(page.getByTestId("seller-to-receive")).toHaveText("R$ 800,00");
    await expect(page.getByTestId("seller-recent-sale")).toHaveCount(2);
    await expect(page.getByTestId("seller-recent-sale").first()).toContainText(
      "Citroën C3",
    );
    expect(await audit(page), "[7b]").toEqual(CLEAN);
    await page.getByRole("link", { name: "Ver extrato" }).click();
    await expect(page).toHaveURL(/\/rede-caju\/extrato$/);
  });

  test("[EXT-FR-001] [EXT-FR-002] [EXT-FR-003] [EXT-FR-009] [EXT-NFR-001] extrato com filtros, Recebi e Desfazer", async ({
    page,
  }) => {
    await enterAs(page, accounts.sellerReferrer.email, "/rede-caju/extrato");
    await expect(heading(page)).toHaveText("Extrato");
    await expect(page.getByTestId("statement-sale")).toHaveCount(2);
    await expect(toReceive(page)).toContainText("Vendido por R$ 40.000,00");
    expect(await audit(page), "[7d] 390").toEqual(CLEAN);

    // Filtro na URL
    await page.getByRole("link", { name: /^A receber/ }).click();
    await expect(page).toHaveURL(/filtro=a-receber/);
    await expect(page.getByTestId("statement-sale")).toHaveCount(1);

    // Recebi com confirmação → Paga, com Desfazer
    await page.goto("/rede-caju/extrato");
    await toReceive(page).getByRole("button", { name: "Recebi" }).click();
    await page.getByRole("button", { name: "Sim, recebi" }).click();
    await expect(toReceive(page).getByText("Paga")).toBeVisible();
    await expect(
      toReceive(page).getByRole("button", { name: "Desfazer" }),
    ).toBeVisible();
    // A paga pela loja não tem Desfazer.
    await expect(
      page
        .getByTestId("statement-sale")
        .filter({ hasText: "BMW X1" })
        .getByRole("button"),
    ).toHaveCount(0);

    // Desfazer volta a A receber
    await toReceive(page).getByRole("button", { name: "Desfazer" }).click();
    await expect(toReceive(page).getByText("A receber")).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
    expect(await audit(page), "[7d] 1280").toEqual(CLEAN);
  });

  test("[EXT-FR-010] a loja vê o aviso do Recebi e do desfazer", async ({
    page,
  }) => {
    await enterAs(page, accounts.showcaseOwner.email, "/painel/veiculos");
    // Os avisos ficam só na tela Avisos do menu (DSG-FR-020).
    await page.goto("/painel/avisos");

    await expect(
      page.getByText(/confirmou o recebimento da comissão do Citroën C3/),
    ).toBeVisible();
    await expect(
      page.getByText(/desfez o recebimento da comissão do Citroën C3/),
    ).toBeVisible();
    expect(S.statementId).toBeTruthy();
  });
});
