/**
 * Centrale brugerforløb, kørt mod produktionsbuildet med repository-specifik base path.
 */
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.describe('Human Capital Sustainability™', () => {
  test('1. Fra overblik til identificeret risiko og anbefalet handling', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Robustheden er tilstrækkelig');
    await expect(page.getByText('Fiktive demodata.').first()).toBeVisible();
    await page.getByRole('button', { name: /Sårbarhed 1:/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Sådan er prioriteten beregnet')).toBeVisible();
    await expect(dialog.getByText(/Prioritet = 100 × K × E × \(6 − B\) ÷ 125 = 100 × \d/)).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Anbefalet handling' })).toBeVisible();
    await expect(page).toHaveURL(/vis=risiko%3A|vis=risiko:/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('2. Fra kritisk rolle til successionsgab', async ({ page }) => {
    await page.goto('./#/pipeline');
    await page.getByRole('row', { name: /Direktør, Digitale Services – åbn detaljer/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Direktør, Digitale Services' })).toBeVisible();
    await expect(dialog.getByText('Effektiv dækning inden for 2 år')).toBeVisible();
    await expect(dialog.getByText('Nominel kandidat er tildelt en rolle, der prioriteres højere.').first()).toBeVisible();
    await expect(dialog.getByText(/Også kandidat til/)).toBeVisible();
  });

  test('3. Fra scenarieinput til forklarligt resultat', async ({ page }) => {
    await page.goto('./#/scenarier');
    await page.getByRole('radio', { name: /To kritiske personer er utilgængelige samtidig/ }).check();
    await expect(page.getByRole('heading', { name: /Organizational Resilience Score™ før og efter/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Valgte antagelser' })).toBeVisible();
    await expect(page.getByText(/Bent Hjorth er utilgængelig/)).toBeVisible();
    await expect(page.getByText(/Hanne Skov er utilgængelig/)).toBeVisible();
    await expect(page).toHaveURL(/s=to-personer/);
    await page.getByRole('button', { name: 'Nulstil scenarie' }).click();
    await expect(page).toHaveURL(/s=n%C3%B8gleperson|s=nøgleperson/);
  });

  test('4. Fra filtreret dashboard til eksport', async ({ page }, info) => {
    await page.goto('./#/risici?b%C3%A5nd=kritisk');
    const rows = page.locator('tbody tr[tabindex="0"]');
    await expect(rows.first()).toBeVisible();
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Eksportér udsnit/ }).click()]);
    const path = info.outputPath('udsnit.csv');
    await download.saveAs(path);
    const csv = readFileSync(path, 'utf8');
    expect(csv).toContain('FIKTIVE DEMODATA');
    expect(csv).toContain('Filtre: bånd: Kritisk');
    const dataLines = csv.trim().split(/\r\n/).slice(3);
    expect(dataLines.length).toBe(n);
    for (const l of dataLines) expect(l).toContain(';Kritisk;');
  });

  test('5. Direkte sidelink virker efter genindlæsning', async ({ page }) => {
    await page.goto('./#/risici?enhed=DIG&periode=2026-06&vis=risiko:VID-K01');
    await expect(page.getByRole('dialog').getByRole('heading', { name: /Kalibrering af prediktive nedbrudsmodeller/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog').getByRole('heading', { name: /Kalibrering af prediktive nedbrudsmodeller/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Enhed')).toHaveValue('DIG');
    await expect(page.getByLabel('Periode')).toHaveValue('2026-06');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human Capital Risk Dashboard™');
  });

  test('Alle moduler kan åbnes uden fejl og uden vandret rulning', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    for (const p of ['/', '/ors', '/matrix', '/afhaengigheder', '/pipeline', '/kultur', '/risici', '/scenarier', '/handlinger', '/model', '/rapport', '/om', '/findes-ikke']) {
      await page.goto(`./#${p}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, p).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });

  test('Spring-til-indhold bevarer siden og filtrene', async ({ page }) => {
    await page.goto('./#/risici?enhed=DIG');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/risici\?enhed=DIG/);
    await expect(page.locator('#indhold')).toBeFocused();
  });

  test('Successionsscenarie virker i en historisk periode', async ({ page }) => {
    await page.goto('./#/scenarier?periode=2025-09&s=efterf%C3%B8lger-klar&r=R15&c=P27');
    await expect(page.getByRole('heading', { name: /Organizational Resilience Score™ før og efter/ })).toBeVisible();
    await expect(page.getByText('Scenariet kan ikke beregnes')).toHaveCount(0);
  });
});
