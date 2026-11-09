import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sem .env.local: usa as variáveis do ambiente.
}

/**
 * Contra o build de produção (servidor standalone), no que o modo de desenvolvimento
 * não revela: erros de pré-renderização e status HTTP reais (spec 006).
 */
export default defineConfig({
  testDir: "tests/e2e-prod",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "bash scripts/start-production.sh",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
