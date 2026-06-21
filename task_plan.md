# Smart AI Quick Trip Parser Task Plan

## Goal

Nang cap quick-entry de hieu ngon ngu tu nhien va tao nhieu draft tu mot input bang AI khi co cau hinh, dong thoi giu fallback rule parser an toan.

## Current Phase

Status: in_progress

## Tasks

- [x] 1. Explore quick-entry parser/provider/service context.
- [x] 2. Create OpenSpec proposal/spec/tasks for smart parser.
- [x] 3. Write failing focused tests for natural parser and AI parse-many.
- [x] 4. Implement parser/provider/service/API changes.
- [x] 5. Check whether quick-entry UI files are present and wire parseMode if possible.
- [x] 6. Run verification commands and document results.

## Acceptance Criteria

- Natural Vietnamese samples parse route/time/price/seats without requiring AI.
- AI provider accepts JSON object, JSON array, and `{ drafts: [...] }`.
- Smart service path can use AI parse-many for one input and fallback safely.
- Missing or failed AI never blocks draft creation.
- Verification output is recorded in `progress.md`.

## Risks

- AI can hallucinate fields. Mitigation: validate locally and keep missing/warning candidates in review.
- Current workspace has no tracked quick-entry UI page/component files. Mitigation: implement backend/API first, add UI hook only if files exist.
