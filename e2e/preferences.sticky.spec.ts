import { test, expect } from '@playwright/test';

test('preferences stays open when toggling theme and language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: /preferences/i }).click();
  const dialog = page.getByRole('dialog', { name: /preferences/i });
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: /theme/i }).click();
  await expect(dialog).toBeVisible();

  await page.getByRole('combobox', { name: /language/i }).selectOption('hi');
  await expect(dialog).toBeVisible();
});
