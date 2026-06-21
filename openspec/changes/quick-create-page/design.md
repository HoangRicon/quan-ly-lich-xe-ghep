# Design: Quick Create Page

## 1. Design System

### 1.1 Color Palette

Inherits from existing project design system. Key colors for this page:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#3B82F6` (blue-500) | Create Ride button, send button, active nav |
| `primary-hover` | `#2563EB` (blue-600) | Hover state |
| `primary-light` | `#EFF6FF` (blue-50) | Selected card border, bg |
| `warning` | `#F59E0B` (amber-500) | Warning badges |
| `warning-bg` | `#FEF3C7` (amber-100) | Warning badge bg |
| `warning-text` | `#B45309` (amber-700) | Warning badge text |
| `success` | `#10B981` (green-500) | Create Ride success flash |
| `success-bg` | `#D1FAE5` (green-100) | Success background |
| `error` | `#EF4444` (red-500) | Delete, error states |
| `error-bg` | `#FEE2E2` (red-100) | Error background |
| `surface` | `#FFFFFF` | Card background |
| `surface-raised` | `#F8FAFC` (slate-50) | Composer bg |
| `border` | `#E2E8F0` (slate-200) | Card border, dividers |
| `text-primary` | `#1E293B` (slate-800) | Main text |
| `text-secondary` | `#64748B` (slate-500) | Secondary labels |
| `text-muted` | `#94A3B8` (slate-400) | Placeholder text |

### 1.2 Typography

- **Font**: Inter (already in use by project)
- **Scale**:
  - `text-base` (16px) — main card text
  - `text-sm` (14px) — secondary info
  - `text-xs` (12px) — badges, metadata
  - `text-[10px]` (10px) — compact badges, timestamps
  - `font-bold` / `font-semibold` — emphasis per ScheduleList pattern

### 1.3 Spacing

- Card padding: `p-2` (8px) — matches ScheduleList
- Card gap: `space-y-1` (4px between cards)
- Section padding: `px-4` horizontal
- Bottom composer: `pb-4 pt-2`

### 1.4 Border Radius

- Cards: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px) for primary, `rounded-xl` (12px) for composer input
- Badges: `rounded-full` for status, `rounded` for warning pills
- Bottom sheet: `rounded-t-2xl` (16px)

---

## 2. Layout Specifications

### 2.1 Page Structure

```
┌──────────────────────────────────────┐
│  HEADER (sticky, h-12=48px)         │
│  bg-white border-b border-slate-200   │
│  [←] "Tạo nhanh" + [Session ▾]     │
├──────────────────────────────────────┤
│  DRAFT LIST (flex-1, overflow-y)     │
│  ┌────────────────────────────────┐  │
│  │  DraftCard                     │  │
│  │  DraftCard                     │  │
│  │  ...                           │  │
│  └────────────────────────────────┘  │
│  (infinite scroll, pull-to-refresh)    │
│                                      │
├──────────────────────────────────────┤
│  AI COMPOSER (sticky bottom)         │
│  bg-white border-t border-slate-200  │
│  shadow-[0_-4px_6px_-1px_rgba(...)] │
│  pb-safe (safe area bottom)           │
└──────────────────────────────────────┘
```

### 2.2 DraftCard Visual Spec (ScheduleList Reference)

**Reference DOM**: `div.bg-white.rounded-lg.border.border-slate-200.p-2.cursor-pointer` (schedule-list.tsx:1174)

**Row 1 — Time / Status / Warnings**
```
[2C?] 09:30  22/06    [StatusBadge]  [⚠️ Thiếu SĐT] [⚠️ Thiếu giá]
```
- `2C` badge: `px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded`
- Time: `font-bold text-slate-800 text-base` (16px)
- Date: `font-semibold text-slate-800 text-[11px]` (11px)
- StatusBadge: from `lib/useTripStatuses` via `statusColorClasses`
- WarningBadge: `px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded`

**Row 2 — Route**
```
Hà Nội → Hải Phòng
```
- `text-slate-800 font-medium text-sm` (14px)
- Arrow: `text-slate-400 flex-shrink-0`
- `truncate` on both sides for overflow

**Row 3 — Pickup / Dropoff (optional)**
```
Đón: 123 Nguyễn Trãi          (or hidden if empty)
Trả: 456 Lê Lợi
```
- `text-[11px] text-slate-500`
- `truncate`

**Row 4 — Customer + Price + Actions**
```
[📞 0912xxx] [Zalo]  150.000đ  [Tạo cuốc xe]  [🗑]
```
- Phone: `text-xs text-blue-600 hover:underline`
- Zalo: `p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600`
- Price: `font-bold text-sm text-slate-800`
- CreateRide: `bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow`
- Delete: `p-1 rounded text-red-500 hover:bg-red-50`

**Card hover / press state**:
- Hover: `hover:bg-slate-50`
- Pressed: `active:bg-blue-50 active:scale-[0.98]` (100ms transition)
- Overdue border: `border-red-300`

