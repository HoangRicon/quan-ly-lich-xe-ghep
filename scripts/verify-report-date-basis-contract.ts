import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const reportsPage = await readFile("app/dashboard/reports/page.tsx", "utf8");
  const statsRoute = await readFile("app/api/reports/stats/route.ts", "utf8");
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
    /useState<ReportDateBasis>\("assignedAt"\)/,
    "Reports page must default date filtering to driver assignment date",
  );
  assert.match(
    reportsPage,
    /params\.set\("dateBasis", dateBasis\)/,
    "Overview stats requests must send the selected date basis",
  );
  assert.match(
    dateBasisHelper,
    /Ngày gán tài xế[\s\S]*Ngày tạo cuốc[\s\S]*Ngày hoàn thành[\s\S]*Ngày đi/,
    "Date-basis helper must expose choices in Vietnamese",
  );
  assert.match(
    reportsPage,
    /REPORT_DATE_BASIS_OPTIONS\.map/,
    "Reports page must render date-basis choices from the shared helper",
  );
  assert.match(
    statsRoute,
    /parseReportDateBasis\(searchParams\.get\("dateBasis"\)\)/,
    "Stats API must parse dateBasis from query params",
  );
  assert.match(
    driversRoute,
    /parseReportDateBasis\(searchParams\.get\("dateBasis"\)\)/,
    "Driver report API must parse dateBasis from query params",
  );
  assert.match(
    driverHistoryRoute,
    /dateBasis/,
    "Driver trip-history API must forward dateBasis",
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
    /Doanh thu đã gán[\s\S]*Lợi nhuận đã gán/,
    "KPI cards must split assigned-only money from completed and projected money",
  );

  console.log("report date-basis contract checks passed");
}

void main();
