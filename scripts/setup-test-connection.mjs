/**
 * Ensure accepted connection between owner and admin test accounts.
 * Uses Supabase REST for account lookup; writes to connections table via PG when
 * DATABASE_URL works, otherwise seeds local JSON fallback (.data/vora/social-data.json).
 *
 * Usage: node scripts/setup-test-connection.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DATA_DIR = join(root, ".data", "vora");
const SOCIAL_FILE = join(DATA_DIR, "social-data.json");
const MESSAGING_FILE = join(DATA_DIR, "messaging-data.json");

const OWNER_EMAIL = "booody3d@gmail.com";
const ADMIN_EMAIL = "b.3d@live.com";

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
    `accounts?select=id,email,account_type&email=eq.${encodeURIComponent(email)}&limit=1`,
  );
  if (!res.ok || !Array.isArray(res.body) || res.body.length === 0) return null;
  return res.body[0];
}

function edgeId(followerId, targetId) {
  return `${followerId}:user:${targetId}`;
}

function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback();
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback();
  }
}

function writeJsonFallback(ownerId, adminId) {
  mkdirSync(DATA_DIR, { recursive: true });
  const now = new Date().toISOString();

  const social = readJsonFile(SOCIAL_FILE, () => ({ follows: [] }));
  if (!social.follows) social.follows = [];

  const pairs = [
    { follower: ownerId, target: adminId },
    { follower: adminId, target: ownerId },
  ];

  for (const { follower, target } of pairs) {
    const id = edgeId(follower, target);
    const existing = social.follows.find((f) => f.id === id);
    if (existing) {
      existing.status = "accepted";
      existing.acceptedAt = now;
    } else {
      social.follows.push({
        id,
        followerAccountId: follower,
        targetId: target,
        targetType: "user",
        status: "accepted",
        createdAt: now,
        acceptedAt: now,
      });
    }
  }

  writeFileSync(SOCIAL_FILE, JSON.stringify(social, null, 2));

  const messaging = readJsonFile(MESSAGING_FILE, () => ({
    conversations: [],
    messages: {},
  }));
  if (!messaging.conversations) messaging.conversations = [];
  if (!messaging.messages) messaging.messages = {};

  const convExists = messaging.conversations.some(
    (c) =>
      c.memberIds?.length === 2 &&
      c.memberIds.includes(ownerId) &&
      c.memberIds.includes(adminId),
  );

  let conversation = messaging.conversations.find(
    (c) =>
      c.memberIds?.length === 2 &&
      c.memberIds.includes(ownerId) &&
      c.memberIds.includes(adminId),
  );

  if (!convExists) {
    conversation = {
      id: `conv-owner-admin-${ownerId.slice(0, 8)}`,
      memberIds: [ownerId, adminId],
      accessType: "mutual_connection",
      createdAt: now,
      updatedAt: now,
    };
    messaging.conversations.push(conversation);
    messaging.messages[conversation.id] = [];
  }

  writeFileSync(MESSAGING_FILE, JSON.stringify(messaging, null, 2));

  return {
    mode: "json-fallback",
    socialFile: SOCIAL_FILE,
    messagingFile: MESSAGING_FILE,
    conversationId: conversation?.id,
    followCount: social.follows.filter(
      (f) =>
        f.targetType === "user" &&
        f.status === "accepted" &&
        ((f.followerAccountId === ownerId && f.targetId === adminId) ||
          (f.followerAccountId === adminId && f.targetId === ownerId)),
    ).length,
  };
}

async function ensureConnectionsSchema(client) {
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
      status connection_status NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (requester_id, recipient_id),
      CHECK (requester_id <> recipient_id)
    );
  `);
}

async function upsertAcceptedConnectionPg(client, requesterId, recipientId) {
  const result = await client.query(
    `
    INSERT INTO public.connections (requester_id, recipient_id, status, created_at, updated_at)
    VALUES ($1, $2, 'accepted', NOW(), NOW())
    ON CONFLICT (requester_id, recipient_id)
    DO UPDATE SET status = 'accepted', updated_at = NOW()
    RETURNING id, requester_id, recipient_id, status
    `,
    [requesterId, recipientId],
  );
  return result.rows[0];
}

async function trySupabasePg(databaseUrl, ownerId, adminId) {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await ensureConnectionsSchema(client);
    const ownerToAdmin = await upsertAcceptedConnectionPg(client, ownerId, adminId);
    const adminToOwner = await upsertAcceptedConnectionPg(client, adminId, ownerId);
    return { mode: "supabase-pg", ownerToAdmin, adminToOwner };
  } finally {
    await client.end();
  }
}

async function trySupabaseRest(baseUrl, apiKey, ownerId, adminId) {
  const now = new Date().toISOString();
  const results = [];

  for (const [requesterId, recipientId] of [
    [ownerId, adminId],
    [adminId, ownerId],
  ]) {
    const existing = await rest(
      baseUrl,
      apiKey,
      `connections?select=id,status&requester_id=eq.${requesterId}&recipient_id=eq.${recipientId}&limit=1`,
    );

    if (existing.status === 404 || existing.body?.code === "PGRST205") {
      return { ok: false, reason: "connections table missing" };
    }

    if (Array.isArray(existing.body) && existing.body.length > 0) {
      const row = existing.body[0];
      if (row.status !== "accepted") {
        const updated = await rest(baseUrl, apiKey, `connections?id=eq.${row.id}`, {
          method: "PATCH",
          body: { status: "accepted", updated_at: now },
          prefer: "return=representation",
        });
        results.push({ action: "updated", row: updated.body?.[0] ?? updated.body });
      } else {
        results.push({ action: "exists", row });
      }
      continue;
    }

    const created = await rest(baseUrl, apiKey, "connections", {
      method: "POST",
      body: {
        requester_id: requesterId,
        recipient_id: recipientId,
        status: "accepted",
        created_at: now,
        updated_at: now,
      },
      prefer: "return=representation",
    });
    results.push({ action: "created", row: created.body?.[0] ?? created.body, ok: created.ok });
  }

  return { ok: true, mode: "supabase-rest", results };
}

async function main() {
  const env = loadEnv();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = env.DATABASE_URL;

  if (!baseUrl || !apiKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const owner = await findAccountId(baseUrl, apiKey, OWNER_EMAIL);
  const admin = await findAccountId(baseUrl, apiKey, ADMIN_EMAIL);

  if (!owner) {
    console.error(`Owner account not found: ${OWNER_EMAIL}`);
    process.exit(1);
  }
  if (!admin) {
    console.error(`Admin account not found: ${ADMIN_EMAIL}`);
    process.exit(1);
  }

  console.log("Owner:", owner);
  console.log("Admin:", admin);

  let result = null;

  const restAttempt = await trySupabaseRest(baseUrl, apiKey, owner.id, admin.id);
  if (restAttempt.ok) {
    result = restAttempt;
  } else {
    console.log("\nREST:", restAttempt.reason);

    if (databaseUrl) {
      try {
        result = await trySupabasePg(databaseUrl, owner.id, admin.id);
      } catch (err) {
        console.log("\nPG failed:", err.message);
      }
    }

    if (!result) {
      result = writeJsonFallback(owner.id, admin.id);
      console.log(
        "\nNOTE: public.connections table is missing in Supabase and DATABASE_URL auth failed.",
      );
      console.log("Seeded local JSON fallback for dev. Apply supabase/migrations/002_network_ecosystem.sql");
      console.log("in Supabase SQL Editor, then re-run this script for persistent DB storage.");
    }
  }

  console.log("\nResult:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
