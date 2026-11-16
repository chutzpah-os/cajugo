import { randomInt } from "node:crypto";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import { E2E_SELLER as V } from "../../src/domains/sellers/testing/e2e-seed";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
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
const PNG = path.join(__dirname, "files", "logo.png");
const PDF = path.join(__dirname, "files", "comprovante.pdf");

/** CPF válido aleatório (dígitos verificadores), para não repetir entre rodadas. */
function randomCpf(): string {
  const d = Array.from({ length: 9 }, () => randomInt(10));
  const dv = (n: number[]) => {
    const s = n.reduce((acc, x, i) => acc + x * (n.length + 1 - i), 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  d.push(dv(d));
  d.push(dv(d));
  return d.join("");
}

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
}

async function windowAs(
  browser: Browser,
  email: string,
  next: string,
  width = 390,
) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 800 },
  });
  const page = await context.newPage();
  await enterAs(page, email, next);
  return page;
}

test.describe.serial("Rede Caju: vendedor", () => {
  test.setTimeout(150_000);
  const name = `Ana E2E ${randomInt(1e6)}`;
  const email = `e2e-cadastro-vendedor-${randomInt(1e9)}@cajugo.test`;

  test("[SEL-FR-001] [SEL-FR-002] [SEL-NFR-001] cadastro com a foto do documento fica Em análise", async ({
    page,
  }) => {
    await page.goto("/rede/cadastro");
    await expect(heading(page)).toHaveText("Seja vendedor da Rede Caju");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Informe seu nome.")).toBeVisible();
    expect(await audit(page), "[7a] 390 px").toEqual(CLEAN);

    await page.getByLabel("Nome completo").fill(name);
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Celular").fill("(79) 99999-1234");
    await page.getByLabel("CPF", { exact: true }).fill("111.111.111-11");
    await page.getByLabel("Cidade", { exact: true }).fill("Aracaju");
    await page.getByLabel("Tipo da chave Pix").selectOption("email");
    await page.getByLabel("Chave Pix", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password());
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("CPF inválido.")).toBeVisible();

    await page.getByLabel("CPF", { exact: true }).fill(randomCpf());
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForURL("**/rede/cadastro/documento");
    await page.getByTestId("document-front").setInputFiles(PNG);
    await expect(page.getByText("✓ Enviada")).toHaveCount(1);
    await page.getByTestId("document-back").setInputFiles(PDF);
    await expect(page.getByText("✓ Enviada")).toHaveCount(2);
    await page.getByRole("button", { name: "Concluir cadastro" }).click();
    await page.waitForURL((u) => u.pathname === "/rede");
    await expect(page.getByTestId("seller-status")).toContainText(
      "Cadastro em análise",
    );
    await expect(page.getByTestId("seller-status")).toContainText(
      "Você não paga nada",
    );
  });

  test("[SEL-FR-003] [SEL-FR-004] [SEL-FR-005] [SEL-SEC-005] [SEL-SEC-009] admin abre o documento, aprova, bloqueia e desbloqueia; suporte só vê", async ({
    page,
    browser,
  }) => {
    const support = await windowAs(
      browser,
      accounts.support.email,
      "/admin/vendedores",
    );
    const asSupport = support
      .getByTestId("seller-in_review")
      .filter({ hasText: name });
    await expect(asSupport).toHaveCount(1);
    await expect(support.getByTestId("seller-approve")).toHaveCount(0);
    await support.context().close();

    await enterAs(page, accounts.admin.email, "/admin/vendedores");
    const card = page.getByTestId("seller-in_review").filter({ hasText: name });
    const front = await card
      .getByRole("link", { name: "Frente do documento" })
      .getAttribute("href");
    const file = await page.request.get(front!);
    expect(file.status()).toBe(200);
    expect(file.headers()["cache-control"]).toBe("private, no-store");
    expect(await audit(page), "[7h] 390 px").toEqual(CLEAN);

    await card.getByTestId("seller-approve").click();
    const active = page.getByTestId("seller-active").filter({ hasText: name });
    await expect(active).toHaveCount(1);
    await expect(active).toContainText("Código ANA");

    await active.getByTestId("seller-block").click();
    const sheet = page.getByRole("dialog", { name: `Bloquear ${name}?` });
    await sheet.getByLabel("Motivo").fill("Cobrou sinal por fora");
    await sheet.getByRole("button", { name: "Bloquear" }).click();
    const blocked = page
      .getByTestId("seller-blocked")
      .filter({ hasText: name });
    await expect(blocked).toContainText("Cobrou sinal por fora");

    const seller = await windowAs(browser, email, "/rede");
    await expect(seller.getByTestId("seller-status")).toContainText(
      "Cobrou sinal por fora",
    );
    await blocked.getByTestId("seller-unblock").click();
    await expect(active).toHaveCount(1);
    await seller.reload();
    await expect(seller.getByTestId("seller-clicks")).toBeVisible();
    await seller.context().close();
  });

  test("[SEL-FR-007] [SEL-FR-008] [SEL-FR-009] [SEL-FR-006] vitrine com 'Você ganha', link do vendedor e pedir parceria", async ({
    page,
  }) => {
    await enterAs(page, accounts.sellerReferrer.email, "/rede/vitrine");
    const full = page
      .getByTestId("seller-card")
      .filter({ has: page.locator(`a[href^="/v/${S.fullId}"]`) });
    await expect(full.getByTestId("seller-earn")).toContainText("Você ganha");
    await expect(full.getByTestId("seller-copy")).toHaveAttribute(
      "data-url",
      new RegExp(`/v/${S.fullId}-.*\\?ref=${V.code}$`),
    );
    expect(await audit(page), "[7c] 390 px").toEqual(CLEAN);

    await page.goto("/rede/vitrine?q=recife");
    const recife = page
      .getByTestId("seller-card")
      .filter({ hasText: S.recifeName })
      .first();
    await expect(recife.getByTestId("seller-earn")).toHaveCount(0);
    await recife.getByRole("button", { name: "Pedir parceria" }).click();
    await expect(recife).toContainText("aguardando a loja");

    await page.goto("/rede/vitrine?marca=bmw");
    await expect(page.getByTestId("seller-card").first()).toContainText("BMW");

    await page.goto("/rede");
    const stores = page.getByTestId("seller-store");
    await expect(stores.filter({ hasText: S.storeName })).toContainText(
      "Parceiro",
    );
    await expect(stores.filter({ hasText: S.recifeName })).toContainText(
      "Pendente",
    );
  });

  test("[SEL-FR-010] [SEL-FR-011] link do vendedor conta o clique e o contato chega como 'via vendedor'", async ({
    page,
    browser,
  }) => {
    const buyer = `Iris Vend ${randomInt(1e6)}`;
    await page.goto(`/v/${S.fullId}?ref=${V.code}`);
    const form = page.getByRole("form", { name: "Envie uma mensagem à loja" });
    await form.getByLabel("Nome").fill(buyer);
    await form.getByLabel("E-mail").fill("iris@e2e.test");
    await form.getByLabel("Telefone").fill("(79) 99999-0000");
    await form.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByTestId("lead-sent")).toBeVisible();

    const owner = await windowAs(
      browser,
      accounts.showcaseOwner.email,
      "/painel/leads",
    );
    await expect(
      owner.getByTestId("lead-card").filter({ hasText: buyer }),
    ).toContainText(`via vendedor ${V.name}`);
    await owner.context().close();

    const seller = await windowAs(
      browser,
      accounts.sellerReferrer.email,
      "/rede",
    );
    await expect(seller.getByTestId("seller-clicks")).not.toHaveText("0");
    await seller.context().close();
  });

  test("[SEL-FR-014] [SEL-SEC-001] conta com CPF mascarado e troca da chave Pix", async ({
    page,
  }) => {
    await enterAs(page, accounts.sellerReferrer.email, "/rede/conta");
    await expect(page.getByTestId("seller-cpf")).toHaveText(
      "CPF 529.***.***-25",
    );
    await page.getByRole("button", { name: "Trocar" }).click();
    await page.getByLabel("Tipo da chave Pix").selectOption("phone");
    await page.getByLabel("Chave Pix", { exact: true }).fill("(79) 98888-7777");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByTestId("seller-pix")).toHaveText("+5579988887777");
    expect(await audit(page), "[13c] 390 px").toEqual(CLEAN);
  });
});

test.describe("Rede Caju no desktop (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[SEL-FR-015] [SEL-NFR-001] menu do vendedor na barra lateral e vitrine sem problemas", async ({
    page,
  }) => {
    await enterAs(page, accounts.sellerReferrer.email, "/rede/vitrine");
    const side = page.getByRole("navigation", {
      name: "Menu do painel",
      exact: true,
    });
    for (const label of ["Início", "Vitrine", "Extrato", "Conta"])
      await expect(side.getByRole("link", { name: label })).toBeVisible();
    expect(await audit(page), "[7c] 1280 px").toEqual(CLEAN);
    await page.goto("/rede/extrato");
    await expect(page.getByText("Suas vendas aparecem aqui")).toBeVisible();
  });
});
