import { expect, test } from '@playwright/test';

test('records a simulated workout and opens its detail screen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'GO' }).click();
  await expect(page.getByText('Свободная тренировка')).toBeVisible();

  await page.clock.fastForward(65_000);

  await page.getByRole('button', { name: /Завершить тренировку/i }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await page.getByRole('button', { name: /Свободная тренировка/i }).first().click();
  await expect(page.getByText('Speed', { exact: true })).toBeVisible();
});
