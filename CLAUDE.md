# SurviveKit — CLAUDE.md

## Product
Offline-first survival app for iOS and Android.
Must work without internet.

Target: Philippines disaster scenarios.

## Core Principles
- Offline-first ALWAYS
- Fast to use under stress
- Minimal taps
- No unnecessary features

## Tech Stack
- Expo (React Native, TypeScript strict)
- Expo Router
- expo-sqlite (ALL storage)
- expo-location (GPS)
- expo-sensors (compass)
- @maplibre/maplibre-react-native (offline maps)

## Tabs (FINAL MVP ONLY)

1. Home
- PAGASA alert banner
- Quick actions (Map, SOS, Compass, Locations)
- Location status
- Checklist summary

2. Map
- Offline map
- User location
- Pin system (evacuation, hospital, family, highground)
- Overlay toggles (fault lines, elevation)
- Simple route line (straight line only)

3. Compass
- Heading
- Coordinates
- Save location
- Accuracy warning

4. SOS
- Emergency numbers (PH)
- One-tap call
- Add custom contacts

5. Guides
- Category-based navigation
- SQLite FTS search

6. Checklist
- Categories
- Per-family-member go bag tracking

## Emergency Mode

Activated from the Home screen. Replaces the normal Home tab UI and hides the tab bar.

### EmergencyModeScreen (`src/components/EmergencyModeScreen.tsx`)
- Header: dark red background, pulsing animated dot, active-since time, live battery %
- Dead Man's Switch card: 3 states — (1) active: countdown + "✓ I'M OKAY" check-in button, (2) contacts exist but DMS off: "ACTIVATE CHECK-IN TIMER" → `DmsConfigModal`, (3) no contacts: link to `/emergency-contacts`
- 2×3 action grid: MY LOCATION (selectable GPS coords), EMERGENCY CALLS, MEDICAL INFO, FIRST AID, SOS SIGNAL (inline flash/audio toggles), FAMILY & CONTACTS
- Exit button opens deactivation modal (harder to exit than enter)
- Invisible `CameraView` for hardware torch control

### Dead Man's Switch (DMS)
- Config: owner name, check-in interval (4h/6h/12h), grace period (30min/1hr)
- Uses `expo-background-fetch` + `expo-task-manager` (task: `DMS_CHECKIN_TASK`)
- Fires `expo-sms` SMS composer with GPS location when deadline + grace period exceeded
- Scheduled local notifications: reminder 5 min before deadline, final warning at deadline
- Notification IDs stored in `app_meta` table
- Service: `src/services/dmsService.ts` — `activateDms()`, `deactivateDms()`, `confirmCheckin()`, `triggerSmsAlert()`
- DB: `src/db/dmsConfig.ts` — singleton row in `dms_config` table (id=1 enforced by CHECK constraint)

### Flashlight (Global Torch)
- State: `torchActive` / `toggleTorch` in `EmergencyContext` — shared across all screens
- Hardware: `GlobalTorchCamera` (invisible 1×1 `CameraView`) in `app/_layout.tsx`, only mounted when `torchActive && !emergencyMode`
- Auto-off: AppState listener turns off torch when app backgrounds
- Permission: Camera permission requested on first toggle; links to Settings on denial
- Home quick tool + Tools screen both read/write the same global state

### SOS Signal (`src/services/sosSignalService.ts`)
- Torch: module-level callback → component's `CameraView enableTorch` prop (expo-camera v17 requirement)
- Flash SOS: Morse ··· — — — ··· pattern via recursive `setTimeout` chain
- Audio alarm: `expo-av` with `playsInSilentModeIOS: true`, loops `assets/sounds/alarm.mp3`
- Dedicated screen: `app/sos-signal.tsx` → `src/components/SosSignalScreen.tsx`

### Emergency Contacts (`app/emergency-contacts.tsx`)
- Stored in `emergency_contacts` table (SQLite, no system contacts access)
- DB: `src/db/emergencyContacts.ts`
- Used by DMS to build SMS recipient list

