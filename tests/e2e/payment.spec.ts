import path from "node:path";
import { randomInt } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import {
  accounts,
  audit,
  expect,
  heading,
  password,
  signIn,
  test,
} from "./fixtures";

const PNG = path.join(__dirname, "files", "logo.png");
const PDF = path.join(__dirname, "files", "comprovante.pdf");
const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

/** Outra pessoa, no próprio navegador e com a própria "rede" (como o fixture `page`). */
async function actor(
  browser: Browser,
  baseURL: string,
  email: string,
  next: string,
) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
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

/** Cadastro de uma loja nova pela tela [5c]; termina em [5d]. */
async function signUpStore(page: Page, stamp: string) {
  await page.goto("/lojistas/cadastro");
  await page.getByLabel("Nome da loja").fill(`E2E Pix ${stamp}`);
  await expect(page.locator("#slug-status")).toHaveText("Disponível");
  await page.getByRole("combobox", { name: "Cidade" }).fill("Aracaj");
  await page.getByRole("option", { name: /Aracaju\/SE/ }).click();
  await page.getByLabel("WhatsApp da loja").fill("(79) 99876-5432");
  await page.getByLabel("Seu nome").fill("Pix E2E");
  await page.getByLabel("E-mail").fill(`e2e-cadastro-${stamp}@cajugo.test`);
  await page
    .getByLabel("Celular")
    .fill(`(79) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`);
  await page.getByLabel("Senha", { exact: true }).fill(password());
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: "Continuar para pagamento" }).click();
  await expect(page).toHaveURL(/\/lojistas\/pagamento$/, { timeout: 20_000 });
  return { name: `E2E Pix ${stamp}`, slug: `e2e-pix-${stamp}` };
}

const card = (page: Page, storeName: string) =>
  page.locator("li", { has: page.getByText(storeName, { exact: true }) });

