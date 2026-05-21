# Roadmap

## Make the hosted web app safe to expose publicly

> **The problem.** `POST /api/analyze` runs the full pipeline with **no
> authentication**. Every call spends real money: OpenAI transcription, one
> vision call per candidate frame (up to 36), embeddings, and a large
> grammar-compilation call — roughly **$0.05–0.30 per analysis** — plus Vercel
> function compute (300 s Node functions on Active-CPU pricing). A public,
> unauthenticated URL is an open wallet: one bot or one shared link can run
> thousands of analyses overnight.
>
> **Scope.** This only affects the **hosted web deployment**. The CLI and MCP
> server run on the *caller's own* `OPENAI_API_KEY`, so they carry no spend
> exposure and stay free and unrestricted. Everything below is about gating the
> web app.

The goal: gate the hosted app behind **Google OAuth + Stripe subscriptions**
with per-user quotas and hard cost ceilings, so spend is always bounded and
attributable.

---

### Phase 0 — Immediate guardrails (ship before any public link)

Cheap protections that work even before auth exists.

- [ ] Add per-IP rate limiting to `/api/analyze` (e.g. Upstash Redis +
      `@upstash/ratelimit`, or Vercel Firewall rate-limit rules).
- [ ] Add a **global daily spend ceiling** with a kill switch — a counter that,
      once exceeded, makes the route return `503` until reset.
- [ ] Cap the hosted path: reject videos over a max duration, and clamp
      `maxCandidateFrames` / `topK` to conservative values server-side.
- [ ] Enable Vercel BotID / Attack Challenge on the analyze route.
- [ ] Add a cost estimate to the result payload and log per-request spend.

### Phase 1 — Authentication (Google OAuth)

- [ ] Add **Auth.js (NextAuth v5)** with the Google provider
      (`@auth/core` + `next-auth`). Configure the Google OAuth client
      (consent screen, authorized redirect URIs).
- [ ] Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET` to env
      and to Vercel project settings; document them in `.env.example`.
- [ ] Add sign-in / sign-out UI to the masthead; gate the composer behind a
      signed-in session.
- [ ] Reject unauthenticated `POST /api/analyze` with `401`.
- [ ] _Decision:_ Auth.js (no vendor, OSS-friendly) vs. Clerk (faster, native
      Vercel Marketplace integration). Default recommendation: **Auth.js**.

### Phase 2 — Persistence & usage metering

- [ ] Provision a database — **Neon Postgres** via the Vercel Marketplace
      (or Upstash Redis if only counters are needed).
- [ ] Schema: `users`, `analyses` (user, url, cost estimate, created_at),
      `usage` (user, period, count, spend).
- [ ] Record every analysis and its estimated cost.
- [ ] Enforce a **free-tier quota** server-side *before* starting the pipeline
      (e.g. 3 analyses / month); return `402` when exhausted.
- [ ] Surface remaining quota in the UI.

### Phase 3 — Stripe subscriptions

- [ ] Create Stripe products/prices: **Free**, **Pro** (monthly, higher quota),
      and optionally metered pay-as-you-go.
- [ ] Implement **Stripe Checkout** for upgrade and the **Customer Portal** for
      managing/cancelling.
- [ ] Add a `POST /api/stripe/webhook` handler for
      `checkout.session.completed`, `customer.subscription.updated`, and
      `customer.subscription.deleted`; verify the signing secret.
- [ ] Map subscription status → plan → monthly quota; store on the user.
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs to env.

### Phase 4 — Hard cost controls

- [ ] Per-request pre-flight cost estimate; refuse runs that would exceed the
      user's remaining budget.
- [ ] Global **monthly budget cap** with a circuit breaker independent of
      per-user quotas.
- [ ] Spend alerting (email / webhook) at configurable thresholds.
- [ ] Abuse detection: flag rapid repeat URLs and anomalous patterns.

### Phase 5 — Billing UX

- [ ] Pricing page with plan comparison.
- [ ] Account page: current plan, usage this period, manage-billing link.
- [ ] Email receipts and quota-warning notifications.

---

## Open decisions

- **Auth provider** — Auth.js vs. Clerk.
- **Database** — Neon Postgres vs. Upstash Redis (vs. both).
- **Pricing** — free-tier size, Pro price point, and whether to offer metered
  pay-as-you-go.
- **Plan enforcement** — block at quota, or allow overage billing.

## Smaller follow-ups

- [ ] Persisted job history so a completed analysis can be revisited by `id`.
- [ ] Resumable / re-connectable streaming if a client drops mid-run.
- [ ] An OG image for link previews.
- [ ] Tests for the core pipeline and the streaming route.
