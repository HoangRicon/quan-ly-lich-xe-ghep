# SPEC: Quick Create Page

## 1. Overview

Trang "Tạo nhanh cuốc xe" (`/dashboard/quick-create`) cho phép người dùng tạo nhiều bản nháp cuốc xe qua AI chat, quản lý bản nháp theo phiên làm việc (sessions), và chuyển bất kỳ bản nháp nào thành cuốc xe thực chỉ bằng 1 click.

**Route**: `/dashboard/quick-create`
**Layout**: Tách biệt với dashboard layout — full-screen mobile-first, có nút quay lại trong header (không có bottom-nav)
**Back Navigation**: Header chứa nút `←` quay về `/dashboard/schedule` hoặc trang trước đó
**Design Reference**: `components/schedule-list.tsx` card (mobile view, ~90% style match)
**Tech**: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, React

---

## 2. Screen Structure

### 2.1 Visual Layout

```
┌──────────────────────────────────────┐
│  [←]  Tạo nhanh      [Session ▾]   │  ← Sticky header (h-12)
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │  Draft Card (ScheduleList     │  │
│  │  style: bg-white rounded-lg   │  │
│  │  border border-slate-200 p-2)  │  │
│  │  ...                          │  │
│  │  [Create Ride] button         │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Draft Card ...                │  │
│  └────────────────────────────────┘  │
│  (infinite scroll / virtualized)      │
│                                      │
├──────────────────────────────────────┤
│  [AI Composer - sticky bottom]       │
│  ┌──────┐ ┌──────────────────────┐  │
│  │ 🎤   │ │ Nhập yêu cầu...     │  │
│  └──────┘ └──────────────────────┘  │
└──────────────────────────────────────┘
```

### 2.2 Component Tree

```
QuickCreatePage (page.tsx)
├── QuickCreateHeader (sticky, with back button)
│   ├── BackButton (←)
│   └── SessionSwitcher (dropdown)
├── DraftList (virtualized / infinite scroll)
│   ├── DraftCard[] (ScheduleList-style)
│   │   ├── DraftWarnings (warning badges)
│   │   ├── DraftInfo (time, customer, route)
│   │   ├── DraftPrice
│   │   └── CreateRideButton
│   ├── EmptyState (no drafts)
│   └── DraftListSkeleton (loading)
├── AIComposer (sticky bottom)
│   ├── AIChatInput
│   ├── VoiceInputButton
│   ├── PromptSuggestions
│   ├── RecentPromptsDropdown
│   └── AIGeneratingIndicator
├── DraftEditorSheet (bottom sheet)
│   ├── DraftFieldEditor (inline fields)
│   ├── UndoRedoBar
│   └── SaveDraftButton
├── QuickActionsBar (swipe-revealed)
│   ├── SwipeLeft: CreateRide
│   └── SwipeRight: Edit / Duplicate / Delete
├── SessionManagerSheet (bottom sheet)
│   ├── SessionList
│   ├── CreateSessionForm
│   ├── RenameSessionForm
│   └── ArchiveSessionButton
└── MultiSelectToolbar (long-press activated)
    ├── SelectedCount
    ├── CreateAllButton
    ├── DeleteAllButton
    └── ChangeSessionButton
```

---

## 3. Data Layer

### 3.1 API Integration

**Tái sử dụng hoàn toàn API routes đã có:**

| Intent | Method | Endpoint | Used By |
|--------|--------|----------|---------|
| List sessions | GET | `/api/quick-trip-entry/sessions` | `SessionRail`, `SessionSwitcher` |
| Create session | POST | `/api/quick-trip-entry/sessions` | `SessionManagerSheet` |
| Update session | PATCH | `/api/quick-trip-entry/sessions/[id]` | `SessionManagerSheet` |
| Delete session | DELETE | `/api/quick-trip-entry/sessions/[id]` | `SessionManagerSheet` |
| List items | GET | `/api/quick-trip-entry/sessions/[id]/items` | `DraftList` (polling / SWR) |
| Create items | POST | `/api/quick-trip-entry/sessions/[id]/items` | `AIComposer` |
| Update item | PATCH | `/api/quick-trip-entry/items/[itemId]` | `DraftEditorSheet` |
| Save item → trip | POST | `/api/quick-trip-entry/items/[itemId]/save` | `CreateRideButton` |
| Discard item | POST | `/api/quick-trip-entry/items/[itemId]/discard` | `QuickActionsBar` |
| Save all valid | POST | `/api/quick-trip-entry/sessions/[id]/save-valid` | `MultiSelectToolbar` |

### 3.2 State Management

