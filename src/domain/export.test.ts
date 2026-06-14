import { describe, expect, it } from 'vitest';
import { createExportPayload } from './export';

describe('createExportPayload', () => {
  it('creates versioned export data', () => {
    const payload = createExportPayload([], '2026-06-13T10:00:00.000Z');
    expect(payload).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-06-13T10:00:00.000Z',
      workouts: [],
    });
  });
});
