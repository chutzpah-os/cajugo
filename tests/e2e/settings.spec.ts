import {
  accounts,
  audit,
  expect,
  heading,
  password,
  signIn,
  test,
} from "./fixtures";
import type { Page } from "@playwright/test";

async function enterAs(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await signIn(page, email);
}

const group = (page: Page, title: string) =>
  page.locator("form", { has: page.locator("h2", { hasText: title }) });

test.describe("regras configuráveis", () => {
  test("[CFG-FR-001] [CFG-FR-002] [CFG-FR-006] admin altera uma regra, vê o valor novo e o histórico", async ({
    page,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/conta");
    await expect(heading(page)).toHaveText("Conta");

    const payment = group(page, "Pagamento");
    await payment
      .getByLabel("Tolerância de atraso antes da suspensão (dias)")
      .fill("7");
    await payment.getByRole("button", { name: "Salvar" }).click();
    await expect(payment.getByText("Alterações salvas.")).toBeVisible();

    await page.reload();
    await expect(
      page.getByLabel("Tolerância de atraso antes da suspensão (dias)"),
    ).toHaveValue("7");

    await group(page, "Pagamento")
      .getByRole("link", { name: /Histórico: Tolerância de atraso/ })
      .click();
    await expect(page.locator("main ol li").first()).toContainText("5 → 7");
    await expect(page.locator("main ol li").first()).toContainText("E2E admin");
  });

  test("[CFG-FR-004] valor fora da faixa mostra o erro e mantém o que foi digitado", async ({
    page,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/conta");
    const network = group(page, "Rede Caju");
    await network.getByLabel(/Taxa CajuGo/).fill("150");
    await network.getByRole("button", { name: "Salvar" }).click();
    await expect(network.locator("#setting-cajugo_fee_bps-error")).toHaveText(
      "Use um valor entre 0% e 20%.",
    );
    await expect(network.getByLabel(/Taxa CajuGo/)).toHaveValue("150");
  });

  test("[CFG-SEC-001] suporte vê as regras sem poder salvar", async ({
    page,
  }) => {
    await enterAs(page, accounts.support.email, "/admin/conta");
    await expect(page.getByRole("note")).toContainText("Somente leitura");
    await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
    await expect(page.getByLabel("Mínimo de fotos por veículo")).toBeDisabled();
    await expect(page.getByRole("button", { name: /chave Pix/ })).toHaveCount(
      0,
    );
  });

  test("[CFG-SEC-002] lojista não abre as regras", async ({ page }) => {
    await enterAs(page, accounts.owner.email, "/admin/conta");
    await expect(heading(page)).toHaveText("Sem permissão");
    await page.goto("/admin/indica/regras");
    await expect(heading(page)).toHaveText("Sem permissão");
  });

  test("[CFG-FR-008] [CFG-SEC-005] chave Pix: senha errada não troca; senha certa troca", async ({
    page,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/conta");
    await page.getByRole("button", { name: /chave Pix/ }).click();
    await page.getByLabel("Nova chave Pix").fill("pix@cajugo.test");
    await page.getByLabel("Tipo da chave").selectOption("email");
    await page.getByLabel("Favorecido").fill("CajuGo Testes");
    await page.getByRole("button", { name: "Revisar" }).click();
    await expect(page.getByText("pix@cajugo.test")).toBeVisible();

    await page.getByLabel("Sua senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Confirmar troca" }).click();
    await expect(page.locator("#pix-password-error")).toHaveText(
      "Senha incorreta.",
    );

    await page.getByLabel("Sua senha").fill(password());
    await page.getByRole("button", { name: "Confirmar troca" }).click();
    await expect(page.getByText("Chave Pix atualizada.")).toBeVisible();
    await expect(page.getByText("p***@cajugo.test")).toBeVisible();
  });

  test("[CFG-FR-007] recuperar senha usa o WhatsApp definido nas regras", async ({
    page,
  }) => {
    await enterAs(page, accounts.admin.email, "/admin/conta");
    const support = group(page, "Atendimento");
    await support.getByLabel("WhatsApp de atendimento").fill("5579900001111");
    await support.getByRole("button", { name: "Salvar" }).click();
    await expect(support.getByText("Alterações salvas.")).toBeVisible();

    await page.goto("/recuperar");
    await expect(
      page.getByRole("link", { name: "Falar com o suporte no WhatsApp" }),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\/5579900001111\?/);
  });

  test("[CFG-FR-010] [CFG-SEC-006] troca da própria senha: atual errada recusa; certa troca", async ({
    page,
  }) => {
    const nova = `${password()}-e2e`;
    await enterAs(page, accounts.sellerReferrer.email, "/conta/senha");
    await expect(
      page.getByRole("heading", { name: "Alterar senha", level: 1 }),
    ).toBeVisible();

    await page.getByLabel("Senha atual").fill("senha-errada-123");
    await page.getByLabel("Nova senha", { exact: true }).fill(nova);
    await page.getByLabel("Confirmar nova senha").fill(nova);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.locator("#current-password-error")).toHaveText(
      "Senha atual incorreta.",
    );

    await page.getByLabel("Senha atual").fill(password());
    await page.getByLabel("Nova senha", { exact: true }).fill(nova);
    await page.getByLabel("Confirmar nova senha").fill(nova);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByRole("status")).toContainText("Senha alterada");
    // `pnpm e2e:seed` volta a senha desta conta na próxima rodada.
  });

  for (const path of ["/admin/conta", "/admin/indica/regras", "/conta/senha"]) {
    test(`[CFG-NFR-002] ${path} cabe em 390 px, com toque ≥ 44 px e campos com rótulo`, async ({
      page,
    }) => {
      await enterAs(page, accounts.admin.email, path);
      await expect(page.locator("main h1, h1").last()).toBeVisible();
      expect(await audit(page)).toEqual({
        horizontalScroll: false,
        small: [],
        unlabeled: [],
      });
    });
  }
});
