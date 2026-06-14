import { Temporal } from '@js-temporal/polyfill';
import { createExportPayload } from '../../domain/export';
import type { Workout } from '../../domain/workout';

export function createExportFile(workouts: Workout[]) {
  const today = Temporal.Now.plainDateISO().toString();
  const payload = createExportPayload(workouts);
  return {
    fileName: `treadmill-workouts-${today}.json`,
    content: JSON.stringify(payload, null, 2),
  };
}

export function downloadJsonFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
