# VORA

Production-ready dual-platform ecosystem: **VORA Network** (professional networking & jobs) and **VORA Freelance** (micro-services marketplace).

## Architecture

- **Unified account** — one login for both platforms
- **Separated data** — professional profiles and freelancer stores are independent databases/views
- **Cross-platform links** — "Visit Store" on professional profiles, "Professional Profile" on freelancer stores
- **Adaptive theming** — LinkedIn-inspired Network UI / Khamsat-inspired Freelance UI
- **Permission tiers** — Visitor → Basic → Professional (unlocked via profile completion)
- **Professional Score** — 0–100% gamified completion algorithm

## Quick Start

### 1. Install Node.js (if not installed)

```bash
winget install OpenJS.NodeJS.LTS
```

### 2. Install dependencies

```bash
cd C:\Users\Microsoft\Projects\vora
npm install
```

### 3. Configure Supabase

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials.

Run the migration in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL Editor or CLI.

### 4. Official logo

The official VORA wordmark lives at `public/brand/vora-logo.png` (329×126). All UI branding is rendered via `VoraLogo` — do not redesign or replace with unofficial assets.

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production operations (Phase 9)

Phase 9 adds production-ready billing (simulation mode valid for soft launch), Twilio/Resend delivery, Vercel cron jobs, Sentry monitoring, Redis caching, and consolidated launch diagnostics. Before deploying, follow the [Production Launch Checklist](docs/PRODUCTION_LAUNCH_CHECKLIST.md). Owner-only readiness: `GET /api/admin/launch/readiness`.

## Permission Matrix

| Action | Visitor | Basic | Professional |
|--------|---------|-------|--------------|
| Browse freelance | ✅ | ✅ | ✅ |
| Buy services | ❌ | ✅ | ✅ |
| Create store / list services | ❌ | ✅ | ✅ |
| Message sellers | ❌ | ✅ | ✅ |
| Apply for jobs | ❌ | ❌ | ✅ |
| Network messaging | ❌ | ❌ | ✅ |
| Engage content (like/comment) | ❌ | ❌ | ✅ |
| View limit | 3 profiles/jobs | Unlimited | Unlimited |

## Professional Score Weights

| Module | Weight |
|--------|--------|
| Profile Photo | 10% |
| Cover Image | 10% |
| Headline & About | 15% |
| Experience (≥1 verified) | 20% |
| Education (≥1 verified) | 15% |
| Skills (≥3) or Certifications | 10% |
| Resume (PDF) | 10% |
| Video Introduction | 10% |

**Unlock threshold:** 70% + all core required fields for full Network access.

**Job apply guardrail:** Score ≥ 70% AND uploaded resume required.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── brand/              # VORA logo
│   ├── landing/            # Dual-hero landing page
│   ├── navigation/         # Dual Dashboard Toggle
│   ├── permissions/        # Visitor limit modal
│   └── professional/       # Score ring, apply guard
├── hooks/                  # useGuardedAction, useJobApplyGuard
├── lib/
│   ├── permissions/        # Access control logic
│   ├── professional-score/ # Score calculator
│   ├── supabase/           # Supabase clients
│   └── themes/             # Platform theme tokens
└── providers/              # Platform & permissions context
```
