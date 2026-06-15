import { Download } from 'lucide-react';
import { useAppStore } from '../../app/app-store';
import { exportWorkouts } from '../../db/workout-repository';
import { useT } from '../../i18n';
import { createExportFile, downloadJsonFile } from './export-download';

export function ExportButton() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);

  async function handleExport() {
    try {
      const workouts = await exportWorkouts();
      const file = createExportFile(workouts);
      downloadJsonFile(file.fileName, file.content);
      showToast(t.export.ready);
    } catch (error) {
      console.error(error);
      showToast(t.export.failed);
    }
  }

  return (
    <button
      type="button"
      aria-label={t.export.label}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white"
      onClick={() => void handleExport()}
    >
      <Download size={20} />
    </button>
  );
}
