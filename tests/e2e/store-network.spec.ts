import { randomInt } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { E2E_SELLER as V } from "../../src/domains/sellers/testing/e2e-seed";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next.split("?")[0]);
}

async function windowAs(browser: Browser, email: string, next: string) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await enterAs(page, email, next);
  return page;
}

test.describe.serial("Rede Caju: lojista e venda", () => {
  test.setTimeout(150_000);

  test("[RCL-FR-014] [RCL-FR-002] [RCL-FR-001] Conta leva a Comissão; prévia; desligar e religar 'Aceitar vendedores'", async ({
    page,
    browser,
  }) => {
    await enterAs(page, accounts.showcaseOwner.email, "/painel/conta");
    const block = page.getByTestId("network-block");
    await expect(block.getByTestId("network-pending")).toHaveText("1");
    await block.getByRole("link", { name: "Comissão" }).click();
    await expect(heading(page)).toHaveText("Comissão");
    await expect(page.getByTestId("commission-preview")).toContainText(
      "Comissão do vendedor: R$ 1.200,00",
    );
    expect(await audit(page), "[7e] 390 px").toEqual(CLEAN);

    // Desligar: a vendedora vê a loja fechada; religar devolve a parceria.
    const toggle = page.getByRole("switch", {
      name: /Aceitar vendedores independentes/,
    });
    // O switch é um checkbox escondido; a pessoa toca no rótulo inteiro.
    const label = page.getByText("Aceitar vendedores independentes");
    await label.click();
    await expect(toggle).not.toBeChecked();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Salvo.", { exact: true })).toBeVisible();
    const seller = await windowAs(
      browser,
      accounts.sellerReferrer.email,
      "/rede/vitrine",
    );
    const card = seller
      .getByTestId("seller-card")
      .filter({ has: seller.locator(`a[href^="/v/${S.fullId}"]`) });
    await expect(card).toContainText("Esta loja não aceita vendedores");
    await expect(card.getByTestId("seller-earn")).toHaveCount(0);

    await label.click();
    await expect(toggle).toBeChecked();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Salvo.", { exact: true })).toBeVisible();
    await seller.reload();
    await expect(card.getByTestId("seller-earn")).toContainText("Você ganha");
    await seller.context().close();
  });

  test("[RCL-FR-004] [RCL-FR-005] [RCL-FR-006] [RCL-SEC-004] aprovar o pedido e encerrar a parceria", async ({
    page,
  }) => {
    await enterAs(
      page,
      accounts.showcaseOwner.email,
      "/painel/rede/vendedores",
    );
    const request = page
      .getByTestId("partner-request")
      .filter({ hasText: V.pendingName });
    await expect(request).toHaveCount(1);
    expect(await audit(page), "[7f] 390 px").toEqual(CLEAN);
    await request.getByRole("button", { name: "Aprovar" }).click();

    const partner = page
      .getByTestId("partner")
      .filter({ hasText: V.pendingName });
    await expect(partner).toContainText("Pix: tadeu-e2e@cajugo.test");
    await expect(
      page.getByTestId("partner").filter({ hasText: V.name }),
    ).toContainText("Pix: ");

    await partner.getByRole("button", { name: "Encerrar parceria" }).click();
    const sheet = page.getByRole("dialog", {
      name: `Encerrar parceria com ${V.pendingName}?`,
    });
    await sheet.getByRole("button", { name: "Encerrar parceria" }).click();
    await expect(partner).toHaveCount(0);
  });

  test("[RCL-FR-008] [RCL-FR-013] [RCL-FR-009] [RCL-FR-010] [RCL-FR-011] [RCL-FR-015] [RCL-NFR-002] lead pelo link, Confirmar venda com o sugerido e desfazer", async ({
    page,
    browser,
  }) => {
    // O comprador chega pelo link da vendedora e manda mensagem.
    const visitor = await browser.newPage();
    await visitor.goto(`/v/${S.saleTestId}?ref=${V.code}`);
    const form = visitor.getByRole("form", {
      name: "Envie uma mensagem à loja",
    });
    await form.getByLabel("Nome").fill(`Iris Venda ${randomInt(1e6)}`);
    await form.getByLabel("E-mail").fill("iris@e2e.test");
    await form.getByLabel("Telefone").fill("(79) 99999-0000");
    await form.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(visitor.getByTestId("lead-sent")).toBeVisible();

    // [1c]: "Vendido" leva à Confirmar venda em [6e].
    await enterAs(page, accounts.showcaseOwner.email, "/painel/veiculos");
    await page.goto("/painel/veiculos?q=C3%20V2");
    const sell = page
      .locator(`a[href="/painel/veiculos/${S.saleTestId}?vender=1"]`)
      .first();
    await sell.click();
    const sheet = page.getByRole("dialog", { name: "Confirmar venda" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel(`${V.name} (pelo link)`)).toBeChecked();
    await sheet.getByLabel("Valor final").fill("50.000,00");
    await expect(sheet.getByTestId("sale-terms")).toContainText(
      "Comissão do vendedor: R$ 1.000,00",
    );
    await expect(sheet.getByTestId("sale-terms")).toContainText(
      "Taxa CajuGo (1%): R$ 500,00",
    );
    expect(await audit(page), "[7g] 390 px").toEqual(CLEAN);
    await sheet.getByRole("button", { name: "Confirmar venda" }).click();
    await expect(
      page.getByRole("button", { name: "Desfazer venda" }),
    ).toBeVisible();

    // Sai da vitrine na hora: o link antigo abre "vendido".
    await visitor.goto(`/v/${S.saleTestId}`);
    await expect(visitor.locator("main")).toContainText(
      "Este veículo já foi vendido",
    );

    await page.getByRole("button", { name: "Desfazer venda" }).click();
    await expect(
      page.getByRole("button", { name: "Marcar como vendido" }),
    ).toBeVisible();
    await visitor.reload();
    await expect(visitor.locator("main")).not.toContainText(
      "Este veículo já foi vendido",
    );
    await visitor.close();
  });

  test("[RCL-SEC-002] usuário da loja não abre Comissão nem Vendedores", async ({
    page,
  }) => {
    await enterAs(page, accounts.staff.email, "/painel/veiculos");
    for (const path of ["/painel/rede/comissao", "/painel/rede/vendedores"]) {
      await page.goto(path);
      await expect(heading(page)).toHaveText("Sem permissão");
    }
  });
});

test.describe("Rede Caju do lojista no desktop (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[RCL-NFR-001] Comissão e Vendedores sem problemas de acessibilidade", async ({
    page,
  }) => {
    await enterAs(page, accounts.showcaseOwner.email, "/painel/rede/comissao");
    expect(await audit(page), "[7e] 1280 px").toEqual(CLEAN);
    await page.goto("/painel/rede/vendedores");
    expect(await audit(page), "[7f] 1280 px").toEqual(CLEAN);
  });
});
