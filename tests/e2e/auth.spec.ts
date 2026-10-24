import { accounts, expect, heading, password, signIn, test } from "./fixtures";

test.describe("login e painéis", () => {
  test("[AUT-FR-001] [AUT-NFR-001] lojista entra e vê o painel em até 2 s", async ({
    page,
  }) => {
    // Aquece as conexões do servidor (banco e Supabase Auth), como numa instância
    // já em uso; e-mail inexistente para não somar falhas na conta do lojista.
    await page.goto("/entrar");
    await signIn(page, "e2e-aquecimento@cajugo.test", "senha-errada-123");
    await expect(page.locator("#password-error")).toBeVisible();
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(accounts.owner.email);
    await page.getByLabel("Senha", { exact: true }).fill(password());
    // AUT-NFR-001 conta do toque em "Entrar" até o painel aberto.
    const start = Date.now();
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/painel\/veiculos$/);
    await expect(heading(page)).toHaveText("Meus veículos");
    const elapsed = Date.now() - start;
    test.info().annotations.push({
      type: "tempo de login (ms)",
      description: String(elapsed),
    });
    // A meta vale para um deploy na região do banco (São Paulo). Localmente o tempo
    // mede a distância até o Supabase (50–230 ms por ida e volta), não o app: só registra.
    const deployed = !/localhost|127\.0\.0\.1/.test(
      process.env.E2E_BASE_URL ?? "localhost",
    );
    if (deployed) expect(elapsed).toBeLessThan(2_000);
  });

  test("[AUT-FR-002] senha errada mostra o erro genérico", async ({ page }) => {
    await page.goto("/entrar");
    await signIn(page, accounts.owner.email, "senha-errada-123");
    await expect(page.locator("#password-error")).toHaveText(
      "E-mail ou senha incorretos",
    );
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("[AUT-FR-011] visitante vai ao login e volta para a página pedida", async ({
    page,
  }) => {
    await page.goto("/painel/conta");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fpainel%2Fconta$/);
    await signIn(page, accounts.owner.email);
    await expect(page).toHaveURL(/\/painel\/conta$/);
    await expect(heading(page)).toHaveText("Conta");
  });

  test("[AUT-SEC-005] volta para site externo é ignorada", async ({ page }) => {
    await page.goto("/entrar?next=https%3A%2F%2Fevil.example");
    await signIn(page, accounts.referrer.email);
    await expect(page).toHaveURL(/\/indica$/);
  });

  test("[AUT-FR-012] indicador no admin vê sem permissão e nenhum dado", async ({
    page,
  }) => {
    await page.goto("/entrar?next=%2Fadmin");
    await signIn(page, accounts.referrer.email);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(heading(page)).toHaveText("Sem permissão");
    await expect(
      page.getByRole("navigation", { name: /Menu do painel/ }),
    ).toHaveCount(0);
  });

  test("[AUT-FR-006] [AUT-FR-007] vendedor e indicador: abre a Rede Caju e troca de painel", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await signIn(page, accounts.sellerReferrer.email);
    await expect(page).toHaveURL(/\/rede$/);
    const select = page.getByLabel("Trocar de painel");
    await expect(select.locator("option")).toHaveText([
      "Rede Caju",
      "Caju Indica",
    ]);
    await select.selectOption("referrer");
    await page.getByRole("button", { name: "Ir", exact: true }).click();
    await expect(page).toHaveURL(/\/indica$/);
    await expect(heading(page)).toHaveText("Caju Indica");
  });

  test("[AUT-SEC-007] usuário da loja usa veículos, mas não a Conta", async ({
    page,
  }) => {
    await page.goto("/entrar?next=%2Fpainel%2Fconta");
    await signIn(page, accounts.staff.email);
    await expect(heading(page)).toHaveText("Sem permissão");
    await page.goto("/painel/veiculos");
    await expect(heading(page)).toHaveText("Meus veículos");
  });

  test("[AUT-SEC-008] suporte busca contas, sem o botão de senha temporária", async ({
    page,
  }) => {
    await page.goto("/entrar?next=%2Fadmin%2Fsenha-temporaria");
    await signIn(page, accounts.support.email);
    await expect(heading(page)).toHaveText("Senha temporária");
    await page.getByLabel("E-mail da conta").fill(accounts.owner.email);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(accounts.owner.email)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Definir senha temporária" }),
    ).toHaveCount(0);
  });

  test("[AUT-FR-005] sair volta à vitrine e fecha o painel", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await signIn(page, accounts.referrer.email);
    await expect(page).toHaveURL(/\/indica$/);
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/indica");
    await expect(page).toHaveURL(/\/entrar\?next=%2Findica$/);
  });

  test("[AUT-FR-015] senha temporária obriga a criar uma nova antes do painel", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await signIn(page, accounts.temporary.email);
    await expect(page).toHaveURL(/\/nova-senha$/);
    await page.goto("/rede");
    await expect(page).toHaveURL(/\/nova-senha$/);
    const nova = `${password()}-nova`;
    await page.getByLabel("Nova senha").fill(nova);
    await page.getByLabel("Confirmar senha").fill(nova);
    await page.getByRole("button", { name: "Salvar e entrar" }).click();
    await expect(page).toHaveURL(/\/rede$/);
    // `pnpm e2e:seed` volta esta conta para a senha temporária na próxima rodada.
  });
});
