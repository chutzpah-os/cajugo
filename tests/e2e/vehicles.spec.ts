import path from "node:path";
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

const PHOTO = path.join(__dirname, "files", "logo.png");
const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const PLATE = "ABC1D23";

async function enterAsOwner(page: Page, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, accounts.owner.email);
  await page.waitForURL((u) => u.pathname === next);
}

/** Identificação pela FIPE real (guardada no banco depois da 1ª consulta). */
async function chooseVehicle(page: Page) {
  await page.getByLabel("Marca").selectOption({ label: "GM - Chevrolet" });
  const model = page.getByLabel("Modelo", { exact: true });
  await expect(model).toBeEnabled({ timeout: 20_000 });
  await model.selectOption({ label: "ONIX" });
  const version = page.getByLabel("Versão");
  await version.selectOption(
    (await version.locator("option").nth(1).getAttribute("value"))!,
  );
  const year = page.getByLabel("Ano modelo");
  await expect(year).toBeEnabled({ timeout: 20_000 });
  await year.selectOption(
    (await year.locator("option").nth(1).getAttribute("value"))!,
  );
  const made = page.getByLabel("Ano fabricação");
  await expect(made).toBeEnabled({ timeout: 20_000 });
  await made.selectOption({ index: 2 });
}

const saved = (page: Page) =>
  expect(page.getByTestId("autosave")).toHaveText("Rascunho salvo", {
    timeout: 20_000,
  });

