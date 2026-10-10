import { defineConfig, devices } from '@playwright/test';

/**
 * E2E memakai hasil build statis + endpoint /api/contact di-mock di browser,
 * jadi tidak butuh kunci Resend/Turnstile. Jalankan `pnpm build` dulu.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4322',
    // Opsional: pakai Chromium yang sudah ada di mesin (mis. di lingkungan tanpa akses CDN Playwright)
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/serve-static.mjs 4322',
    port: 4322,
    reuseExistingServer: !process.env.CI,
  },
});
