/**
 * Read-only verification of Supabase migrations 023-027 via PostgREST.
 * Usage: node scripts/verify-migrations.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function restFetch(baseUrl, path, apiKey) {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, ok: res.ok, body };
}

async function fetchOpenApi(baseUrl, apiKey) {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/openapi+json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function tableColumnsFromOpenApi(openapi, tableName) {
  const schema = openapi?.components?.schemas?.[tableName];
  if (!schema?.properties) return null;
  return Object.keys(schema.properties);
}

function maskSecret(val, visible = 4) {
  if (!val) return "(missing)";
  if (val.length <= visible * 2) return "***";
  return `${val.slice(0, visible)}…${val.slice(-visible)}`;
}

const CHECKS = {
  "023": {
    name: "023_auth_otp_phase8b",
    tableChecks: [{ table: "otp_codes", requiredColumns: ["channel", "provider_ref", "purpose"] }],
    indexHints: ["idx_otp_phone_channel"],
  },
  "024": {
    name: "024_auth_phone_phase8c",
    tableChecks: [{ table: "accounts", requiredColumns: ["phone_country", "preferred_otp_channel", "phone", "phone_verified"] }],
    indexHints: ["idx_accounts_phone_verified"],
  },
  "025": {
    name: "025_auth_totp_phase8d",
    tableChecks: [{ table: "accounts", requiredColumns: ["totp_enabled_at", "totp_secret", "totp_enabled"] }],
  },
  "026": {
    name: "026_user_sessions_phase8e",
    tableChecks: [{ table: "user_sessions", requiredColumns: ["session_token_hash", "account_id"] }],
    indexHints: ["idx_user_sessions_token_hash"],
  },
  "027": {
    name: "027_security_audit_phase8f",
    tableChecks: [{ table: "security_audit_log", requiredColumns: ["event_type", "account_id", "created_at"] }],
    indexHints: ["idx_security_audit_account", "idx_security_audit_event_type"],
  },
};

async function main() {
  const fileEnv = loadEnv();
  const env = { ...fileEnv, ...process.env };
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const keyLabel = env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY";

  console.log(JSON.stringify({
    connection: {
      method: "PostgREST (Supabase REST API)",
      supabaseUrl: baseUrl || "(missing)",
      authKey: maskSecret(apiKey),
      authKeySource: keyLabel,
      databaseUrl: env.DATABASE_URL ? maskSecret(env.DATABASE_URL) : "(not set)",
      directUrl: env.DIRECT_URL ? maskSecret(env.DIRECT_URL) : "(not set)",
    },
  }, null, 2));

  if (!baseUrl || !apiKey) {
    console.error("\nMissing NEXT_PUBLIC_SUPABASE_URL or API key in .env.local");
    process.exit(1);
  }

  const openapi = await fetchOpenApi(baseUrl, apiKey);
  const openapiOk = !!openapi;

  const results = {};

  for (const [id, check] of Object.entries(CHECKS)) {
    const migrationResult = {
      migration: check.name,
      status: "APPLIED",
      evidence: [],
      missing: [],
    };

    for (const tc of check.tableChecks) {
      const probe = await restFetch(baseUrl, `${tc.table}?select=*&limit=0`, apiKey);

      if (probe.status === 404 || (probe.body?.code === "PGRST205")) {
        migrationResult.status = "NOT APPLIED";
        migrationResult.missing.push(`table ${tc.table} not found in schema`);
        migrationResult.evidence.push({ table: tc.table, httpStatus: probe.status, error: probe.body?.message || probe.body });
        continue;
      }

      if (!probe.ok && probe.status !== 200) {
        migrationResult.status = migrationResult.status === "NOT APPLIED" ? "NOT APPLIED" : "PARTIAL";
        migrationResult.evidence.push({ table: tc.table, httpStatus: probe.status, note: "unexpected response", body: probe.body });
      } else {
        migrationResult.evidence.push({ table: tc.table, httpStatus: probe.status, exists: true });
      }

      let columns = openapiOk ? tableColumnsFromOpenApi(openapi, tc.table) : null;
      if (columns) {
        for (const col of tc.requiredColumns) {
          if (!columns.includes(col)) {
            migrationResult.missing.push(`column ${tc.table}.${col}`);
            migrationResult.status = migrationResult.status === "NOT APPLIED" ? "NOT APPLIED" : "PARTIAL";
          } else {
            migrationResult.evidence.push({ column: `${tc.table}.${col}`, present: true });
          }
        }
      } else if (openapiOk) {
        migrationResult.evidence.push({ note: `OpenAPI schema missing for ${tc.table} — column check skipped` });
        if (migrationResult.status === "APPLIED") migrationResult.status = "PARTIAL";
      } else {
        migrationResult.evidence.push({ note: "OpenAPI unavailable — column-level check skipped (table probe only)" });
        if (migrationResult.status === "APPLIED") migrationResult.status = "PARTIAL";
      }
    }

    if (check.indexHints?.length && !openapiOk) {
      migrationResult.evidence.push({ note: `Index hints ${check.indexHints.join(", ")} require SQL verification (indexes not exposed via REST)` });
    }

    if (migrationResult.missing.length === 0 && migrationResult.status === "APPLIED" && !openapiOk) {
      migrationResult.status = "PARTIAL";
    }

    results[id] = migrationResult;
  }

  console.log("\n--- Migration Results ---\n");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
