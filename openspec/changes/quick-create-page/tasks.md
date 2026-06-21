# Tasks: Quick Create Page

## Task Groups

Tasks are organized by implementation phase. Each task is designed to be implementable in 5-15 minutes.

---

## Phase 1: Core Page & Routing

### 1.1 Create page route

- [ ] **File**: `app/dashboard/quick-create/page.tsx`
- Server component that renders `QuickCreateShell` client component
- Redirects to `/login` if no session (reuse auth check)
- No dashboard layout wrapper (standalone page)

### 1.2 Create QuickCreateShell client wrapper

- [ ] **File**: `app/dashboard/quick-create/QuickCreateShell.tsx`
- `"use client"` directive
- Wraps all child components
- Provides SessionContext
- Uses SWR to fetch sessions on mount

### 1.3 Create constants and formatters

- [ ] **File**: `lib/quick-create/constants.ts`
  - Status color mappings (per design.md)
  - Warning badge label mappings: `missing_phone` → "Thiếu SĐT", `missing_price` → "Thiếu giá", etc.

- [ ] **File**: `lib/quick-create/formatters.ts`
  - `formatPriceK(price: number): string` — 150000 → "150k"
  - `formatCurrency(price: number): string` — 150000 → "150.000đ"
  - `formatTime(departureTime: string): string` — ISO → "09:30"
  - `formatFullDate(departureTime: string): string` — ISO → "22/06"
  - `formatPhoneLink(phone: string): string` — for tel: links
  - `formatZaloLink(phone: string): string` — https://zalo.me/...

---

## Phase 2: Data Hooks

### 2.1 Session hooks

- [ ] **File**: `hooks/use-quick-create-sessions.ts`
- `useSessions()` — fetches sessions via GET `/api/quick-trip-entry/sessions`
- `useCreateSession()` — POST, returns mutate function
- `useUpdateSession()` — PATCH, returns mutate function
- `useDeleteSession()` — DELETE, returns mutate function
- All use SWR `mutate` for optimistic updates

### 2.2 Draft hooks

- [ ] **File**: `hooks/use-quick-create-drafts.ts`
- `useDrafts(sessionId)` — fetches items via GET `/api/quick-trip-entry/sessions/[id]/items`
- Auto-refresh every 5 seconds when session has `pending` items
- `useCreateDraft(rawText, sessionId)` — POST, creates items
- `useUpdateDraft(itemId, parsedData)` — PATCH
- `useSaveDraft(itemId)` — POST save
- `useDiscardDraft(itemId)` — POST discard

### 2.3 AI composer state hook

- [ ] **File**: `hooks/use-ai-composer.ts`
- State machine: `idle | analyzing | generating | done | error`
- Manages `composerText` state
- Auto-clears on success
- Error message state

### 2.4 Multi-select hook

- [ ] **File**: `hooks/use-multi-select.ts`
- `selectedIds: Set<number>`
- `toggle(id)`, `selectAll()`, `clearSelection()`
- `isSelected(id)` helper
- `isMultiSelecting` boolean

### 2.5 Swipe actions hook

- [ ] **File**: `hooks/use-swipe-actions.ts`
- Tracks `swipeDirection` per card id: `null | 'left' | 'right'`
- `swipeThreshold: 80` px
- `resetSwipe(id)` helper

### 2.6 Recent prompts hook

- [ ] **File**: `hooks/use-recent-prompts.ts`
- Reads/writes `quick-create-recent-prompts` in localStorage
- `addPrompt(text)`, `getPrompts(): string[]`
- Max 10 items, FIFO eviction

---

## Phase 3: UI Components (Core)

### 3.1 DraftCard

- [ ] **File**: `components/quick-create/draft-card.tsx`
- Props: `DraftCardProps` (item data, onCreate, onEdit, onDelete, onDuplicate, isSelected, isMultiSelecting)
- Renders 4-row layout matching ScheduleList
- Shows warning badges from `missingFields` array
- Shows status badge from `status`
- Inline CreateRide button
- Swipe gesture via `use-swipe-actions`
- Multi-select state via `use-multi-select`
- Optimistic: loading state with overlay

### 3.2 DraftWarnings

- [ ] **File**: `components/quick-create/draft-warnings.tsx`
- Props: `missingFields: string[]`, `warnings: string[]`
- Renders yellow badge pills
- Maps codes to Vietnamese labels (from constants.ts)

### 3.3 DraftList

- [ ] **File**: `components/quick-create/draft-list.tsx`
- Props: `sessionId`, `drafts[]`
- Maps drafts to `DraftCard` components
- Handles pull-to-refresh
- Shows `DraftListSkeleton` during loading
- Shows `EmptyState` when no drafts

### 3.4 DraftListSkeleton

