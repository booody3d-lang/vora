/**
 * Probe connections + profile resolution for follower list debugging.
 * Usage: node scripts/probe-followers.mjs
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
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  const env = loadEnv();
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    console.error("Missing Supabase URL or service role key");
    process.exit(1);
  }

  const emails = [
    "booody3d@gmail.com",
    "b.3d@live.com",
    "abod.s.bakkar@hotmail.com",
    "abadi.5g@outlook.com",
  ];

  console.log("=== Accounts ===");
  const accounts = {};
  for (const email of emails) {
    const r = await rest(
      base,
      key,
      `accounts?select=id,email,account_type,full_name&email=eq.${encodeURIComponent(email)}`
    );
    console.log(email, r.status, JSON.stringify(r.body));
    if (Array.isArray(r.body) && r.body[0]) accounts[email] = r.body[0];
  }

  // Also search by name
  const byName = await rest(
    base,
    key,
    `accounts?select=id,email,account_type,full_name&full_name=ilike.*Saeed*`
  );
  console.log("\nSaeed search:", byName.status, JSON.stringify(byName.body));

  const connections = await rest(
    base,
    key,
    "connections?select=id,requester_id,recipient_id,status,created_at&order=created_at.desc"
  );
  console.log("\n=== All connections ===");
  console.log(connections.status, JSON.stringify(connections.body, null, 2));

  const follows = await rest(base, key, "follows?select=*&limit=20");
  console.log("\n=== follows table ===");
  console.log(follows.status, typeof follows.body === "string" ? follows.body.slice(0, 200) : JSON.stringify(follows.body)?.slice(0, 500));

  // For each known account, show inbound/outbound
  console.log("\n=== Per-account follower view (recipient_id = me) ===");
  for (const [email, acc] of Object.entries(accounts)) {
    const inbound = await rest(
      base,
      key,
      `connections?select=*&recipient_id=eq.${acc.id}&status=neq.declined`
    );
    const outbound = await rest(
      base,
      key,
      `connections?select=*&requester_id=eq.${acc.id}&status=neq.declined`
    );
    console.log(
      email,
      "inbound(followers)=",
      Array.isArray(inbound.body) ? inbound.body.length : inbound.body,
      "outbound(following)=",
      Array.isArray(outbound.body) ? outbound.body.length : outbound.body
    );
  }

  // Profile lookups for connection participants
  if (Array.isArray(connections.body)) {
    const ids = new Set();
    for (const row of connections.body) {
      ids.add(row.requester_id);
      ids.add(row.recipient_id);
    }
    console.log("\n=== Profile resolution for connection IDs ===");
    for (const id of ids) {
      const prof = await rest(base, key, `profiles?select=id,full_name,slug&id=eq.${id}`);
      const pp = await rest(
        base,
        key,
        `professional_profiles?select=account_id,full_name,slug&account_id=eq.${id}`
      );
      console.log(
        id,
        "profiles=",
        JSON.stringify(prof.body),
        "professional_profiles=",
        typeof pp.body === "string" ? pp.body.slice(0, 120) : JSON.stringify(pp.body)
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
