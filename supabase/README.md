# Supabase setup for VORA

Apply these steps on a **fresh Supabase project** before production deployment.

## 1. Run migrations (recommended)

In the Supabase SQL editor, run the files in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `002_network_ecosystem.sql`
3. `003_company_ecosystem.sql`
4. `004_freelance_marketplace.sql`
5. `005_billing_payments.sql`
6. `006_notifications_comms.sql`
7. `007_security_rbac.sql`
8. `008_navigation_links.sql`
9. `009_account_gender.sql`
10. `010_supabase_auth_signup_metadata.sql`
11. `011_storage_bucket.sql`
12. `012_core_schema_bootstrap_fn.sql`
13. `013_feed_rls_policies.sql` — feed engagement RLS (requires `002_network_ecosystem.sql` tables)
14. `014_social_messaging_rls.sql` — conversation insert/update RLS (requires `002_network_ecosystem.sql`)
15. `015_subscription_ecosystem.sql` — subscription tiers, assignments, Stripe mappings, payment events (auto-migrates from JSON store when service role is configured)
16. `016_subscription_stripe_phase4b.sql` — Stripe Price ID map per tier + subscription linkage on assignments
17. `017_email_delivery_log.sql` — email delivery audit log for Resend/console transport
18. `018_notification_preferences_phase4d.sql` — notification preferences RLS + default row bootstrap
19. `019_billing_wallet_phase4e.sql` — wallet bootstrap on signup + admin withdrawal policies
20. `020_billing_escrow_withdrawals_phase4e1.sql` — escrow payment RPC + withdrawal review workflow
21. `021_company_rls_phase5.sql` — company posts/followers/analytics RLS + subscription bootstrap trigger + ATS update policy

## 2. Quick bootstrap (empty project)

If you only need core auth/profile tables immediately, run:

```sql
select vora_ensure_core_schema();
```

This is defined in `012_core_schema_bootstrap_fn.sql`.

## 3. Required environment variables

Set on Vercel (and locally in `.env.local`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin + DB sync |
| `JWT_SECRET` | Legacy OTP/JWT fallback |
| `PASSWORD_PEPPER` | Legacy password hashing pepper |
| `NEXT_PUBLIC_SITE_URL` | Password reset redirect base URL |
| `CRON_SECRET` | Protect cron endpoints |

## 4. Auth redirect URLs

In Supabase Dashboard → Authentication → URL configuration, add:

- Site URL: your production domain (e.g. `https://vora-tau.vercel.app`)
- Redirect URLs:
  - `https://your-domain/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev)

Password reset emails use:

`/auth/callback?next=/auth/reset-password`

## 5. Email

Supabase can send auth emails (signup confirm, password reset) using its built-in mailer.
For product emails (notifications, alerts), configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
The app routes through `src/lib/email/send.ts` with automatic console fallback when keys are absent.
