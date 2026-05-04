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

## Database (SQLite)

Tables:
- pins
- members
- checklist_items
- member_checklist
- alerts
- saved_locations

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
src/components/
src/db/
src/services/
assets/tiles/
assets/geojson/
assets/guides/

## Goal
Produce a fully working Expo app ready for EAS build.
