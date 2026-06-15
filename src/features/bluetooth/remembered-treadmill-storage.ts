export const REMEMBERED_TREADMILL_KEY = 'walking-app-remembered-treadmill';

export type RememberedTreadmill = {
  id: string;
  name: string | null;
  rememberedAt: string;
};

export function rememberTreadmill(device: { id: string; name?: string | null }): void {
  const payload: RememberedTreadmill = {
    id: device.id,
    name: device.name ?? null,
    rememberedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(REMEMBERED_TREADMILL_KEY, JSON.stringify(payload));
}

export function readRememberedTreadmill(): RememberedTreadmill | null {
  const raw = window.localStorage.getItem(REMEMBERED_TREADMILL_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RememberedTreadmill>;
    if (typeof parsed.id !== 'string' || !parsed.id) {
      clearRememberedTreadmill();
      return null;
    }

    return {
      id: parsed.id,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      rememberedAt: typeof parsed.rememberedAt === 'string' ? parsed.rememberedAt : new Date().toISOString(),
    };
  } catch {
    clearRememberedTreadmill();
    return null;
  }
}

export function clearRememberedTreadmill(): void {
  window.localStorage.removeItem(REMEMBERED_TREADMILL_KEY);
}
