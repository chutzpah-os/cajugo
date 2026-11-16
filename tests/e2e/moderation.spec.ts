import type { Browser, Page } from "@playwright/test";
import { E2E_REPORTS as R } from "../../src/domains/moderation/testing/e2e-seed";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const reportForm = (page: Page) =>
  page.getByRole("form", { name: "Denunciar anúncio" });
const queueCard = (page: Page) =>
  page.getByTestId("report-card").filter({ hasText: "BMW X1" });
/** Conteúdo do `meta robots`; página indexável não tem a tag. */
const robots = (page: Page) =>
  page.evaluate(
    () =>
      document.querySelector('meta[name="robots"]')?.getAttribute("content") ??
      "",
  );

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next.split("?")[0]);
}

/** Outra pessoa numa janela separada, com o aparelho limpo (sem marca de denúncia). */
async function other(browser: Browser, width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 800 },
  });
  return context.newPage();
}

async function report(page: Page, reason: string, details?: string) {
  await page.goto(`/v/${S.reportedId}`);
  await page.getByTestId("report-open").click();
  const f = reportForm(page);
  await expect(f).toBeVisible();
  await f.getByLabel(reason).check();
  if (details) await f.getByLabel("Descreva (opcional)").fill(details);
  await f.getByRole("button", { name: "Enviar denúncia" }).click();
  await expect(page.getByTestId("report-sent")).toHaveText(
    "Denúncia enviada. Vamos analisar.",
  );
}

