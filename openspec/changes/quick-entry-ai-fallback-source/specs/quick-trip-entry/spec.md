# Quick Trip Entry Spec Delta

## Requirement: AI fallback must still create drafts

When smart parsing cannot use AI because the provider is missing, the request fails, the response is invalid, or the request times out, the system must still create rule-based drafts whenever the rule parser can parse at least one chunk.

### Scenario: AI request throws

Given a user submits quick-create text in smart mode
And the AI provider throws an error
When the draft creation job runs
Then at least one draft is created from the rule parser
And the draft has warning `ai_parse_failed`
And the draft is not marked failed only because AI failed

### Scenario: AI request times out

Given a user submits quick-create text in smart mode
And the AI request does not complete before the configured timeout
When the draft creation job runs
Then rule-based drafts are created
And the user-facing message explains that AI was unavailable and rule parsing was used

## Requirement: Drafts must expose analysis source

Each serialized draft must expose a derived source label so the UI can distinguish AI-assisted parsing from rule-only parsing without requiring a database migration.

### Scenario: Draft created with AI result

Given AI returns one or more usable drafts
When the drafts are persisted
Then each draft stores `analysisSource: "ai"` in parsed data
And the UI displays "AI phân tích"

### Scenario: Draft created by rule fallback

Given AI is unavailable or fails
When the rule parser creates fallback drafts
Then each draft stores `analysisSource: "rule"` in parsed data
And the UI displays "Quy tắc thường"

## Requirement: User-facing copy must be clear Vietnamese

Quick-create submission, fallback, and draft source messages must use readable Vietnamese with accents.

### Scenario: AI fallback is used

Given a fallback rule draft was created because AI failed
When the draft appears in the list
Then the draft card shows a visible rule-source badge
And the warning text says AI could not connect and the system used normal rules