**Card selected (multi-select)**:
- Border: `border-blue-500 border-2`
- Checkmark overlay: top-right corner, `absolute`

### 2.3 AI Composer Visual Spec

```
┌──────────────────────────────────────────────────────────────┐
│ [🎤] │ [Nhập yêu cầu bằng ngôn ngữ tự nhiên...] [SEND] │
│ 44×44  auto-grow input (max 120px)                  44×44  │
└──────────────────────────────────────────────────────────────┘
```
- Container: `bg-white border-t border-slate-200 px-4 py-3`
- Voice button: `w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center`
- Input: `flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100`
- Send button: `w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40`
- Safe area: `pb-safe` = `max(pb-4, env(safe-area-inset-bottom))`

**Generating state**:
```
┌──────────────────────────────────────────────────────────────┐
│ [⏸] │ Đang tạo bản nháp...                      [✕]      │
└──────────────────────────────────────────────────────────────┘
```
- Animated dots: `● ● ●` cycling opacity
- Cancel button: stops the request

**Success flash**: Composer input flashes `bg-green-50 border-green-300` for 500ms then clears

---

## 3. Color Mapping for Draft Status

Based on `lib/useTripStatuses` pattern:

| Draft Status | Color | Background | Badge Style |
|-------------|-------|------------|-------------|
| `pending` | slate | slate-100 | slate-600 text |
| `parsed` | green | green-100 | green-700 text |
| `needs_review` | amber | amber-100 | amber-700 text |
| `auto_saved` | blue | blue-100 | blue-700 text |
| `saved` | green | green-100 | green-700 text |
| `failed` | red | red-100 | red-600 text |
| `discarded` | slate-300 | slate-100 | slate-500 text |

---

## 4. Animation Specifications

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Card slide in | 200ms | ease-out | New draft added |
| Card slide out | 200ms | ease-in | Draft deleted/saved |
| Sheet open | 300ms | spring (damping 0.8) | Card tap |
| CreateRide success | 300ms | ease-out | API success |
| Error shake | 400ms | spring | API error |
| Composer success flash | 500ms | ease-out | Draft created |
| Multi-select border | 150ms | ease-out | Card selected |
| Swipe reveal | 200ms | ease-out | Swipe threshold met |

All animations: `prefers-reduced-motion: reduce` → no animation

---

## 5. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `< lg` (mobile) | Full-screen, bottom composer, back button in header |
| `lg+` (desktop) | Same layout, wider cards, keyboard shortcuts |

**Mobile-only optimizations**:
- `safe-area-inset-bottom` on composer
- `safe-area-inset-top` on header
- Bottom nav: `lg:hidden`
- Cards: full-width with `px-3`
- Composer: fixed position, `z-[80]`

**Desktop enhancements**:
- `max-w-2xl mx-auto` container for draft list
- Keyboard shortcuts shown as tooltips
- Hover states on cards
- Session sidebar can float on wide screens

---

## 6. Loading States

### DraftListSkeleton
Matches DraftCard dimensions but with shimmer animation:
```
┌──────────────────────────────────────┐
│ ████████  ████  ████████████████   │
│ ████████████████████████            │
│ ████████████████████████  ████████ │
└──────────────────────────────────────┘
```
- 3 skeleton cards shown during initial load
- Skeleton shimmer: `animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200`

### Composer Loading
- Send button: `animate-spin` spinner
- Input border: `border-blue-400`
- Text: "Đang phân tích..." → "Đang tạo bản nháp..."

---

## 7. Empty State Designs

### No Sessions
```
┌──────────────────────────────────────┐
│                                      │
│         [📋 icon, 48px]             │
│                                      │
│     Chưa có phiên làm việc nào      │
│     Tạo phiên đầu tiên để bắt đầu  │
│                                      │
│     [Tạo phiên mới]                 │
│                                      │
└──────────────────────────────────────┘
```
- Icon: `FolderOpen` from lucide-react, `text-slate-300`
- Text: `text-slate-500 text-sm`
- Button: primary style

### Session Empty
```
┌──────────────────────────────────────┐
│                                      │
│         [✨ icon, 48px]              │
│                                      │
│     Chưa có bản nháp nào             │
│     Trò chuyện với AI để tạo bản    │
│     nháp đầu tiên                    │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ "Mai có 2 khách đi HP → HN..." │ │
│  └────────────────────────────────┘ │
│  (prompt suggestion highlighted)     │
└──────────────────────────────────────┘
```

---

## 8. Accessibility

- All interactive elements: `role`, `aria-label`, `aria-pressed`
- Draft cards: `role="button"`, `tabIndex={0}`, keyboard activation
- Swipe actions: also accessible via long-press context menu
- Composer: `aria-live="polite"` for status announcements
- Loading states: `aria-busy="true"`
- Error states: `role="alert"`
- Focus management: trap focus in sheets, return focus on close
- Color contrast: all text passes WCAG AA (4.5:1 for body, 3:1 for large)
