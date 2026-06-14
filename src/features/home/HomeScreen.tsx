import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { todayString } from '../../domain/date-time';
import { summarizeWorkouts } from '../../domain/stats';
import { connectFtms } from '../bluetooth/ftms';
import { ExportButton } from '../export/ExportButton';
import { useLiveStore } from '../live/live-store';
import { TreadmillArt } from '../../ui/TreadmillArt';

export function HomeScreen() {
  const showScreen = useAppStore((state) => state.showScreen);
  const [today, setToday] = useState(todayString);
  const workouts = useLiveQuery(() => db.workouts.where('date').equals(today).toArray(), [today]) ?? [];
  const summary = summarizeWorkouts(workouts);
  const isConnected = useLiveStore((state) => state.isConnected);
  const deviceName = useLiveStore((state) => state.deviceName);
  const ftmsConnection = useLiveStore((state) => state.ftmsConnection);
  const start = useLiveStore((state) => state.start);
  const setConnection = useLiveStore((state) => state.setConnection);
  const setFtmsConnection = useLiveStore((state) => state.setFtmsConnection);
  const setTreadmillData = useLiveStore((state) => state.setTreadmillData);
  const showToast = useAppStore((state) => state.showToast);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayString()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function toggleConnect() {
    if (isConnected) {
      ftmsConnection?.disconnect();
      setFtmsConnection(null);
      setConnection(false, null);
      showToast('Отключено');
      return;
    }

    try {
      const connection = await connectFtms(
        (data) => {
          setTreadmillData(data);
        },
        () => {
          setFtmsConnection(null);
          setConnection(false, null);
          showToast('Отключилась');
        },
      );
      setFtmsConnection(connection);
      setConnection(true, connection.deviceName);
      showToast(connection.deviceName);
    } catch (error) {
      setConnection(false, null);
      showToast(error instanceof Error ? error.message : 'Ошибка подключения');
    }
  }

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
          className={`mx-auto mb-4 block h-[90px] w-[90px] rounded-full text-[22px] font-black ${
            isConnected ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'
          }`}
          disabled={!isConnected}
          onClick={() => {
            const started = start();
            if (!started) {
              showToast('Сначала подключите дорожку');
              return;
            }
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
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-[13px] font-bold text-white ${isConnected ? 'border border-neutral-700 bg-neutral-900 text-neutral-400' : 'bg-[#5B5BF6]'}`}
            onClick={toggleConnect}
          >
            {isConnected ? 'Отключить' : 'Подключить'}
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
