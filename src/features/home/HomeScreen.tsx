import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { todayString } from '../../domain/date-time';
import { summarizeWorkouts } from '../../domain/stats';
import { ExportButton } from '../export/ExportButton';
import { useLiveStore } from '../live/live-store';
import { TreadmillArt } from '../../ui/TreadmillArt';

export function HomeScreen() {
  const showScreen = useAppStore((state) => state.showScreen);
  const workouts = useLiveQuery(() => db.workouts.where('date').equals(todayString()).toArray(), []) ?? [];
  const summary = summarizeWorkouts(workouts);
  const isConnected = useLiveStore((state) => state.isConnected);
  const deviceName = useLiveStore((state) => state.deviceName);
  const start = useLiveStore((state) => state.start);

  return (
    <main className="min-h-dvh pb-24">
      <header className="flex items-center justify-between px-4 pt-14">
        <h1 className="text-[28px] font-extrabold tracking-normal">Workout</h1>
        <ExportButton />
      </header>
      <div className="mx-4 mt-2 flex h-[200px] items-center justify-center">
        <TreadmillArt />
      </div>
      <section className="mx-4 rounded-[20px] bg-neutral-900 px-4 pb-4 pt-5">
        <button
          type="button"
          className="mx-auto mb-4 block h-[90px] w-[90px] rounded-full bg-white text-[22px] font-black text-black"
          onClick={() => {
            start();
            showScreen('live');
          }}
        >
          GO
        </button>
        <div className="flex items-center justify-between rounded-[14px] bg-neutral-800 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#30D158]' : 'bg-red-500'}`} />
            <span className="truncate">{isConnected ? deviceName ?? 'Подключено' : 'Дорожка не подключена...'}</span>
          </div>
          <button type="button" className="rounded-full bg-[#5B5BF6] px-4 py-2 text-[13px] font-bold text-white">
            Подключить
          </button>
        </div>
      </section>
      <section className="mx-4 mt-2 grid grid-cols-2 gap-2.5">
        <Metric label="Калории сегодня" value={summary.kcal.toLocaleString('ru')} unit="ккал" color="text-[#5B8AF6]" />
        <Metric label="Дистанция сегодня" value={summary.km.toFixed(2)} unit="км" color="text-[#5B8AF6]" />
      </section>
      <section className="mx-4 mt-2 rounded-2xl bg-neutral-900 p-3.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-[#F06A1D]">Шаги</div>
          <div>
            <span className="text-[26px] font-extrabold">{summary.steps.toLocaleString('ru')}</span>
            <span className="ml-1 text-xs text-neutral-400">шаги</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-3.5">
      <div className={`mb-1.5 text-xs font-semibold ${color}`}>{label}</div>
      <span className="text-[26px] font-extrabold">{value}</span>
      <span className="ml-1 text-xs text-neutral-400">{unit}</span>
    </div>
  );
}
