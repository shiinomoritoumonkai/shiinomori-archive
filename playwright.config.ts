import { defineConfig, devices } from '@playwright/test';

// pnpm e2e は、先に pnpm e2e:prepare（フィクスチャ → ingest build → VITE_PHOTO_SOURCE=local でビルド）を実行してから走らせる
export const E2E_PASSWORD = 'fixture-password-1234';
const BASE = process.env.PAGES_BASE ?? '/shiinomori-archive/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${BASE}`,
    trace: 'retain-on-failure',
    locale: 'ja-JP',
  },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'pnpm preview',
    url: `http://127.0.0.1:4173${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