- **SWR / React Query** cho server state (sessions, items) với optimistic updates
- **Zustand** hoặc React Context cho UI state:
  - `selectedSessionId`
  - `multiSelectedIds` (Set<number>)
  - `editingItemId`
  - `composerText`
  - `composerState` (idle | analyzing | generating | done | error)
  - `swipeState` per card
  - `undoStack` / `redoStack` per item
- **LocalStorage** cho:
  - `quick-create-recent-prompts` (JSON array, max 10)
  - `quick-create-session-order` (pinned session IDs)

---

## 4. Component Specifications

### 4.1 DraftCard — 90% ScheduleList Style Match

**File**: `components/quick-create/draft-card.tsx`

```tsx
// Reference from schedule-list.tsx line 1174
<div className="bg-white rounded-lg border border-slate-200 p-2 cursor-pointer ...">
```

**DraftCard layout (3 rows, matching ScheduleList pattern):**

**Row 1**: `[2C badge?] HH:mm [Ngày]    [Status badge]  [Warning badges]`
- 2C badge: `px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded`
- Time: `font-bold text-slate-800 text-base`
- Date: `font-semibold text-slate-800 text-[11px]`
- Status badge: uses `statusColorClasses` from `lib/useTripStatuses`
- Warning badges: yellow pills `bg-amber-100 text-amber-700 text-[10px]`

**Row 2**: `Điểm đón → Điểm đến`
- Route: `text-slate-800 font-medium text-sm`
- Arrow: `text-slate-400 flex-shrink-0`

**Row 3** (optional pickup/dropoff):
- `text-[11px] text-slate-500 truncate`
- Label "Đón: " / "Trả: "

**Row 4** (customer + price + actions):
- Customer phone: `text-xs text-blue-600` → click to call
- Zalo link: icon button `bg-blue-50 text-blue-600`
- Price: `font-bold text-sm text-slate-800`
- **[Create Ride] button**: `bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow`
- Delete button: `text-red-500 hover:bg-red-50`

**Interactions**:
- Tap card → open `DraftEditorSheet`
- Long press → multi-select mode
- Swipe left → reveal CreateRide action
- Swipe right → reveal Edit / Duplicate / Delete actions

### 4.2 AI Composer (Sticky Bottom)

**File**: `components/quick-create/ai-composer.tsx`

**Visual**:
```
┌──────────────────────────────────────────────────────┐
│ [🎤] │ [Nhập yêu cầu bằng ngôn ngữ tự nhiên...] │ [▶]│
└──────────────────────────────────────────────────────┘
```

- Sticky at bottom, above bottom nav
- Background: `bg-white border-t border-slate-200 shadow-lg`
- Safe area padding: `pb-safe`
- Input: `flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm`
- Voice button: `w-10 h-10 rounded-full bg-blue-50 text-blue-600`
- Send button: `w-10 h-10 rounded-full bg-blue-600 text-white`
- Height: auto-grow up to 120px, then scroll

**States**:
1. `idle` — placeholder "Nhập yêu cầu...", send disabled when empty
2. `analyzing` — send button shows spinner, input readonly
3. `generating` — animated dots "Đang tạo bản nháp..."
4. `done` — green flash, cards appear with slide-in animation
5. `error` — red border, error message below input, retry button

**Prompt Suggestions** (shown when empty, 3 suggestions):
```
"Mai có 2 khách đi HP - HN lúc 8h"
"2 cuốc HP → HN 150k, 1 cuốc HN → HP 160k"
"Chị Lan đi HN - HP sáng mai 9h"
```

**Recent Prompts** (dropdown, last 10):
- Stored in localStorage
- Shown on input focus when empty

### 4.3 SessionSwitcher

**File**: `components/quick-create/session-switcher.tsx`

**Visual**: Dropdown button in header
```
[📋 Phiên sáng ▾]
```

**Dropdown content**:
- List of sessions (name, pending count badge)
- Pinned sessions at top (⭐)
- "Tạo phiên mới" button
- Divider
- "Quản lý phiên" → opens SessionManagerSheet
- "Lưu trữ" → shows archived sessions

**Actions per session**:
- Tap → switch (optimistic update)
- Long press → pin/unpin
- Swipe left → archive
- Swipe right → rename inline

### 4.4 DraftEditorSheet (Bottom Sheet)

**File**: `components/quick-create/draft-editor-sheet.tsx`

**Implementation**: Uses existing `components/quick-trip-entry/draft-editor-sheet.tsx` pattern (see below)

Uses `Sheet` from shadcn/ui with `snap points: [50%, 90%]`.

**Fields** (all editable inline):
- Khách hàng: phone, name (with autocomplete from `/api/customers`)
- Điểm đón, Điểm đến (with swap button)
- Vị trí đón, Vị trí trả
- Ngày, Giờ đi
- Loại: Ghép / Ghép 2C / Bao / Bao 2C
- Số ghế
- Giá tiền (VNĐ, auto format with dots)
- Ghi chú

