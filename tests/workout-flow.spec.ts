import { expect, test } from '@playwright/test';

test.use({ locale: 'ru-RU' });

test('records a connected treadmill workout and opens its detail screen', async ({ page }) => {
  await page.addInitScript(() => {
    let treadmillDataListener: ((event: Event) => void) | null = null;
    const characteristic = {
      startNotifications: async () => undefined,
      stopNotifications: async () => undefined,
      addEventListener: (_eventName: string, listener: EventListener) => {
        treadmillDataListener = listener;
      },
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

    Object.defineProperty(window, '__emitTreadmillData', {
      value: (bytes: number[]) => {
        const event = new Event('characteristicvaluechanged');
        Object.defineProperty(event, 'target', {
          value: { value: new DataView(Uint8Array.from(bytes).buffer) },
        });
        treadmillDataListener?.(event);
      },
      configurable: true,
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Подключить' }).click();
  await expect(page.getByRole('button', { name: 'GO' })).toBeEnabled();
  await page.getByRole('button', { name: 'GO' }).click();
  await expect(page.getByText('Свободная тренировка')).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __emitTreadmillData: (bytes: number[]) => void }).__emitTreadmillData([
      0x84, 0x04, 0x58, 0x02, 0xe8, 0x03, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x41, 0x00,
    ]);
  });
  await expect(page.getByText('01:05')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Завершить тренировку' }).click();
  await page.getByRole('button', { name: 'История' }).click();
  await page.getByRole('button', { name: 'Свободная тренировка' }).click();
  await expect(page.getByText('Скорость', { exact: true })).toBeVisible();
});
