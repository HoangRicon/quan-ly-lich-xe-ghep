import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { calculatePointsFromProfit } from "@/lib/formula-engine";

async function main() {
  const routeSource = await readFile("app/api/trips/[id]/route.ts", "utf8");
  const scheduleSource = await readFile("components/schedule-list.tsx", "utf8");

  assert.equal(calculatePointsFromProfit(50_000, 200_000), 0.25);
  assert.equal(calculatePointsFromProfit(100_000, 200_000), 0.5);
  assert.equal(calculatePointsFromProfit(300_000, 200_000), 1.5);
  assert.equal(calculatePointsFromProfit(50_000, 0), null);

  assert.match(
    routeSource,
    /const hasManualProfitInput = profit !== undefined;/,
    "Trip update API must detect explicit manual profit input before formula recalculation",
  );
  assert.match(
    routeSource,
    /const applyManualProfitInput = \(\) => \{[\s\S]*updateData\.pointsEarned = sanitizeOptionalDecimal10_2\([\s\S]*calculatePointsFromProfit\([\s\S]*\)[\s\S]*\);[\s\S]*\};/,
    "Trip update API must recalculate points from manual profit and the effective profit rate",
  );
  assert.match(
    routeSource,
    /if \(hasManualProfitInput\) \{\s*applyManualProfitInput\(\);\s*\}/,
    "Manual profit must be applied after formula recalculation so it remains the final saved profit",
  );
  assert.match(
    scheduleSource,
    /const shouldRecalculate = driverHasFormula;/,
    "Schedule edit must still recalculate formula metadata when manual profit is entered",
  );

  console.log("trip manual profit update checks passed");
}

void main();
