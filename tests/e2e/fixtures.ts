import { randomInt } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { E2E_ACCOUNTS } from "../../src/domains/auth/e2e-seed";

export { expect };
export const accounts = E2E_ACCOUNTS;
export const password = () => {
  const p = process.env.E2E_PASSWORD;
  if (!p)
    throw new Error("Defina E2E_PASSWORD no .env.local e rode pnpm e2e:seed.");
  return p;
};

/**
 * Cada teste vem de uma "rede" diferente (x-forwarded-for), para os limites por rede
 * (login, cadastro) não bloquearem a suíte. O cabeçalho vai só para o nosso servidor:
 * em serviços externos (Cloudinary) ele quebraria o CORS. Na Vercel quem preenche é
 * a própria plataforma.
 */
export const test = base.extend({
  page: async ({ page, baseURL }, provide) => {
    const octet = () => randomInt(1, 255);
    const ip = `10.${octet()}.${octet()}.${octet()}`;
    await page.route(`${baseURL}/**`, (route) =>
      route.continue({
        headers: { ...route.request().headers(), "x-forwarded-for": ip },
      }),
    );
    await provide(page);
  },
});

export async function signIn(page: Page, email: string, pass = password()) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export const heading = (page: Page) => page.locator("main h1").first();

/**
 * Acessibilidade da tela atual (AUT-NFR-002, CFG-NFR-002, STO-NFR-002): rolagem
 * horizontal, alvos de toque e rótulos dos campos. O alvo de um campo dentro de um
 * `<label>` é o rótulo inteiro; link no meio do texto e campo escondido do leitor de
 * tela (`aria-hidden`, ex.: campo isca) ficam de fora, como no WCAG 2.5.8.
 */
export async function audit(page: Page) {
  return page.evaluate(() => {
    const target = (el: Element) =>
      (el.matches("input") && el.closest("label")) || el;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const exempt = (el: Element) =>
      !!el.closest("[aria-hidden=true]") ||
      (el.matches("a") && getComputedStyle(el).display === "inline");
    const small = [
      ...document.querySelectorAll(
        "main a, main button, main input, main select",
      ),
    ]
      .filter((el) => !exempt(el))
      .filter((el) => visible(target(el)))
      .filter((el) => target(el).getBoundingClientRect().height < 44)
      .map((el) => el.outerHTML.slice(0, 80));
    const unlabeled = [
      ...document.querySelectorAll(
        "main input:not([type=hidden]), main select",
      ),
    ]
      .filter(
        (el) =>
          !el.closest("[aria-hidden=true]") &&
          !(el as HTMLInputElement).labels?.length &&
          !el.getAttribute("aria-label") &&
          !el.getAttribute("aria-labelledby"),
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