### Medical Info (`app/medical-info.tsx`)
- Stored as columns on the `members` table: `blood_type`, `allergies`, `conditions`, `medications`, `medical_notes`
- Added via `emergency_v1` migration
- DB: `src/db/medicalInfo.ts` — `getMedicalInfo(memberId)`, `saveMedicalInfo(memberId, info)`
- Shown per-family-member with accordion UI

### Preparedness Score (`src/services/emergencyModeService.ts`)
- Weights (total 100): go-bag 32pts, emergency contacts 20pts, medical info 16pts, evacuation pin 12pts, tutorial 20pts (4 per lesson)
- Displayed on Home screen as a progress bar + checklist of actionable items

### Context (`src/context/EmergencyContext.tsx`)
- `EmergencyProvider` wraps the entire app in `app/_layout.tsx`
- Exposes: `emergencyMode`, `activateEmergencyMode`, `deactivateEmergencyMode`, `dmsActive`, `dmsNextCheckin`, `confirmCheckin`, `preparednessScore`, `preparednessItems`, `hasEmergencyContacts`, `reload`, `refreshPreparedness`, `torchActive`, `toggleTorch`

### Tutorial System
- DB: `tutorial_progress` table — singleton row (id=1), `lesson_1_done`…`lesson_5_done`, `welcome_shown`
- DB layer: `src/db/tutorialProgress.ts` — `getTutorialProgressRow()`, `markLessonDone()`, `markWelcomeShown()`
- Service: `src/services/tutorialService.ts` — `LESSONS` (5), `getLessonProgress()`, `getTutorialScorePoints()`, `completeLessonByKey(key)`
- Context: `src/context/TutorialContext.tsx` — `TutorialProvider`, `useTutorial()` — exposes `activeLesson`, `showWelcome`, `tutorialScorePoints`, `lessonProgress`, `startLesson`, `dismissLesson`, `dismissWelcome`, `onActionCompleted`, `refreshTutorial`
- Overlay: `src/components/TutorialOverlay.tsx` — Reanimated slide-up card, globally mounted in `_layout.tsx` inside `TutorialProvider`
- Home: GET READY section with 5 lesson rows; first-launch welcome modal → auto-starts lesson 1
- Completion keys: `pin_added` (map), `checklist_checked_3` (checklist), `emergency_contact_added` (contacts), `guide_opened` (guides), `cpr_started` (tools CPR timer)
- Score: 4 pts per lesson completed, max 20 pts, counted in preparedness score

### Tab bar in emergency mode
- `app/(tabs)/_layout.tsx` sets `tabBarStyle: { display: 'none' }` when `emergencyMode === true`
- `app/(tabs)/index.tsx` early-returns `<EmergencyModeScreen />` when `emergencyMode === true`

## Database (SQLite)

Tables:
- pins
- members (extended: blood_type, allergies, conditions, medications, medical_notes)
- checklist_items
- member_checklist
- alerts
- saved_locations
- emergency_contacts
- dms_config (singleton row, id=1)
- emergency_mode (singleton row, id=1)
- tutorial_progress (singleton row, id=1)

## Map Rules
- Use MapLibre
- Support offline packs
- Do NOT implement turn-by-turn navigation
- Route = straight line only

## Alerts
- Source: PAGASA RSS only
- Cache in SQLite
- Show "last updated"

## Checklist Rules
- Each family member has their own checklist
- Predefined items based on type (adult, child, baby, pet)

## UX Rules
- Large buttons
- Clear labels
- No clutter
- Must work in panic situations

## Constraints
- NO AI embeddings
- NO online dependency for core features
- NO unnecessary animations
- Keep app lightweight

## Code Rules
- TypeScript strict (no any)
- Functional components only
- Separate services, db, and UI
- All data via SQLite (no AsyncStorage)

## Folder Structure

app/(tabs)/
app/                    ← stack screens (emergency-contacts, medical-info, sos-signal, onboarding)
src/components/
src/components/modals/  ← DmsConfigModal and future modal components
src/context/            ← EmergencyContext, TutorialContext
src/db/
src/services/
src/types/
assets/tiles/
assets/geojson/
assets/guides/
assets/sounds/          ← alarm.mp3, cpr_beep.wav (generated at runtime)

## Goal
Produce a fully working Expo app ready for EAS build.
