/**
 * Read-only probe: verify account + company linkage for AlBakkar.
 * Usage: node scripts/probe-company-account.mjs
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

async function rest(baseUrl, apiKey, path) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, ok: res.ok, body: parsed };
}

const EMAIL = "abadi.5g@outlook.com";
const EXPECTED_SLUG = "albakkar";

async function main() {
  const env = loadEnv();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !apiKey) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const acct = await rest(
    baseUrl,
    apiKey,
    `accounts?select=id,email,account_type,status&email=eq.${encodeURIComponent(EMAIL)}&limit=1`
  );
  console.log("Account:", JSON.stringify(acct, null, 2));

  const accountId = acct.body?.[0]?.id;
  if (!accountId) {
    console.log("No account found for", EMAIL);
    return;
  }

  const byOwner = await rest(
    baseUrl,
    apiKey,
    `companies?select=*&owner_account_id=eq.${accountId}&limit=1`
  );
  console.log("\nCompany by owner_account_id:", JSON.stringify(byOwner, null, 2));

  const bySlug = await rest(
    baseUrl,
    apiKey,
    `companies?select=*&slug=eq.${EXPECTED_SLUG}&limit=1`
  );
  console.log("\nCompany by slug:", JSON.stringify(bySlug, null, 2));

  const sub = await rest(
    baseUrl,
    apiKey,
    `company_subscriptions?select=*&company_id=eq.${byOwner.body?.[0]?.id ?? "none"}&limit=1`
  );
  console.log("\nCompany subscription:", JSON.stringify(sub, null, 2));
}

main().catch(console.error);
