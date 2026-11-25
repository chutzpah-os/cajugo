import { E2E_CANCEL as C } from "../../src/domains/billing/testing/cancel-seed";
import { accounts, audit, expect, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

// O seed (`pnpm e2e:seed`) deixa "Cancela E2E" ativa (vence em 20 dias) e "Cancelada
// E2E" cancelada pelo ciclo real.
test.describe.configure({ mode: "serial" });

test.describe("cancelamento da assinatura (011b)", () => {
  test.setTimeout(90_000);

  test("[CAN-FR-001] [CAN-FR-002] [CAN-FR-003] [CAN-FR-012] [CAN-NFR-001] lojista cancela com motivo, vê o aviso e desfaz", async ({
    page,
  }) => {
    await page.goto("/entrar?next=/painel/conta");
    await signIn(page, accounts.cancelOwner.email);
    await page.waitForURL(/\/painel\/conta$/);

    // [12h]: consequências e o motivo opcional
    await page.getByTestId("cancel-subscription").click();
    const sheet = page.getByRole("dialog");
    await expect(
      sheet.getByText(/ficam no ar até .*Não há multa/),
    ).toBeVisible();
    await expect(sheet.getByText(/guardados por 90 dias/)).toBeVisible();
    await expect(sheet.getByText(/Você pode desfazer até/)).toBeVisible();
    expect(await audit(page), "[12h] 390").toEqual(CLEAN);
    await sheet.getByText("Vou parar de vender").click();
    await sheet.getByRole("button", { name: "Cancelar assinatura" }).click();

    // Conta e painel: o fim agendado com Desfazer
    await expect(
      page.getByRole("heading", { name: /Sua assinatura termina em/ }),
    ).toBeVisible();
    await expect(page.getByText("Motivo: Vou parar de vender.")).toBeVisible();
    await page.goto("/painel/veiculos");
    const banner = page.getByRole("status").filter({
      hasText: "Sua assinatura termina em",
    });
    await expect(banner).toBeVisible();
    expect(await audit(page), "aviso 390").toEqual(CLEAN);

    // Desfazer volta a ativa
    await banner.getByTestId("undo-cancel").click();
    await expect(banner).toBeHidden();
    await page.goto("/painel/conta");
    await expect(page.getByTestId("cancel-subscription")).toBeVisible();
  });

  test("[CAN-FR-010] [CAN-NFR-001] admin vê o cancelamento agendado em [4b] (390 e 1280 px)", async ({
    page,
    browser,
    baseURL,
  }) => {
    // O lojista agenda de novo (o teste anterior desfez)
    await page.goto("/entrar?next=/painel/conta");
    await signIn(page, accounts.cancelOwner.email);
    await page.waitForURL(/\/painel\/conta$/);
    await page.getByTestId("cancel-subscription").click();
    const sheet = page.getByRole("dialog");
    await sheet.getByText("Vou parar de vender").click();
    await sheet.getByRole("button", { name: "Cancelar assinatura" }).click();
    await expect(
      page.getByRole("heading", { name: /Sua assinatura termina em/ }),
    ).toBeVisible();

    for (const width of [390, 1280]) {
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
      });
      const admin = await context.newPage();
      await admin.goto("/entrar?next=/admin/assinaturas?filtro=cancelamento");
      await signIn(admin, accounts.admin.email);
      await admin.waitForURL(/\/admin\/assinaturas/);
      const card = admin
        .getByTestId("subscription")
        .filter({ hasText: C.active.storeName });
      await expect(card).toBeVisible();
      await expect(card.getByText("Vou parar de vender")).toBeVisible();
      await expect(
        admin.getByRole("link", { name: "Canceladas" }),
      ).toBeVisible();
      expect(await audit(admin), `[4b] ${width}`).toEqual(CLEAN);
      await context.close();
    }

    // Deixa a loja como o seed (ativa) para a próxima rodada da suíte
    await page.goto("/painel/conta");
    await page.getByTestId("undo-cancel").first().click();
    await expect(page.getByTestId("cancel-subscription")).toBeVisible();
  });

  test("[CAN-SEC-005] loja cancelada: 404, 'não está mais na CajuGo' e fora da busca", async ({
    page,
  }) => {
    const res = await page.goto(`/loja/${C.gone.slug}`);

    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Esta loja não está mais na CajuGo" }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("[CAN-FR-005] [CAN-FR-006] lojista da loja cancelada: só a Conta, com Reassinar para a 1ª mensalidade", async ({
    page,
  }) => {
    await page.goto("/entrar?next=/painel/veiculos");
    await signIn(page, accounts.canceledOwner.email);
    await page.waitForURL(/\/painel\/conta$/);
    await expect(
      page.getByRole("heading", { name: /Assinatura cancelada em/ }),
    ).toBeVisible();
    expect(await audit(page), "[3c] cancelada").toEqual(CLEAN);

    await page.getByTestId("resubscribe").click();
    await page.waitForURL(/\/lojistas\/pagamento$/);
  });

  test("[CAN-FR-011] [CAN-NFR-001] admin abre Editar plano; data com menos de 30 dias é recusada", async ({
    page,
  }) => {
    await page.goto("/entrar?next=/admin/assinaturas");
    await signIn(page, accounts.admin.email);
    await page.waitForURL(/\/admin\/assinaturas$/);

    await page.getByTestId("edit-plan").click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Nova mensalidade").fill("120,00");
    const today = new Date().toISOString().slice(0, 10);
    await sheet.getByLabel("Vale a partir de").fill(today);
    expect(await audit(page), "Editar plano 390").toEqual(CLEAN);
    await sheet.getByRole("button", { name: "Salvar" }).click();

    await expect(sheet.getByText(/Escolha uma data a partir de/)).toBeVisible();
    await expect(page.getByTestId("plan-upcoming")).toHaveCount(0);
  });
});
