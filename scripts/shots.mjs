// Gennemgang af alle sider i flere bredder: overløb, konsolfejl og skærmbilleder.
import { chromium } from '@playwright/test';
const out = process.env.SHOT_DIR ?? '.';
const pages = (process.env.PAGES ?? '/,/ors,/matrix,/afhaengigheder,/pipeline,/kultur,/risici,/scenarier,/handlinger,/model,/rapport,/om').split(',');
const widths = (process.env.WIDTHS ?? '1440').split(',').map(Number);
const browser = await chromium.launch();
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, locale: 'da-DK' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const p of pages) {
    await page.goto(`http://localhost:4173/human-capital-sustainability/#${p}`);
    await page.waitForTimeout(700);
    const name = `${w}${p.replace(/[\/?=&:]/g, '_')}`;
    if (process.env.SHOOT !== '0') await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    console.log(JSON.stringify({ w, p, overflow, h1: h1?.slice(0, 60), errors: errors.splice(0) }));
  }
  await page.close();
}
await browser.close();
