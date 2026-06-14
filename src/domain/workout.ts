export type Workout = {
  id: number;
  date: string;
  time: string;
  seconds: number;
  km: number;
  kcal: number;
  min: number;
  steps: number;
  maxSpeed: number;
};

export type WorkoutLike = Partial<Pick<Workout, 'seconds' | 'min' | 'km' | 'steps' | 'maxSpeed'>>;

export function workoutSeconds(workout: WorkoutLike): number {
  return Math.max(0, workout.seconds ?? (workout.min ?? 0) * 60);
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPaceSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

export function formatPace(workout: WorkoutLike): string {
  const seconds = workoutSeconds(workout);
  if (!workout.km || !seconds) return '--';
  return formatPaceSeconds(seconds / workout.km);
}

export function formatSpeed(workout: WorkoutLike): string {
  const seconds = workoutSeconds(workout);
  if (!workout.km || !seconds) return '--';
  return (workout.km / (seconds / 3600)).toFixed(1);
}

export function formatCadence(workout: WorkoutLike): string {
  const minutes = workoutSeconds(workout) / 60;
  if (!workout.steps || !minutes) return '--';
  return String(Math.round(workout.steps / minutes));
}
