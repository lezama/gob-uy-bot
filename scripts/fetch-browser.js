#!/usr/bin/env node
// Fetch a URL using a real headless Chromium via Playwright.
// Use this when a plain `curl` HTTP fetch fails (JS-rendered sites,
// UA-blocked sites, paywalled sites where the lede is above the wall).
//
// Usage:
//   node scripts/fetch-browser.js <url> [--screenshot]
//
// Exit codes:
//   0 — page loaded; HTML written to stdout
//   2 — page returned 4xx/5xx
//   3 — page loaded but body is suspiciously empty
//   1 — uncaught error / timeout

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: fetch-browser.js <url> [--screenshot]");
  process.exit(1);
}
const url = args[0];
const wantScreenshot = args.includes("--screenshot");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright not installed. Run: npm install playwright && npx playwright install chromium");
  process.exit(1);
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

(async () => {
  // ignoreHTTPSErrors + --ignore-certificate-errors:
  // El sandbox del Copilot Agent ha mostrado ERR_CERT_AUTHORITY_INVALID
  // contra busqueda.com.uy y subrayado.com.uy (proxy/CA chain del entorno).
  // El uso es read-only de noticias públicas — sin credenciales — así que
  // saltear la validación de cert no expone datos sensibles.
  const browser = await chromium.launch({
    headless: true,
    args: ["--ignore-certificate-errors"],
  });
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: "es-UY",
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  let status = 0;
  let html = "";
  let exitCode = 0;

  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = resp ? resp.status() : 0;

    // Give SPA frameworks a moment to render.
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    html = await page.content();

    if (status >= 400) {
      exitCode = 2;
    } else if (html.replace(/\s+/g, "").length < 500) {
      // body suspiciously empty
      exitCode = 3;
    }

    if (wantScreenshot) {
      const sha = crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
      const outDir = path.join(process.cwd(), ".tmp", "screenshots");
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${sha}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      // Emit screenshot path on stderr so callers can grab it without
      // polluting the HTML on stdout.
      console.error(`SCREENSHOT ${outPath}`);
    }

    process.stdout.write(html);
  } catch (err) {
    console.error(`fetch-browser error: ${err.message}`);
    exitCode = 1;
  } finally {
    console.error(`STATUS ${status}`);
    await browser.close();
    process.exit(exitCode);
  }
})();
