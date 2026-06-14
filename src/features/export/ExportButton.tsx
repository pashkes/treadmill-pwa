import { Download } from 'lucide-react';

export function ExportButton() {
  return (
    <button type="button" aria-label="Экспорт тренировок" className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
      <Download size={20} />
    </button>
  );
}
