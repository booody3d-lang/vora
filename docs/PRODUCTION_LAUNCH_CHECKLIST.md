# VORA Production Launch Checklist

Use this checklist before deploying VORA to production on Vercel. It reflects **Phase 9** production ops (9A–9F) and the current **soft-launch** posture: simulation billing and demo accounts remain valid until legal approval.

---

## Pre-launch environment variable matrix

### Supabase (required)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL from Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin, DB sync, cron jobs |

### Auth & security (required)

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | Yes | Long random secret; must **not** contain `vora-dev-jwt-secret` in production |
| `PASSWORD_PEPPER` | Yes | Long random pepper; must **not** be `vora-pepper-2026` in production |
| `VORA_PLATFORM_OWNER_EMAIL` | Yes | RBAC owner email (not a password) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production domain, e.g. `https://vora.sa` — used for password reset redirects |

### Billing (simulation OK for soft launch)

| Variable | Required | Notes |
|----------|----------|-------|
| `BILLING_PAYMENT_MODE` | Optional | `simulation` is **valid for soft launch**. Do not switch to `stripe` until legal approval |
| `STRIPE_SECRET_KEY` | Deferred | Live Stripe keys — **deferred until legal approval** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Deferred | **Deferred until legal approval** |
| `STRIPE_WEBHOOK_SECRET` | Deferred | **Deferred until legal approval** |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Deferred | **Deferred until legal approval** |
| `STRIPE_PREMIUM_YEARLY_PRICE_ID` | Deferred | **Deferred until legal approval** |
| `STRIPE_COMPANY_ANNUAL_PRICE_ID` | Deferred | **Deferred until legal approval** |

> Simulation mode allows checkout, portal, and subscription flows without live payment capture. Keep `BILLING_PAYMENT_MODE=simulation` until legal procedures complete.

### OTP / Email (required for production soft launch)

| Variable | Required | Notes |
|----------|----------|-------|
| `OTP_PROVIDER` | Recommended | Set `twilio` in production (or `auto` with Twilio keys present) |
| `TWILIO_ACCOUNT_SID` | Yes (prod) | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes (prod) | Twilio auth token |
| `TWILIO_SMS_FROM` | Yes (prod) | E.164 sender number |
| `TWILIO_WHATSAPP_FROM` | Optional | WhatsApp sender if using WhatsApp OTP |
| `EMAIL_TRANSPORT_MODE` | Recommended | Set `resend` in production (or `auto` with Resend key present) |
| `RESEND_API_KEY` | Yes (prod) | Resend API key |
| `RESEND_FROM_EMAIL` | Yes (prod) | Verified sender domain |
| `RESEND_REPLY_TO` | Optional | Support reply-to address |

### Cron (required)

| Variable | Required | Notes |
|----------|----------|-------|
| `CRON_SECRET` | Yes | Random secret; Vercel cron sends `Authorization: Bearer <CRON_SECRET>` |
| `BACKUP_STORAGE_URL` | Optional | HTTPS POST target for backup manifests; local fallback when unset |
| `VORA_DATA_DIR` | Optional | Defaults to `/tmp/vora` on Vercel |

### Sentry (optional, recommended)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Client + server error reporting |
| `SENTRY_ORG` | Optional | For source map upload |
| `SENTRY_PROJECT` | Optional | Project slug |
| `SENTRY_AUTH_TOKEN` | Optional | Enables source map upload on build |

### Redis (optional, recommended)

| Variable | Required | Notes |
|----------|----------|-------|
| `REDIS_URL` | Optional | Upstash REST URL |
| `REDIS_TOKEN` | Optional | Upstash REST token; in-memory fallback when unset |

### Site / AI (optional)

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Optional | VORA AI features |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | Optional | Default `text-embedding-3-small` |

### Dev / staging only (do not set in production)

| Variable | Notes |
|----------|-------|
| `VORA_PLATFORM_OWNER_BOOTSTRAP_PASSWORD` | Dev-only bootstrap — **never in production** |
| `VORA_MANUAL_TEST_USER_BOOTSTRAP_PASSWORD` | Dev/staging only |
| `VORA_MANUAL_TEST_USER_EMAIL` | Dev/staging only |
| `VORA_DEMO_DEFAULT_PASSWORD` | Dev/staging only — demo accounts deferred for removal |

---

## Database migrations (001–027)

