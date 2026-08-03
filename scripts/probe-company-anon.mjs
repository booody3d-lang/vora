/**
 * Probe company read via anon key (simulates production without service role).
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

async function main() {
  const env = loadEnv();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("=== Anon key read (public) ===");
  const anon = await rest(baseUrl, anonKey, "companies?select=id,slug,name&slug=eq.albakkar&limit=1");
  console.log(JSON.stringify(anon, null, 2));

  console.log("\n=== is_public column probe (anon) ===");
  const isPublic = await rest(baseUrl, anonKey, "companies?select=is_public&limit=0");
  console.log(JSON.stringify(isPublic, null, 2));

  console.log("\n=== is_public column probe (service) ===");
  const isPublicSvc = await rest(baseUrl, serviceKey, "companies?select=is_public&limit=0");
  console.log(JSON.stringify(isPublicSvc, null, 2));

  console.log("\n=== companies columns via service select=* ===");
  const cols = await rest(baseUrl, serviceKey, "companies?select=*&slug=eq.albakkar&limit=1");
  if (cols.ok && cols.body?.[0]) {
    console.log("columns:", Object.keys(cols.body[0]).join(", "));
    console.log("is_public value:", cols.body[0].is_public);
  } else {
    console.log(JSON.stringify(cols, null, 2));
  }
}

main().catch(console.error);
