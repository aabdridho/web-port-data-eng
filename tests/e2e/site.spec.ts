import { expect, test } from '@playwright/test';

test.describe('Halaman utama', () => {
  test('hero, projects dan form tampil tanpa error console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hi, I’m');
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: /send inquiry/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('klik project mengganti panel visualisasi', async ({ page }) => {
    await page.goto('/#projects');
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    const panelLabel = await page.locator('#project-panel').getAttribute('aria-labelledby');
    expect(panelLabel).toBe(await tabs.nth(1).getAttribute('id'));
  });

  test('halaman case study bisa dibuka', async ({ page }) => {
    await page.goto('/#projects');
    await page.getByRole('link', { name: /read the case study/i }).click();
    await expect(page).toHaveURL(/\/projects\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('tidak ada scroll horizontal', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Form kontak', () => {
  test('validasi client menandai field kosong', async ({ page }) => {
    await page.goto('/#contact');
    await page.getByRole('button', { name: /send inquiry/i }).click();
    await expect(page.getByRole('alert')).toContainText('highlighted');
    await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('kirim sukses menampilkan pesan terima kasih', async ({ page }) => {
    await page.route('**/api/contact', (r) => r.fulfill({ status: 200, json: { ok: true } }));
    await page.goto('/#contact');
    await page.fill('#f-name', 'Budi Santoso');
    await page.fill('#f-email', 'budi@example.com');
    await page.fill('#f-message', 'We need a daily pipeline from our POS system into BigQuery.');
    await page.getByRole('button', { name: /send inquiry/i }).click();
    await expect(page.getByText('Thanks — message received.')).toBeVisible();
  });

  test('rate limit dari server ditampilkan', async ({ page }) => {
    await page.route('**/api/contact', (r) =>
      r.fulfill({ status: 429, json: { ok: false, message: 'Too many requests. Please try again in a few minutes.' } }),
    );
    await page.goto('/#contact');
    await page.fill('#f-name', 'Budi Santoso');
    await page.fill('#f-email', 'budi@example.com');
    await page.fill('#f-message', 'We need a daily pipeline from our POS system into BigQuery.');
    await page.getByRole('button', { name: /send inquiry/i }).click();
    await expect(page.getByRole('alert')).toContainText('Too many requests');
  });
});
