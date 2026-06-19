import { chooseNewestWorkout } from '../../domain/sync';
import type { Workout } from '../../domain/workout';
import {
  attachGuestWorkoutsToUser,
  bulkPutWorkouts,
  createLocalWorkoutId,
  listAllWorkoutsIncludingDeleted,
  listWorkoutsForSync,
} from '../../db/workout-repository';

export type RemoteWorkoutApi = {
  listWorkouts: (userId: string) => Promise<Workout[]>;
  upsertWorkouts: (workouts: Workout[]) => Promise<void>;
};

function isPendingSync(workout: Workout): boolean {
  return workout.syncStatus === 'local' || workout.syncStatus === 'pending' || workout.syncStatus === 'error';
}

export async function syncWorkouts({ userId, remote }: { userId: string; remote: RemoteWorkoutApi }): Promise<void> {
  await attachGuestWorkoutsToUser(userId);

  const remoteWorkouts = await remote.listWorkouts(userId);
  const localWorkouts = await listAllWorkoutsIncludingDeleted();
  const localByClientId = new Map(localWorkouts.map((workout) => [workout.clientId, workout]));

  for (const remoteWorkout of remoteWorkouts) {
    const local = localByClientId.get(remoteWorkout.clientId);
    if (!local) {
      await bulkPutWorkouts([
        {
          ...remoteWorkout,
          id: await createLocalWorkoutId(),
          ownerUserId: userId,
          syncStatus: 'synced',
        },
      ]);
      continue;
    }

    const winner = chooseNewestWorkout(local, remoteWorkout);
    const syncStatus = winner === local && isPendingSync(local) ? local.syncStatus : 'synced';
    await bulkPutWorkouts([{ ...winner, id: local.id, ownerUserId: userId, syncStatus }]);
  }

  const pending = await listWorkoutsForSync(userId);
  if (!pending.length) return;

  await remote.upsertWorkouts(pending);
  await bulkPutWorkouts(pending.map((workout) => ({ ...workout, syncStatus: 'synced', lastSyncError: undefined })));
}
