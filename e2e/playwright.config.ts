import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    cwd: '..',
  },
});
