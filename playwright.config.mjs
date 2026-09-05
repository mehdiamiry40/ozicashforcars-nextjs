import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3106',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node --import=./tests/mock-resend.mjs node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3106',
    url: 'http://127.0.0.1:3106',
    reuseExistingServer: false,
    env: {
      NODE_OPTIONS: '',
      VERCEL: '',
      DATABASE_URL: '',
      DATABASE_URL_UNPOOLED: '',
      QUOTE_OUTBOX_ENABLED: 'false',
      RESEND_API_KEY: 're_test_key',
      QUOTE_FROM_EMAIL: 'Ozi Quotes <quotes@example.com>',
      QUOTE_TO_EMAIL: 'contact@example.com',
      QUOTE_EMAIL_TIMEOUT_MS: '100',
      CRON_SECRET: '',
      QUOTE_MONITOR_SECRET: '',
    },
  },
});
