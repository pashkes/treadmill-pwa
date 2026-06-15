# Live FTMS Pause Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix live treadmill pause/recovery behavior, smooth derived metrics, and keep the live UI usable in landscape.

**Architecture:** Keep completed workouts in Dexie and keep Zustand limited to live runtime state. Treat a zero-speed FTMS packet after movement as pause state, not automatic completion. Restore persisted active workouts as recoverable disconnected drafts without forcing the live route on app startup.

**Tech Stack:** React, TypeScript, Zustand, TanStack Router, Vitest, Tailwind CSS.

---

### Task 1: Pause State Instead Of Auto-Complete

**Files:**
- Modify: `src/features/live/live-store.test.ts`
- Modify: `src/features/live/live-store.ts`
- Modify: `src/features/live/LiveScreen.test.tsx`
- Modify: `src/features/live/LiveScreen.tsx`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/ru.ts`
- Modify: `src/i18n/uk.ts`

- [ ] **Step 1: Write failing tests**

Add a live-store test that starts a connected workout, sends moving data, then sends `speedKph: 0`; assert `isPaused` is `true` and `autoStopRequested` is `false`.

Add a LiveScreen test that sets `isPaused: true`, renders `/live`, and asserts a pause status is visible and no automatic save occurs.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/features/live/live-store.test.ts src/features/live/LiveScreen.test.tsx`

Expected: tests fail because zero speed currently sets `autoStopRequested`, and the UI has no pause status.

- [ ] **Step 3: Implement minimal behavior**

In `setTreadmillData`, set `isPaused: true` for zero speed after movement and stop setting `autoStopRequested` from speed alone. Set `isPaused: false` when speed rises above the moving threshold. Add translated `paused`/`resumeHint` strings and render a compact pause banner in `LiveScreen`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/features/live/live-store.test.ts src/features/live/LiveScreen.test.tsx`

Expected: PASS.

### Task 2: Active Workout Recovery

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/features/live/live-store.test.ts`
- Modify: `src/features/live/live-store.ts`

- [ ] **Step 1: Write failing tests**

Update App recovery tests so startup restores active metrics and toast but remains on the current route instead of forcing `/live`. Add a live-store test proving `stopAndSave()` saves a restored disconnected active workout and clears `walking-app-active-workout`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/App.test.tsx src/features/live/live-store.test.ts`

Expected: App test fails because startup navigates to `/live`.

- [ ] **Step 3: Implement minimal behavior**

Remove forced `navigate({ to: '/live' })` from restore effect. Keep `showToast()`, restore live state, and leave user navigation URL-backed. Ensure restored disconnected workouts can be manually saved.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/App.test.tsx src/features/live/live-store.test.ts`

Expected: PASS.

### Task 3: Derived Metrics Stability

**Files:**
- Modify: `src/features/live/live-store.test.ts`
- Modify: `src/features/live/live-store.ts`
- Modify: `src/domain/workout.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that elapsed seconds never move backward or jump by a non-monotonic treadmill packet, zero-speed pause packets do not add distance, and estimated steps are based on a configurable stride-length constant.

Add a domain pace test for `13:48 / 1.30 km = 10'37"` to match the reported screenshot.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/features/live/live-store.test.ts src/domain/workout.test.ts`

Expected: at least the non-monotonic elapsed-time test fails with current direct assignment.

- [ ] **Step 3: Implement minimal behavior**

Clamp elapsed seconds to never decrease. Integrate fallback distance only when running speed is above the movement threshold and elapsed delta is positive. Replace steps-per-km with an estimated stride length constant and derive steps from `distanceMeters / strideMeters`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/features/live/live-store.test.ts src/domain/workout.test.ts`

Expected: PASS.

### Task 4: Landscape Layout And Treadmill Centering

**Files:**
- Modify: `src/ui/TreadmillArt.tsx`
- Modify: `src/features/live/LiveScreen.tsx`
- Modify: `tests/workout-flow.spec.ts`

- [ ] **Step 1: Write or update UI checks**

Update the Playwright smoke test to also set a landscape viewport while on live screen and assert key controls remain visible.

- [ ] **Step 2: Run test to verify baseline**

Run: `npm run test:e2e -- tests/workout-flow.spec.ts`

Expected: baseline may pass functionally, but layout is not optimized.

- [ ] **Step 3: Implement minimal layout changes**

Center `TreadmillArt` using a full-width responsive SVG class. Constrain `LiveScreen` content with a centered max width on portrait and switch the live metric grid to a landscape-friendly four-column layout.

- [ ] **Step 4: Run targeted checks**

Run: `npm run test:e2e -- tests/workout-flow.spec.ts`

Expected: PASS.

### Task 5: Final Verification

**Files:**
- All modified files.

- [ ] **Step 1: Run required checks**

Run: `npm run test`

Run: `npm run lint`

Run: `npm run build`

Run: `npm run test:e2e`

- [ ] **Step 2: Review git diff**

Run: `git diff --stat`

Run: `git diff`

Expected: changes are scoped to live/Bluetooth-adjacent behavior, translations, tests, and the plan doc.
