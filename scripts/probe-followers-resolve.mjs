/**
 * Simulate follower list resolution the way the API should.
 * Usage: node scripts/probe-followers-resolve.mjs [accountId]
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
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = val;
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
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

async function resolveName(base, key, accountId) {
  const prof = await rest(base, key, `profiles?select=id,full_name,slug&id=eq.${accountId}`);
  if (prof.ok && Array.isArray(prof.body) && prof.body[0]) {
    return {
      source: "profiles",
      fullName: prof.body[0].full_name,
      slug: prof.body[0].slug,
    };
  }
  const acc = await rest(base, key, `accounts?select=id,email&id=eq.${accountId}`);
  if (acc.ok && Array.isArray(acc.body) && acc.body[0]) {
    return { source: "accounts.email", fullName: acc.body[0].email?.split("@")[0], slug: null };
  }
  return { source: "fallback", fullName: "User", slug: null };
}

async function main() {
  const env = loadEnv();
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.argv[2] || "f5da8382-c8af-47e1-93e2-5f943cac517a"; // Saeed Bakka

  const inbound = await rest(
    base,
    key,
    `connections?select=*&recipient_id=eq.${ownerId}&status=neq.declined`
  );
  console.log("Owner:", ownerId);
  console.log("Inbound connections:", inbound.status, JSON.stringify(inbound.body, null, 2));

  const rows = Array.isArray(inbound.body) ? inbound.body : [];
  const followers = [];
  for (const row of rows) {
    const resolved = await resolveName(base, key, row.requester_id);
    followers.push({
      accountId: row.requester_id,
      status: row.status,
      ...resolved,
    });
  }
  console.log("\nResolved followers:");
  console.log(JSON.stringify(followers, null, 2));
  console.log("\nCount:", followers.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
