import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4300', headless: true },
  webServer: {
    command: 'npm.cmd run site',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
