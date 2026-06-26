/**
 * scripts/import-data-sql.js
 * Import data.sql into PostgreSQL.
 * Uses \copy for non-JSON tables, INSERT statements for JSON tables.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const PGPASSWORD = "123456";
const PGHOST = "localhost";
const PGPORT = "5432";
const PGUSER = "postgres";
const PGDATABASE = "xeghep";
const DATA_SQL = path.join(__dirname, "..", "prisma", "data.sql");

const JSON_TABLES = new Set(["email_templates", "notifications"]);

const TABLE_ORDER = [
  "accounts", "pricing_formulas", "trip_statuses",
  "users", "user_settings", "customers",
  "trips", "trip_customers", "bookings",
  "notifications", "push_subscriptions",
  "email_templates", "system_settings", "password_resets",
];

// --- helpers ---

function runPsql(args, cb) {
  const env = Object.assign({}, process.env, { PGPASSWORD });
  const child = spawn(PG_BIN, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  child.on("close", (code) => { cb(code, out, err); });
}

function fixJson(raw) {
  let r = raw;
  r = r.replace(/([{,]\s*)'?([a-zA-Z_][a-zA-Z0-9_]*?)'?\s*:/g,
    (m, b, k) => b + '"' + k + '":');
  r = r.replace(/(?<=[\[,]\s*)([a-zA-Z_][a-zA-Z0-9_.@+-]+)\s*(?=[,\]])/g,
    '"$1"');
  return r;
}

function extractBlock(content, tableName) {
  const re = new RegExp("COPY public\\." + tableName + " \\(([^)]+)\\) FROM stdin;");
  const m = content.match(re);
  if (!m) return null;
  const header = m[0];
  const cols = m[1];
  const headerEnd = m.index + header.length;
  const nextCopy = content.indexOf("COPY public.", headerEnd);
  const endPos = nextCopy === -1 ? content.length : nextCopy;
  let data = content.substring(headerEnd, endPos);
  data = data.replace(/\\{0,2}\.\n[\s\S]*/m, "").replace(/[\r\n]+$/, "");
  return { cols, data };
}

