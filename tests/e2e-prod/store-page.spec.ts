import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.describe("build de produção", () => {
  test("[SHW-NFR-002] a página de uma loja existente renderiza com o conteúdo no HTML, também nos acessos seguintes e sem erro de pré-renderização", async ({
    request,
  }) => {
    // O erro de pré-renderização só aparece depois da 1ª resposta (revalidação).
    for (let i = 0; i < 4; i++) {
      const res = await request.get("/loja/e2e-loja");

      expect(res.status(), `acesso ${i + 1}`).toBe(200);
      expect(await res.text(), `acesso ${i + 1}`).toContain("Loja E2E");
      await new Promise((r) => setTimeout(r, 1500));
    }

    const log = readFileSync(".next/production-server.log", "utf8");
    expect(log).not.toContain("during prerendering");
  });
});
