export type SyncStatus = 'local' | 'pending' | 'syncing' | 'synced' | 'error';

export type Workout = {
  id: number;
  clientId: string;
  ownerUserId: string | null;
  date: string;
  time: string;
  seconds: number;
  km: number;
  kcal: number;
  min: number;
  steps: number;
  maxSpeed: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastSyncError?: string;
};

export function createWorkoutSyncFields(
  now = new Date().toISOString(),
): Pick<Workout, 'clientId' | 'ownerUserId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus'> {
  return {
    clientId: crypto.randomUUID(),
    ownerUserId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'local',
  };
}

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
  const speed = averageSpeedKph(workout);
  return speed === null ? '--' : speed.toFixed(1);
}

function averageSpeedKph(workout: WorkoutLike): number | null {
  const seconds = workoutSeconds(workout);
  if (!workout.km || !seconds) return null;
  return workout.km / (seconds / 3600);
}

function topSpeedKph(workout: WorkoutLike): number | null {
  const averageSpeed = averageSpeedKph(workout);
  const maxSpeed = workout.maxSpeed && workout.maxSpeed > 0 ? workout.maxSpeed : null;
  if (averageSpeed === null) return maxSpeed;
  if (maxSpeed === null) return averageSpeed;
  return Math.max(maxSpeed, averageSpeed);
}

export function formatTopSpeed(workout: WorkoutLike): string {
  const speed = topSpeedKph(workout);
  return speed === null ? '--' : speed.toFixed(1);
}

export function formatFastestPace(workout: WorkoutLike): string {
  const speed = topSpeedKph(workout);
  return speed === null ? formatPace(workout) : formatPaceSeconds((60 / speed) * 60);
}

export function formatCadence(workout: WorkoutLike): string {
  const minutes = workoutSeconds(workout) / 60;
  if (!workout.steps || !minutes) return '--';
  return String(Math.round(workout.steps / minutes));
}
