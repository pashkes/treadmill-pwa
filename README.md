# Treadmill Workout PWA

Offline-first treadmill workout tracker built with React, Vite, TypeScript, Dexie, and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run test
npm run build
npm run test:e2e
```

## Storage

Completed workouts are stored in IndexedDB through Dexie. On first launch, existing `localStorage` workouts from `treadmill_v2` are copied into Dexie without deleting the old value.
