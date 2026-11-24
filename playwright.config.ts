import { defineConfig, devices } from '@playwright/test';

const PORT = 4180;

// Headless Chromium has no GPU in CI or containers: SwiftShader draws the page's canvases in software.
const gpuArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// A Chromium already on the machine (PW_CHROMIUM=/path/to/chrome) instead of Playwright's own download.
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: process.env.CI ? 150_000 : 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { args: gpuArgs, executablePath },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      grepInvert: /@phone/,
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
      grep: /@phone/,
    },
  ],
  // The production build: what is deployed.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
