import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const bottomNav = await readFile("components/dashboard/bottom-nav.tsx", "utf8");
  const quickCreatePage = await readFile("app/dashboard/quick-create/page.tsx", "utf8");
  const scheduleAddPage = await readFile("app/dashboard/schedule/add/page.tsx", "utf8");
  const scheduleList = await readFile("components/schedule-list.tsx", "utf8");
  const quickCreateConstants = await readFile("lib/quick-create/constants.ts", "utf8");

  assert.match(
    bottomNav,
    /href:\s*"\/dashboard\/quick-create"[\s\S]*label:\s*"Tạo thủ công"[\s\S]*isFab:\s*true/,
    "Bottom plus button must be the manual-create entry",
  );
  assert.match(
    bottomNav,
    /aria-label=\{item\.label\}[\s\S]*title=\{item\.label\}/,
    "Bottom plus button must expose the manual-create label",
  );
  assert.match(
    quickCreatePage,
    /TripForm/,
    "The plus route /dashboard/quick-create must render the manual trip form",
  );
  assert.match(
    quickCreatePage,
    /Tạo thủ công/,
    "The manual form page must be labeled Tạo thủ công",
  );
  assert.match(
    scheduleAddPage,
    /QuickCreateShell/,
    "The old manual route /dashboard/schedule/add must render quick create",
  );
  assert.match(
    scheduleList,
    /href="\/dashboard\/schedule\/add"[\s\S]*Tạo nhanh/,
    "Schedule page button to the old manual route must be labeled Tạo nhanh",
  );
  assert.match(
    scheduleList,
    /href="\/dashboard\/schedule\/add"[\s\S]*title="Tạo nhanh"[\s\S]*aria-label="Tạo nhanh"/,
    "Schedule page quick-create button must expose the Tạo nhanh label",
  );
  assert.match(
    quickCreateConstants,
    /QUICK_CREATE_PAGE_HREF\s*=\s*"\/dashboard\/schedule\/add"/,
    "Shared quick-create href must point to the old manual route",
  );

  console.log("create route swap checks passed");
}

void main();
