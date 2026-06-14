import { expect, test } from '@playwright/test';

test('records a connected treadmill workout and opens its detail screen', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const characteristic = {
      startNotifications: async () => undefined,
      stopNotifications: async () => undefined,
      addEventListener: () => undefined,
      writeValueWithoutResponse: async () => undefined,
    };
    const service = {
      getCharacteristic: async () => characteristic,
    };
    const server = {
      getPrimaryService: async () => service,
    };
    const device = {
      name: 'Test treadmill',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      gatt: {
        connected: true,
        connect: async () => server,
        disconnect: () => undefined,
      },
    };

    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        requestDevice: async () => device,
      },
      configurable: true,
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Подключить' }).click();
  await expect(page.getByRole('button', { name: 'GO' })).toBeEnabled();
  await page.getByRole('button', { name: 'GO' }).click();
  await expect(page.getByText('Свободная тренировка')).toBeVisible();
  await page.getByRole('button', { name: 'Увеличить скорость' }).click();

  await page.clock.fastForward(65_000);

  await page.getByRole('button', { name: /Завершить тренировку/i }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await page.getByRole('button', { name: /Свободная тренировка/i }).first().click();
  await expect(page.getByText('Speed', { exact: true })).toBeVisible();
});
