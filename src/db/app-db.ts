import Dexie, { type Table } from 'dexie';
import type { Workout } from '../domain/workout';

export class AppDb extends Dexie {
  workouts!: Table<Workout, number>;

  constructor() {
    super('treadmill-workout-db');
    this.version(1).stores({
      workouts: 'id, date',
    });
  }
}

export const db = new AppDb();
