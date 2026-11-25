import type { Page } from "@playwright/test";
import { brlWhole } from "../../src/platform/br/money";
import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { audit, expect, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };
const KEY = "cajugo:favorites:v1";
/** Preço do veículo completo no seed (i = 0). */
const FULL_PRICE = 3_000_000;

async function setFavorites(page: Page, items: object[]) {
  await page.goto("/termos");
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    KEY,
    JSON.stringify({ v: 1, items }),
  ] as const);
}

test.describe("ferramentas do comprador (390 px)", () => {
  test.setTimeout(120_000);

  test("[PRC-FR-003] página do veículo sem parcela estimada nem simulador", async ({
    page,
  }) => {
    await page.goto(`/v/${S.fullId}`);
    await expect(page.getByTestId("whatsapp").first()).toBeVisible();
    await expect(page.getByText("/mês")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Simular", exact: true }),
    ).toHaveCount(0);
  });

  test("[BUY-FR-004] [BUY-SEC-001] coração no card e na página, sem avisar o servidor", async ({
    page,
  }) => {
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") posts.push(r.url());
    });
    await page.goto("/veiculos");
    const card = page.locator('[data-testid="catalog-list"] > li').first();
    const heart = card.getByTestId("favorite");
    await expect(heart).toHaveAttribute("aria-pressed", "false");

    // Repete até a página hidratar: antes disso o clique não tem efeito.
    await expect(async () => {
      if ((await heart.getAttribute("aria-pressed")) !== "true")
        await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", "true", {
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    expect(posts, "favoritar não vai ao servidor").toEqual([]);

    // O título é o link do card ([15a]).
    await card.getByRole("heading").getByRole("link").click();
    await page.waitForURL(/\/v\//);
    // Na navegação do cliente, a vitrine fica escondida no DOM: só o coração visível.
    // O da galeria vem primeiro (os de "Você também pode gostar" ficam abaixo).
    const pageHeart = page
      .getByTestId("favorite")
      .filter({ visible: true })
      .first();
    await expect(pageHeart).toHaveAttribute("aria-pressed", "true");
    await pageHeart.click();
    await expect(pageHeart).toHaveAttribute("aria-pressed", "false");
    await page.goBack();
    await expect(
      page
        .locator('[data-testid="catalog-list"] > li')
        .filter({ visible: true })
        .first()
        .getByTestId("favorite"),
    ).toHaveAttribute("aria-pressed", "false");

    // Catálogo da loja: coração também no veículo não divulgado na vitrine
    await page.goto(`/loja/${S.slug}`);
    const list = page.locator('[data-testid="catalog-list"] > li');
    await expect(list.first().getByTestId("favorite")).toBeVisible();
    expect(await list.count()).toBe(
      await page
        .locator('[data-testid="catalog-list"] [data-testid="favorite"]')
        .count(),
    );
    expect(await audit(page), "catálogo com coração").toEqual(CLEAN);
  });

  test("[BUY-FR-005] [BUY-FR-006] [BUY-FR-007] [BUY-SEC-002] Favoritos: ordem, Baixou, Vendido e sem placa", async ({
    page,
  }) => {
    await setFavorites(page, [
      {
        id: S.fullId,
        path: `/v/${S.fullId}`,
        title: "Fiat Argo 2015",
        priceCents: FULL_PRICE + 400_000,
        savedAt: "2026-11-16T12:00:00.000Z",
      },
      {
        id: S.hiddenId,
        path: `/v/${S.hiddenId}`,
        title: "Carro do catálogo",
        priceCents: null,
        savedAt: "2026-11-16T11:00:00.000Z",
      },
      {
        id: S.soldId,
        path: `/v/${S.soldId}`,
        title: "BMW X1 vendida",
        priceCents: 4_000_000,
        savedAt: "2026-11-16T10:00:00.000Z",
      },
    ]);

    await page.goto("/");
    // No celular, Favoritos fica no menu [11a].
    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(async () => {
      if (!(await menu.isVisible()))
        await page.getByRole("button", { name: "Abrir menu" }).click();
      await expect(menu).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await menu.getByText("Comprar", { exact: true }).click();
    await menu.getByRole("link", { name: "Favoritos" }).click();
    await expect(page).toHaveURL(/\/favoritos$/);

    const items = page.locator('[data-testid="favorites-list"] > li');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText("Baixou R$ 4.000");
    await expect(items.nth(0)).toContainText(brlWhole(FULL_PRICE));
    await expect(items.nth(1).getByTestId("favorite")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const sold = items.nth(2);
    await expect(sold).toHaveAttribute("data-testid", "favorite-unavailable");
    await expect(sold).toContainText("Vendido");
    await expect(sold).toContainText("BMW X1 vendida");
    await expect(sold).not.toContainText("R$");
    expect(await page.content()).not.toContain(S.plate);
    expect(await page.content()).not.toContain(S.chassis);
    expect(await audit(page), "[14a]").toEqual(CLEAN);

    // Leva à página do modelo (006b), que lista os parecidos (BUY-FR-007)
    await sold.getByRole("link", { name: "Ver veículos parecidos" }).click();
    await expect(page).toHaveURL(/\/carros\/bmw\/x1$/);
  });

  test("[BUY-FR-008] sem favoritos: estado vazio com convite para a vitrine", async ({
    page,
  }) => {
    await setFavorites(page, []);
    await page.goto("/favoritos");

    await expect(page.getByText("Nenhum favorito ainda")).toBeVisible();
    await page.getByRole("link", { name: "Ver a vitrine" }).click();
    await expect(page).toHaveURL(/\/veiculos$/);
  });

  test("[BUY-NFR-002] HTML de /favoritos fora do Google e igual para todos", async ({
    request,
  }) => {
    const html = await (await request.get("/favoritos")).text();
    expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
    expect(html).not.toContain('data-testid="favorites-list"');
    const sitemap = await (await request.get("/sitemap/pages.xml")).text();
    expect(sitemap).not.toContain("/favoritos");
  });
});

test.describe("ferramentas do comprador no desktop [15a] (1280 px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[BUY-NFR-001] favoritos no desktop", async ({ page }) => {
    await setFavorites(page, [
      {
        id: S.fullId,
        path: `/v/${S.fullId}`,
        title: "Fiat Argo 2015",
        priceCents: FULL_PRICE,
        savedAt: "2026-11-16T12:00:00.000Z",
      },
    ]);
    await page.goto("/favoritos");
    await expect(
      page.locator('[data-testid="favorites-list"] > li'),
    ).toHaveCount(1);
    expect(await audit(page), "[14a] desktop").toEqual(CLEAN);
  });
});
