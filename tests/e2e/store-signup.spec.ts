import path from "node:path";
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

const LOGO = path.join(__dirname, "files", "logo.png");

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === next);
}

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Menu" }).click();
  return page.getByRole("navigation", { name: "Menu principal" });
}

async function pickCity(page: Page, text: string, option: RegExp) {
  await page.getByRole("combobox", { name: "Cidade" }).fill(text);
  await page.getByRole("option", { name: option }).click();
}

test.describe("cadastro do lojista e Minha loja", () => {
  test("[STO-FR-001] menu da home: visitante vê Entrar; conectado vê o nome e o painel", async ({
    page,
  }) => {
    await page.goto("/");
    let menu = await openMenu(page);
    for (const item of [
      "Comprar veículos",
      "Catálogo para lojas",
      "Rede Caju",
      "Caju Indica",
      "Favoritos",
      "Entrar",
    ])
      await expect(menu.getByRole("link", { name: item })).toBeVisible();

    await enterAs(page, accounts.owner.email, "/painel");
    await page.goto("/");
    menu = await openMenu(page);
    await expect(menu).toContainText("Olá,");
    await expect(menu.getByRole("link", { name: "Minha loja" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Entrar" })).toHaveCount(0);
  });

  test("[STO-FR-002] [STO-NFR-001] landing com SEO no HTML do servidor e Prosseguir para o cadastro", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/lojistas")).text();
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<link rel="canonical" href="[^"]+\/lojistas"/);
    expect(html).toMatch(/<meta property="og:title"/);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain("R$ 100");

    await page.goto("/lojistas");
    await page.getByRole("link", { name: "Prosseguir" }).click();
    await expect(page).toHaveURL(/\/lojistas\/cadastro$/);
  });

  test("[STO-FR-003] [STO-FR-004] [STO-FR-005] [STO-FR-006] [STO-FR-007] [STO-FR-014] cadastro pelo link de indicação leva ao pagamento", async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    await page.goto("/i/lojista10");
    await expect(page).toHaveURL(/\/lojistas\/cadastro\?codigo=LOJISTA10$/);
    await expect(page.getByLabel("Código de indicação")).toHaveValue(
      "LOJISTA10",
    );
    await expect(page.getByText(/Indicação de .+ aplicada\./)).toBeVisible();

    // Envio vazio: erros nos campos (STO-FR-004).
    await page
      .getByRole("button", { name: "Continuar para pagamento" })
      .click();
    await expect(
      page.getByText("Aceite os termos para continuar."),
    ).toBeVisible();

    await page.getByLabel("Nome da loja").fill(`E2E Autos ${stamp}`);
    await expect(page.getByLabel("Endereço do catálogo")).toHaveValue(
      `e2e-autos-${stamp}`,
    );
    await expect(page.locator("#slug-status")).toHaveText("Disponível");
    await pickCity(page, "Aracaj", /Aracaju\/SE/);
    await page.getByLabel("WhatsApp da loja").fill("(79) 99876-5432");
    await page.getByLabel("Seu nome").fill("Cadastro E2E");
    await page.getByLabel("E-mail").fill(`e2e-cadastro-${stamp}@cajugo.test`);
    await page.getByLabel("Celular").fill("(79) 98765-4321");
    await page.getByLabel("Senha", { exact: true }).fill(password());
    await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
    await page
      .getByRole("button", { name: "Continuar para pagamento" })
      .click();

    await expect(page).toHaveURL(/\/lojistas\/pagamento$/, { timeout: 20_000 });
    await expect(heading(page)).toHaveText("Pagamento");
  });

  test("[STO-FR-005] endereço já usado aparece como Indisponível", async ({
    page,
  }) => {
    await page.goto("/lojistas/cadastro");
    await page.getByLabel("Endereço do catálogo").fill("e2e-loja");
    await expect(page.locator("#slug-status")).toHaveText("Indisponível");
  });

  test("[STO-FR-015] [STO-SEC-002] e-mail de conta existente convida a entrar", async ({
    page,
  }) => {
    await page.goto("/lojistas/cadastro");
    await page.getByLabel("Nome da loja").fill("Indicador E2E Veículos");
    await pickCity(page, "Aracaj", /Aracaju\/SE/);
    await page.getByLabel("WhatsApp da loja").fill("(79) 99876-5432");
    await page.getByLabel("Seu nome").fill("Indicador E2E");
    await page.getByLabel("E-mail").fill(accounts.referrer.email);
    await page.getByLabel("Celular").fill("(79) 98765-4321");
    await page.getByLabel("Senha", { exact: true }).fill(password());
    await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
    await page
      .getByRole("button", { name: "Continuar para pagamento" })
      .click();

    await expect(
      page.getByText("Se você já tem conta, entre para continuar."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Entrar e continuar" }),
    ).toBeVisible();
    // O que foi digitado continua no formulário.
    await expect(page.getByLabel("Nome da loja")).toHaveValue(
      "Indicador E2E Veículos",
    );
  });

  test("[STO-FR-008] [STO-FR-009] [STO-FR-012] Minha loja salva dados, horário e divulgação", async ({
    page,
  }) => {
    await enterAs(page, accounts.owner.email, "/painel/loja");
    await expect(heading(page)).toHaveText("Minha loja");

    await page
      .getByLabel("Sobre a loja")
      .fill("Seminovos revisados em Aracaju.");
    await page.getByLabel("Instagram").fill("@lojae2e");
    await page.getByLabel("Rua").fill("Avenida Beira Mar");
    await page.getByLabel("Número").fill("100");
    await page.getByLabel("CEP").fill("49000-000");
    await page.getByLabel("Bairro").fill("Atalaia");
    for (const day of ["mon", "tue", "wed", "thu", "fri", "sat"]) {
      await page.locator(`#hours-${day}-0-from`).fill("08:00");
      await page
        .locator(`#hours-${day}-0-to`)
        .fill(day === "sat" ? "12:00" : "18:00");
    }
    await page.locator('input[name="hours.sun.closed"]').check();
    // O checkbox é sr-only; quem recebe o toque é o rótulo inteiro.
    await page
      .getByRole("switch", { name: /Divulgar novos veículos/ })
      .check({ force: true });
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Alterações salvas.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Sobre a loja")).toHaveValue(
      "Seminovos revisados em Aracaju.",
    );
    await expect(page.getByLabel("Bairro")).toHaveValue("Atalaia");
    await expect(page.locator("#hours-mon-0-from")).toHaveValue("08:00");
    await expect(page.locator("#hours-sat-0-to")).toHaveValue("12:00");
    await expect(page.locator('input[name="hours.sun.closed"]')).toBeChecked();
    await expect(
      page.getByRole("switch", { name: /Divulgar novos veículos/ }),
    ).toBeChecked();
  });

  test("[STO-FR-010] [STO-FR-011] logo enviado ao Cloudinary, link copiado e QR code baixado", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await enterAs(page, accounts.owner.email, "/painel/loja");

    await page.locator("#store-logo").setInputFiles(LOGO);
    await expect(page.getByRole("img", { name: "Logo" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: "Trocar logo" }),
    ).toBeVisible();

    const url = await page.getByTestId("catalog-url").textContent();
    expect(url).toMatch(/\/loja\/e2e-loja$/);
    await page.getByRole("button", { name: "Copiar link" }).click();
    await expect(page.getByText("Link copiado.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar QR code" }).click();
    expect((await download).suggestedFilename()).toBe("qrcode-loja-e2e.png");
    await expect(
      page.getByRole("link", { name: "Ver como cliente" }),
    ).toHaveAttribute("href", url!);
  });

  test("[STO-FR-013] troca do endereço: o antigo redireciona e a próxima troca espera 30 dias", async ({
    page,
  }) => {
    const next = `e2e-loja-${Date.now().toString(36)}`;
    await enterAs(page, accounts.owner.email, "/painel/loja");
    await page.getByRole("textbox", { name: "Novo endereço" }).fill(next);
    await expect(page.locator("#new-slug-status")).toHaveText("Disponível");
    await page.getByRole("checkbox", { name: /Entendi/ }).check();
    await page.getByRole("button", { name: "Alterar endereço" }).click();
    await expect(
      page.getByText(/Você poderá trocar de novo a partir de/),
    ).toBeVisible();
    await expect(page.getByTestId("catalog-url")).toHaveText(
      new RegExp(`/loja/${next}$`),
    );

    await page.goto("/loja/e2e-loja");
    await expect(page).toHaveURL(new RegExp(`/loja/${next}$`));
  });

  test("[STO-FR-016] termos e privacidade", async ({ page }) => {
    await page.goto("/termos");
    await expect(heading(page)).toHaveText("Termos e privacidade");
    await page.getByRole("link", { name: "Privacidade", exact: true }).click();
    await expect(page).toHaveURL(/#privacidade$/);
    await expect(
      page.getByRole("heading", { name: "Política de privacidade" }),
    ).toBeVisible();
  });

  test("[STO-SEC-003] usuário da loja não abre Minha loja", async ({
    page,
  }) => {
    await enterAs(page, accounts.staff.email, "/painel/loja");
    await expect(heading(page)).toHaveText("Sem permissão");
    await expect(
      page.getByRole("textbox", { name: "Novo endereço" }),
    ).toHaveCount(0);
  });

  test("[STO-NFR-002] menu, landing, cadastro, termos e Minha loja em 390 px", async ({
    page,
  }) => {
    for (const url of ["/", "/lojistas", "/lojistas/cadastro", "/termos"]) {
      await page.goto(url);
      expect(await audit(page), url).toEqual({
        horizontalScroll: false,
        small: [],
        unlabeled: [],
      });
    }
    await enterAs(page, accounts.owner.email, "/painel/loja");
    expect(await audit(page), "/painel/loja").toEqual({
      horizontalScroll: false,
      small: [],
      unlabeled: [],
    });
  });
});