test.describe.serial("denúncias de anúncio", () => {
  test.setTimeout(120_000);

  test("[RPT-FR-001] [RPT-FR-010] [RPT-FR-002] [RPT-FR-007] [RPT-NFR-001] denunciar em [1b] e ver na fila", async ({
    page,
    browser,
  }) => {
    // Sem motivo, recusa no campo.
    await page.goto(`/v/${S.reportedId}`);
    await page.getByTestId("report-open").click();
    const f = reportForm(page);
    await f.getByRole("button", { name: "Enviar denúncia" }).click();
    await expect(f).toContainText("Escolha um motivo.");
    expect(await audit(page), "[14d] 390 px").toEqual(CLEAN);

    await f.getByLabel("Fotos de outro carro").check();
    await f
      .getByLabel("Descreva (opcional)")
      .fill("A placa da foto é de outro veículo");
    await f.getByRole("button", { name: "Enviar denúncia" }).click();
    await expect(page.getByTestId("report-sent")).toHaveText(
      "Denúncia enviada. Vamos analisar.",
    );
    // O mesmo aparelho de novo: confirma, mas não conta (RPT-FR-010).
    await report(page, "Suspeita de golpe");

    const admin = await other(browser);
    await enterAs(admin, accounts.admin.email, "/admin/denuncias");
    const card = queueCard(admin);
    await expect(card).toHaveCount(1);
    await expect(card.getByTestId("report-count")).toHaveText("2 denúncias");
    await expect(card).toContainText("Preço não real 1");
    await expect(card).toContainText("Fotos de outro carro 1");
    await expect(card).not.toContainText("Suspeita de golpe 1");
    await expect(card).toContainText(R.details);
    await expect(card).toContainText("A placa da foto é de outro veículo");
    expect(await audit(admin), "[14e] 390 px").toEqual(CLEAN);

    // Menu no celular: "Denúncias" na gaveta Mais, com o contador.
    await admin
      .getByRole("navigation", { name: "Menu do painel (celular)" })
      .getByRole("button", { name: "Mais" })
      .click();
    const drawer = admin.getByRole("dialog", { name: "Mais opções do painel" });
    await expect(
      drawer.getByRole("link", { name: /Denúncias/ }).getByTestId("nav-count"),
    ).toHaveText(/^1\b/);
    await admin.context().close();

    // Desktop (1280 px): barra lateral com o contador e a fila sem problemas.
    const desk = await other(browser, 1280);
    await enterAs(desk, accounts.support.email, "/admin/denuncias");
    await expect(
      desk
        .getByRole("navigation", { name: "Menu do painel", exact: true })
        .getByRole("link", { name: /Denúncias/ })
        .getByTestId("nav-count"),
    ).toHaveText(/^1\b/);
    await expect(queueCard(desk)).toHaveCount(1);
    expect(await audit(desk), "[14e] 1280 px").toEqual(CLEAN);
    await desk.context().close();
  });

  test("[RPT-FR-003] Manter tira da fila; denúncia nova traz de volta", async ({
    page,
    browser,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/denuncias");
    await queueCard(page).getByTestId("report-keep").click();
    await expect(queueCard(page)).toHaveCount(0);

    const visitor = await other(browser);
    await report(visitor, "Preço não real");
    await visitor.context().close();

    await page.reload();
    await expect(queueCard(page).getByTestId("report-count")).toHaveText(
      "1 denúncia",
    );
  });

  test("[RPT-SEC-003] lojista não abre a fila", async ({ page }) => {
    await enterAs(page, accounts.showcaseOwner.email, "/painel/veiculos");
    await page.goto("/admin/denuncias");
    await expect(heading(page)).toHaveText("Sem permissão");
    await expect(page.getByTestId("report-card")).toHaveCount(0);
  });

  test("[RPT-FR-004] [RPT-FR-005] [RPT-FR-006] [RPT-FR-009] [RPT-FR-008] [RPT-NFR-003] [RPT-SEC-001] Ocultar, a loja vê o motivo e Mostrar de novo", async ({
    page,
    browser,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/denuncias");
    await queueCard(page).getByTestId("report-hide").click();
    const sheet = page.getByRole("dialog", { name: "Ocultar veículo" });
    await expect(sheet).toContainText(
      "Sai só da vitrine, continua no catálogo da loja; o lojista é avisado com o motivo.",
    );
    await sheet.getByRole("button", { name: "Ocultar da vitrine" }).click();
    await expect(sheet).toContainText("Escolha um motivo.");
    await sheet.getByLabel("Preço não real").check();
    await sheet.getByRole("button", { name: "Ocultar da vitrine" }).click();
    await expect(queueCard(page)).toHaveCount(0);

    // A página abre como veículo do catálogo, fora do Google, na hora (RPT-NFR-003).
    const visitor = await other(browser);
    await visitor.goto(`/v/${S.reportedId}`);
    expect(await robots(visitor)).toContain("noindex");
    await expect(
      visitor.getByRole("link", { name: "Voltar" }).first(),
    ).toHaveAttribute("href", `/loja/${S.slug}`);
    const sitemap = await visitor.request.get("/sitemap/vehicles.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).not.toContain(S.reportedId);

    // A loja: aviso com o motivo, selo e [6e] sem Editar nem Divulgar.
    const owner = await other(browser);
    await enterAs(
      owner,
      accounts.showcaseOwner.email,
      `/painel/veiculos/${S.reportedId}`,
    );
    await expect(owner.getByRole("list", { name: "Avisos" })).toContainText(
      "foi ocultado da vitrine: Preço não real",
    );
    await expect(heading(owner)).toHaveText("Veículo oculto");
    await expect(owner.getByTestId("hidden-notice")).toContainText(
      "Para revisar, fale com a CajuGo",
    );
    const main = owner.locator("main").first();
    await expect(main).not.toContainText("Divulgar na CajuGo");
    await expect(main.getByRole("link", { name: /Editar/ })).toHaveCount(0);
    await expect(
      main.getByRole("button", { name: "Marcar como vendido" }),
    ).toBeVisible();
    await expect(
      main.getByRole("button", { name: "Excluir veículo" }),
    ).toBeVisible();
    await expect(main).not.toContainText(R.details);
    await expect(main).not.toContainText(/denúncia/i);
    expect(await audit(owner), "[6e] oculto").toEqual(CLEAN);

    // Mostrar de novo: volta à vitrine e a loja é avisada.
    await page.goto("/admin/denuncias?aba=ocultados");
    const hidden = page
      .getByTestId("hidden-card")
      .filter({ hasText: "BMW X1" });
    await expect(hidden).toContainText("Preço não real");
    await hidden.getByTestId("report-show").click();
    await expect(hidden).toHaveCount(0);

    await visitor.reload();
    expect(await robots(visitor)).not.toContain("noindex");
    await owner.reload();
    await expect(owner.getByRole("list", { name: "Avisos" })).toContainText(
      "voltou à vitrine CajuGo",
    );
    await visitor.context().close();
    await owner.context().close();
  });
});
