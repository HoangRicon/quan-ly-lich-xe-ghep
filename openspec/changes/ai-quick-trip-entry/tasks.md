# Tasks

## 1. Schema and persistence

- [x] 1.1 Add `QuickTripEntrySession` and `QuickTripEntryItem` models to `prisma/schema.prisma`.
- [x] 1.2 Create migration with account/session/item indexes.
- [x] 1.3 Generate Prisma client.

## 2. Shared trip creation service

- [x] 2.1 Extract existing `POST /api/trips` create logic into `lib/trips/create-trip.ts`.
- [x] 2.2 Update `POST /api/trips` to call the shared service without behavior regression.
- [ ] 2.3 Add focused tests or smoke script for customer upsert, driver assignment, formula, and event recording.

## 3. Quick-entry parser

- [x] 3.1 Create `lib/quick-trip-entry/split-input.ts`.
- [x] 3.2 Create deterministic Vietnamese shorthand parser for common time, route, phone, price, seats, type, and direction.
- [x] 3.3 Create parser validation and auto-save eligibility helpers.
- [x] 3.4 Add provider adapter boundary for optional AI parsing.
- [x] 3.5 Add parser tests for one-line, multi-line, complete, missing-field, and ambiguous examples.

## 4. Quick-entry API

- [x] 4.1 Add session list/create/update/archive/delete routes.
- [x] 4.2 Add session item list/create route with split/parse behavior.
- [x] 4.3 Add item update route for bottom-sheet edits.
- [x] 4.4 Add save-one route using shared trip creation service.
- [x] 4.5 Add save-all-valid route with per-item isolation.
- [x] 4.6 Ensure all routes are account-scoped and authenticated.

## 5. Mobile UI

- [x] 5.1 Add quick-entry page reachable from schedule mobile actions.
- [x] 5.2 Build horizontal session chip rail with pending/error counts.
- [x] 5.3 Build thumb-friendly input panel with textarea, send, and mic controls.
- [x] 5.4 Build draft queue cards with status, summary, warnings, and actions.
- [x] 5.5 Build bottom-sheet editor for unsaved draft item fields.
- [x] 5.6 Add save-one, discard, copy raw text, and save-all-valid actions.
- [x] 5.7 Add delete completed session action with confirm-discard flow for unfinished sessions.
- [x] 5.8 Make desktop render safely without becoming the primary design target.

## 6. Browser voice

- [x] 6.1 Add browser speech recognition wrapper with feature detection.
- [x] 6.2 Pipe transcript into active input as source `voice`.
- [x] 6.3 Add unsupported-browser fallback and clear error messaging.

## 7. Verification

- [x] 7.1 Run `npx prisma generate`.
- [x] 7.2 Run parser/service tests or smoke scripts.
- [x] 7.3 Run `npx tsc --noEmit`.
- [x] 7.4 Run `npm run lint` and document any pre-existing baseline failures.
- [ ] 7.5 Manually verify mobile quick-entry flow: create session, enter text, paste multi-line, voice fallback/success, edit draft, auto-save, save all valid, delete completed session.

Verification notes:

- `npx prisma generate` passed.
- `npx tsx scripts\verify-quick-trip-parser.ts`, `npx tsx scripts\verify-quick-trip-service.ts`, and `npx tsx scripts\verify-quick-trip-ui-helpers.ts` passed.
- `npx tsc --noEmit --pretty false` was run; it fails only on the known unrelated baseline error `lib/reports/driver-trip-history.ts(117,85)`.
- Scoped lint for quick-entry UI/API/service files passed. Full `npm run lint` was run and still reports pre-existing baseline errors outside quick-entry scope.
- Manual browser/mobile smoke test remains pending.
