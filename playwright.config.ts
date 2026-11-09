import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

try { process.loadEnvFile(join(process.cwd(), '.env')); } catch { /* no .env file: use real environment */ }

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['json', { outputFile: 'report/results.json' }]],
  use: { trace: 'on-first-retry', screenshot: 'only-on-failure', testIdAttribute: 'data-test' },
  projects: [
    { name: 'ui', testMatch: 'ui.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: process.env.UI_URL ?? 'https://www.saucedemo.com' } },
    { name: 'api', testMatch: 'api.spec.ts',
      use: { baseURL: process.env.API_URL ?? 'https://restful-booker.herokuapp.com' } },
  ],
});
