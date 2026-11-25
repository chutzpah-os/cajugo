/**
 * Capturas das telas entregues para comparar com o design (012, DSG-NFR-001):
 *   pnpm design:shots [filtro]
 * Precisa do servidor local (`pnpm dev`) e do seed (`pnpm e2e:seed`). Grava em
 * `test-results/design/<tela>-<largura>.png` (fora do git); a comparação com
 * `docs/design/telas/` fica em `docs/specs/012-design-fidelity/comparacao.md`.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = "test-results/design";

/** [tela, conta (null = visitante), endereço] */
const SCREENS = [
  ["1a", null, "/veiculos"],
  ["home", null, "/"],
  ["1b", null, "/v/__primeiro__"],
  ["11a", null, "/?menu=1"],
  ["5b", null, "/lojistas"],
  ["5c", null, "/lojistas/cadastro"],
  ["9f", null, "/entrar"],
  ["loja", null, "/loja/e2e-vitrine"],
  ["14a", null, "/favoritos"],
  ["1c", "e2e-vitrine@cajugo.test", "/painel/veiculos"],
  ["2a", "e2e-vitrine@cajugo.test", "/painel/veiculos/novo"],
  ["3a", "e2e-vitrine@cajugo.test", "/painel/leads"],
  ["3b", "e2e-vitrine@cajugo.test", "/painel/loja"],
  ["3c", "e2e-vitrine@cajugo.test", "/painel/conta"],
  ["10c", "e2e-fatura@cajugo.test", "/painel/fatura"],
  ["6c", "e2e-fatura@cajugo.test", "/painel/fatura/pix"],
  ["7e", "e2e-vitrine@cajugo.test", "/painel/conta"],
  ["7f", "e2e-vitrine@cajugo.test", "/painel/conta"],
  ["8a", "e2e-lojista@cajugo.test", "/painel/conta"],
  ["8e", "e2e-lojista@cajugo.test", "/painel/conta"],
  ["7b", "e2e-vendedor@cajugo.test", "/rede-caju"],
  ["7c", "e2e-vendedor@cajugo.test", "/rede-caju/vitrine"],
  ["7d", "e2e-vendedor@cajugo.test", "/rede-caju/extrato"],
  ["13c", "e2e-vendedor@cajugo.test", "/rede-caju/conta"],
  ["9d", "e2e-indicador@cajugo.test", "/indica"],
  ["4b", "e2e-admin@cajugo.test", "/admin/assinaturas"],
  ["4c", "e2e-admin@cajugo.test", "/admin/conta"],
  ["10b", "e2e-admin@cajugo.test", "/admin/pagamentos"],
  ["7h", "e2e-admin@cajugo.test", "/admin/vendedores"],
  ["14e", "e2e-admin@cajugo.test", "/admin/denuncias"],
  ["12a", "e2e-admin@cajugo.test", "/admin/alertas"],
  ["8f", "e2e-admin@cajugo.test", "/admin/indica"],
];

const filter = process.argv[2];
const list = SCREENS.filter(([id]) => !filter || id === filter);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const byAccount = Map.groupBy(list, ([, account]) => account ?? "");
for (const [account, screens] of byAccount)
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 800 },
    });
    const page = await context.newPage();
    if (account) {
      await page.goto(`${BASE}/entrar`);
      await page.getByLabel("E-mail").fill(account);
      await page
        .getByLabel("Senha", { exact: true })
        .fill(process.env.E2E_PASSWORD ?? "");
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), {
        timeout: 90_000,
      });
    }
    for (const [id, , path] of screens) {
      let url = path;
      if (path === "/v/__primeiro__") {
        await page.goto(`${BASE}/veiculos`);
        url =
          (await page.locator('a[href^="/v/"]').first().getAttribute("href")) ??
          "/";
      }
      await page.goto(`${BASE}${url}`, { timeout: 120_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.screenshot({
        path: `${OUT}/${id}-${width}.png`,
        fullPage: width === 390,
      });
      console.log(`${id}-${width}`);
    }
    await context.close();
  }
await browser.close();
