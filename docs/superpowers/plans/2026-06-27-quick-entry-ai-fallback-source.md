# Quick Entry AI Fallback Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure quick-create can create rule-based drafts when AI is unavailable and clearly label each draft as AI-assisted or rule-based.

**Architecture:** Store optional analysis metadata inside existing `parsedData` JSON to avoid a Prisma migration. The smart parser marks chunks as `ai` or `rule`, the service persists the candidate unchanged, and the UI renders a small source badge plus Vietnamese fallback copy.

**Tech Stack:** Next.js App Router, TypeScript, Prisma JSON fields, existing node assert verification scripts.

---

### Task 1: Parser Metadata And AI Timeout

**Files:**
- Modify: `lib/quick-trip-entry/types.ts`
- Modify: `lib/quick-trip-entry/ai-provider.ts`
- Modify: `lib/quick-trip-entry/smart-parser.ts`
- Test: `scripts/verify-quick-trip-smart-service.ts`
- Test: `scripts/verify-quick-trip-ai-provider.ts`

- [x] **Step 1: Add failing tests**

Add expectations that AI success sets `analysisSource: "ai"`, AI failure sets `analysisSource: "rule"` plus `ai_parse_failed`, and AI request construction exposes timeout behavior through an abort signal test.

- [x] **Step 2: Run red tests**

Run:

```bash
npx tsx scripts/verify-quick-trip-smart-service.ts
npx tsx scripts/verify-quick-trip-ai-provider.ts
```

Expected: fail on missing `analysisSource` and timeout behavior.

- [x] **Step 3: Implement minimal parser/provider changes**

Add optional fields to `QuickTripCandidate`, wrap AI fetch with `AbortController`, and mark parser chunks with source metadata.

- [x] **Step 4: Run green tests**

Run the same two scripts. Expected: both print their existing success messages.

### Task 2: UI Badge And Vietnamese Copy

**Files:**
- Modify: `lib/quick-create/draft-helpers.ts`
- Modify: `components/quick-create/draft-card.tsx`
- Modify: `components/quick-create/draft-list.tsx`
- Modify: `components/quick-create/ai-composer.tsx`
- Modify: `app/dashboard/quick-create/QuickCreateShell.tsx`
- Modify: `lib/quick-create/constants.ts`
- Test: `scripts/verify-quick-create-logic.ts`

- [x] **Step 1: Add failing helper tests**

Add tests for `getDraftAnalysisBadge` with `analysisSource: "ai"`, `analysisSource: "rule"`, and legacy `ai_parse_failed`.

- [x] **Step 2: Run red helper test**

Run:

```bash
npx tsx scripts/verify-quick-create-logic.ts
```

Expected: fail because `getDraftAnalysisBadge` does not exist.

- [x] **Step 3: Implement helper and UI badge**

Implement `getDraftAnalysisBadge`, render it beside the status badge, and replace quick-create-facing copy with Vietnamese text with accents.

- [x] **Step 4: Run green helper test**

Run `npx tsx scripts/verify-quick-create-logic.ts`. Expected: success message.

### Task 3: Verification

**Files:**
- All modified files above

- [x] **Step 1: Run focused scripts**

```bash
npx tsx scripts/verify-quick-trip-ai-provider.ts
npx tsx scripts/verify-quick-trip-smart-service.ts
npx tsx scripts/verify-quick-create-logic.ts
```

- [x] **Step 2: Run TypeScript**

```bash
npx tsc --noEmit --pretty false
```

- [x] **Step 3: Run focused lint**

```bash
npx eslint lib/quick-trip-entry/types.ts lib/quick-trip-entry/ai-provider.ts lib/quick-trip-entry/smart-parser.ts lib/quick-create/draft-helpers.ts components/quick-create/draft-card.tsx components/quick-create/draft-list.tsx components/quick-create/ai-composer.tsx app/dashboard/quick-create/QuickCreateShell.tsx lib/quick-create/constants.ts scripts/verify-quick-trip-ai-provider.ts scripts/verify-quick-trip-smart-service.ts scripts/verify-quick-create-logic.ts
```

### Verification Evidence

- `npx tsx scripts/verify-quick-trip-ai-provider.ts` -> `quick-trip AI provider checks passed`
- `npx tsx scripts/verify-quick-trip-smart-service.ts` -> `quick-trip smart service checks passed`
- `npx tsx scripts/verify-quick-create-logic.ts` -> `quick-create logic checks passed`
- `npx tsc --noEmit --pretty false` -> exit 0
- Focused `npx eslint ...` -> exit 0