test.describe("Pix manual e ativação", () => {
  test.setTimeout(120_000);

  test("[PIX-FR-001] [PIX-FR-002] [PIX-FR-004] [PIX-FR-005] [PIX-FR-006] [PIX-FR-007] [PIX-FR-008] [PIX-FR-009] [PIX-FR-010] [PIX-FR-012] [PIX-FR-013] [PIX-FR-014] [PIX-NFR-001] paga, é recusado, reenvia PDF, é confirmado e a loja vai ao ar", async ({
    page,
    browser,
    baseURL,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const stamp = Date.now().toString(36);
    const store = await signUpStore(page, stamp);

    // [5d]: plano, Pix e CPF inválido
    await expect(heading(page)).toHaveText("Pagamento");
    await expect(
      page.getByText("Você pode cancelar a assinatura a qualquer momento."),
    ).toBeVisible();
    expect(await audit(page), "[5d]").toEqual(CLEAN);
    await page
      .getByLabel("CPF ou CNPJ para a nota fiscal")
      .fill("111.111.111-11");
    await page.getByRole("button", { name: /Pagar com Pix/ }).click();
    await expect(page.getByText("CPF inválido.")).toBeVisible();

    // [6c]: valor, QR, copiar; [10a]
    await page
      .getByLabel("CPF ou CNPJ para a nota fiscal")
      .fill("529.982.247-25");
    await page
      .getByRole("button", { name: /Pagar com Pix · R\$ 100,00/ })
      .click();
    await expect(page.getByTestId("pix-amount")).toHaveText("R$ 100,00");
    await expect(
      page.getByRole("img", { name: /QR code do Pix/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copiar chave pix" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "@cajugo.test",
    );
    await expect(
      page.getByRole("button", { name: "Enviar comprovante" }),
    ).toBeDisabled();
    expect(await audit(page), "[6c]").toEqual(CLEAN);
    await page.locator("#receipt").setInputFiles(PNG);
    await expect(
      page.getByRole("img", { name: "Pré-visualização do comprovante" }),
    ).toBeVisible();
    await page.getByLabel("Valor pago").fill("90");
    await page.getByRole("button", { name: "Enviar comprovante" }).click();
    await expect(page).toHaveURL(/\/painel\/pagamento$/, { timeout: 30_000 });
    await expect(
      page.getByText("Comprovante recebido. Estamos conferindo."),
    ).toBeVisible();
    expect(await audit(page), "[10a]").toEqual(CLEAN);

    // Admin [10b]: alerta e recusa com motivo
    const admin = await actor(
      browser,
      baseURL!,
      accounts.admin.email,
      "/admin/pagamentos",
    );
    const pending = card(admin, store.name);
    await expect(
      pending.getByText(/Valor diferente do esperado/),
    ).toBeVisible();
    expect(await audit(admin), "[10b]").toEqual(CLEAN);
    await pending.getByRole("button", { name: "Recusar" }).click();
    await pending.getByLabel("Motivo da recusa").fill("Valor divergente");
    await pending.getByRole("button", { name: "Recusar" }).click();
    await expect(
      admin.getByText(`Comprovante de ${store.name} recusado.`),
    ).toBeVisible();

    // Lojista [12e]: motivo, faltante e aviso; reenvia em PDF
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/lojistas\/pagamento$/);
    await expect(heading(page)).toHaveText("Comprovante recusado");
    await expect(page.getByText("Valor faltante: R$ 10,00")).toBeVisible();
    expect(await audit(page), "[12e]").toEqual(CLEAN);
    await expect(
      page.getByText(
        "Comprovante recusado: Valor divergente. Faltam R$ 10,00.",
      ),
    ).toBeVisible();
    // Reenvio sem redigitar o documento (fica o já informado).
    await page
      .getByRole("button", { name: /Pagar com Pix · R\$ 100,00/ })
      .click();
    await expect(page).toHaveURL(/\/lojistas\/pagamento\/pix$/);
    await page.locator("#receipt").setInputFiles(PDF);
    await page.getByLabel("Valor pago").fill("100");
    await page.getByRole("button", { name: "Enviar comprovante" }).click();
    await expect(page).toHaveURL(/\/painel\/pagamento$/, { timeout: 30_000 });

    // Admin abre o PDF pela rota privada e confirma
    await admin.reload();
    const again = card(admin, store.name);
    const href = await again
      .getByRole("link", { name: /Ver comprovante/ })
      .getAttribute("href");
    const file = await admin.request.get(href!);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("application/pdf");
    expect(file.headers()["cache-control"]).toBe("private, no-store");
    expect((await page.request.get(href!)).status()).toBe(200);
    await again.getByRole("button", { name: "Confirmar" }).click();
    await expect(
      admin.getByRole("link", { name: `Avisar ${store.name} no WhatsApp` }),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\/5579998765432\?text=/);

    // Lojista [5e]: no ar, primeiros passos, aviso; catálogo público abre
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/painel\/veiculos$/);
    await expect(
      page.getByText("Assinatura ativa. Sua loja está no ar."),
    ).toBeVisible();
    await expect(page.getByText("(1 de 3)")).toBeVisible();
    await expect(
      page.getByText("Pagamento confirmado. Sua loja está no ar."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Cadastrar primeiro veículo" }),
    ).toHaveAttribute("href", "/painel/veiculos/novo");
    expect(await audit(page), "[5e]").toEqual(CLEAN);
    await page
      .getByRole("listitem")
      .filter({ hasText: "Pagamento confirmado. Sua loja está no ar." })
      .getByRole("button", { name: "Dispensar" })
      .click();
    await expect(
      page.getByText("Pagamento confirmado. Sua loja está no ar."),
    ).toHaveCount(0);
    await page.goto(`/loja/${store.slug}`);
    await expect(heading(page)).toHaveText(store.name);
    await admin.context().close();
  });

  test("[PIX-FR-011] admin registra pagamento sem comprovante e a loja vai ao ar", async ({
    page,
    browser,
    baseURL,
  }) => {
    const store = await signUpStore(page, `m${Date.now().toString(36)}`);
    const admin = await actor(
      browser,
      baseURL!,
      accounts.admin.email,
      "/admin/pagamentos",
    );

    await admin
      .getByRole("button", { name: "Registrar pagamento sem comprovante" })
      .click();
    await admin.getByLabel("Loja (nome ou endereço)").fill(store.slug);
    await admin.getByRole("button", { name: new RegExp(store.name) }).click();
    await admin.getByLabel("Forma de pagamento").selectOption("cash");
    await admin.getByLabel("Valor recebido").fill("100");
    await admin.getByLabel("Observação").fill("Pago em dinheiro na loja");
    await admin.getByRole("button", { name: "Registrar" }).click();
    await expect(
      admin.getByText(
        `Pagamento de ${store.name} registrado. A loja está no ar.`,
      ),
    ).toBeVisible();

    await page.goto("/painel");
    await expect(page).toHaveURL(/\/painel\/veiculos$/);
    await expect(
      page.getByText("Assinatura ativa. Sua loja está no ar."),
    ).toBeVisible();
    await admin.context().close();
  });

  test("[PIX-SEC-003] [PIX-SEC-006] suporte vê a fila sem agir; usuário da loja não paga", async ({
    page,
    browser,
    baseURL,
  }) => {
    const support = await actor(
      browser,
      baseURL!,
      accounts.support.email,
      "/admin/pagamentos",
    );
    await expect(heading(support)).toHaveText("Pagamentos Pix");
    await expect(
      support.getByRole("button", { name: "Confirmar" }),
    ).toHaveCount(0);
    await expect(
      support.getByRole("button", {
        name: "Registrar pagamento sem comprovante",
      }),
    ).toHaveCount(0);
    await support.context().close();

    await page.goto(
      `/entrar?next=${encodeURIComponent("/lojistas/pagamento/pix")}`,
    );
    await signIn(page, accounts.staff.email);
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/lojistas\/pagamento/);
    await expect(
      page.getByRole("button", { name: "Enviar comprovante" }),
    ).toHaveCount(0);
  });
});
