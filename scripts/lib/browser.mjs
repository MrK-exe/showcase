// A real browser for pages behind a bot check that plain fetch can't pass. Headless Chrome is
// challenged too, so the window is a normal one parked off-screen (CI runs it under xvfb-run).
// Uses the installed Chrome or Edge; playwright-core downloads no browser of its own.
export async function browserHtml(url, readySelector, timeout = 30000) {
  const { chromium } = await import('playwright-core');
  let lastErr;
  for (const channel of ['chrome', 'msedge']) {
    let browser;
    try {
      browser = await chromium.launch({ channel, headless: false, timeout, args: ['--window-position=-32000,-32000'] });
    } catch (err) {
      lastErr = err;
      continue;
    }
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForSelector(readySelector, { state: 'attached', timeout });
      return await page.content();
    } finally {
      await browser.close();
    }
  }
  throw lastErr;
}
