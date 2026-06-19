import { create } from 'zustand';
import type { SyncAggregateStatus } from '../../domain/sync';

type WorkoutSyncState = {
  status: SyncAggregateStatus;
  pendingCount: number;
  error: string | null;
  localChangeVersion: number;
  notifyLocalWorkoutChanged: () => void;
  setSyncing: () => void;
  setResult: (status: SyncAggregateStatus, pendingCount: number, error?: string | null) => void;
};

export const useWorkoutSyncStore = create<WorkoutSyncState>((set) => ({
  status: 'synced',
  pendingCount: 0,
  error: null,
  localChangeVersion: 0,
  notifyLocalWorkoutChanged: () =>
    set((state) => ({
      localChangeVersion: state.localChangeVersion + 1,
      status: state.status === 'syncing' ? state.status : 'pending',
      pendingCount: Math.max(1, state.pendingCount),
    })),
  setSyncing: () => set({ status: 'syncing', error: null }),
  setResult: (status, pendingCount, error = null) => set({ status, pendingCount, error }),
}));

export function notifyLocalWorkoutChanged(): void {
  useWorkoutSyncStore.getState().notifyLocalWorkoutChanged();
}