- [ ] **File**: `components/quick-create/draft-list-skeleton.tsx`
- 3 shimmer placeholder cards
- Matches DraftCard dimensions

### 3.5 EmptyState

- [ ] **File**: `components/quick-create/empty-state.tsx`
- Props: `type: 'no-sessions' | 'no-drafts' | 'all-processed'`
- Shows appropriate icon + message per type

### 3.6 AIComposer

- [ ] **File**: `components/quick-create/ai-composer.tsx`
- States: idle, analyzing, generating, done, error
- Auto-growing textarea (up to 120px)
- Send button (disabled when empty or loading)
- Shows `PromptSuggestions` when idle + empty
- Shows `RecentPromptsDropdown` on focus when empty
- Clear input on success

### 3.7 VoiceInputButton

- [ ] **File**: `components/quick-create/voice-input-button.tsx`
- Uses Web Speech API (`SpeechRecognition`)
- Sets `isListening` state
- Appends transcript to composer input
- Falls back gracefully if not supported

### 3.8 PromptSuggestions

- [ ] **File**: `components/quick-create/prompt-suggestions.tsx`
- 3 hardcoded suggestions (see spec)
- Tap → fills composer input

### 3.9 SessionSwitcher

- [ ] **File**: `components/quick-create/session-switcher.tsx`
- Dropdown button in header
- Lists sessions with pending count badges
- Pinned sessions at top
- Tap → switch session (via `useSessions`)

---

## Phase 4: Sheet Components

### 4.1 DraftEditorSheet

- [ ] **File**: `components/quick-create/draft-editor-sheet.tsx`
- Uses `Sheet` from shadcn/ui
- Snap points: `["50%", "90%"]`
- Props: `itemId`, `draft`, `onSave`, `onCreateRide`, `onClose`
- Inline editing for all fields (matching TripForm pattern)
- Customer phone autocomplete via `/api/customers`
- Footer: [Hủy] [Lưu] [Tạo cuốc xe ngay]
- Undo/redo via local state

### 4.2 SessionManagerSheet

- [ ] **File**: `components/quick-create/session-manager-sheet.tsx`
- Full session CRUD
- Drag-to-reorder (optional, nice-to-have)
- Create, rename, pin, archive, delete

---

## Phase 5: Quick Actions & Multi-Select

### 5.1 QuickActionsBar

- [ ] **File**: `components/quick-create/quick-actions-bar.tsx`
- Wraps DraftCard with swipe detection
- Left swipe → Create Ride (blue)
- Right swipe → Edit, Duplicate, Delete (gray/amber/red)
- Touch handlers using pointer events (no external library)

### 5.2 MultiSelectToolbar

- [ ] **File**: `components/quick-create/multi-select-toolbar.tsx`
- Appears when `multiSelectedIds.size > 0`
- Selected count + "Tạo tất cả" + "Xóa"
- Tap outside / Escape → exit multi-select
- Batch save via `/api/quick-trip-entry/sessions/[id]/save-valid`

---

## Phase 6: Page Assembly & Navigation

### 6.1 Assemble QuickCreateShell

- [ ] **File**: `app/dashboard/quick-create/QuickCreateShell.tsx`
- Compose all components with proper z-index layering
- Session context provider
- Keyboard shortcut listeners
- Responsive layout

### 6.2 Back Button

- [ ] **File**: `components/quick-create/back-button.tsx`
- `←` icon button in header, navigates via `router.back()` with `/dashboard/schedule` fallback
- Consistent with other page header back buttons in the project

---

## Phase 7: Polish & Edge Cases

### 7.1 Keyboard shortcuts

- [ ] Global listener in `QuickCreateShell`
- Commands per design.md spec

### 7.2 Error handling

- [ ] Toast notifications for all API errors
- Retry buttons where appropriate
- Network offline detection

### 7.3 Accessibility audit

- [ ] Verify all interactive elements have focus styles
- [ ] Screen reader announcements for state changes
- [ ] Keyboard navigation for draft list

### 7.4 Performance

- [ ] Verify 60fps scroll with 50+ drafts
- [ ] Debounce rapid create/save actions
- [ ] Memoize DraftCard renders

---

## Test Scenarios

1. Create session → type prompt → see 2 draft cards appear
2. Tap CreateRide on draft → see success animation → card removed
3. Swipe draft left → see blue CreateRide → swipe to threshold → ride created
4. Long-press draft → multi-select mode → tap 3 more → select all 4
5. Tap "Tạo tất cả" → all 4 rides created with batch API
6. Switch session → see different drafts immediately
7. Open editor sheet → change phone → autocomplete shows customer → save
8. Voice input → speak Vietnamese → transcript appears in input
9. Error: delete session → API fails → toast error → session still shown
10. Mobile: keyboard opens → composer scrolls into view above keyboard