Apply in order via Supabase SQL editor or CLI:

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Core accounts, profiles, auth tables |
| 002 | `002_network_ecosystem.sql` | Network posts, jobs, connections |
| 003 | `003_company_ecosystem.sql` | Company pages, jobs, analytics |
| 004 | `004_freelance_marketplace.sql` | Freelance stores, services, orders |
| 005 | `005_billing_payments.sql` | Billing, wallets, payment events |
| 006 | `006_notifications_comms.sql` | Notifications, messaging |
| 007 | `007_security_rbac.sql` | Roles, permissions, audit foundations |
| 008 | `008_navigation_links.sql` | Cross-platform navigation links |
| 009 | `009_account_gender.sql` | Account gender field |
| 010 | `010_supabase_auth_signup_metadata.sql` | Supabase auth signup metadata |
| 011 | `011_storage_bucket.sql` | Storage bucket policies |
| 012 | `012_core_schema_bootstrap_fn.sql` | `vora_ensure_core_schema()` bootstrap |
| 013 | `013_feed_rls_policies.sql` | Feed engagement RLS |
| 014 | `014_social_messaging_rls.sql` | Conversation insert/update RLS |
| 015 | `015_subscription_ecosystem.sql` | Subscription tiers, assignments, Stripe mappings |
| 016 | `016_subscription_stripe_phase4b.sql` | Stripe Price ID map per tier |
| 017 | `017_email_delivery_log.sql` | Email delivery audit log |
| 018 | `018_notification_preferences_phase4d.sql` | Notification preferences RLS |
| 019 | `019_billing_wallet_phase4e.sql` | Wallet bootstrap, withdrawal policies |
| 020 | `020_billing_escrow_withdrawals_phase4e1.sql` | Escrow RPC, withdrawal workflow |
| 021 | `021_company_rls_phase5.sql` | Company posts/followers/analytics RLS |
| 022 | `022_freelance_rls_phase6a.sql` | Freelance orders/messages/disputes RLS |
| 023 | `023_auth_otp_phase8b.sql` | OTP channel/provider metadata |
| 024 | `024_auth_phone_phase8c.sql` | Phone auth metadata on accounts |
| 025 | `025_auth_totp_phase8d.sql` | TOTP 2FA persistence fields |
| 026 | `026_user_sessions_phase8e.sql` | User sessions indexes and RLS |
| 027 | `027_security_audit_phase8f.sql` | Security audit log indexes and RLS |

See also [supabase/README.md](../supabase/README.md) for Supabase dashboard setup (redirect URLs, email).

---

## Admin diagnostics URLs

All owner-only endpoints require platform owner authentication.

| Subsystem | Endpoint | Purpose |
|-----------|----------|---------|
| **Consolidated readiness** | `GET /api/admin/launch/readiness` | Soft-launch readiness aggregate |
| Health (public) | `GET /api/health` | Liveness/readiness probe (no auth) |
| Billing | `GET /api/admin/billing/diagnostics` | Payment mode, Stripe config, simulation status |
| Notifications | `GET /api/admin/notifications/diagnostics` | Twilio OTP + Resend email readiness |
| Cron | `GET /api/admin/cron/diagnostics` | CRON_SECRET, schedules, last runs |
| Cache | `GET /api/admin/cache/diagnostics` | Redis connectivity and usage |
| Monitoring | `GET /api/admin/monitoring/diagnostics` | Sentry, health, Redis summary |

Expected soft-launch response from `/api/admin/launch/readiness`:

```json
{
  "readyForSoftLaunch": true,
  "deferred": ["stripe_live", "demo_removal"],
  "checks": { "...": "..." },
  "warnings": ["Billing is in simulation mode (expected for soft launch...)"]
}
```

---

## Deferred until legal approval

Do **not** complete these before legal sign-off:

1. **Stripe live mode** — Keep `BILLING_PAYMENT_MODE=simulation`. Do not configure live Stripe keys or switch to `stripe` mode.
2. **Demo account removal** — Demo bootstrap accounts and mock data fallbacks remain active. Do not remove `VORA_DEMO_*` bootstrap paths or disable demo store seeding.

These items appear in `deferred` on the launch readiness endpoint and do **not** block `readyForSoftLaunch`.

---

## Vercel deployment checklist

- [ ] All required env vars set in Vercel project settings (Production environment)
- [ ] `CRON_SECRET` set — matches what cron routes expect (`Authorization: Bearer …`)
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain
- [ ] Supabase redirect URLs include `https://<domain>/auth/callback`
- [ ] Migrations 001–027 applied on production Supabase project
- [ ] `vercel.json` cron schedules deployed (backup 03:00 UTC, search-reindex every 6h, subscription-reconcile 04:00 UTC)
- [ ] Health probe configured: `GET /api/health` returns `{ "status": "ok" }` (200) or `{ "status": "degraded" }` (200); 503 only if Supabase missing in production
- [ ] Owner can access `/admin` and call `/api/admin/launch/readiness`
- [ ] **Not** switching Stripe to live mode
- [ ] **Not** removing demo accounts / mock data

---

## Post-launch smoke tests

Run as platform owner after deploy:

- [ ] `GET /api/health` — status ok or degraded (not 503)
- [ ] `GET /api/admin/launch/readiness` — `readyForSoftLaunch: true`
- [ ] Sign up / sign in flow works
- [ ] Password reset email delivers (Supabase auth + Resend)
- [ ] OTP SMS sends via Twilio (test phone verification)
- [ ] Browse Network and Freelance landing pages
- [ ] Admin panel loads at `/admin`
- [ ] Billing diagnostics shows `simulationMode: true` (expected)
- [ ] Cron diagnostics shows `CRON_SECRET` configured
- [ ] Trigger or wait for first cron run; verify in cron diagnostics `lastRuns`
- [ ] Sentry receives a test error (if configured)
- [ ] Redis diagnostics shows connectivity (if configured)

---

## Phase 9 reference

| Phase | Scope | Status |
|-------|-------|--------|
| 9A | Stripe billing (simulation OK) | Complete |
| 9B | Twilio + Resend | Complete |
| 9C | Cron jobs | Complete |
| 9D | Sentry monitoring | Complete |
| 9E | Redis cache | Complete |
| 9F | Launch checklist + readiness diagnostics | This document |
