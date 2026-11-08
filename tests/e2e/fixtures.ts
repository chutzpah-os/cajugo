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
 * Cada teste vem de uma "rede" diferente (x-forwarded-for), para o limite de 5
 * logins por minuto por rede (AUT-FR-003) não bloquear a suíte. Só vale localmente:
 * na Vercel esse cabeçalho é preenchido pela plataforma.
 */
export const test = base.extend({
  extraHTTPHeaders: async ({}, provide) => {
    const octet = () => randomInt(1, 255);
    await provide({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
  },
});

export async function signIn(page: Page, email: string, pass = password()) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export const heading = (page: Page) => page.locator("main h1").first();

/** Acessibilidade da tela atual (AUT-NFR-002, CFG-NFR-002): rolagem horizontal, alvos de toque e rótulos dos campos. */
export async function audit(page: Page) {
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
