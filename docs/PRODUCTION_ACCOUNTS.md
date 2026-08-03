# VORA Production Accounts

This document describes the permanent production accounts for the VORA platform.
**Passwords are never stored in the repository.** Create auth users manually in Supabase
and set bootstrap passwords only in `.env.local` (local) or Vercel env (never committed).

> **Security:** Passwords were shared in chat during setup. Rotate all account passwords
> after initial configuration.

---

## Account Overview

| Role | Email | Display Name | Profile Slug | Company | Premium Badge |
|------|-------|--------------|--------------|---------|---------------|
| **Owner** | `booody3d@gmail.com` | Abdullah saeed alBakkar | `abdullah-saeed-albakkar` | — | Yes |
| **Company** | `abadi.5g@outlook.com` | AlBakkar | `albakkars-company` | AlBakkar (`albakkar`) | Yes |
| **Admin** | `b.3d@live.com` | Saeed Bakka | `saeed-bakka` | — | Yes |
| **Premium User** | `abod.s.bakkar@hotmail.com` | Bakkar.3d | `bakkar-3d` | — | Yes (lifetime) |

---

## Four Distinct Accounts

Supabase Auth allows **one auth user per email address**. Company and admin are now
**separate accounts**:

- **`abadi.5g@outlook.com`** — Company portal (`/company/dashboard`), AlBakkar entity, premium badge. No freelancer store.
- **`b.3d@live.com`** — Limited admin panel (`/admin`), freelancer store creation, premium badge.

---

## Permissions Matrix

| Capability | Owner | Company | Admin | Premium User |
|------------|-------|---------|-------|--------------|
| Access profile | Yes | Yes | Yes | Yes |
| Create freelancer store | Yes | No | Yes | Yes |
| Admin panel (`/admin`) | Yes (full) | No | Yes (limited) | No |
| Company portal | No | Yes | No | No |
| Financial / Stripe config | Yes | No | No | No |
| Premium badge | Yes | Yes | Yes | Yes (lifetime) |
| Manage subscriptions (admin) | Yes | No | Yes | No |

Owner effective role is determined by `VORA_PLATFORM_OWNER_EMAIL` env var matching
`booody3d@gmail.com`, regardless of DB `account_type`.

---

## Production Schema (PostgREST-probed)

The live Supabase project uses a **slim schema** that differs from migration files 001/012:

| Table | Columns (production) |
|-------|---------------------|
| `accounts` | `id`, `email`, `account_type`, `status` |
| `profiles` | `id`, `full_name`, `updated_at` (NOT `professional_profiles`) |
| `companies` | `id`, `owner_account_id`, `slug`, `name`, `updated_at` |
| `account_subscription_assignments` | `account_id`, `tier_id`, `status`, `expires_at`, `updated_at` |
| `subscription_manual_overrides` | `account_id`, `tier_id`, `reason` |

Roles are stored in `accounts.account_type`: `owner`, `company`, `admin`, `professional`.
Display names live in `profiles.full_name` (profile `id` = account `id`).
Premium badge uses `account_subscription_assignments` + `subscription_manual_overrides` with tier `premium-user`.

---

## Manual Setup Steps

### 1. Environment variables

In `.env.local` (local) and Vercel Production:

```env
VORA_PLATFORM_OWNER_EMAIL=booody3d@gmail.com
```

Optional dev-only bootstrap passwords (never in production):

```env
# VORA_PLATFORM_OWNER_BOOTSTRAP_PASSWORD=
# VORA_ADMIN_BOOTSTRAP_PASSWORD=
# VORA_COMPANY_BOOTSTRAP_PASSWORD=
# VORA_PREMIUM_USER_BOOTSTRAP_PASSWORD=
# VORA_MANUAL_TEST_USER_BOOTSTRAP_PASSWORD=
# VORA_MANUAL_TEST_USER_EMAIL=b.3d@live.com
```

### 2. Create auth users in Supabase

Supabase Dashboard → **Authentication** → **Users** → **Add user**

Create each user with email + password (use strong unique passwords, not shared in chat):

1. `booody3d@gmail.com` — Owner
2. `abadi.5g@outlook.com` — Company
3. `b.3d@live.com` — Admin (**new** — create manually if not yet present)
4. `abod.s.bakkar@hotmail.com` — Premium User

Alternatively, users can self-register via the app signup flow; the seed script will
configure roles on the next step.

### 3. Run migrations

Apply all migrations through `029_fix_navigation_demo_hrefs.sql`:

```bash
# Via Supabase CLI or SQL Editor — run in order 001 → 029
```

Verify navigation links:

```sql
SELECT label_key, href FROM public.navigation_links
WHERE label_key IN ('nav.profile', 'sidebar.freelance.orders');
-- Expected: /network/profile/{profileSlug}  and  /freelance/orders
```

### 4. Seed account roles and profiles

**Preferred (REST, uses service role from `.env.local`):**

```bash
node scripts/seed-production-accounts-rest.mjs
```

**Alternative (SQL Editor or direct Postgres):**

```bash
node scripts/run-sql-file.mjs supabase/scripts/seed_production_accounts.sql
```

Or paste `supabase/scripts/seed_production_accounts.sql` into the Supabase SQL Editor.

The script is idempotent and skips accounts whose auth user does not yet exist.

### 5. Verify

```sql
SELECT a.email, a.account_type, a.status, p.full_name, c.name, c.slug, asa.tier_id
FROM accounts a
LEFT JOIN profiles p ON p.id = a.id
LEFT JOIN companies c ON c.owner_account_id = a.id
LEFT JOIN account_subscription_assignments asa ON asa.account_id = a.id
WHERE lower(a.email) IN (
  'booody3d@gmail.com',
  'abadi.5g@outlook.com',
  'b.3d@live.com',
  'abod.s.bakkar@hotmail.com'
);
```

Smoke test after deploy:

```bash
npm run build
BASE_URL=https://your-app.vercel.app npm run smoke:production
```

---

## Related Files

| File | Purpose |
|------|---------|
| `supabase/scripts/seed_production_accounts.sql` | Email-based role/profile/company/premium seed (SQL) |
| `scripts/seed-production-accounts-rest.mjs` | Same seed via PostgREST service role (preferred) |
| `scripts/probe-schema.mjs` | Read-only production schema probe |
| `supabase/migrations/029_fix_navigation_demo_hrefs.sql` | Fix demo nav hrefs (404 sources) |
| `.env.local.example` | Env var placeholders |
| `src/lib/security/roles.ts` | Owner email + admin test email resolution |
