import { chromium } from '@playwright/test';
const pages = (process.env.PAGES ?? '/').split(',');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +(process.env.W ?? 390), height: 844 } });
for (const p of pages) {
  await page.goto(`http://localhost:4173/human-capital-sustainability/#${p}`);
  await page.waitForTimeout(600);
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      const pr = el.parentElement?.getBoundingClientRect();
      if (r.right > vw + 1 && pr && pr.right <= vw + 1) out.push(`${el.tagName}.${(el.className?.baseVal ?? el.className ?? '').toString().slice(0,70)} right=${Math.round(r.right)} parent=${el.parentElement.tagName}.${String(el.parentElement.className).slice(0,40)}`);
    }
    return { sw: document.documentElement.scrollWidth - vw, out: out.slice(0, 5) };
  });
  console.log(p, JSON.stringify(res, null, 0));
}
await browser.close();
