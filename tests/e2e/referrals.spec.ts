import { randomInt } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  accounts,
  audit,
  expect,
  heading,
  password,
  signIn,
  test,
} from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
}

// O seed tem a loja de Recife indicada pelo lojista de teste (1ª paga → R$ 30 de
// crédito) e a loja suspensa da vitrine indicada pela vendedora (R$ 30 de saldo).
test.describe("Caju Indica (010)", () => {
  test("[IND-FR-001] [IND-FR-003] [IND-FR-005] [IND-FR-009] [IND-NFR-001] lojista: link, landing, indicações e crédito", async ({
    page,
  }) => {
    // Link, indicações e crédito ficam na própria Conta (012).
    await enterAs(page, accounts.owner.email, "/painel/conta");
    await page.getByTestId("referral-link").locator("summary").click();
    await expect(
      page.getByText("Ganhe 30% da mensalidade de cada loja indicada"),
    ).toBeVisible();
    const url = await page
      .getByTestId("referral-link")
      .locator("code")
      .nth(1)
      .innerText();
    expect(url).toMatch(/\/i\/[a-z0-9]+$/);
    expect(await audit(page), "[8a]").toEqual(CLEAN);

    await page.getByTestId("referral-list").locator("summary").click();
    const recife = page
      .getByTestId("referral-item")
      .filter({ hasText: "Recife E2E" });
    await expect(recife.getByText("Rendendo")).toBeVisible();
    await expect(recife).toContainText("Rendeu R$ 30,00 · faltam 2 meses");
    expect(await audit(page), "[8b]").toEqual(CLEAN);

    await page.getByTestId("referral-credit").locator("summary").click();
    await expect(page.getByTestId("credit-available")).toHaveText("R$ 30,00");
    expect(await audit(page), "[8e]").toEqual(CLEAN);

    // Landing do link [8c]: quem indicou, noindex e o cadastro com o código
    await page.goto(new URL(url).pathname);
    await expect(page.getByTestId("referral-from")).toHaveText(
      /^Indicação de /,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await page.getByRole("link", { name: "Quero meu catálogo" }).click();
    await expect(page).toHaveURL(/\/lojistas\/cadastro\?codigo=[A-Z0-9]+/);
  });

  test("[IND-FR-002] [IND-FR-008] [IND-FR-010] [IND-NFR-001] vendedora: saldo, código e indicação pausada", async ({
    page,
  }) => {
    await enterAs(page, accounts.sellerReferrer.email, "/indica");

    await expect(page.getByTestId("referral-balance")).toHaveText("R$ 30,00");
    await expect(
      page.getByTestId("referral-item").filter({ hasText: "Suspensa E2E" }),
    ).toContainText("Pausada");
    expect(await audit(page), "[9d] 390").toEqual(CLEAN);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
    expect(await audit(page), "[9d] 1280").toEqual(CLEAN);
  });

  test("[IND-FR-004] [IND-FR-014] banner da vitrine leva ao cadastro do indicador, que abre o painel", async ({
    page,
  }) => {
    await page.goto("/veiculos");
    // Faixa do Caju Indica logo abaixo do quadro Comprar · Vender.
    await page.getByTestId("referral-banner").filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/indica\/cadastro$/);
    await expect(heading(page)).toHaveText("Indique lojas e ganhe");
    expect(await audit(page), "[9b]").toEqual(CLEAN);

    const stamp = Date.now().toString(36);
    await page.getByLabel("Nome").fill("Indicadora E2E");
    await page
      .getByLabel("Celular")
      .fill(`(79) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`);
    await page.getByLabel("E-mail").fill(`e2e-cadastro-${stamp}@cajugo.test`);
    await page.getByLabel("Senha", { exact: true }).fill(password());
    await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
    await page.getByRole("button", { name: "Criar minha conta" }).click();

    await expect(page).toHaveURL(/\/indica$/, { timeout: 20_000 });
    await expect(page.getByText("Seu código", { exact: true })).toBeVisible();
    await expect(page.getByTestId("referral-balance")).toHaveText("R$ 0,00");
  });
});
