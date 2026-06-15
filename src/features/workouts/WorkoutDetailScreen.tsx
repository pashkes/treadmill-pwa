import { ChevronLeft, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '../../app/app-store';
import { useWorkout } from '../../db/workout-live-queries';
import { deleteWorkout } from '../../db/workout-repository';
import { formatCadence, formatDuration, formatPace, formatPaceSeconds, formatSpeed, workoutSeconds } from '../../domain/workout';
import { useT } from '../../i18n';

export function WorkoutDetailScreen({ workoutId }: { workoutId: number }) {
  const t = useT();
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);
  const workout = useWorkout(Number.isFinite(workoutId) ? workoutId : null);

  if (!workout) {
    return (
      <main className="min-h-dvh px-5 pt-16">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-neutral-900"
          onClick={() => void navigate({ to: '/history' })}
          aria-label={t.detail.back}
        >
          <ChevronLeft size={24} />
        </button>
        <p className="mt-8 text-neutral-400">{t.detail.notFound}</p>
      </main>
    );
  }

  const seconds = workoutSeconds(workout);
  const pace = formatPace(workout);
  const speed = formatSpeed(workout);
  const cadence = formatCadence(workout);
  const topSpeed = workout.maxSpeed ? workout.maxSpeed.toFixed(1) : speed;
  const fastestPace = workout.maxSpeed ? formatPaceSeconds((60 / workout.maxSpeed) * 60) : pace;

  async function handleDelete() {
    if (!window.confirm(t.detail.deleteConfirm)) return;

    await deleteWorkout(workoutId);
    showToast(t.detail.workoutDeleted);
    void navigate({ to: '/history' });
  }

  return (
    <main className="min-h-dvh bg-black pb-8 pt-16 text-white">
      <div className="flex items-center justify-between px-5">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-neutral-900"
          onClick={() => void navigate({ to: '/history' })}
          aria-label={t.detail.back}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-500"
          onClick={() => void handleDelete()}
          aria-label={t.detail.deleteLabel}
        >
          <Trash2 size={20} />
        </button>
      </div>
      <section className="px-8 pt-8">
        <div className="mb-2 text-[15px] font-extrabold text-neutral-400">{t.detail.workout}</div>
        <div className="mb-6 text-[13px] font-bold text-neutral-700">
          {workout.date} {workout.time}
        </div>
        <div className="mb-3.5 text-[17px] font-extrabold">{t.detail.freeWorkout}</div>
        <div className="mb-7 flex items-end gap-2">
          <strong className="text-[68px] font-black leading-none">{workout.km.toFixed(2)}</strong>
          <span className="pb-2 text-[17px] font-extrabold text-neutral-400">{t.units.km}</span>
        </div>
      </section>
      <DetailCard>
        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          <DetailMetric label={t.detail.calories} value={String(workout.kcal)} />
          <DetailMetric label={t.detail.time} value={formatDuration(seconds)} />
          <DetailMetric label={t.detail.stepsLabel} value={String(workout.steps)} />
          <DetailMetric label={t.detail.avgPace} value={pace} />
          <DetailMetric label={t.detail.avgSpeed} value={speed} />
          <DetailMetric label={t.detail.avgCadence} value={cadence} />
        </div>
      </DetailCard>
      <DetailCard title={t.detail.paceCard}>
        <div className="grid grid-cols-2 gap-7">
          <DetailMetric label={t.detail.avgPace} value={pace} />
          <DetailMetric label={t.detail.fastestPace} value={fastestPace} />
        </div>
      </DetailCard>
      <DetailCard title={t.detail.speed}>
        <div className="grid grid-cols-2 gap-7">
          <DetailMetric label={t.detail.avgSpeedKph} value={`${speed} ${t.units.kmh}`} />
          <DetailMetric label={t.detail.topSpeed} value={`${topSpeed} ${t.units.kmh}`} />
        </div>
      </DetailCard>
    </main>
  );
}

function DetailCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mx-5 mt-4 rounded-3xl bg-neutral-900 px-6 py-6">
      {title ? <div className="mb-6 text-xl font-black text-[#5B5BF6]">{title}</div> : null}
      {children}
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-extrabold leading-tight text-neutral-400">{label}</div>
      <div className="text-[24px] font-black leading-tight">{value}</div>
    </div>
  );
}
