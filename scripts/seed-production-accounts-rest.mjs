/**
 * Seed production accounts via Supabase PostgREST (service role).
 * Mirrors supabase/scripts/seed_production_accounts.sql for the ACTUAL schema.
 *
 * Usage: node scripts/seed-production-accounts-rest.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
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

const ACCOUNTS = [
  {
    email: "booody3d@gmail.com",
    account_type: "owner",
    full_name: "Abdullah saeed alBakkar",
    company: null,
    store: { slug: "abdullah-saeed-albakkar-store", name: "Abdullah Store" },
    overrideReason: "Platform owner — lifetime premium",
  },
  {
    email: "abadi.5g@outlook.com",
    account_type: "company",
    full_name: "AlBakkar",
    company: { slug: "albakkar", name: "AlBakkar" },
    store: null,
    overrideReason: "Company account — premium badge",
  },
  {
    email: "b.3d@live.com",
    account_type: "admin",
    full_name: "Saeed Bakka",
    company: null,
    store: { slug: "saeed-bakka-store", name: "Saeed Store" },
    overrideReason: "Limited admin — premium badge",
  },
  {
    email: "abod.s.bakkar@hotmail.com",
    account_type: "professional",
    full_name: "Bakkar.3d",
    company: null,
    store: { slug: "bakkar-3d-store", name: "Bakkar Store" },
    overrideReason: "Lifetime free premium — founder account",
  },
];

async function rest(baseUrl, apiKey, path, { method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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

async function findAccountId(baseUrl, apiKey, email) {
  const res = await rest(
    baseUrl,
    apiKey,
    `accounts?select=id,email,account_type,status&email=eq.${encodeURIComponent(email)}&limit=1`,
  );
  if (!res.ok || !Array.isArray(res.body) || res.body.length === 0) return null;
  return res.body[0];
}

async function upsertAccount(baseUrl, apiKey, id, account_type) {
  return rest(baseUrl, apiKey, `accounts?id=eq.${id}`, {
    method: "PATCH",
    body: { account_type, status: "active" },
    prefer: "return=minimal",
  });
}

async function upsertProfile(baseUrl, apiKey, id, full_name) {
  return rest(baseUrl, apiKey, "profiles", {
    method: "POST",
    body: { id, full_name, updated_at: new Date().toISOString() },
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

async function upsertCompany(baseUrl, apiKey, ownerId, { slug, name }) {
  const existing = await rest(
    baseUrl,
    apiKey,
    `companies?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (existing.ok && Array.isArray(existing.body) && existing.body.length > 0) {
    return rest(baseUrl, apiKey, `companies?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: { owner_account_id: ownerId, name, updated_at: new Date().toISOString() },
      prefer: "return=minimal",
    });
  }
  return rest(baseUrl, apiKey, "companies", {
    method: "POST",
    body: {
      owner_account_id: ownerId,
      slug,
      name,
      updated_at: new Date().toISOString(),
    },
    prefer: "return=minimal",
  });
}

async function upsertStore(baseUrl, apiKey, accountId, { slug, name }) {
  const existing = await rest(
    baseUrl,
    apiKey,
    `freelancer_stores?select=id&account_id=eq.${accountId}&limit=1`,
  );
  if (existing.ok && Array.isArray(existing.body) && existing.body.length > 0) {
    return rest(baseUrl, apiKey, `freelancer_stores?account_id=eq.${accountId}`, {
      method: "PATCH",
      body: { slug, store_name: name, updated_at: new Date().toISOString() },
      prefer: "return=minimal",
    });
  }
  return rest(baseUrl, apiKey, "freelancer_stores", {
    method: "POST",
    body: {
      account_id: accountId,
      slug,
      store_name: name,
      updated_at: new Date().toISOString(),
    },
    prefer: "return=minimal",
  });
}

async function upsertSubscription(baseUrl, apiKey, accountId, reason) {
  const now = new Date().toISOString();
  const asa = await rest(baseUrl, apiKey, "account_subscription_assignments", {
    method: "POST",
    body: {
      account_id: accountId,
      tier_id: "premium-user",
      status: "active",
      expires_at: null,
      updated_at: now,
    },
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  const smo = await rest(baseUrl, apiKey, "subscription_manual_overrides", {
    method: "POST",
    body: {
      account_id: accountId,
      tier_id: "premium-user",
      reason,
    },
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  return { asa, smo };
}

async function verify(baseUrl, apiKey) {
  const emails = ACCOUNTS.map((a) => a.email);
  const orFilter = emails.map((e) => `email.eq.${e}`).join(",");
  const res = await rest(
    baseUrl,
    apiKey,
    `accounts?select=id,email,account_type,status&or=(${orFilter})`,
  );
  if (!res.ok) return { error: res.body };

  const rows = [];
  for (const acct of res.body) {
    const prof = await rest(baseUrl, apiKey, `profiles?select=full_name&id=eq.${acct.id}&limit=1`);
    const comp = await rest(
      baseUrl,
      apiKey,
      `companies?select=name,slug&owner_account_id=eq.${acct.id}&limit=1`,
    );
    const asa = await rest(
      baseUrl,
      apiKey,
      `account_subscription_assignments?select=tier_id,status,expires_at&account_id=eq.${acct.id}&limit=1`,
    );
    const smo = await rest(
      baseUrl,
      apiKey,
      `subscription_manual_overrides?select=reason&account_id=eq.${acct.id}&limit=1`,
    );
    const store = await rest(
      baseUrl,
      apiKey,
      `freelancer_stores?select=slug,store_name&account_id=eq.${acct.id}&limit=1`,
    );
    rows.push({
      email: acct.email,
      account_type: acct.account_type,
      status: acct.status,
      profile_display_name: prof.body?.[0]?.full_name ?? null,
      company_name: comp.body?.[0]?.name ?? null,
      company_slug: comp.body?.[0]?.slug ?? null,
      store_slug: store.body?.[0]?.slug ?? null,
      store_name: store.body?.[0]?.store_name ?? null,
      tier_id: asa.body?.[0]?.tier_id ?? null,
      subscription_status: asa.body?.[0]?.status ?? null,
      override_reason: smo.body?.[0]?.reason ?? null,
    });
  }
  return rows.sort((a, b) => a.email.localeCompare(b.email));
}

async function main() {
  const env = loadEnv();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !apiKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const results = [];
  for (const spec of ACCOUNTS) {
    const acct = await findAccountId(baseUrl, apiKey, spec.email);
    if (!acct) {
      results.push({ email: spec.email, status: "SKIP", reason: "auth user not found" });
      continue;
    }

    const steps = [];
    const acctRes = await upsertAccount(baseUrl, apiKey, acct.id, spec.account_type);
    steps.push({ step: "accounts", ok: acctRes.ok, status: acctRes.status, error: acctRes.ok ? null : acctRes.body });

    const profRes = await upsertProfile(baseUrl, apiKey, acct.id, spec.full_name);
    steps.push({ step: "profiles", ok: profRes.ok, status: profRes.status, error: profRes.ok ? null : profRes.body });

    if (spec.company) {
      const compRes = await upsertCompany(baseUrl, apiKey, acct.id, spec.company);
      steps.push({ step: "companies", ok: compRes.ok, status: compRes.status, error: compRes.ok ? null : compRes.body });
    }

    if (spec.store) {
      const storeRes = await upsertStore(baseUrl, apiKey, acct.id, spec.store);
      steps.push({
        step: "freelancer_stores",
        ok: storeRes.ok,
        status: storeRes.status,
        error: storeRes.ok ? null : storeRes.body,
      });
    }

    const subRes = await upsertSubscription(baseUrl, apiKey, acct.id, spec.overrideReason);
    steps.push({
      step: "subscriptions",
      ok: subRes.asa.ok && subRes.smo.ok,
      asa: subRes.asa.status,
      smo: subRes.smo.status,
      error: subRes.asa.ok && subRes.smo.ok ? null : { asa: subRes.asa.body, smo: subRes.smo.body },
    });

    const failed = steps.filter((s) => !s.ok);
    results.push({
      email: spec.email,
      id: acct.id,
      status: failed.length === 0 ? "OK" : "PARTIAL",
      steps,
    });
  }

  console.log("\n--- Seed Results ---\n");
  console.log(JSON.stringify(results, null, 2));

  console.log("\n--- Verification ---\n");
  const verification = await verify(baseUrl, apiKey);
  console.log(JSON.stringify(verification, null, 2));

  const anyFail = results.some((r) => r.status !== "OK" && r.status !== "SKIP");
  if (anyFail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
