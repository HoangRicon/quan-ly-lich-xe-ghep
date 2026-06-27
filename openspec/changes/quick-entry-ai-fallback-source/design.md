# Design

## Approach

Dung metadata optional trong `QuickTripCandidate` thay vi them cot DB:

- `analysisSource?: "ai" | "rule"`
- `analysisMessage?: string`

Metadata nay duoc luu trong `parsedData` JSON, di qua serializer hien co va duoc UI doc truc tiep. Draft cu khong co metadata se duoc suy luan: co warning `ai_parse_failed` thi xem nhu `rule`, con lai mac dinh `ai` neu khong ro.

## Backend

`lib/quick-trip-entry/ai-provider.ts` them timeout cho fetch AI, mac dinh 5 giay. Neu timeout hoac HTTP fail thi throw nhu hien tai.

`lib/quick-trip-entry/smart-parser.ts` se tra ve chunk da gan source:

- AI chunks hop le: `analysisSource = "ai"`.
- Rule chunks khi provider missing, AI fail, AI empty, hoac AI under-count grouped request: `analysisSource = "rule"`.
- Neu fallback do loi AI: them warning `ai_parse_failed` va message tieng Viet co dau.

`service.ts` giu validate/persist nhu hien tai; chi can dam bao normalize khong xoa optional metadata.

## Frontend

Them helper trong `lib/quick-create/draft-helpers.ts`:

- `getDraftAnalysisBadge(item)` tra ve label/tone/description.
- Rule fallback copy: "AI không kết nối được, hệ thống đã tạo bản nháp bằng quy tắc thường. Vui lòng kiểm tra lại thông tin trước khi tạo cuốc."

`DraftCard` hien badge gan status badge, va warning note hien copy co dau. `QuickCreateShell`, `AIComposer`, constants va empty state se sua cac chuoi quick-create sang tieng Viet co dau.

## Tests

Bo sung script/unit style hien co:

- Smart parser: AI success marks `ai`, AI throw/timeout fallback marks `rule`.
- Quick-create helper: draft badge returns correct Vietnamese labels.
- Existing smart parser fallback tests continue to pass.
