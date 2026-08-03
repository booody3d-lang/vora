import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns";
import pg from "pg";

dns.setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function maskDatabaseUrl(url) {
  if (!url) return "(missing)";
  return url.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

function projectRefFromUrl(connectionString) {
  try {
    const host = new URL(connectionString).hostname;
    const m = host.match(/^db\.(.+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function poolerConnectionCandidates(connectionString) {
  const ref = projectRefFromUrl(connectionString);
  if (!ref) return [];

  const base = new URL(connectionString);
  const password = base.password;
  const regions = [
    "ap-southeast-1",
    "ap-southeast-2",
    "us-east-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "us-west-1",
  ];

  const candidates = [];
  for (const region of regions) {
    for (const username of [`postgres.${ref}`, "postgres"]) {
      for (const port of ["5432", "6543"]) {
        const url = new URL(connectionString);
        url.username = username;
        url.password = password;
        url.hostname = `aws-0-${region}.pooler.supabase.com`;
        url.port = port;
        candidates.push({
          label: `${region}/${username.split(".")[0]}:${port}`,
          url: url.toString(),
        });
      }
    }
  }
  return candidates;
}

function shouldTryNextEndpoint(err) {
  const code = err?.code || "";
  if (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "28P01" ||
    code === "XX000"
  ) {
    return true;
  }
  return /Tenant or user not found|password authentication failed/i.test(String(err?.message));
}

async function runSql(connectionString, sql) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main() {
  const sqlArg = process.argv[2];
  if (!sqlArg) {
    console.error("Usage: node scripts/run-sql-file.mjs <path-to.sql>");
    process.exit(1);
  }

  const fileEnv = loadEnv();
  const connectionCandidates = [
    process.env.DIRECT_URL,
    fileEnv.DIRECT_URL,
    process.env.DATABASE_URL,
    fileEnv.DATABASE_URL,
  ].filter(Boolean);

  if (connectionCandidates.length === 0) {
    console.error("DATABASE_URL (or DIRECT_URL) not set in .env.local");
    process.exit(1);
  }

  const sqlPath = resolve(process.cwd(), sqlArg);
  let sql;
  try {
    sql = readFileSync(sqlPath, "utf8");
  } catch (err) {
    console.error(`Cannot read SQL file: ${sqlArg} (${err.message})`);
    process.exit(1);
  }

  console.log(`File: ${sqlArg} (${sql.length} bytes)`);

  const attempts = [];
  const seen = new Set();
  for (const connectionString of connectionCandidates) {
    for (const attempt of [
      { label: "direct", url: connectionString },
      ...poolerConnectionCandidates(connectionString),
    ]) {
      if (seen.has(attempt.url)) continue;
      seen.add(attempt.url);
      attempts.push(attempt);
    }
  }

  let lastErr;
  for (const attempt of attempts) {
    try {
      console.log(`Trying: ${attempt.label} (${maskDatabaseUrl(attempt.url)})`);
      await runSql(attempt.url, sql);
      console.log(`Migration SQL executed successfully via ${attempt.label}.`);
      return;
    } catch (err) {
      lastErr = err;
      if (shouldTryNextEndpoint(err) || err.code === "XX000") {
        console.error(`  Skipped (${err.code || "error"}): ${err.message}`);
        continue;
      }
      console.error(`Query failed: ${err.message}`);
      if (err.position) console.error(`Position: ${err.position}`);
      process.exit(1);
    }
  }

  console.error(`All connection attempts failed. Last error: ${lastErr?.message || lastErr}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
