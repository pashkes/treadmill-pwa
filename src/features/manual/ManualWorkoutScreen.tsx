import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAppStore } from '../../app/app-store';
import { createLocalWorkoutId, addWorkout } from '../../db/workout-repository';
import { nowTimeString, todayString } from '../../domain/date-time';
import { createManualWorkout } from '../../domain/manual-workout';
import { useT } from '../../i18n';
import { notifyLocalWorkoutChanged } from '../sync/sync-store';

type ManualWorkoutErrors = Partial<Record<'date' | 'time' | 'km' | 'minutes' | 'kcal', string>>;

export function ManualWorkoutScreen() {
  const t = useT();
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);
  const today = todayString();
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTimeString);
  const [km, setKm] = useState('');
  const [minutes, setMinutes] = useState('');
  const [kcal, setKcal] = useState('');
  const [errors, setErrors] = useState<ManualWorkoutErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateManualWorkout({ date, time, km, minutes, kcal }, today, t);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const id = await createLocalWorkoutId();
      const workout = createManualWorkout(
        {
          date,
          time,
          km: Number(km),
          minutes: Number(minutes),
          kcal: Number(kcal),
        },
        id,
      );
      await addWorkout(workout);
      notifyLocalWorkoutChanged();
      showToast(t.manual.saved);
      void navigate({ to: '/workouts/$workoutId', params: { workoutId: String(id) } });
    } catch {
      showToast(t.errors.saveWorkoutFailed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-14">
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white"
          aria-label={t.manual.back}
          onClick={() => void navigate({ to: '/' })}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[26px] font-extrabold">{t.manual.title}</h1>
      </header>

      <form className="space-y-3" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.manual.date} error={errors.date}>
            <input
              className={inputClassName}
              type="date"
              value={date}
              max={today}
              aria-label={t.manual.date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label={t.manual.time} error={errors.time}>
            <input
              className={inputClassName}
              type="time"
              value={time}
              aria-label={t.manual.time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>

        <Field label={t.manual.distance} unit={t.units.km} error={errors.km}>
          <input
            className={inputClassName}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={km}
            aria-label={t.manual.distance}
            onChange={(event) => setKm(event.target.value)}
          />
        </Field>

        <Field label={t.manual.duration} unit={t.units.min} error={errors.minutes}>
          <input
            className={inputClassName}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={minutes}
            aria-label={t.manual.duration}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </Field>

        <Field label={t.manual.calories} unit={t.units.kcal} error={errors.kcal}>
          <input
            className={inputClassName}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={kcal}
            aria-label={t.manual.calories}
            onChange={(event) => setKcal(event.target.value)}
          />
        </Field>

        <button
          type="submit"
          className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5B5BF6] text-[15px] font-extrabold text-white disabled:opacity-60"
          disabled={isSaving}
        >
          <Save size={19} />
          {isSaving ? t.manual.saving : t.manual.save}
        </button>
      </form>
    </main>
  );
}

function validateManualWorkout(
  values: { date: string; time: string; km: string; minutes: string; kcal: string },
  today: string,
  t: ReturnType<typeof useT>,
): ManualWorkoutErrors {
  const errors: ManualWorkoutErrors = {};
  const km = Number(values.km);
  const minutes = Number(values.minutes);
  const kcal = Number(values.kcal);

  if (!values.date) {
    errors.date = t.manual.validation.dateRequired;
  } else if (values.date > today) {
    errors.date = t.manual.validation.dateFuture;
  }
  if (!values.time) errors.time = t.manual.validation.timeRequired;
  if (!Number.isFinite(km) || km <= 0) errors.km = t.manual.validation.distancePositive;
  if (!Number.isFinite(minutes) || minutes < 1) errors.minutes = t.manual.validation.durationPositive;
  if (!Number.isFinite(kcal) || kcal < 0) errors.kcal = t.manual.validation.caloriesPositive;

  return errors;
}

const inputClassName =
  'mt-2 h-12 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-[16px] font-bold text-white outline-none focus:border-[#5B5BF6]';

function Field({ label, unit, error, children }: { label: string; unit?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block rounded-2xl bg-neutral-900 p-3.5">
      <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
        <span>{label}</span>
        {unit ? <span>{unit}</span> : null}
      </div>
      {children}
      {error ? <div className="mt-2 text-xs font-semibold text-red-400">{error}</div> : null}
    </label>
  );
}
