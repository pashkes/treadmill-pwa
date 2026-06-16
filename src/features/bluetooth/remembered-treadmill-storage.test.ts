import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRememberedTreadmill,
  readRememberedTreadmill,
  rememberTreadmill,
  REMEMBERED_TREADMILL_KEY,
} from './remembered-treadmill-storage';

describe('remembered treadmill storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and reads remembered treadmill metadata', () => {
    rememberTreadmill({ id: 'device-1', name: 'Blue treadmill' });

    expect(readRememberedTreadmill()).toMatchObject({
      id: 'device-1',
      name: 'Blue treadmill',
    });
    expect(readRememberedTreadmill()?.rememberedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('clears remembered treadmill metadata', () => {
    rememberTreadmill({ id: 'device-1', name: 'Blue treadmill' });

    clearRememberedTreadmill();

    expect(readRememberedTreadmill()).toBeNull();
    expect(window.localStorage.getItem(REMEMBERED_TREADMILL_KEY)).toBeNull();
  });

  it('drops invalid remembered treadmill data', () => {
    window.localStorage.setItem(REMEMBERED_TREADMILL_KEY, '{"name":"missing id"}');

    expect(readRememberedTreadmill()).toBeNull();
    expect(window.localStorage.getItem(REMEMBERED_TREADMILL_KEY)).toBeNull();
  });
});
