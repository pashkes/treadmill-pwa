import type { Workout } from './workout';

export type SyncAggregateStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

export function chooseNewestWorkout(local: Workout, remote: Workout): Workout {
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  return remoteTime > localTime ? remote : local;
}

export function syncStatusFromCounts({
  isOnline,
  isSyncing,
  pending,
  errors,
}: {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
  errors: number;
}): SyncAggregateStatus {
  if (!isOnline) return 'offline';
  if (isSyncing) return 'syncing';
  if (errors > 0) return 'error';
  if (pending > 0) return 'pending';
  return 'synced';
}
