import { defineConfig, devices } from '@playwright/test';

// End-to-end-tests af de centrale brugerforløb mod produktionsbuildet.
// Kør: npm run build && npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/human-capital-sustainability/',
    locale: 'da-DK',
    timezoneId: 'Europe/Copenhagen',
  },
  webServer: {
    command: 'npx vite build --base=/human-capital-sustainability/ && npx vite preview --port 4173 --strictPort --base=/human-capital-sustainability/',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 }, hasTouch: true } },
    { name: 'mobil', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
