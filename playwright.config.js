const { defineConfig, devices } = require("@playwright/test");

/**
 * End-to-end test configuration.
 *
 * The tests drive a real Chromium browser against the dashboard in frontend/,
 * served by tests/e2e/static-server.js. The two APIs the page calls are
 * intercepted and answered from tests/e2e/fixtures, so a run costs nothing,
 * works offline, and gives the same answer every time.
 */
module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,

  // Nobody may commit a test with .only in it and have the pipeline pass.
  forbidOnly: !!process.env.CI,

  // Deliberately zero. Retrying a failed test until it passes is how a flaky
  // suite becomes invisible: the pipeline stays green and the team stops
  // believing the tests either way. See tests/README.md.
  retries: 0,

  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: "node tests/e2e/static-server.js",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
