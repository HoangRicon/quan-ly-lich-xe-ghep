# AI Quick Trip Entry Design

## Goal

Build a mobile-first quick-entry workflow for creating trips from text, paste, or browser voice while keeping safety gates around AI/parser uncertainty.

The workflow optimizes for dispatchers entering about 10 trips per minute from multiple live sources such as Zalo conversations, groups, or call center notes.

## Confirmed Decisions

- Primary device: phone only. Desktop may work, but is not the design target.
- Session model: one quick-entry session represents one source or conversation.
- Session storage: server/database, account-scoped.
- Session cleanup: completed sessions can be permanently deleted to remove quick-entry raw text/drafts; deleting a session never deletes created Trip records.
- Input modes: text, multi-line paste, browser realtime voice transcript.
- Save behavior: combined mode. High-confidence complete candidates may auto-save; uncertain candidates stay as drafts for review.
- Voice scope: browser speech recognition only in the first version; no server audio upload or stored audio.

## Product Design

The quick-entry page is a compact mobile command surface:

- Top chip rail for source sessions.
- Center input panel for text, paste, and voice transcript.
- Bottom card queue for parsed items.
- Sticky thumb-zone actions for mic, send, and save-all-valid.
- Bottom sheet editor for correcting one draft without leaving the page.

The UI should not use tables on phone. Each draft card shows the minimum needed to decide quickly: time, route, price, phone/customer, seat/type, and status.

## Data Design

Add server-side session and item persistence:

- `QuickTripEntrySession` stores account, owner, source name, status, and timestamps.
- `QuickTripEntryItem` stores raw text, parsed data, source, confidence from `0.00` to `1.00`, missing fields, warnings, status, created trip id, and errors.

This keeps unfinished queues safe across refreshes and device switches.

Completed sessions can be deleted to reduce storage. Delete cascades only to quick-entry items/raw input and does not cascade to Trips.

## System Design

Quick entry is an input layer, not a second trip engine.

Implementation should extract current trip creation logic into a shared service so both the old form and quick entry use the same rules for customer upsert, price normalization, trip creation, formula calculation, and driver assignment events.

Parsing should be layered:

1. Split raw input into candidate chunks.
2. Run deterministic Vietnamese shorthand parsing.
3. Optionally call an AI provider adapter if configured.
4. Validate all parsed output locally.
5. Auto-save only candidates that are complete, high-confidence, and warning-free.

## Safety Rules

The system must never trust AI output directly.

Auto-save requires:

- customer phone
- departure and destination
- departure time
- price
- valid trip type/direction
- confidence at least 0.85
- no critical warnings

All other candidates remain drafts with visible missing fields and quick edit actions.

## Verification Strategy

Verify with parser/service tests and manual mobile scenarios:

- one-line input creates one item
- multi-line paste creates multiple items
- low-confidence item does not auto-save
- valid item saves through shared trip creation service
- session survives refresh
- account isolation blocks cross-account access
- browser voice fallback is clear when unsupported
- completed session deletion removes quick-entry data but preserves created trips

## Scope Guard

Out of scope for this change:

- server audio transcription
- storing audio files
- multi-user assignment workflow
- replacing the existing trip form
- desktop-first UI
