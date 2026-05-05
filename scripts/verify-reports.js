const { Pool } = require('postgres');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/htool_xeghep?schema=public'
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Check trips for account 4 in May 2026
  const trips = await prisma.$queryRaw`
    SELECT t.id, t.status, t.price, t.profit, t.departure_time, t.driver_id, d.name as driver_name
    FROM trips t
    LEFT JOIN drivers d ON t.driver_id = d.id
    WHERE t.account_id = 4
    AND t.departure_time >= '2026-05-01' AND t.departure_time < '2026-06-01'
    ORDER BY t.departure_time
  `;

  console.log('Total trips in May 2026:', trips.length);

  const completed = trips.filter(t => t.status === 'completed');
  const assignedNotCompleted = trips.filter(t => t.driver_id && t.status !== 'completed' && t.status !== 'cancelled');
  const unassigned = trips.filter(t => !t.driver_id && t.status !== 'cancelled');
  const cancelled = trips.filter(t => t.status === 'cancelled');

  const revenue = completed.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const profit = completed.reduce((sum, t) => sum + (Number(t.profit) || 0), 0);
  const forecastRevenue = assignedNotCompleted.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const forecastProfit = assignedNotCompleted.reduce((sum, t) => sum + (Number(t.profit) || 0), 0);

  console.log('Completed:', completed.length, '| Revenue:', revenue, '| Profit:', profit);
  console.log('Assigned not completed:', assignedNotCompleted.length, '| Forecast revenue:', forecastRevenue, '| Forecast profit:', forecastProfit);
  console.log('Unassigned (non-cancelled):', unassigned.length);
  console.log('Cancelled:', cancelled.length);

  console.log('\n--- All trips ---');
  trips.forEach(t => {
    console.log(new Date(t.departure_time).toISOString().replace('T', ' ').slice(0, 19), '|', t.status.padEnd(12), '| price:', String(t.price).padStart(10), '| profit:', String(t.profit).padStart(10), '|', t.driver_name || 'UNASSIGNED');
  });

  await prisma.$disconnect();
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
