# SPEC: Toggle Thông Minh / Nháp Thường cho Quick Create

## 1. Concept & Vision

Cho phép người dùng linh hoạt chuyển đổi giữa hai chế độ tạo bản nháp chuyến xe:

- **Chế độ Thông minh (AI)**: Sử dụng AI API để parse văn bản tự nhiên tiếng Việt thành dữ liệu chuyến xe, hỗ trợ NLP nâng cao
- **Chế độ Nháp thường (Rule)**: Sử dụng rule-based parser với regex và heuristics, không cần API, hoạt động offline

**Hai tính năng quan trọng:**
1. **Badge hiển thị nguồn** - Mỗi draft card hiển thị badge "AI" hoặc "TH" để user biết draft được tạo bằng cách nào
2. **Auto AI khi phân tích lại** - Khi user click "Phân tích lại", tự động dùng AI thay vì rule-based

## 2. Design Language

### Color Palette
```
AI Mode:
  - Toggle Active: bg-blue-600
  - Badge: bg-blue-100 text-blue-700
  - Icon: blue-500

Rule Mode:
  - Toggle Active: bg-slate-500
  - Badge: bg-slate-100 text-slate-600
  - Icon: slate-500
```

### Typography
- Toggle label: text-xs font-medium
- Badge: text-[10px] font-bold
- Tooltip: text-xs

## 3. Features & Interactions

### 3.1 Mode Toggle (Trong AIComposer)
- Toggle pill-shaped ngay trên textarea
- Left = Rule ("TH"), Right = AI ("AI")
- Lưu preference vào localStorage
- Hover hiện tooltip mô tả

### 3.2 Draft Source Badge (Trong DraftCard)
Mỗi draft card hiển thị badge nguồn ở góc trên bên trái:

```
┌─────────────────────────────────────┐
│ [AI]  08:00  Hôm nay               │ ← Badge AI (màu xanh dương)
│ HP → HN                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [TH]  09:00  Hôm nay               │ ← Badge TH (màu xám)
│ HN → HP                            │
└─────────────────────────────────────┘
```

**Design Badge:**
- Kích thước: px-1.5 py-0.5 (nhỏ gọn)
- Font: text-[10px] font-bold uppercase
- Icon: Sparkles cho AI, FileText cho TH
- Border-radius: rounded

### 3.3 Auto AI on Re-parse
- Khi click "Phân tích lại" → Force dùng AI mode
- API gọi: `parseMode: "smart"` bất kể toggle hiện tại
- Badge của draft sau re-parse: "AI"

## 4. Component Inventory

### ModeToggle Component
```typescript
interface ModeToggleProps {
  mode: "smart" | "rule";
  onModeChange: (mode: "smart" | "rule") => void;
  isAiAvailable: boolean;
}
```

### SourceBadge Component
```typescript
interface SourceBadgeProps {
  parseMode: "smart" | "rule";
}
```

**States:**
- Smart: bg-blue-100 text-blue-700, icon Sparkles, text "AI"
- Rule: bg-slate-100 text-slate-600, icon FileText, text "TH"

## 5. File Changes

### New Files
- `components/quick-create/mode-toggle.tsx` - Toggle component
- `components/quick-create/source-badge.tsx` - Badge hiển thị nguồn draft

### Modified Files
1. `components/quick-create/ai-composer.tsx` - Tích hợp ModeToggle
2. `components/quick-create/draft-card.tsx` - Thêm SourceBadge
3. `hooks/use-ai-composer.ts` - Thêm parseMode state
4. `hooks/use-quick-create-drafts.ts` - Truyền parseMode khi tạo drafts
5. `app/dashboard/quick-create/QuickCreateShell.tsx` - Pass parseMode xuống
6. `lib/quick-create/types.ts` - Thêm ParseMode type

## 6. Data Flow

```
User Toggle Mode
  → AIComposer.parseMode = "rule" | "smart"
  → localStorage.set('quick-create-parse-mode', mode)
  → On submit: createDrafts(text, parseMode)

User Submit Prompt
  → API: POST /items { rawText, parseMode }
  → Backend: parseQuickEntryDrafts({ parseMode })
  → Draft created với source = parseMode

User Click "Phân tích lại"
  → Force parseMode = "smart" (AI)
  → API: PATCH /items/{id} { rawText, reparse: true, parseMode: "smart" }
  → Backend: reparseQuickEntryItem({ parseMode: "smart" })
  → Draft badge updated = "AI"
```

## 7. Edge Cases

- **No AI API key**: Disable smart mode, show tooltip
- **AI parse fails**: Fallback to rule, badge = "TH"
- **Re-parse without AI**: Still use rule, badge stays "TH"
