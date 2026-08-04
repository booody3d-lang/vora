import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const env = {};
  for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function q(path) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  return { status: res.status, body: await res.json() };
}

const terms = ["saeed", "Saeed", "abdullah", "Bakka", "albakkar"];
for (const term of terms) {
  const r = await q(`profiles?select=id,full_name,slug&full_name=ilike.*${encodeURIComponent(term)}*`);
  console.log(term, r.status, JSON.stringify(r.body));
}
const all = await q("profiles?select=id,full_name,slug");
console.log("all profiles", Array.isArray(all.body) ? all.body.length : all.body);
