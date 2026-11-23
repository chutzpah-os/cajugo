import path from "node:path";
import { randomInt } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { E2E_BILLING as B } from "../../src/domains/billing/testing/e2e-seed";
import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

const PNG = path.join(__dirname, "files", "logo.png");
const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const TOTAL = "R$ 600,00";

/** Outra pessoa, no próprio navegador e com a própria "rede". */
async function actor(
  browser: Browser,
  baseURL: string,
  email: string,
  next: string,
  width = 390,
) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width, height: 844 },
  });
  const page = await context.newPage();
  const ip = `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
  await page.route(`${baseURL}/**`, (route) =>
    route.continue({
      headers: { ...route.request().headers(), "x-forwarded-for": ip },
    }),
  );
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
  return page;
}

const storeCard = (page: Page) =>
  page.getByTestId("subscription").filter({ hasText: B.storeName });

// O seed (`pnpm e2e:seed`) roda o ciclo real na loja da fatura: vencida há 10 dias,
// em atraso e suspensa, com R$ 100 de mensalidade + R$ 500 de taxa em aberto.
test.describe.configure({ mode: "serial" });

test.describe("ciclo de cobrança (011)", () => {
  test.setTimeout(120_000);

  test("[SUB-FR-002] [SUB-FR-009] [SUB-FR-010] [SUB-FR-015] [SUB-NFR-001] lojista da loja suspensa: alerta, edição, fatura, Pix e Conta", async ({
    page,
  }) => {
    // Painel: [12f] no topo e o aviso da suspensão
    await page.goto("/entrar?next=/painel/veiculos");
    await signIn(page, accounts.billingOwner.email);
    await page.waitForURL(/\/painel\/veiculos$/);
    await expect(
      page.getByText(`Loja suspensa · ${B.daysLate} dias de atraso · ${TOTAL}`),
    ).toBeVisible();
    await expect(
      page.getByText("Sua loja foi suspensa por falta de pagamento."),
    ).toBeVisible();

    // Edição continua permitida
    await page.goto(`/painel/veiculos/${B.vehicleId}`);
    await expect(heading(page)).toHaveText("Editar veículo");

    // [10c]: mensalidade, taxa com veículo e data, total e Pagar com Pix
    await page.goto("/painel/fatura");
    await expect(heading(page)).toHaveText("Fatura do mês");
    await expect(page.getByText(/^Mensalidade \d{2}\/\d{4}$/)).toBeVisible();
    await expect(page.getByText(/Taxa CajuGo · BMW X1 ·/)).toBeVisible();
    await expect(page.getByText("Em atraso", { exact: true })).toBeVisible();
    await expect(page.getByText(TOTAL).first()).toBeVisible();
    expect(await audit(page), "[10c] 390").toEqual(CLEAN);
    await page.getByRole("link", { name: "Pagar com Pix" }).click();
    await expect(page).toHaveURL(/\/painel\/fatura\/pix$/);
    await expect(page.getByTestId("pix-amount")).toHaveText(TOTAL);
    expect(await audit(page), "[6c] mensal").toEqual(CLEAN);

    // [3c]: plano, status, Como pagar, fatura do mês e a anterior
    await page.goto("/painel/conta");
    await expect(page.getByText("Plano Catálogo")).toBeVisible();
    await expect(page.getByText("Suspensa", { exact: true })).toBeVisible();
    await expect(page.getByText("pix-e2e@cajugo.test")).toBeVisible();
    await expect(page.getByText(/1ª mensalidade · R\$ 100,00/)).toBeVisible();
    expect(await audit(page), "[3c] 390").toEqual(CLEAN);

    await page.setViewportSize({ width: 1280, height: 900 });
    for (const path of ["/painel/fatura", "/painel/conta"]) {
      await page.goto(path);
      expect(await audit(page), `${path} 1280`).toEqual(CLEAN);
    }
  });

  test("[SUB-FR-008] [SUB-SEC-005] catálogo da loja suspensa fora do ar, sem motivo, valor nem dias", async ({
    page,
  }) => {
    await page.goto(`/loja/${B.slug}`);

    await expect(heading(page)).toHaveText(
      "Catálogo temporariamente indisponível",
    );
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("R$");
    expect(body).not.toMatch(/atraso|pagamento|suspens/i);
  });

  test("[SUB-FR-011] [SUB-FR-012] [SUB-FR-013] [SUB-SEC-003] [SUB-NFR-001] suporte vê [4b] sem os botões; admin reativa e suspende", async ({
    browser,
    baseURL,
  }) => {
    // Suporte: vê a loja e o wa.me, sem Reativar
    const support = await actor(
      browser,
      baseURL!,
      accounts.support.email,
      "/admin/assinaturas",
    );
    await support.goto("/admin/assinaturas?filtro=suspensas");
    const seen = storeCard(support);
    await expect(
      seen.getByText("Catálogo e vitrine · Fora do ar"),
    ).toBeVisible();
    await expect(seen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\//,
    );
    await expect(seen.getByRole("button", { name: "Reativar" })).toHaveCount(0);
    expect(await audit(support), "[4b] suporte").toEqual(CLEAN);
    await support.context().close();

    // Admin: Reativar com motivo → em atraso, com Suspender
    const admin = await actor(
      browser,
      baseURL!,
      accounts.admin.email,
      "/admin/assinaturas",
      1280,
    );
    await expect(admin.getByTestId("mrr")).toContainText("R$");
    expect(await audit(admin), "[4b] 1280").toEqual(CLEAN);
    await admin.goto("/admin/assinaturas?filtro=suspensas");
    await storeCard(admin).getByRole("button", { name: "Reativar" }).click();
    await storeCard(admin).getByLabel("Motivo").fill("Acordo de pagamento");
    await storeCard(admin)
      .getByRole("button", { name: "Reativar", exact: true })
      .last()
      .click();
    // Sai da lista de suspensas quando a action termina.
    await expect(storeCard(admin)).toHaveCount(0, { timeout: 20_000 });
    await admin.goto("/admin/assinaturas?filtro=atrasadas");
    const late = storeCard(admin);
    await expect(
      late.getByText(`Em atraso ${B.daysLate} dias · ${TOTAL}`),
    ).toBeVisible();

    // Suspender com a confirmação
    await late.getByRole("button", { name: "Suspender" }).click();
    await late.getByRole("button", { name: "Suspender loja" }).click();
    await expect(storeCard(admin)).toHaveCount(0, { timeout: 20_000 });
    await admin.goto("/admin/assinaturas?filtro=suspensas");
    await expect(storeCard(admin)).toBeVisible();
    await admin.context().close();
  });

  test("[SUB-FR-003] [SUB-FR-004] [SUB-FR-016] comprovante do total e confirmação: a loja volta ao ar", async ({
    page,
    browser,
    baseURL,
  }) => {
    // Lojista paga o total em aberto
    await page.goto("/entrar?next=/painel/fatura/pix");
    await signIn(page, accounts.billingOwner.email);
    await page.waitForURL(/\/painel\/fatura\/pix$/);
    await page.locator("#receipt").setInputFiles(PNG);
    await page.getByLabel("Valor pago").fill("600");
    await page.getByRole("button", { name: "Enviar comprovante" }).click();
    await expect(page).toHaveURL(/\/painel\/pagamento$/, { timeout: 30_000 });

    // Admin confere "Mensalidade mm/aaaa" e confirma
    const admin = await actor(
      browser,
      baseURL!,
      accounts.admin.email,
      "/admin/pagamentos",
    );
    const pending = admin.locator("li", {
      has: admin.getByText(B.storeName, { exact: true }),
    });
    await expect(pending.getByText(/Mensalidade \d{2}\/\d{4}/)).toBeVisible();
    await pending.getByRole("button", { name: "Confirmar" }).click();
    await expect(
      admin.getByRole("link", { name: `Avisar ${B.storeName} no WhatsApp` }),
    ).toBeVisible();
    await admin.context().close();

    // Lojista: sem alerta, aviso da reativação; catálogo de volta
    await page.goto("/painel/veiculos");
    await expect(
      page.getByText("Pagamento confirmado. Sua loja está no ar."),
    ).toBeVisible();
    await expect(page.getByText(/Loja suspensa ·/)).toHaveCount(0);
    await page.goto(`/loja/${B.slug}`);
    await expect(heading(page)).toHaveText(`Estoque ${B.storeName}`);
  });
});
