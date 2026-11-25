import { E2E_SHOWCASE as S } from "../../src/domains/showcase/testing/e2e-seed";
import { audit, expect, test } from "./fixtures";

const CLEAN = { horizontalScroll: false, small: [], unlabeled: [] };

/** Página do veículo completa (015): 390 e 1280 px, com a auditoria. */
for (const width of [390, 1280]) {
  test(`[PRC-FR-001] [PRC-FR-004] [PRC-FR-005] [PRC-FR-006] [PRC-FR-007] [PRC-FR-008] [PRC-NFR-001] [PRC-SEC-001] blocos da página do veículo em ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/v/${S.fullId}`);

    // Compare os preços com a FIPE e a diferença.
    const compare = page.getByTestId("price-compare");
    await expect(compare).toContainText("Valor anunciado");
    await expect(compare).toContainText("Tabela FIPE");
    await expect(page.getByTestId("fipe-diff")).toContainText("Tabela FIPE");

    // Ver parcelas leva ao bloco de financiamento, sem envio (PRC-SEC-001).
    await page
      .getByTestId("see-installments")
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/#parcelas$/);
    const financing = page.getByTestId("financing");
    await expect(financing).toContainText(
      "No momento não estamos recebendo simulações",
    );
    for (const input of await financing.locator("input").all())
      await expect(input).toBeDisabled();

    // Sobre a loja e Você também pode gostar (até 4).
    await expect(page.getByTestId("store-link")).toBeVisible();
    const similar = page.getByTestId("similar-list").locator("> li");
    expect(await similar.count()).toBeLessThanOrEqual(4);

    // Sem barra fixa e sem parcela estimada.
    await expect(page.getByText("/mês")).toHaveCount(0);
    expect(await audit(page)).toEqual(CLEAN);
    await page.screenshot({
      path: `test-results/vehicle-page-${width}.png`,
      fullPage: true,
    });
  });
}
