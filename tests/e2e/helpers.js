/**
 * Helpers shared by the end-to-end tests.
 *
 * Two things happen here, and both are worth understanding before reading the
 * tests themselves.
 *
 * 1. The dashboard's four settings (API key, two URLs, country) are normally
 *    filled in by hand as homework. A test cannot depend on whether somebody
 *    did that, so it rewrites app.js on its way to the browser and puts known
 *    values in. The file on disk is never touched.
 *
 * 2. The two APIs the page calls are never actually called. Every request is
 *    intercepted and answered from tests/e2e/fixtures. That is what makes the
 *    suite free to run, usable with no internet, and identical every time —
 *    a test that fails because a third party had a bad afternoon teaches the
 *    team to ignore red builds.
 */
const exchangeRateFixture = require("./fixtures/exchange-rate.json");
const incomeTaxFixture = require("./fixtures/income-tax-us.json");

const EXCHANGE_RATE_URL = "https://api.api-ninjas.com/v1/exchangerate?pair=EUR_USD";
const TAX_URL = "https://api.api-ninjas.com/v1/incometax?country=US&year=2026&region=federal";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

/** Serve app.js with the given constants replaced. */
async function serveAppWith(page, values) {
  await page.route("**/app.js", async (route) => {
    const original = await route.fetch();
    let body = await original.text();

    for (const [name, value] of Object.entries(values)) {
      const declaration = new RegExp("const " + name + ' = "[^"]*";');
      body = body.replace(declaration, () => "const " + name + ' = "' + value + '";');
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/javascript; charset=utf-8" },
      body,
    });
  });
}

/** The dashboard as it looks once the homework is done correctly. */
async function configureApp(page) {
  await serveAppWith(page, {
    API_KEY: "test-key-not-a-real-one",
    EXCHANGE_RATE_URL,
    TAX_COUNTRY: "US",
    TAX_URL,
  });
}

/** The dashboard as it looks when it is freshly cloned and nothing is filled in. */
async function leaveAppUnconfigured(page) {
  await serveAppWith(page, {
    API_KEY: "YOUR_API_KEY_HERE",
    EXCHANGE_RATE_URL: "YOUR_URL_HERE",
    TAX_COUNTRY: "YOUR_COUNTRY_HERE",
    TAX_URL: "YOUR_URL_HERE",
  });
}

function stubJson(page, urlPattern, { status = 200, body = {}, delayMs = 0 } = {}) {
  return page.route(urlPattern, async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: JSON_HEADERS });
    }
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fulfill({
      status,
      headers: JSON_HEADERS,
      body: JSON.stringify(status === 200 ? body : { error: "upstream unavailable" }),
    });
  });
}

const stubExchangeRate = (page, options = {}) =>
  stubJson(page, "**/v1/exchangerate**", { body: exchangeRateFixture, ...options });

const stubIncomeTax = (page, options = {}) =>
  stubJson(page, "**/v1/incometax**", { body: incomeTaxFixture, ...options });

module.exports = {
  configureApp,
  leaveAppUnconfigured,
  stubExchangeRate,
  stubIncomeTax,
  exchangeRateFixture,
  incomeTaxFixture,
};
