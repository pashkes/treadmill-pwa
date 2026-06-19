import { Upload } from 'lucide-react';
import { type ChangeEvent } from 'react';
import { useAppStore } from '../../app/app-store';
import { importWorkoutExportPayload } from '../../db/workout-repository';
import { useT } from '../../i18n';

export function ImportButton() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      await importWorkoutExportPayload(await file.text());
      showToast(t.import.ready);
    } catch (error) {
      console.error(error);
      showToast(t.import.failed);
    }
  }

  return (
    <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-neutral-900 text-white">
      <span className="sr-only">{t.import.label}</span>
      <Upload size={20} aria-hidden="true" />
      <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void handleImport(event)} />
    </label>
  );
}
