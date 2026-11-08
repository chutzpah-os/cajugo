import { accounts, audit, expect, signIn, test } from "./fixtures";

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
