import { expect, test } from "@playwright/test";

test.describe("status HTTP real (ADR 0013)", () => {
  test("[SHW-FR-014] endereço antigo de loja responde 308; inexistente responde 404 em português", async ({
    request,
  }) => {
    const old = await request.get("/loja/e2e-loja-antiga", { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toMatch(/\/loja\/e2e-loja$/);

    const missing = await request.get("/loja/nao-existe-mesmo");
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain("Página não encontrada");

    const badVehicle = await request.get("/v/abc");
    expect(badVehicle.status()).toBe(404);
  });
});