test.describe("veículos do lojista", () => {
  test.setTimeout(180_000);

  test("[VEH-FR-001] [VEH-FR-002] [VEH-FR-003] [VEH-FR-004] [VEH-FR-005] [VEH-FR-006] [VEH-FR-007] [VEH-FR-008] [VEH-FR-009] [VEH-FR-010] [VEH-FR-011] [VEH-FR-013] [VEH-FR-014] [VEH-FR-015] [VEH-NFR-001] [VEH-NFR-003] [VEH-SEC-002] [VEH-SEC-004] cadastra, publica, vende, desfaz e exclui", async ({
    page,
  }) => {
    await enterAsOwner(page, "/painel/veiculos/novo");
    expect(await audit(page), "[2a]").toEqual(CLEAN);

    // Publicar vazio mostra o que falta
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Envie pelo menos 1 foto.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Informe o preço.")).toBeVisible();

    // Fotos: duas, a segunda vira capa pelas setas
    await page.getByTestId("photo-input").setInputFiles(PHOTO);
    await expect(page.getByTestId("photo-count")).toHaveText("1/20", {
      timeout: 30_000,
    });
    await page.getByTestId("photo-input").setInputFiles(PHOTO);
    await expect(page.getByTestId("photo-count")).toHaveText("2/20", {
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Mover foto 2 para antes" }).click();
    await expect(page.getByRole("img", { name: "Foto de capa" })).toBeVisible();

    // Identificação, ficha, preço e condições
    await chooseVehicle(page);
    await page.getByLabel("Placa", { exact: true }).fill("abc1d23");
    await page.getByLabel("Quilometragem").fill("42000");
    await page.getByLabel("Câmbio").selectOption("manual");
    await page.getByLabel("Combustível").selectOption("flex");
    await page.getByLabel("Preço de venda").fill("50.000");
    await expect(page.getByTestId("fipe-reference")).toContainText(
      /% (abaixo|acima)/,
      {
        timeout: 20_000,
      },
    );
    await page
      .getByRole("radiogroup", { name: "Único dono" })
      .getByText("Sim")
      .click();
    await page.getByRole("button", { name: "Airbag" }).click();
    await expect(page.getByText("1 selecionados")).toBeVisible();
    await page.getByLabel(/Conte o que o comprador/).fill("Revisado.");
    await expect(page.getByText("9/2000")).toBeVisible();
    await saved(page);

    // Fecha e volta: nada se perdeu
    const editUrl = page.url();
    expect(editUrl).toMatch(/\/painel\/veiculos\/[0-9a-f-]+\/editar$/);
    await page.goto("/painel/veiculos?status=draft");
    await page
      .getByRole("link", { name: /^Editar / })
      .first()
      .click();
    await page.waitForURL(/\/painel\/veiculos\/[0-9a-f-]+$/);
    await page.getByRole("link", { name: "Editar Preço" }).click();
    await expect(page.getByLabel("Preço de venda")).toHaveValue("50.000,00", {
      timeout: 20_000,
    });
    await expect(page.getByLabel("Placa", { exact: true })).toHaveValue(PLATE);

    // Publica
    await page.getByRole("button", { name: "Publicar" }).click();
    await page.waitForURL(/\/painel\/veiculos\/[0-9a-f-]+$/, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("days-on-air")).toHaveText("0 dias no ar");
    await expect(heading(page)).toHaveText("Editar veículo");
    expect(await audit(page), "[6e]").toEqual(CLEAN);
    const summaryUrl = page.url();

    // Catálogo mostra sem a placa
    await page.goto("/loja/e2e-loja");
    await expect(page.locator("main ul li")).toHaveCount(1);
    await expect(page.locator("main ul li")).toContainText("R$ 50.000,00");
    expect(await page.content()).not.toContain(PLATE);

    // Lista: indicadores, filtro, busca por placa e primeiros passos
    await page.goto("/painel/veiculos");
    await expect(page.getByTestId("kpi-Publicados")).toHaveText("1");
    await expect(page.getByTestId("subscription-card")).toContainText(
      "Plano Catálogo",
    );
    expect(await audit(page), "[1c]").toEqual(CLEAN);
    await page.getByLabel("Buscar por modelo ou placa").fill(PLATE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/q=ABC1D23/);
    await expect(page.locator("main ul li")).toHaveCount(1);

    // Vendido sai do catálogo; desfazer volta
    await page.goto(summaryUrl);
    await page
      .getByRole("button", { name: "Marcar como vendido" })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Marcar como vendido" })
      .click();
    await expect(
      page.getByRole("button", { name: "Desfazer venda" }),
    ).toBeVisible({ timeout: 20_000 });
    await page.goto("/loja/e2e-loja");
    await expect(
      page.getByText("Esta loja ainda não tem veículos publicados."),
    ).toBeVisible();
    await page.goto(summaryUrl);
    await page.getByRole("button", { name: "Desfazer venda" }).click();
    await expect(page.getByRole("button", { name: "Despublicar" })).toBeVisible(
      { timeout: 20_000 },
    );
    await page.goto("/loja/e2e-loja");
    await expect(page.locator("main ul li")).toHaveCount(1);

    // Despublicar e excluir
    await page.goto(summaryUrl);
    await page.getByRole("button", { name: "Despublicar" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Despublicar" })
      .click();
    await expect(
      page.getByRole("button", { name: "Marcar como vendido" }),
    ).toHaveCount(0, { timeout: 20_000 });
    await page.getByRole("button", { name: "Excluir veículo" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Excluir veículo" })
      .click();
    await page.waitForURL(/\/painel\/veiculos$/, { timeout: 20_000 });
    await page.goto(summaryUrl);
    await expect(page.getByText("Página não encontrada")).toBeVisible();
  });

  test("[VEH-SEC-001] outra loja não abre o veículo; usuário da loja cadastra", async ({
    page,
    browser,
    baseURL,
  }) => {
    // Rascunho da loja de teste, criado pelo usuário da loja (também cuida de veículos)
    await page.goto(
      `/entrar?next=${encodeURIComponent("/painel/veiculos/novo")}`,
    );
    await signIn(page, accounts.staff.email);
    await page.waitForURL(/\/painel\/veiculos\/novo$/);
    await page.getByLabel("Quilometragem").fill("1000");
    await saved(page);
    const url = new URL(page.url()).pathname;
    expect(url).toMatch(/\/editar$/);

    // Outra loja, recém-cadastrada
    const stamp = `v${Date.now().toString(36)}`;
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
    });
    const other = await context.newPage();
    const ip = `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
    await other.route(`${baseURL}/**`, (route) =>
      route.continue({
        headers: { ...route.request().headers(), "x-forwarded-for": ip },
      }),
    );
    await other.goto("/lojistas/cadastro");
    await other.getByLabel("Nome da loja").fill(`E2E Carros ${stamp}`);
    await expect(other.locator("#slug-status")).toHaveText("Disponível");
    await other.getByRole("combobox", { name: "Cidade" }).fill("Aracaj");
    await other.getByRole("option", { name: /Aracaju\/SE/ }).click();
    await other.getByLabel("WhatsApp da loja").fill("(79) 99876-5432");
    await other.getByLabel("Seu nome").fill("Carros E2E");
    await other.getByLabel("E-mail").fill(`e2e-cadastro-${stamp}@cajugo.test`);
    await other
      .getByLabel("Celular")
      .fill(`(79) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`);
    await other.getByLabel("Senha", { exact: true }).fill(password());
    await other.getByRole("checkbox", { name: /Li e aceito/ }).check();
    await other
      .getByRole("button", { name: "Continuar para pagamento" })
      .click();
    await expect(other).toHaveURL(/\/lojistas\/pagamento$/, {
      timeout: 20_000,
    });

    // Loja ainda não ativada é levada ao pagamento; ativa, veria 404 (coberto no serviço)
    await other.goto(url);
    await expect(other.getByLabel("Quilometragem")).toHaveCount(0);
    await context.close();
  });
});