function buildInsert(tableName, cols, row) {
  const colList = cols.split(",").map((c) => c.trim());
  const fields = row.split("\t");
  const vals = colList.map((col, i) => {
    let val = fields[i] !== undefined ? fields[i] : "\\N";
    if (val === "\\N" || val === "") return "NULL";
    if (/^-?\d+(\.\d+)?$/.test(val)) return val;
    const t = val.trim();
    if ((t.startsWith("{") && t.endsWith("}")) ||
        (t.startsWith("[") && t.endsWith("]"))) {
      return "'" + fixJson(t).replace(/'/g, "''") + "'";
    }
    return "'" + val.replace(/'/g, "''") + "'";
  });
  return "INSERT INTO " + tableName + " (" + cols + ") VALUES (" + vals.join(", ") + ");";
}

// --- main ---

console.log("========================================");
console.log(" Import data from", DATA_SQL);
console.log("========================================");

// Read file
console.log("\n[1/5] Reading file...");
const buf = fs.readFileSync(DATA_SQL);
const raw = (buf[0] === 0xff && buf[1] === 0xfe)
  ? buf.toString("utf16le").replace(/^\ufeff/, "")
  : buf.toString("utf8");
console.log("  Read", raw.length, "chars");

// Truncate
console.log("\n[2/5] Truncating tables...");
const truncTables = [
  "trip_events", "trip_customers", "bookings", "notifications",
  "push_subscriptions", "user_settings", "quick_trip_entry_items",
  "quick_trip_entry_sessions", "trips", "customers", "users",
  "pricing_formulas", "trip_statuses", "email_templates",
  "system_settings", "password_resets", "accounts",
];
runPsql(
  ["-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", PGDATABASE, "-c",
   truncTables.map((t) => "TRUNCATE TABLE " + t + " CASCADE;").join(" ")],
  (code, out, err) => {
    if (code !== 0) { console.error("  Truncate FAILED:", err.slice(0, 500)); process.exit(1); }
    console.log("  Truncate: OK");
    continueImport();
  }
);

function continueImport() {
  // Extract blocks for all tables
  console.log("\n[3/5] Extracting COPY blocks...");
  const blocks = {};
  const allTables = [...new Set([...TABLE_ORDER, ...JSON_TABLES])];
  let found = 0;
  for (const t of allTables) {
    const b = extractBlock(raw, t);
    if (b) { blocks[t] = b; found++; }
  }
  console.log("  Found", found, "COPY blocks");

  // Build INSERT SQL for JSON tables
  console.log("\n[4/5] Building INSERT statements for JSON tables...");
  const insertByTable = {};
  for (const t of JSON_TABLES) {
    const b = blocks[t];
    if (!b) continue;
    const trimmed = b.data.trimStart();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    const stmts = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const unesc = line.replace(/\\n/g, "\n");
      stmts.push(buildInsert(t, b.cols, unesc));
    }
    insertByTable[t] = stmts;
    console.log("  " + t + ": " + stmts.length + " rows");
  }

  // Import
  console.log("\n[5/5] Importing tables...");
  const tmpDir = os.tmpdir();
  let idx = 0;
  let ok = 0, fail = 0;
  const failed = [];

  function next() {
    if (idx >= TABLE_ORDER.length) {
      verify(); return;
    }

    const t = TABLE_ORDER[idx++];
    const b = blocks[t];

    if (!b) { console.log("  " + t + ": (no data)"); ok++; next(); return; }

    const trimmed = b.data.trimStart();
    if (!trimmed) { console.log("  " + t + ": (empty)"); ok++; next(); return; }

    // JSON table: use INSERT
    if (JSON_TABLES.has(t)) {
      const stmts = insertByTable[t];
      if (!stmts || stmts.length === 0) { console.log("  " + t + ": (no INSERTs)"); ok++; next(); return; }

      const sql = "TRUNCATE TABLE " + t + " CASCADE;\n" + stmts.join("\n") + "\n";
      const f = path.join(tmpDir, "insert_" + t + "_" + Date.now() + ".sql");
      fs.writeFileSync(f, sql);

      runPsql(["-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", PGDATABASE, "-f", f],
        (code, cout, cerr) => {
          try { fs.unlinkSync(f); } catch (e) {}
          if (code === 0) {
            console.log("  " + t + ": OK (" + stmts.length + " rows)");
            ok++;
          } else {
            console.log("  " + t + ": FAILED - " + cerr.slice(0, 200).replace(/\n/g, " "));
            fail++; failed.push(t);
          }
          next();
        });
      return;
    }

    // Non-JSON table: use \copy
    // Escape embedded \n so each row is on one line
    const lines = trimmed.split("\n");
    const escaped = lines.map((l) => l.replace(/\n/g, "\\n")).join("\n");
    const f = path.join(tmpDir, "copy_" + t + "_" + Date.now() + ".csv");
    fs.writeFileSync(f, escaped + "\n");

    const copySql =
      "\\copy public." + t + " (" + b.cols + ") " +
      "FROM '" + f + "' " +
      "WITH (FORMAT csv, DELIMITER E'\\t', NULL '\\N')";

    runPsql(["-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", PGDATABASE, "-c", copySql],
      (code, cout, cerr) => {
        try { fs.unlinkSync(f); } catch (e) {}
        if (code === 0) { console.log("  " + t + ": OK"); ok++; }
        else { console.log("  " + t + ": FAILED - " + cerr.slice(0, 200).replace(/\n/g, " ")); fail++; failed.push(t); }
        next();
      });
  }

  function verify() {
    console.log("\n--- Verification ---");
    runPsql(
      ["-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", PGDATABASE, "-c",
       "SELECT 'accounts' AS t,COUNT(*) FROM accounts UNION ALL " +
       "SELECT 'users',COUNT(*) FROM users UNION ALL " +
       "SELECT 'trips',COUNT(*) FROM trips UNION ALL " +
       "SELECT 'customers',COUNT(*) FROM customers UNION ALL " +
       "SELECT 'trip_customers',COUNT(*) FROM trip_customers UNION ALL " +
       "SELECT 'bookings',COUNT(*) FROM bookings UNION ALL " +
       "SELECT 'pricing_formulas',COUNT(*) FROM pricing_formulas UNION ALL " +
       "SELECT 'trip_statuses',COUNT(*) FROM trip_statuses UNION ALL " +
       "SELECT 'email_templates',COUNT(*) FROM email_templates UNION ALL " +
       "SELECT 'notifications',COUNT(*) FROM notifications UNION ALL " +
       "SELECT 'user_settings',COUNT(*) FROM user_settings;"],
      (code, out) => {
        for (const line of out.split("\n")) {
          const m = line.trim().match(/^(\S+)\s+(\d+)$/);
          if (m && m[1] !== "?column?") console.log("  " + m[1] + ": " + m[2] + " rows");
        }
        console.log("\n========================================");
        console.log(fail > 0
          ? " Import PARTIAL (" + ok + " ok, " + fail + " failed: " + failed.join(", ") + ")"
          : " Import COMPLETE! (" + ok + " ok)");
        console.log("========================================");
      }
    );
  }

  next();
}
