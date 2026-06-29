import Dexie, { type Table } from 'dexie';
import { createWorkoutSyncFields, type Workout } from '../domain/workout';

function normalizeWorkoutForLocalStorage(workout: Partial<Workout>): Workout {
  const syncFields = createWorkoutSyncFields();
  return {
    id: Number(workout.id),
    clientId: workout.clientId ?? syncFields.clientId,
    ownerUserId: workout.ownerUserId ?? syncFields.ownerUserId,
    date: workout.date ?? '',
    time: workout.time ?? '',
    seconds: workout.seconds ?? 0,
    km: workout.km ?? 0,
    kcal: workout.kcal ?? 0,
    min: workout.min ?? 0,
    steps: workout.steps ?? 0,
    maxSpeed: workout.maxSpeed ?? 0,
    createdAt: workout.createdAt ?? syncFields.createdAt,
    updatedAt: workout.updatedAt ?? syncFields.updatedAt,
    deletedAt: workout.deletedAt ?? syncFields.deletedAt,
    syncStatus: workout.syncStatus ?? syncFields.syncStatus,
    lastSyncError: workout.lastSyncError,
  };
}

export class AppDb extends Dexie {
  workouts!: Table<Workout, number>;

  constructor() {
    super('treadmill-workout-db');
    this.version(1).stores({
      workouts: 'id, date',
    });
    this.version(2)
      .stores({
        workouts: 'id, clientId, ownerUserId, date, updatedAt, deletedAt, syncStatus',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<Workout, number>('workouts')
          .toCollection()
          .modify((workout) => {
            Object.assign(workout, normalizeWorkoutForLocalStorage(workout));
          });
      });
    this.version(3).stores({
      workouts: 'id, clientId, ownerUserId, date, [date+time+id], updatedAt, deletedAt, syncStatus',
    });
    this.workouts.hook('creating', (_primaryKey, workout) => {
      Object.assign(workout, normalizeWorkoutForLocalStorage(workout));
    });
    this.workouts.hook('updating', (mods) => {
      const changes = mods as Record<string, unknown>;
      if (!('updatedAt' in changes)) {
        changes.updatedAt = new Date().toISOString();
      }
      return mods;
    });
  }
}

export const db = new AppDb();
