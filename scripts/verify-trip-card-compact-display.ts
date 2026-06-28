import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const draftCardSource = await readFile(
    "components/quick-create/draft-card.tsx",
    "utf8",
  );
  const scheduleSource = await readFile("components/schedule-list.tsx", "utf8");

  assert.doesNotMatch(
    draftCardSource,
    /parsed\??\.(pickupLocation|dropoffLocation)/,
    "Quick-create draft cards must not render pickup/dropoff locations automatically",
  );

  const mobileCardRouteIndex = scheduleSource.indexOf("{/* Row 2: Route");
  const mobileCardCustomerIndex = scheduleSource.indexOf(
    "{/* Customer Phone",
    mobileCardRouteIndex,
  );
  assert.notEqual(
    mobileCardRouteIndex,
    -1,
    "Schedule mobile card route section must exist",
  );
  assert.ok(
    mobileCardCustomerIndex > mobileCardRouteIndex,
    "Schedule mobile card customer section must follow the route section",
  );

  const mobileCardSegment = scheduleSource.slice(
    mobileCardRouteIndex,
    mobileCardCustomerIndex,
  );
  assert.doesNotMatch(
    mobileCardSegment,
    /trip\.(pickupLocation|dropoffLocation)/,
    "Schedule trip cards must stay compact and not render pickup/dropoff locations",
  );

  console.log("trip card compact display checks passed");
}

void main();
