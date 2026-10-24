import { accounts, expect, signIn, test } from "./fixtures";

/** Mede a tela atual: rolagem horizontal, alvos de toque e rótulos dos campos. */
async function audit(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const small = [
      ...document.querySelectorAll(
        "main a, main button, main input, main select",
      ),
    ]
      .filter(visible)
      .filter((el) => el.getBoundingClientRect().height < 44)
      .map((el) => el.outerHTML.slice(0, 80));
    const unlabeled = [
      ...document.querySelectorAll(
        "main input:not([type=hidden]), main select",
      ),
    ]
      .filter(
        (el) =>
          !(el as HTMLInputElement).labels?.length &&
          !el.getAttribute("aria-label"),
      )
      .map((el) => el.outerHTML.slice(0, 80));
    return {
      horizontalScroll:
        document.documentElement.scrollWidth > window.innerWidth,
      small,
      unlabeled,
    };
  });
}

test.describe("telas de conta no celular", () => {
  for (const path of ["/entrar", "/recuperar"]) {
    test(`[AUT-NFR-002] ${path} cabe em 390 px, com toque ≥ 44 px e campos com rótulo`, async ({
      page,
    }) => {
      await page.goto(path);
      const result = await audit(page);
      expect(result).toEqual({
        horizontalScroll: false,
        small: [],
        unlabeled: [],
      });
    });
  }

  test("[AUT-NFR-002] /nova-senha cabe em 390 px, com toque ≥ 44 px e campos com rótulo", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await signIn(page, accounts.temporary.email);
    await expect(page).toHaveURL(/\/nova-senha$/);
    const result = await audit(page);
    expect(result).toEqual({
      horizontalScroll: false,
      small: [],
      unlabeled: [],
    });
  });
});
