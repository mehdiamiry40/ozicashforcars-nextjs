# Ozi Cash for Cars

A production-focused Next.js rebuild of the Ozi Cash for Cars website. It keeps all 282 known public routes while replacing the former WordPress snapshot runtime with fast, accessible, statically generated pages.

## What is included

- Responsive, keyboard-accessible page templates and quote forms
- One consistent offer message: up to $19,999, subject to vehicle value
- Indexable service and regional pages, with local suburb URLs consolidated to their regional canonical page
- LocalBusiness, Service, FAQ, BlogPosting and breadcrumb structured data
- Clean sitemap and robots rules
- Permanent redirects for known legacy broken URLs
- Security headers and a same-origin quote endpoint with bounded input, durable storage, idempotency and deployment-wide abuse limits
- No analytics, tracking pixels, reCAPTCHA or legacy WordPress scripts

## Local validation

```bash
npm install
npm run lint
npm test
```

## Quote delivery setup

The form durably accepts each lead in Neon before sending mail through Resend. A stable browser-generated submission ID prevents duplicate leads and duplicate provider sends. Failed sends stay queued with bounded retries, and the protected reconciliation route processes due work every minute in production.

Copy `.env.example` to `.env.local` for local development. Keep preview, development and production credentials isolated in Vercel Project Settings.

- `DATABASE_URL`: Neon connection string for the current environment
- `RESEND_API_KEY`: Resend API key
- `QUOTE_FROM_EMAIL`: a sender on a domain verified in Resend, for example `Ozi Quotes <quotes@ozicashforcars.com.au>`
- `RESEND_EMAIL_DOMAIN`: optional verified sender-domain fallback when `QUOTE_FROM_EMAIL` is not set
- `QUOTE_TO_EMAIL`: destination inbox; defaults to `contact@ozicashforcars.com.au`
- `QUOTE_EMAIL_TIMEOUT_MS`: optional provider timeout from 100–30,000 ms; defaults to 8,000 ms
- `QUOTE_OUTBOX_ENABLED`: must be `true` on Vercel; hosted requests fail closed when it is disabled
- `QUOTE_RATE_SECRET`: at least 32 random characters, used only to HMAC short-lived rate-limit subjects
- `QUOTE_CLIENT_RATE_LIMIT`, `QUOTE_CONTACT_RATE_LIMIT`, `QUOTE_GLOBAL_RATE_LIMIT`: optional 15-minute budgets; defaults are 5, 5 and 100
- `CRON_SECRET`: strong random bearer secret used by the reconciliation endpoint and Vercel Cron

Apply the schema separately from the build:

```bash
npm run db:migrate:quotes
```

The migration is repeatable. Never run it automatically during `next build`. Quote records expire after 90 days; expired records and old rate buckets are purged by reconciliation. Rate-limit rows store HMAC hashes, not raw client addresses.

When Neon cannot commit a lead, visitors receive a clear unavailable message with the business phone number. Once Neon commits, the visitor receives an honest accepted response even if Resend is temporarily unavailable. Vercel Firewall can be added as an outer abuse prefilter, but the transactional Neon budgets remain authoritative across function instances.

## Vercel release checklist

1. Import the repository as a Next.js project.
2. Provision separate production Neon and Resend resources, then add the quote environment variables.
3. Apply the quote migration to the production database before enabling `QUOTE_OUTBOX_ENABLED`.
4. Deploy and verify quote acceptance, provider delivery and reconciliation on a protected preview.
5. Stage and review a Vercel Firewall rule for `POST /api/quote/`; publish it only after observing the log-only rule.
6. Confirm the deployment is publicly accessible (disable Vercel Authentication for the production domain).
7. Connect `www.ozicashforcars.com.au` and redirect the apex domain to it.
8. Submit `https://www.ozicashforcars.com.au/sitemap.xml` in Google Search Console after DNS cutover.

The included `vercel.json` uses the standard Next.js build with no custom output mode.
