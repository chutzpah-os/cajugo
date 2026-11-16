import { randomInt } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { E2E_LEADS as L } from "../../src/domains/leads/testing/e2e-seed";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { accounts, audit, expect, heading, signIn, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const form = (page: Page) =>
  page.getByRole("form", { name: "Envie uma mensagem à loja" });
const cards = (page: Page) => page.getByTestId("lead-card");
const card = (page: Page, text: string) =>
  cards(page).filter({ hasText: text });

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
}

/** Painel da loja da vitrine numa janela separada (o visitante segue em outra). */
async function ownerPage(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await enterAs(page, accounts.showcaseOwner.email, "/painel/leads");
  await expect(cards(page).first()).toBeVisible();
  return page;
}

test.describe("leads (390 px)", () => {
  test.setTimeout(120_000);

  test("[LED-FR-001] [LED-FR-002] [LED-FR-004] [LED-SEC-004] mensagem pela vitrine vira lead via CajuGo", async ({
    page,
    browser,
  }) => {
    const name = `Iris E2E ${randomInt(1e6)}`;
    await page.goto(`/v/${S.fullId}`);
    const f = form(page);
    await expect(f.getByRole("link", { name: "Privacidade" })).toHaveAttribute(
      "href",
      "/termos#privacidade",
    );
    await expect(f.getByLabel("Mensagem")).toHaveValue(
      "Olá, tenho interesse no veículo. Por favor entre em contato.",
    );

    await f.getByLabel("Nome").fill(name);
    await f.getByLabel("E-mail").fill("iris@");
    await f.getByLabel("Telefone").fill("1234");
    await f.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(f).toContainText("Informe um e-mail válido.");
    await expect(f).toContainText("Informe DDD e número");
    expect(await audit(page), "[1b] formulário").toEqual(CLEAN);

    await f.getByLabel("E-mail").fill("iris@e2e.test");
    await f.getByLabel("Telefone").fill("(79) 99999-0000");
    await f.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByTestId("lead-sent")).toHaveText(
      "Mensagem enviada. A loja vai responder em breve.",
    );

    const owner = await ownerPage(browser);
    const lead = card(owner, name);
    await expect(lead).toHaveCount(1);
    await expect(lead).toContainText("Novo");
    await expect(lead).toContainText("via CajuGo");
    await owner.context().close();
  });

  test("[LED-FR-003] [LED-FR-013] [LED-FR-014] [LED-FR-004] WhatsApp pelo catálogo: dois toques, um lead Seu catálogo", async ({
    page,
    browser,
  }) => {
    await page
      .context()
      .route("https://wa.me/**", (route) =>
        route.fulfill({ body: "WhatsApp" }),
      );
    const owner = await ownerPage(browser);
    const whatsappCards = card(owner, "Contato pelo WhatsApp");
    const before = await whatsappCards.count();

    await page.goto(`/loja/${S.slug}`);
    await page.goto(`/v/${S.fullId}`);
    for (let i = 0; i < 2; i++) {
      const popup = page.waitForEvent("popup");
      await page.getByTestId("whatsapp").click();
      await (await popup).close();
    }

    await expect(async () => {
      await owner.reload();
      expect(await whatsappCards.count()).toBe(before + 1);
    }).toPass({ timeout: 15_000 });
    const newest = whatsappCards.first();
    await expect(newest).toContainText("Seu catálogo");
    await expect(newest).toContainText("Em contato");
    await expect(newest.getByRole("link", { name: "Ligar" })).toHaveCount(0);
    await owner.context().close();
  });

  test("[LED-FR-005] [LED-FR-006] [LED-FR-007] [LED-FR-008] [LED-FR-009] [LED-FR-010] [LED-FR-011] [LED-NFR-003] tela Leads, contador e status", async ({
    page,
  }) => {
    await enterAs(page, accounts.showcaseOwner.email, "/painel/leads");
    await expect(heading(page)).toHaveText("Leads");
    await expect(page.getByTestId("kpi-new-leads")).not.toHaveText("0");
    await expect(page.getByTestId("kpi-cajugo-share")).toHaveText(/%$/);

    // Contador no menu (barra do celular)
    const nav = page.getByRole("navigation", {
      name: "Menu do painel (celular)",
    });
    await expect(
      nav.getByRole("link", { name: /Leads/ }).getByTestId("nav-count"),
    ).toBeVisible();

    // Novo há mais de 24 h em destaque; o recente, não
    await expect(card(page, L.oldNewName)).toHaveAttribute(
      "data-highlight",
      "true",
    );
    await expect(card(page, L.oldNewName)).toContainText("Seu catálogo");
    await expect(card(page, L.newName)).not.toHaveAttribute(
      "data-highlight",
      "true",
    );
    const fresh = card(page, L.newName);
    for (const text of ["Argo", "R$", "via CajuGo", "Olá, tenho interesse"])
      await expect(fresh).toContainText(text);
    await expect(fresh.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/5579990000010\?text=/,
    );
    await expect(fresh.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5579990000010",
    );

    // Veículo excluído sem link
    const gone = card(page, L.deletedVehicleName);
    await expect(gone).toContainText("Fiat UNO · Veículo excluído");
    await expect(gone.getByRole("link", { name: /UNO/ })).toHaveCount(0);
    expect(await audit(page), "[3a]").toEqual(CLEAN);

    // Filtro Novo
    await page
      .getByRole("navigation", { name: "Filtrar leads" })
      .getByRole("link", { name: /^Novo/ })
      .click();
    await expect(page).toHaveURL(/status=new/);
    await expect(card(page, L.contactingName)).toHaveCount(0);
    await expect(card(page, L.newName)).toHaveCount(1);

    // Avançar e Perdido
    await page.goto("/painel/leads");
    await card(page, L.contactingName)
      .getByRole("button", { name: "→ Negociando" })
      .click();
    await expect(card(page, L.contactingName)).toContainText("Negociando");
    const fabi = card(page, L.negotiatingName);
    await fabi.getByLabel("Mais ações do lead").click();
    await fabi.getByRole("button", { name: "Perdido" }).click();
    await expect(fabi).toContainText("Perdido");
    await expect(fabi.getByRole("button", { name: /→/ })).toHaveCount(0);
    await expect(
      card(page, L.soldName).getByRole("button", { name: /→/ }),
    ).toHaveCount(0);

    // Tocar no veículo abre a edição, com o desempenho do anúncio
    await card(page, L.newName).getByRole("link", { name: /Argo/i }).click();
    await page.waitForURL(new RegExp(`/painel/veiculos/${S.fullId}$`));
    await expect(page.getByText("Desempenho do anúncio")).toBeVisible();
    await expect(page.getByTestId("perf-leads")).not.toHaveText("0");
  });

  test("[LED-SEC-003] vitrine e catálogo não mostram o contato de quem enviou lead", async ({
    page,
  }) => {
    for (const path of ["/", `/loja/${S.slug}`, `/v/${S.fullId}`]) {
      await page.goto(path);
      const html = await page.content();
      expect(html, path).not.toContain(L.newName);
      expect(html, path).not.toContain("5579990000010");
    }
  });
});

test.describe("leads no desktop (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[LED-NFR-001] formulário em [1b] e tela Leads no desktop", async ({
    page,
  }) => {
    await page.goto(`/v/${S.fullId}`);
    await expect(form(page)).toBeVisible();
    expect(await audit(page), "[1b] desktop").toEqual(CLEAN);

    await enterAs(page, accounts.showcaseOwner.email, "/painel/leads");
    await expect(heading(page)).toHaveText("Leads");
    await expect(
      page
        .getByRole("navigation", { name: "Menu do painel" })
        .getByRole("link", { name: /Leads/ }),
    ).toBeVisible();
    expect(await audit(page), "[3a] desktop").toEqual(CLEAN);
  });
});