**Footer**:
- [Hủy] [Lưu bản nháp] [Tạo cuốc xe ngay]

### 4.5 QuickActionsBar (Swipe)

**File**: `components/quick-create/quick-actions-bar.tsx`

Uses a swipe library (e.g. `react-native-gesture-handler` or custom touch handlers).

**Swipe Left** (reveal from right):
- Create Ride button (blue, `bg-blue-600`)
- Icon: `Car`

**Swipe Right** (reveal from left):
- Edit: `bg-slate-100 text-slate-700`
- Duplicate: `bg-amber-100 text-amber-700`
- Delete: `bg-red-100 text-red-600`

**Threshold**: 80px to trigger action, 40px to show hint.

### 4.6 SessionManagerSheet

**File**: `components/quick-create/session-manager-sheet.tsx`

- List all sessions with drag-to-reorder
- Create new session (name input)
- Rename session (inline edit)
- Pin/unpin (star icon)
- Archive session
- Delete session (with confirmation)
- Duplicate session (deep copy all items)

### 4.7 MultiSelectToolbar

Appears when `multiSelectedIds.size > 0`.

```
┌──────────────────────────────────────┐
│ [✕ 3 đã chọn]  [Tạo tất cả]  [Xóa]│
└──────────────────────────────────────┘
```

- Sticky at top of list
- "Tạo tất cả" → batch save via `/api/quick-trip-entry/sessions/[id]/save-valid`
- "Xóa" → batch discard
- Tap outside or press Esc → exit multi-select

---

## 5. Interactions & Edge Cases

### 5.1 AI Chat Flow

| Step | UI Feedback |
|------|-------------|
| User types "Mai có 2 khách..." | Live char count, send button activates |
| User taps send | Input shows spinner, "Đang phân tích..." |
| AI parses | Input shows "Đang tạo bản nháp..." |
| AI returns 2 drafts | Cards slide in from bottom, input clears |
| AI returns 0 drafts | Error toast "Không nhận diện được cuốc xe nào" |
| AI unavailable | Rule parser fallback, cards show `ai_parse_failed` warning |

### 5.2 Create Ride (1-click)

```
Draft → Validate (client-side) → POST /api/quick-trip-entry/items/[id]/save
```

**Client-side validation before save**:
- Required: departure, destination, departureTime, price, customerPhone
- Missing: highlight field with red border + shake animation

**Feedback**:
- Loading: button shows spinner, card gets blue overlay
- Success: green checkmark animation, card turns green briefly, then slides out
- Error: red shake, error toast appears below card

### 5.3 Multi-Select

- Long press any card → enter multi-select mode
- Tap other cards → toggle selection
- Selected cards: blue border + checkmark overlay
- "Tạo tất cả" → only saves items with status `parsed` (confidence high enough)
- Items with `needs_review` status → show warning count, still allow batch save

### 5.4 Session Switching

- Tap new session → immediate UI switch (optimistic)
- Fetch new session items in background
- Loading skeleton for new drafts
- If fetch fails → show error toast, revert to previous session

### 5.5 Offline / Network Error

- No drafts shown when offline (clear state)
- `AIComposer` shows "Không có kết nối" when offline
- Retry button on failed API calls
- Optimistic updates reversed on API failure

### 5.6 Empty States

| Context | Message |
|---------|---------|
| No sessions | "Tạo phiên đầu tiên để bắt đầu" + [Tạo phiên] button |
| Session has no drafts | "Chưa có bản nháp nào" + AI composer highlighted |
| Session all saved/discarded | "Tất cả bản nháp đã xử lý" |
| No search results | "Không tìm thấy bản nháp phù hợp" |

---

## 6. Mobile UX Details

### 6.1 Touch Targets
- Minimum 44×44px for all interactive elements
- Draft cards: full-width, min-height 80px
- Buttons: min-height 44px

### 6.2 Safe Areas
- Top: respects `env(safe-area-inset-top)` — usually 44px on iPhone notch
- Bottom: `pb-safe` = `padding-bottom: max(16px, env(safe-area-inset-bottom))`
- Header height: 48px (h-12)
- Bottom composer height: auto (grows with content), min 64px

### 6.3 Keyboard Handling
- When keyboard opens, composer scrolls into view
- `scroll-padding-bottom` accounts for composer height
- On blur, keyboard dismisses

### 6.4 Gestures
- Pull-to-refresh on draft list
- Swipe left/right on cards (QuickActionsBar)
- Long-press for multi-select
- Swipe down on bottom sheet to dismiss

### 6.5 Animations
- Card appear: `slide-in-from-bottom`, 200ms ease-out
- Card delete: `slide-out-to-right`, 200ms ease-in
- Sheet open: spring animation (damping 0.8)
- CreateRide success: scale-up + fade, 300ms
- All animations respect `prefers-reduced-motion`

