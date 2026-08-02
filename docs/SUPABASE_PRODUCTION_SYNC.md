# Supabase Production Sync

Apply migrations **in numeric order** on the production Supabase project linked to VORA (`NEXT_PUBLIC_SUPABASE_URL`).

> **Sync protocol:** GitHub push ≠ Vercel env ≠ Supabase migrations. Deploying code does not apply SQL — run migrations manually in the Supabase SQL editor or via CLI.

## Prerequisites

1. Install Supabase CLI: `npm i -g supabase` (or use [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor).
2. Link project (optional CLI): `supabase link --project-ref <your-project-ref>`
3. Confirm current state before applying — do **not** re-run migrations that already exist.

## Migration checklist (27 total)

Apply each file from `supabase/migrations/` in order:

| # | File | Summary |
|---|------|---------|
| 001 | `001_initial_schema.sql` | Core accounts, profiles, auth bootstrap |
| 002 | `002_network_ecosystem.sql` | Network posts, connections |
| 003 | `003_company_ecosystem.sql` | Company pages, jobs |
| 004 | `004_freelance_marketplace.sql` | Freelance services, orders |
| 005 | `005_billing_payments.sql` | Billing tables, payment records |
| 006 | `006_notifications_comms.sql` | Notifications, messaging |
| 007 | `007_security_rbac.sql` | RBAC, privacy_settings, data_deletion_requests, OTP |
| 008 | `008_navigation_links.sql` | Navigation links |
| 009 | `009_account_gender.sql` | Account gender field |
| 010 | `010_supabase_auth_signup_metadata.sql` | Auth signup metadata trigger |
| 011 | `011_storage_bucket.sql` | Storage bucket policies |
| 012 | `012_core_schema_bootstrap_fn.sql` | Schema bootstrap function |
| 013 | `013_feed_rls_policies.sql` | Feed RLS policies |
| 014 | `014_social_messaging_rls.sql` | Social messaging RLS |
| 015 | `015_subscription_ecosystem.sql` | Subscription plans |
| 016 | `016_subscription_stripe_phase4b.sql` | Stripe subscription fields |
| 017 | `017_email_delivery_log.sql` | Email delivery log |
| 018 | `018_notification_preferences_phase4d.sql` | Notification preferences |
| 019 | `019_billing_wallet_phase4e.sql` | Billing wallet |
| 020 | `020_billing_escrow_withdrawals_phase4e1.sql` | Escrow withdrawals |
| 021 | `021_company_rls_phase5.sql` | Company RLS policies |
| 022 | `022_freelance_rls_phase6a.sql` | Freelance RLS policies |
| 023 | `023_auth_otp_phase8b.sql` | OTP codes table + indexes |
| 024 | `024_auth_phone_phase8c.sql` | Phone auth fields |
| 025 | `025_auth_totp_phase8d.sql` | TOTP 2FA fields |
| 026 | `026_user_sessions_phase8e.sql` | User sessions table |
| 027 | `027_security_audit_phase8f.sql` | Security audit log indexes + RLS |

### Phase 8 migrations (023–027) — verify after apply

These are required for OTP, phone auth, TOTP, sessions, and security audit features:

- **023** — `otp_codes` table
- **024** — phone verification columns on accounts
- **025** — TOTP secret storage
- **026** — `user_sessions` table (replaces demo-store sessions)
- **027** — `security_audit_log` RLS + indexes

Privacy settings use table `privacy_settings` from **007** (not 027).

## Apply via Dashboard (recommended if CLI unavailable)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. For each migration file (001 → 027), paste contents and run.
3. Skip any migration whose objects already exist (use verification queries below).

## Apply via CLI

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Or apply individually:

```bash
supabase db execute --file supabase/migrations/023_auth_otp_phase8b.sql
# … repeat for 024–027
```

## Verification SQL

Run after migrations to confirm production schema:

```sql
-- Core tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts', 'privacy_settings', 'data_deletion_requests',
    'otp_codes', 'user_sessions', 'security_audit_log',
    'notification_preferences'
  )
ORDER BY table_name;

-- Privacy settings RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'privacy_settings';

-- OTP table present (migration 023)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'otp_codes'
ORDER BY ordinal_position;

-- User sessions present (migration 026)
SELECT COUNT(*) AS session_table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_sessions';

-- Security audit indexes (migration 027)
SELECT indexname FROM pg_indexes
WHERE tablename = 'security_audit_log'
  AND indexname LIKE 'idx_security_audit%';

-- Latest migration marker — check otp_codes has expected columns
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'otp_codes'
    AND column_name = 'purpose'
) AS otp_phase8b_applied;
```

Expected: all tables listed, `privacy_settings` RLS = `true`, OTP and sessions tables present, audit indexes found.

## Post-migration smoke checks

1. Sign up / log in on production.
2. `GET /api/security/privacy` — returns settings from Supabase (not in-memory demo store).
3. `PUT /api/security/privacy` — persists changes.
4. `POST /api/auth/otp/send` — OTP flow uses Supabase `otp_codes` table.
5. Owner: `GET /api/admin/launch/readiness` — all blocking checks green.

## Do not run without confirmation

- `DROP TABLE`, `TRUNCATE`, or destructive rollbacks
- Re-applying migrations that already succeeded (may error on duplicate objects — safe to skip)

## Local vs production

| Layer | Sync method |
|-------|-------------|
| Code | `git push origin main` → Vercel auto-deploy |
| Env vars | Vercel Dashboard → Settings → Environment Variables |
| Database | Supabase SQL Editor or `supabase db push` (this doc) |
