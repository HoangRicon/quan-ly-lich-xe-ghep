import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const routeSource = await readFile("app/api/trips/[id]/route.ts", "utf8");

  assert.match(
    routeSource,
    /const hasManualProfitInput = profit !== undefined;/,
    "Trip update API must detect explicit manual profit input before formula recalculation",
  );
  assert.match(
    routeSource,
    /const applyManualProfitInput = \(\) => \{[\s\S]*updateData\.profit = Number\.isFinite\(n\) \? sanitizeOptionalDecimal10_2\(n\) : null;[\s\S]*\};/,
    "Trip update API must centralize manual profit assignment",
  );
  assert.match(
    routeSource,
    /if \(hasManualProfitInput\) \{\s*applyManualProfitInput\(\);\s*\}/,
    "Manual profit must be applied after formula recalculation so it remains the final saved profit",
  );

  console.log("trip manual profit update checks passed");
}

void main();
