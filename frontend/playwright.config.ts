import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,          // timeout por test (poker necesita login x2 + WebSocket)
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-ES',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,  // tiempo máximo por acción individual (click, fill…)
  },
  // El stack lo levanta run-e2e-stack.sh antes de ejecutar los tests.
  webServer: undefined,
});