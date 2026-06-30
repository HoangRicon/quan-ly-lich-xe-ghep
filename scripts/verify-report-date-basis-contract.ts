import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const reportsPage = await readFile("app/dashboard/reports/page.tsx", "utf8");
  const statsRoute = await readFile("app/api/reports/stats/route.ts", "utf8");
  const exportRoute = await readFile("app/api/reports/export/route.ts", "utf8");
  const tripsRoute = await readFile("app/api/trips/route.ts", "utf8");
  const overviewReport = await readFile("lib/reports/overview-report.ts", "utf8");
  const driversRoute = await readFile("app/api/reports/drivers/route.ts", "utf8");
  const driverHistoryRoute = await readFile(
    "app/api/reports/drivers/[driverId]/trips/route.ts",
    "utf8",
  );
  const dateBasisHelper = await readFile("lib/reports/date-basis.ts", "utf8");
  const driverTab = await readFile("components/reports/driver-report-tab.tsx", "utf8");
  const customerTab = await readFile("components/reports/customer-report-tab.tsx", "utf8");
  const routeTab = await readFile("components/reports/route-report-tab.tsx", "utf8");
  const kpiCards = await readFile("components/reports/kpi-cards.tsx", "utf8");

  assert.match(
    reportsPage,
    /useState<ReportDateBasis>\(DEFAULT_REPORT_DATE_BASIS\)/,
    "Reports page must default date filtering from the shared helper",
  );
  assert.doesNotMatch(
    reportsPage,
    /params\.set\("dateBasis", "assignedAt"\)/,
    "Reports page must not hard-code dateBasis",
  );
  assert.match(
    reportsPage,
    /params\.set\("dateBasis", dateBasis\)/,
    "Overview stats requests must send the selected dateBasis",
  );

  for (const key of ["assignedAt", "createdAt", "completedAt", "departureTime"]) {
    assert.match(
      dateBasisHelper,
      new RegExp(`key:\\s*"${key}"`),
      `Date-basis helper must expose ${key}`,
    );
  }

  assert.match(
    dateBasisHelper,
    /DEFAULT_REPORT_DATE_BASIS:\s*ReportDateBasis\s*=\s*"departureTime"/,
    "Report date-basis helper must default to departure date",
  );
  assert.match(
    reportsPage,
    /REPORT_DATE_BASIS_OPTIONS\.map/,
    "Reports page must render date-basis choices from the shared helper",
  );
  assert.match(
    statsRoute,
    /parseReportDateBasis\(searchParams\.get\("dateBasis"\)\)/,
    "Overview stats API must parse dateBasis from query params",
  );
  assert.match(
    statsRoute,
    /getOverviewReport/,
    "Stats API must delegate overview filtering to the shared overview report helper",
  );
  assert.match(
    overviewReport,
    /buildTripDateBasisRelationWhere\(dateBasis,\s*range\)/,
    "Overview report must apply the selected date basis",
  );
  assert.match(
    tripsRoute,
    /parseReportDateRange\(date,\s*date\)/,
    "Trips page API must use the shared report date parser for single-day filters",
  );
  assert.match(
    tripsRoute,
    /where\.departureTime\s*=\s*tripDateRange/,
    "Trips page API must filter by departure date",
  );
  assert.doesNotMatch(
    exportRoute,
    /where\.createdAt\s*=\s*current/,
    "Export API must not filter report rows by trip creation date",
  );
  assert.match(
    exportRoute,
    /where\.departureTime\s*=\s*current/,
    "Export API must filter report rows by departure date like the trips page",
  );
  assert.match(
    driversRoute,
    /parseReportDateBasis\(searchParams\.get\("dateBasis"\)\)/,
    "Driver report API must parse dateBasis from query params",
  );
  assert.match(
    driverHistoryRoute,
    /parseReportDateBasis\(searchParams\.get\("dateBasis"\)\)[\s\S]*dateBasis,/,
    "Driver trip-history API must parse and forward dateBasis",
  );
  assert.equal(
    (driverTab.match(/params\.set\("dateBasis", dateBasis\)/g) ?? []).length,
    2,
    "Driver report tab must send dateBasis for summary and trip history",
  );
  assert.match(
    customerTab,
    /params\.set\("dateBasis", dateBasis\)/,
    "Customer report tab must send the selected date basis",
  );
  assert.match(
    routeTab,
    /params\.set\("dateBasis", dateBasis\)/,
    "Route report tab must send the selected date basis",
  );
  assert.match(
    driverTab,
    /projectedRevenue/,
    "Driver report tab must show projected revenue",
  );
  assert.match(
    kpiCards,
    /assignedRevenue[\s\S]*assignedProfit[\s\S]*projectedRevenue[\s\S]*projectedProfit/,
    "KPI cards must split assigned-only money from completed and projected money",
  );

  console.log("report date-basis contract checks passed");
}

void main();
