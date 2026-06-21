# Capability: quick-trip-entry

## Purpose

Mobile users must be able to enter trips quickly from text, paste, or browser voice while managing multiple source sessions safely.

## Requirements

### REQ-QTE-001: Server-saved source sessions

The system MUST save quick-entry sessions on the server per account.

#### Scenario: create source session
- GIVEN the user is authenticated
- WHEN the user creates a quick-entry session named "Zalo A"
- THEN the session is saved for the user's account
- AND it appears in the session chip list

#### Scenario: switch between unfinished sessions
- GIVEN the user has sessions "Zalo A" and "Tong dai"
- AND both sessions contain unsaved draft items
- WHEN the user switches from "Zalo A" to "Tong dai"
- THEN the draft items for each session remain separate
- AND returning to "Zalo A" restores its queue

#### Scenario: reload page
- GIVEN a session has draft items
- WHEN the user refreshes the page
- THEN the session and draft queue are loaded from the server

### REQ-QTE-002: Mobile-first session navigation

The quick-entry UI MUST prioritize mobile operation.

#### Scenario: session chips on phone
- GIVEN the user opens quick entry on a phone viewport
- WHEN multiple sessions exist
- THEN sessions are shown as horizontally scrollable chips
- AND each chip shows the session name and pending/error count

#### Scenario: no table layout
- GIVEN the user opens quick entry on a phone viewport
- WHEN draft items are displayed
- THEN they are displayed as cards
- AND no table is required to operate the workflow

### REQ-QTE-003: Fast text and paste entry

The system MUST let users create draft items from text with minimal taps.

#### Scenario: Enter sends one item
- GIVEN the user types a single trip line
- WHEN the user presses Enter or the send button
- THEN the line is submitted to the active session

#### Scenario: paste many lines
- GIVEN the user pastes several trip messages
- WHEN the user sends the text
- THEN the system attempts to split and parse them into multiple draft items

### REQ-QTE-004: Browser voice creates transcript text

The system MUST support browser realtime voice input when available.

#### Scenario: speech recognition available
- GIVEN the browser supports speech recognition
- WHEN the user taps the mic button and speaks a trip
- THEN the transcript is placed into the quick-entry input
- AND the user can send it as a voice-sourced item

#### Scenario: speech recognition unavailable
- GIVEN the browser does not support speech recognition
- WHEN the user opens quick entry
- THEN the mic action shows a clear fallback message
- AND text entry still works

### REQ-QTE-005: Auto-save only safe candidates

The system MUST support combined auto-save and review behavior.

#### Scenario: complete high-confidence candidate
- GIVEN parser output includes all required fields
- AND confidence is at least 0.85
- AND there are no critical warnings
- WHEN auto-save is enabled for the submission
- THEN the system creates the trip automatically
- AND the item status becomes `auto_saved`

#### Scenario: ambiguous candidate
- GIVEN parser output has missing fields or critical warnings
- WHEN auto-save is enabled
- THEN the item remains in the queue as `needs_review`
- AND no trip is created

### REQ-QTE-006: Edit unsaved item in bottom sheet

The system MUST allow quick correction without leaving the mobile workflow.

#### Scenario: edit missing field
- GIVEN a draft item is missing price
- WHEN the user taps the item card
- THEN a bottom sheet opens with editable trip fields
- WHEN the user enters the price and saves
- THEN the item can create a trip without navigating to the full trip form

### REQ-QTE-007: Bulk save valid items

The system MUST allow saving all currently valid draft items in a session.

#### Scenario: save all valid
- GIVEN a session has three valid draft items and two items needing review
- WHEN the user taps "Luu tat ca hop le"
- THEN the three valid items are saved as trips
- AND the two review items remain in the queue

#### Scenario: one item fails during bulk save
- GIVEN multiple draft items are submitted for bulk save
- AND one item fails validation at save time
- WHEN bulk save completes
- THEN successful items are saved
- AND the failed item remains unsaved with an error message

### REQ-QTE-008: Account isolation

The system MUST isolate sessions and items by account.

#### Scenario: another account requests session
- GIVEN a session belongs to account A
- WHEN a user from account B requests that session or item
- THEN the system returns not found or forbidden
- AND no data from account A is exposed

### REQ-QTE-009: Archive or delete completed sessions

The system MUST let users delete completed sessions to free server storage and SHOULD let users archive sessions that are no longer active.

#### Scenario: archive processed source
- GIVEN a session has no pending items
- WHEN the user archives the session
- THEN it is removed from the active chip list
- AND its quick-entry history remains stored

#### Scenario: delete completed source
- GIVEN a session contains only `saved`, `auto_saved`, `discarded`, or `failed` items
- WHEN the user deletes the session
- THEN the session and quick-entry items are removed from the server
- AND normal Trip records created from those items remain available

#### Scenario: prevent accidental delete with unfinished items
- GIVEN a session contains `pending`, `parsed`, or `needs_review` items
- WHEN the user deletes the session without confirming discard
- THEN the system rejects deletion
- AND the unfinished items remain available

#### Scenario: confirmed discard of unfinished session
- GIVEN a session contains unfinished draft items
- WHEN the user confirms deletion and discard
- THEN the session and quick-entry draft items are removed
- AND no normal Trip records are deleted
