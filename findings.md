# Smart AI Quick Trip Parser Findings

## 2026-06-22

- Existing parser is regex/rule based and handles shorthand such as `8h HN - HP 150k`.
- Existing AI provider only exposes `parse(rawText)` returning one partial candidate object.
- Existing service creates items by looping over `parseQuickTripInput(input.rawText)` and enriching each chunk with AI.
- Existing splitter only splits reliable multi-line inputs; single-line multi-trip content generally stays one chunk.
- AI env vars required: `QUICK_TRIP_AI_BASE_URL`, `QUICK_TRIP_AI_API_KEY`, `QUICK_TRIP_AI_MODEL`.
- Current git-tracked quick-entry files are backend/API/lib/scripts docs. The quick-entry UI directories exist but appear empty in git and filesystem during this session.
- `app/dashboard/schedule/quick-entry` and `components/quick-trip-entry` had no page/client files to wire a visible button into during this session; only `state-helpers.ts` was restored because the existing verify script imports it.
- `npx tsc --noEmit --pretty false` now fails only on the pre-existing report typing issue: `lib/reports/driver-trip-history.ts(117,85): Property 'findMany' does not exist on type '{}'`.
