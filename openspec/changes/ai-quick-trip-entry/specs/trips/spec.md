# Capability: trips

## Purpose

Trips must be creatable from a mobile quick-entry workflow without bypassing existing trip business rules.

## Requirements

### REQ-TRIP-QUICK-001: Quick-entry saved items create normal trips

The system MUST create trips from valid quick-entry items using the same business rules as the existing trip creation flow.

#### Scenario: save valid quick-entry item
- GIVEN a quick-entry item has customer phone, departure, destination, departure time, price, trip type, and seat data
- WHEN the user saves the item
- THEN a normal trip is created
- AND customer upsert rules are applied
- AND the created trip belongs to the user's account

#### Scenario: save valid quick-entry item with driver
- GIVEN a quick-entry item includes a valid driver in the same account
- WHEN the user saves the item
- THEN the trip is created with that driver
- AND formula calculation is applied
- AND a driver assignment event is recorded

### REQ-TRIP-QUICK-002: Quick-entry must not bypass validation

The system MUST validate AI/parser output before creating trips.

#### Scenario: parser returns invalid driver
- GIVEN parser output includes a driver id that is not in the user's account
- WHEN auto-save is evaluated
- THEN the item is not auto-saved
- AND the item is marked for review with a warning

#### Scenario: parser returns invalid enum
- GIVEN parser output includes an unsupported trip type
- WHEN the item is validated
- THEN the item remains unsaved
- AND the user can correct it in the edit sheet

### REQ-TRIP-QUICK-003: Low-confidence items require review

The system MUST keep uncertain quick-entry items as drafts instead of silently creating trips.

#### Scenario: missing price
- GIVEN a raw input contains route and phone but no price
- WHEN the quick-entry parser processes it
- THEN a draft item is created with `needs_review`
- AND no trip is created automatically

#### Scenario: confidence below threshold
- GIVEN parser output has confidence below 0.85
- WHEN auto-save is enabled
- THEN the item is not auto-saved
- AND the missing fields or warnings are shown to the user

### REQ-TRIP-QUICK-004: Multi-line input can create multiple candidates

The system MUST support both one-trip and multi-trip input.

#### Scenario: one line creates one item
- GIVEN the user enters one complete trip line
- WHEN the user sends it
- THEN one quick-entry item is created

#### Scenario: paste creates multiple items
- GIVEN the user pastes multiple trip lines
- WHEN the user sends the pasted text
- THEN the system creates one quick-entry item per detected trip candidate

### REQ-TRIP-QUICK-005: Raw input remains available

The system MUST preserve the original raw text for reconciliation and correction.

#### Scenario: parser misunderstands route
- GIVEN a quick-entry item was parsed incorrectly
- WHEN the user opens the edit sheet
- THEN the raw text is visible or copyable
- AND the user can correct parsed fields before saving
