import { randomInt } from "node:crypto";
import type { Page } from "@playwright/test";
import { E2E_ALERTS as A } from "../../src/domains/buyers/testing/e2e-seed";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
/** Celular novo a cada teste: o limite e a busca repetida são por celular. */
const phone = () => `(79) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
const form = (page: Page) =>
  page.getByRole("form", { name: "Avisar quando chegar" });

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
}

async function ask(page: Page, cell: string) {
  await page.getByRole("button", { name: "Avisar quando chegar" }).click();
  await form(page).getByLabel("Nome").fill("Teste E2E");
  await form(page).getByLabel("Celular com WhatsApp").fill(cell);
  await form(page).getByRole("checkbox").check();
  await form(page)
    .getByRole("button", { name: "Avisar quando chegar" })
    .click();
}

test.describe("Avisar quando chegar (390 px)", () => {
  test.setTimeout(120_000);

  test("[ALR-FR-001] [ALR-FR-004] [ALR-FR-006] pedido na vitrine, repetido e cancelado pelo link", async ({
    page,
  }) => {
    const cell = phone();
    await page.goto(`/?q=e2e-nada-${randomInt(1e6)}`);
    await expect(page.getByTestId("no-results")).toBeVisible();

    // Fixo e sem consentimento são recusados
    await page.getByRole("button", { name: "Avisar quando chegar" }).click();
    await form(page).getByLabel("Nome").fill("Teste E2E");
    await form(page).getByLabel("Celular com WhatsApp").fill("(79) 3211-0000");
    await form(page)
      .getByRole("button", { name: "Avisar quando chegar" })
      .click();
    await expect(form(page)).toContainText("Informe um celular com WhatsApp");
    await expect(form(page)).toContainText("Aceite para receber o aviso");
    expect(await audit(page), "[12a] com formulário").toEqual(CLEAN);

    await form(page).getByLabel("Celular com WhatsApp").fill(cell);
    await form(page).getByRole("checkbox").check();
    await form(page)
      .getByRole("button", { name: "Avisar quando chegar" })
      .click();
    const done = page.getByTestId("alert-done");
    await expect(done).toContainText("Vamos avisar quando chegar");
    const cancelHref = await done
      .getByRole("link", { name: "Não quero mais este aviso" })
      .getAttribute("href");

    // A mesma busca do mesmo celular não repete
    await page.reload();
    await ask(page, cell);
    await expect(page.getByTestId("alert-done")).toContainText(
      "Já estamos de olho nessa busca",
    );

    await page.goto(cancelHref!);
    await expect(heading(page)).toHaveText("Cancelar aviso");
    await page.getByRole("button", { name: "Cancelar aviso" }).click();
    await expect(page.getByTestId("cancel-outcome")).toHaveText(
      "Aviso cancelado. Não vamos mais mandar mensagem sobre esta busca.",
    );
    await page.reload();
    await page.getByRole("button", { name: "Cancelar aviso" }).click();
    await expect(page.getByTestId("cancel-outcome")).toHaveText(
      "Este alerta já foi encerrado.",
    );
  });

  test("[ALR-FR-001] na descoberta sim; no catálogo da loja, não", async ({
    page,
  }) => {
    await page.goto(`/carros/fiat?q=e2e-nada-${randomInt(1e6)}`);
    await ask(page, phone());
    await expect(page.getByTestId("alert-done")).toContainText(
      "Vamos avisar quando chegar",
    );

    await page.goto(`/loja/${S.slug}?q=e2e-nada`);
    await expect(page.getByTestId("no-results")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Avisar quando chegar" }),
    ).toHaveCount(0);
  });

  test("[ALR-SEC-005] link adulterado não cancela nada", async ({ page }) => {
    await page.goto(
      "/alertas/cancelar/00000000-0000-4000-8000-000000000000.abc",
    );
    await page.getByRole("button", { name: "Cancelar aviso" }).click();
    await expect(page.getByTestId("cancel-outcome")).toHaveText(
      "Link inválido.",
    );
  });

  test("[ALR-FR-002] [ALR-FR-003] [ALR-NFR-003] admin vê o compatível, avisa e marca como avisado", async ({
    page,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/alertas");
    await expect(heading(page)).toHaveText("Alertas");

    const matched = page
      .getByTestId("alert-matched")
      .filter({ hasText: A.matchedName });
    await expect(matched).toHaveCount(1);
    await expect(
      matched.getByRole("link", { name: /Argo V0/ }),
    ).toHaveAttribute("href", new RegExp(`/v/${S.fullId}`));
    const href = decodeURIComponent(
      (await matched.getByTestId("alert-whatsapp").getAttribute("href"))!,
    );
    expect(href).toMatch(
      new RegExp(`^https://wa\\.me/${A.matchedPhone}\\?text=`),
    );
    expect(href).toContain(`Olá, ${A.matchedName}!`);
    expect(href).toContain("/alertas/cancelar/");
    await expect(
      page.getByTestId("alert-waiting").filter({ hasText: "e2e-sem-carro" }),
    ).toHaveCount(1);
    expect(await page.content()).not.toContain("5579990000002");

    // Contador no menu (gaveta "Mais" no celular)
    await page.getByRole("button", { name: "Mais" }).click();
    const item = page
      .getByRole("dialog", { name: "Mais opções do painel" })
      .getByRole("link", { name: /Alertas/ });
    await expect(item.getByTestId("nav-count")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await audit(page), "Alertas").toEqual(CLEAN);

    await matched.getByRole("button", { name: "Marcar como avisado" }).click();
    await expect(
      page.getByTestId("alert-matched").filter({ hasText: A.matchedName }),
    ).toHaveCount(0);
  });

  test("[ALR-SEC-001] lojista não vê os alertas", async ({ page }) => {
    await enterAs(page, accounts.owner.email, "/painel");
    await page.goto("/admin/alertas");
    await expect(page.getByText(A.matchedName)).toHaveCount(0);
    await expect(page.getByTestId("alert-matched")).toHaveCount(0);
  });
});

test.describe("Avisar quando chegar no desktop (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[ALR-NFR-001] formulário e tela Alertas no desktop", async ({
    page,
  }) => {
    await page.goto(`/?q=e2e-nada-${randomInt(1e6)}`);
    await page.getByRole("button", { name: "Avisar quando chegar" }).click();
    await expect(form(page)).toBeVisible();
    expect(await audit(page), "[12a] desktop").toEqual(CLEAN);

    await enterAs(page, accounts.support.email, "/admin/alertas");
    await expect(heading(page)).toHaveText("Alertas");
    await expect(
      page
        .getByRole("navigation", { name: "Menu do painel" })
        .getByRole("link", {
          name: /Alertas/,
        }),
    ).toBeVisible();
    expect(await audit(page), "Alertas desktop").toEqual(CLEAN);
  });
});
