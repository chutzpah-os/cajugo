import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Testes de integração criam um Postgres (PGlite) e aplicam todas as migrations;
    // com os arquivos em paralelo, 5 s (padrão) fica apertado.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
