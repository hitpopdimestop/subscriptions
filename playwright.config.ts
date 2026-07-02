import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "yarn build && SUBSCRIPTIONS_REPLAY_MAX_AGE_MS=1500 SUBSCRIPTIONS_REPLAY_MAX_EVENTS=50 yarn start --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
