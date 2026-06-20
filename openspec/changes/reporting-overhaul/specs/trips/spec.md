# Capability: trips

## Purpose

Trips must expose enough audit history for reporting to answer when a driver was assigned, changed, or removed without relying on mutable fields like `updatedAt`.

## Requirements

### REQ-TRIP-EVENT-001: Record driver assignment events

The system MUST record a trip event whenever a driver is assigned, changed, or removed.

#### Scenario: create trip with driver
- GIVEN a user creates a trip with `driverId = 10`
- WHEN the trip is saved successfully
- THEN a `driver_assigned` event exists for that trip
- AND `toDriverId = 10`

#### Scenario: assign driver to existing trip
- GIVEN a trip has `driverId = null`
- WHEN the user updates the trip to `driverId = 10`
- THEN a `driver_assigned` event exists
- AND `fromDriverId = null`
- AND `toDriverId = 10`

#### Scenario: change driver
- GIVEN a trip has `driverId = 10`
- WHEN the user updates the trip to `driverId = 11`
- THEN a `driver_changed` event exists
- AND `fromDriverId = 10`
- AND `toDriverId = 11`

#### Scenario: remove driver
- GIVEN a trip has `driverId = 10`
- WHEN the user clears the driver
- THEN a `driver_unassigned` event exists
- AND `fromDriverId = 10`
- AND `toDriverId = null`

### REQ-TRIP-EVENT-002: Record status events

The system MUST record status change events.

#### Scenario: complete trip
- GIVEN a trip has `status = "confirmed"`
- WHEN the user changes status to `completed`
- THEN a `status_changed` event exists
- AND a `trip_completed` event exists
- AND both events reference the trip and account

#### Scenario: cancel trip
- GIVEN a trip has `status = "scheduled"`
- WHEN the user changes status to `cancelled`
- THEN a `status_changed` event exists
- AND a `trip_cancelled` event exists

### REQ-TRIP-EVENT-003: Backfill legacy assignment events

The system MUST provide an idempotent backfill for existing trips.

#### Scenario: legacy trip has driver but no event
- GIVEN a legacy trip has `driverId = 10`
- AND no driver assignment event exists for that trip
- WHEN the backfill runs
- THEN a `driver_assigned` event is created with `createdAt = Trip.createdAt`

#### Scenario: backfill reruns
- GIVEN a legacy trip already has a driver assignment event
- WHEN the backfill runs again
- THEN no duplicate assignment event is created

### REQ-TRIP-EVENT-004: Assignment events store point snapshots

Driver assignment events SHOULD store the point/profit snapshot that was calculated at assignment time so driver reports can reconcile Zom point frames without relying on mutable trip fields.

#### Scenario: create trip with driver and matched formula
- GIVEN a user creates a trip with `driverId = 10`
- AND the pricing formula calculation returns `pointsEarned = 2.5`, `profit = 2500`, `profitRate = 1000`, `formulaId = 99`, and `formulaName = "Khung 13h-15h"`
- WHEN the trip is saved successfully
- THEN the `driver_assigned` event stores those snapshot fields

#### Scenario: change driver recalculates assignment snapshot
- GIVEN a trip has `driverId = 10`
- WHEN the user changes the trip to `driverId = 11`
- THEN a `driver_changed` event exists
- AND the event stores the point/profit/formula snapshot for driver 11 at the assignment time

#### Scenario: legacy assignment has no snapshot
- GIVEN a legacy backfilled assignment event has no point snapshot
- WHEN driver reports are calculated
- THEN reports may fall back to current `Trip.pointsEarned`, `Trip.profit`, `Trip.profitRate`, and `Trip.matchedFormulaId`
