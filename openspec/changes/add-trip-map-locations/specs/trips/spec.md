# Trips Spec Delta

## ADDED Requirements

### Requirement: Store exact pickup and dropoff map addresses
The system SHALL store optional exact map addresses for each trip separately from the existing departure and destination route fields.

#### Scenario: Create trip with exact map addresses
- Given an operator opens the create trip form
- When they enter `Vi tri don` and `Vi tri tra` values copied from Zalo Map and submit
- Then the created trip stores those exact values on the trip record
- And the existing `Diem don` and `Diem den` values are unchanged

#### Scenario: Edit trip map addresses
- Given a trip already has exact pickup and dropoff map addresses
- When an operator opens the edit sheet
- Then both values are prefilled
- And saving updates those values without changing other trip fields

#### Scenario: Backward compatibility
- Given an older trip has no exact map address values
- When it is listed or edited
- Then the UI remains usable with empty `Vi tri don` and `Vi tri tra` fields
