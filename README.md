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

The form durably accepts each lead in Neon before sending mail through Resend. A stable browser-generated submission ID prevents duplicate leads and duplicate provider sends. Failed sends stay queued with bounded retries, and the protected reconciliation route processes a paced batch of due work every minute in production.

Copy `.env.example` to `.env.local` for local development. Keep preview, development and production credentials isolated in Vercel Project Settings.

- `DATABASE_URL`: Neon connection string for the current environment
- `RESEND_API_KEY`: Resend API key
- `QUOTE_FROM_EMAIL`: a sender on a domain verified in Resend, for example `Ozi Quotes <quotes@ozicashforcars.com.au>`
- `RESEND_EMAIL_DOMAIN`: optional verified sender-domain fallback when `QUOTE_FROM_EMAIL` is not set
- `QUOTE_TO_EMAIL`: destination inbox; defaults to `contact@ozicashforcars.com.au`
- `QUOTE_EMAIL_TIMEOUT_MS`: optional provider timeout from 100–8,000 ms; defaults to 8,000 ms
- `QUOTE_OUTBOX_ENABLED`: must be `true` on Vercel; hosted requests fail closed when it is disabled
- `QUOTE_RATE_SECRET`: at least 32 random characters, used only to HMAC short-lived rate-limit subjects
- `QUOTE_CLIENT_RATE_LIMIT`, `QUOTE_CONTACT_RATE_LIMIT`, `QUOTE_GLOBAL_RATE_LIMIT`: optional 15-minute budgets; defaults are 5, 5 and 100
- `CRON_SECRET`: strong random bearer secret used by the reconciliation endpoint and Vercel Cron

Apply the schema separately from the build:

```bash
MIGRATION_EXPECTED_NEON_PROJECT_ID=replace_with_reviewed_project_id npm run db:migrate:quotes
```

The migration is repeatable. Never run it automatically during `next build`. For production, pull credentials to an isolated temporary file and set `MIGRATION_EXPECTED_NEON_PROJECT_ID` to the reviewed production project ID; the migration refuses a mismatch. Quote records expire after 90 days; expired records and old rate buckets are purged by reconciliation. Rate-limit rows store HMAC hashes, not raw client addresses.

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

## Production monitoring and rollback

The reconciliation route returns `503` and writes a structured error log whenever a terminal lead or expired delivery lease requires operator attention. Connect a production error-monitoring integration or log drain and assign an owner before launch; runtime logs alone are not a notification channel.

If the quote pipeline is unhealthy after release:

1. In Vercel Project Settings → Cron Jobs, click **Disable Cron Jobs** before an Instant Rollback and verify the job is disabled; rollback does not update active cron jobs.
2. Keep the Neon database and its records intact; do not down-migrate or delete the resource.
3. Revert the custom-domain web records to the preserved WordPress host if traffic has already moved.
4. Roll back the Vercel application artifact and verify whether its quote path is usable before directing customers to it.
5. Inspect `accepted`, expired `sending` and `failed` leads, then process or requeue them under operator control.
6. Re-enable reconciliation only after the replacement delivery path is verified.

The proposed lead-retention period is 90 days. Confirm that policy, mailbox retention and deletion-request ownership before production cutover.
