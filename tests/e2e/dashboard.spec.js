const { test, expect } = require("@playwright/test");
const {
  configureApp,
  leaveAppUnconfigured,
  stubExchangeRate,
  stubIncomeTax,
} = require("./helpers");

/**
 * END-TO-END TESTS — the top of the test pyramid.
 *
 * A real browser opens the real page, runs the real JavaScript and clicks the
 * real buttons. Nothing about the application is stubbed; only the outside
 * world is. These tests answer the one question the other two tiers cannot:
 * does a person sitting in front of this thing get what they came for?
 *
 * They are also the slowest and the most fragile tier, which is why there are
 * five of them and forty of the cheaper kind.
 */

test.describe("Finance dashboard", () => {

  test("tells you what to fix when the settings are still blank", async ({ page }) => {
    await leaveAppUnconfigured(page);

    await page.goto("/");

    // Both cards should explain themselves rather than showing a spinner forever
    // or a stack trace. This is the state every course participant sees first.
    await expect(page.locator("#exchange-rate-content")).toContainText("Configuration needed");
    await expect(page.locator("#exchange-rate-content")).toContainText("Task 1 & 2");
    await expect(page.locator("#income-tax-content")).toContainText("Configuration needed");
    await expect(page.locator("#income-tax-content")).toContainText("Task 1, 3a & 3b");
  });

  test("shows the exchange rate returned by the currency API", async ({ page }) => {
    await configureApp(page);
    await stubExchangeRate(page);
    await stubIncomeTax(page);

    await page.goto("/");

    await expect(page.locator(".rate-value")).toHaveText("1.08420");
    await expect(page.locator(".currency-pair")).toContainText("EUR");
    await expect(page.locator(".currency-pair")).toContainText("USD");
    await expect(page.locator(".rate-inverse")).toContainText("0.92234");

    // Note what is *not* asserted: the "Last updated" line. It is rendered in the
    // browser's own timezone, so pinning its text would make this test pass in
    // Sofia and fail for a colleague in Brussels.
    await expect(page.locator(".rate-updated")).toContainText("Last updated");
  });

  test("shows one table row per tax bracket, with the top band unbounded", async ({ page }) => {
    await configureApp(page);
    await stubExchangeRate(page);
    await stubIncomeTax(page);

    await page.goto("/");

    const rows = page.locator(".tax-table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("10%");
    await expect(rows.nth(2)).toContainText("30%");
    await expect(rows.nth(2)).toContainText("No limit");

    // The filing statuses come from the data, not from a hardcoded list.
    await expect(page.locator("#filing-status option")).toHaveCount(2);
    await expect(page.locator("#filing-status")).toContainText("Married Filing Jointly");
  });

  test("estimates the tax on an income the way a person would check it by hand", async ({ page }) => {
    await configureApp(page);
    await stubExchangeRate(page);
    await stubIncomeTax(page);

    await page.goto("/");

    await page.locator("#income-input").fill("100000");
    await page.getByRole("button", { name: "Calculate" }).click();

    // 10% of the first 10 000, 20% of the next 40 000, 30% of the last 50 000.
    // 1 000 + 8 000 + 15 000 = 24 000. Anyone in the room can check that on paper,
    // which is the point: the test states the expected answer, not the method.
    const result = page.locator(".calc-result");
    await expect(result).toContainText("USD 24,000");
    await expect(result).toContainText("30%");     // top (marginal) rate
    await expect(result).toContainText("24.0%");   // effective rate
  });

  test("recovers from a failing currency API instead of locking the button", async ({ page }) => {
    await configureApp(page);
    await stubExchangeRate(page, { status: 500 });
    await stubIncomeTax(page);

    await page.goto("/");

    await expect(page.locator("#exchange-rate-content")).toContainText("Something went wrong");
    await expect(page.locator("#exchange-rate-content")).toContainText("HTTP 500");

    // The refresh button is disabled while a request is in flight. If it were not
    // re-enabled after a failure, one bad response from a third party would leave
    // the customer with a dead button and no way back.
    const refresh = page.locator("#refresh-exchange");
    await expect(refresh).toBeEnabled();
    await expect(refresh).toHaveText("↻ Refresh Rate");
  });

  /**
   * ⚠️  DELIBERATELY FLAKY — teaching example, Module 3 Lesson 3. Skipped.
   *
   * To watch it misbehave, change `test.skip(` to `test(` below and run:
   *
   *     npx playwright test --repeat-each=10
   *
   * It will pass some of those ten runs and fail the others, without a single
   * line of the application changing in between. The cause is in the test, not
   * in the product: it waits a fixed 200 ms and then assumes the answer has
   * arrived, while the stubbed API answers after anything from 0 to 600 ms.
   *
   * Real suites acquire this by accident — a fixed sleep instead of waiting for
   * the thing itself, a test that depends on another test's leftovers, a clock
   * that ticks over midnight. The cost is not the failed run. The cost is that
   * after a fortnight of "just run it again", nobody reads a red pipeline any
   * more, and the one real failure goes through with the rest.
   *
   * The fix is on the line marked FIX: wait for the element, not for the clock.
   */
  test.skip("flaky by design: waits for a fixed time instead of for the result", async ({ page }) => {
    await configureApp(page);
    await stubExchangeRate(page, { delayMs: Math.floor(Math.random() * 600) });
    await stubIncomeTax(page);

    await page.goto("/");

    await page.waitForTimeout(200);                                   // FIX: delete this line…
    await expect(page.locator(".rate-value")).toHaveText("1.08420", { timeout: 1 });
    //                                                    …and drop the 1 ms timeout, so the
    //                                                    assertion waits for the value itself.
  });
});