---

## 7. Keyboard Shortcuts (Desktop)

| Key | Action |
|-----|--------|
| `Enter` in composer | Submit prompt |
| `Ctrl/Cmd + K` | Focus composer |
| `Escape` | Close sheet / exit multi-select |
| `Ctrl/Cmd + Z` | Undo (in editor) |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `↑ / ↓` | Navigate draft cards |
| `Space` on focused card | Open editor |
| `Ctrl/Cmd + S` | Save current draft (in editor) |

---

## 8. Acceptance Criteria

### AC-1: Session Management
- [ ] Can create a new session with custom name
- [ ] Can switch between sessions with instant UI update
- [ ] Pinned sessions appear at top of session list
- [ ] Can rename, archive, and delete sessions

### AC-2: Draft Cards
- [ ] Cards match ScheduleList visual style (~90%)
- [ ] Warning badges (yellow) shown for missing fields
- [ ] Status badges use project status color system
- [ ] Long-press activates multi-select
- [ ] Swipe reveals quick actions

### AC-3: AI Composer
- [ ] Can type natural Vietnamese prompts
- [ ] Shows 3 prompt suggestions when empty
- [ ] Shows recent prompts from localStorage
- [ ] Voice input button present and functional
- [ ] Loading states: analyzing → generating → done/error
- [ ] Multiple drafts created from single prompt

### AC-4: Create Ride (1-Click)
- [ ] Single click on CreateRide → validates → saves
- [ ] No modal required
- [ ] Success: green animation + card removed
- [ ] Error: shake + toast message
- [ ] Missing required fields: highlighted before save attempt

### AC-5: Draft Editor
- [ ] Bottom sheet opens on card tap
- [ ] All fields editable inline
- [ ] Customer phone autocomplete works
- [ ] Save draft preserves changes
- [ ] "Tạo cuốc xe ngay" creates ride from editor

### AC-6: Multi-Select
- [ ] Long-press enters multi-select mode
- [ ] Selected cards show checkmark + blue border
- [ ] "Tạo tất cả" batch-saves valid items
- [ ] "Xóa" batch-discards selected items
- [ ] Escape / tap outside exits multi-select

### AC-7: Mobile Performance
- [ ] Virtualized list handles 100+ drafts smoothly
- [ ] 60fps scroll
- [ ] Composer sticky at bottom, above keyboard
- [ ] Touch targets ≥ 44px

### AC-8: Dashboard-like Feel
- [ ] No full-page reload on any action
- [ ] All state changes are optimistic
- [ ] Keyboard shortcuts work on desktop
- [ ] Sticky header + sticky composer

---

## 9. File Structure

```
app/dashboard/quick-create/
├── page.tsx                  # Server component, wraps QuickCreateShell
└── QuickCreateShell.tsx      # "use client", all state management

components/quick-create/
├── draft-card.tsx            # Draft card (ScheduleList-style)
├── draft-list.tsx            # Virtualized draft list
├── draft-warnings.tsx        # Warning badge component
├── ai-composer.tsx           # Sticky AI chat input
├── voice-input-button.tsx    # Browser speech-to-text
├── prompt-suggestions.tsx   # 3 suggestion chips
├── session-switcher.tsx      # Header dropdown
├── session-manager-sheet.tsx # Full session management
├── draft-editor-sheet.tsx    # Edit sheet (bottom sheet)
├── quick-actions-bar.tsx     # Swipe action reveals
├── multi-select-toolbar.tsx # Batch action toolbar
├── draft-list-skeleton.tsx   # Loading skeleton
└── empty-state.tsx          # Empty session / no drafts

hooks/
├── use-quick-create-sessions.ts  # SWR hooks for sessions
├── use-quick-create-drafts.ts    # SWR hooks for items
├── use-ai-composer.ts             # AI chat state machine
├── use-swipe-actions.ts          # Swipe gesture logic
├── use-multi-select.ts           # Multi-select state
└── use-recent-prompts.ts         # localStorage prompts

lib/quick-create/
├── constants.ts              # Colors, sizes, config
└── formatters.ts             # Price formatting, time formatting
```

---

## 10. Dependencies

- `swr` — data fetching + cache
- `framer-motion` — animations (sheet, card transitions)
- `@use-gesture/react` — swipe, long-press gestures
- `@radix-ui/react-dialog` / `Sheet` from shadcn/ui — bottom sheet
- `@radix-ui/react-dropdown-menu` — session switcher dropdown
- `@radix-ui/react-toast` — error/success feedback
- `lucide-react` — icons
- `clsx` / `tailwind-merge` — className utilities

No new backend, no new database schema, no new API routes needed.
