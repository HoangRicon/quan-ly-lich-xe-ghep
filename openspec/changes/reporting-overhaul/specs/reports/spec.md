# Capability: reports

## Purpose

Bao cao phai phan anh dung doanh thu da ghi nhan, tinh hinh van hanh va hieu qua tai xe theo nghiep vu quan ly lich xe ghep.

## Requirements

### REQ-REPORT-001: Revenue uses created date

Doanh thu va loi nhuan trong bao cao MUST duoc tinh theo ngay tao cuoc.

#### Scenario: completed trip created yesterday, departed today
- GIVEN a trip has `createdAt = 2026-06-19`, `departureTime = 2026-06-20`, `status = "completed"`, and `price = 500000`
- WHEN the user filters reports for `2026-06-19`
- THEN total revenue includes `500000`
- AND the revenue chart groups the amount under `2026-06-19`
- WHEN the user filters reports for `2026-06-20`
- THEN total revenue does not include that trip

### REQ-REPORT-002: Only completed trips count as recognized revenue

Revenue and profit MUST include only trips with `status = "completed"`.

#### Scenario: scheduled and cancelled trips have prices
- GIVEN a selected period contains one scheduled trip with `price = 100000`, one cancelled trip with `price = 200000`, and one completed trip with `price = 300000`
- WHEN the overview report is calculated
- THEN total revenue equals `300000`

### REQ-REPORT-003: Total trips counts created trips in the period

Total trip volume MUST count all trips created in the selected period, regardless of status.

#### Scenario: mixed statuses in period
- GIVEN the period contains one scheduled, one completed, and one cancelled trip
- WHEN the overview report is calculated
- THEN `totalTrips = 3`

### REQ-REPORT-004: Completion and cancellation rates

Reports MUST expose completion and cancellation rates.

#### Scenario: five trips with three completed and one cancelled
- GIVEN the period contains 5 trips
- AND 3 are completed
- AND 1 is cancelled
- WHEN the overview report is calculated
- THEN `completionRate = 60`
- AND `cancelRate = 20`

### REQ-REPORT-005: Status distribution uses counts, not revenue

The status distribution chart MUST show trip counts and percentages by bucket.

#### Scenario: assigned trips have high price
- GIVEN the period contains 1 assigned trip priced at 1000000 and 2 completed trips priced at 100000 each
- WHEN status distribution is calculated
- THEN the assigned bucket count is 1
- AND the completed bucket count is 2
- AND percentages are based on total trip count, not revenue

### REQ-REPORT-006: Driver report includes assignment recency

Driver reports MUST show the latest assignment event for each driver.

#### Scenario: driver assigned to two trips
- GIVEN driver A has assignment events at `2026-06-18T08:00:00+07:00` and `2026-06-20T09:00:00+07:00`
- WHEN the driver report is calculated
- THEN driver A `lastAssignedAt` equals `2026-06-20T09:00:00+07:00`

### REQ-REPORT-007: Driver report includes operational quality metrics

Driver reports MUST include completion rate, cancellation rate, assignment-time points, assignment-time driver profit, revenue average, and completed-trip profit average.

#### Scenario: driver has mixed trips
- GIVEN driver A has 4 trips in the period
- AND 2 are completed
- AND 1 is cancelled
- AND completed trip prices are 100000 and 300000
- WHEN the driver report is calculated
- THEN `completionRate = 50`
- AND `cancelRate = 25`
- AND `avgTripValue = 200000`

### REQ-REPORT-008: Driver points use latest assignment snapshot

Driver point/profit totals MUST use the latest assignment event snapshot for the trip and the current driver, falling back to trip fields only when no snapshot exists.

#### Scenario: trip reassigned from driver A to driver B
- GIVEN trip 501 currently has `driverId = 20`
- AND a prior assignment event for driver A stores `pointsEarned = 9`
- AND no assignment event for driver B exists in legacy data
- WHEN the driver report is calculated for driver B
- THEN driver B points fall back to `Trip.pointsEarned`
- AND driver B MUST NOT receive driver A's prior assignment snapshot

#### Scenario: latest assignment snapshot exists
- GIVEN trip 502 currently has `driverId = 20`
- AND driver B has assignment events for that trip at `2026-06-20T08:00:00+07:00` and `2026-06-20T10:00:00+07:00`
- WHEN the driver report is calculated
- THEN `totalPoints` uses the snapshot from `2026-06-20T10:00:00+07:00`
- AND `assignedPointProfit` uses the same latest snapshot

### REQ-REPORT-009: Driver trip history is available for reconciliation

Driver reports MUST expose a per-driver trip history endpoint/UI that shows trip created date, latest assigned time, points, driver profit, and formula name/id used for reconciliation.

#### Scenario: user opens driver trip history
- GIVEN driver A has a trip created in the selected period
- AND the trip has a latest `driver_assigned` or `driver_changed` event with snapshot fields
- WHEN the user opens the driver's trip history
- THEN the row shows `createdAt`, `lastAssignedAt`, `pointsEarned`, `profit`, `profitRate`, `formulaId`, and `formulaName`

### REQ-REPORT-010: Empty ranges are valid

Reports MUST return zeroed metrics for periods with no data.

#### Scenario: no trips in range
- GIVEN no trips were created in the selected period
- WHEN the overview report is requested
- THEN money fields are 0
- AND count fields are 0
- AND rate fields are 0
- AND chart arrays are empty
