/**
 * One-off schema probe via PostgREST OpenAPI. Read-only.
 * Usage: node scripts/probe-schema.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
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

async function restFetch(baseUrl, path, apiKey, method = "GET") {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
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

const TABLES = [
  "accounts",
  "professional_profiles",
  "profiles",
  "companies",
  "account_subscription_assignments",
  "subscription_manual_overrides",
];

async function main() {
  const env = loadEnv();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !apiKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const openapi = await fetchOpenApi(baseUrl, apiKey);
  const result = { openapiAvailable: !!openapi, tables: {} };

  for (const table of TABLES) {
    const schema = openapi?.components?.schemas?.[table];
    const columns = schema?.properties ? Object.keys(schema.properties).sort() : null;
    const probe = await restFetch(baseUrl, `${table}?select=*&limit=0`, apiKey);
    result.tables[table] = {
      exists: probe.status === 200 || probe.status === 206,
      httpStatus: probe.status,
      columns,
      probeError: probe.ok ? null : probe.body,
    };
  }

  async function probeColumns(table, cols) {
    const out = {};
    for (const col of cols) {
      const p = await restFetch(baseUrl, `${table}?select=${col}&limit=0`, apiKey);
      out[col] = p.ok;
    }
    return out;
  }

  result.accountsColumnProbe = await probeColumns("accounts", [
    "id", "email", "account_type", "status", "full_name", "primary_role",
    "tier", "professional_unlocked", "has_freelancer_store", "updated_at",
  ]);

  // Probe status values by attempting update (dry - we'll use REST seed instead)
  const statusProbe = await restFetch(
    baseUrl,
    "accounts?select=status&limit=5",
    apiKey,
  );
  result.accountsStatusSample = statusProbe.ok ? statusProbe.body : statusProbe;

  result.profilesColumnProbe = await probeColumns("profiles", [
    "id", "account_id", "user_id", "slug", "headline", "full_name", "display_name",
    "name", "is_public", "is_premium", "updated_at", "created_at", "email",
    "avatar_url", "bio", "title", "role", "status",
  ]);

  result.companiesColumnProbe = await probeColumns("companies", [
    "id", "owner_account_id", "account_id", "slug", "name", "is_public", "updated_at",
  ]);

  result.asaColumnProbe = await probeColumns("account_subscription_assignments", [
    "account_id", "tier_id", "status", "source", "expires_at", "updated_at",
  ]);

  result.smoColumnProbe = await probeColumns("subscription_manual_overrides", [
    "account_id", "tier_id", "reason", "granted_by", "granted_at", "expires_at",
  ]);

  result.subscriptionTiersProbe = await restFetch(
    baseUrl,
    "subscription_tiers?select=*&limit=20",
    apiKey,
  );

  result.subscriptionTiersColumnProbe = await probeColumns("subscription_tiers", [
    "id", "name", "name_en", "name_ar", "slug", "price", "price_sar", "audience",
  ]);

  // Discover all profiles columns via select=*
  const profAll = await restFetch(baseUrl, "profiles?select=*&limit=1", apiKey);
  result.profilesSampleRow = profAll.ok && Array.isArray(profAll.body) && profAll.body[0]
    ? Object.keys(profAll.body[0])
    : profAll.body;

  // Fetch sample rows for the 4 production emails
  const emails = [
    "booody3d@gmail.com",
    "abadi.5g@outlook.com",
    "b.3d@live.com",
    "abod.s.bakkar@hotmail.com",
  ];
  const emailFilter = emails.map((e) => `email.eq.${e}`).join(",");
  const acctRes = await restFetch(
    baseUrl,
    `accounts?select=id,email,account_type,status&or=(${emailFilter})`,
    apiKey,
  );
  result.sampleAccounts = acctRes.ok ? acctRes.body : acctRes;

  if (Array.isArray(result.sampleAccounts)) {
    const ids = result.sampleAccounts.map((a) => a.id);
    const idFilter = ids.map((id) => `id.eq.${id}`).join(",");
    const profRes = await restFetch(
      baseUrl,
      `profiles?select=*&or=(${idFilter})`,
      apiKey,
    );
    result.sampleProfiles = profRes.ok ? profRes.body : profRes;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
