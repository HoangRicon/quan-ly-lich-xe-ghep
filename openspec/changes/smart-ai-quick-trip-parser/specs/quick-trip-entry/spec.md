# Capability: quick-trip-entry-smart-parser

## Requirements

### REQ-SMART-PARSE-001: Natural Vietnamese input

The system MUST understand common Vietnamese natural language trip messages better than shorthand-only parsing.

#### Scenario: natural price and time
- GIVEN the user enters "Khach Anh Nam di tu Ha Noi den Hai Phong luc 8 gio sang, gia 150 nghin, sdt 0912345678, 2 khach"
- WHEN the input is parsed without AI
- THEN the candidate includes phone `0912345678`
- AND departure `Ha Noi`
- AND destination `Hai Phong`
- AND price `150000`
- AND total seats `2`
- AND a departure time around 08:00 on the parse date

#### Scenario: route using ve
- GIVEN the user enters "Mai co 2 khach tu Hai Phong ve Ha Noi luc 8h30 gia 150k lien he 0912345678"
- WHEN the input is parsed
- THEN departure is `Hai Phong`
- AND destination is `Ha Noi`

### REQ-SMART-PARSE-002: AI parse-many

The system MUST allow an AI provider to return multiple candidates from one raw input.

#### Scenario: AI returns an array
- GIVEN AI responds with a JSON array containing two trip candidates
- WHEN provider `parseMany` parses the response
- THEN the system returns two parsed candidates
- AND each candidate preserves its own `rawText`

#### Scenario: AI returns object with drafts
- GIVEN AI responds with `{ "drafts": [...] }`
- WHEN provider `parseMany` parses the response
- THEN the system returns each draft in the `drafts` array

### REQ-SMART-PARSE-003: Safe fallback

The system MUST not require AI for quick-entry to work.

#### Scenario: AI unavailable
- GIVEN no AI env vars are configured
- WHEN the user submits quick-entry input
- THEN rule parsing still creates draft items
- AND incomplete candidates remain in review instead of failing the request

#### Scenario: AI failure
- GIVEN AI parsing fails
- WHEN the user submits input
- THEN the system falls back to rule parser chunks
- AND created candidates include warning `ai_parse_failed`

### REQ-SMART-PARSE-004: Explicit AI mode

The API SHOULD accept a parse mode hint so UI can request smarter AI splitting when available.

#### Scenario: smart mode requested
- GIVEN the request body contains `parseMode: "smart"`
- WHEN AI is configured
- THEN service attempts AI parse-many for the whole raw input before falling back to rule chunks
