# Ozi Cash for Cars

A production-focused Next.js rebuild of the Ozi Cash for Cars website. It keeps all 282 known public routes while replacing the former WordPress snapshot runtime with fast, accessible, statically generated pages.

## What is included

- Responsive, keyboard-accessible page templates and quote forms
- Distinct service guides without unsupported maximum-offer, one-hour or testimonial claims
- Indexable service and regional pages, with local suburb URLs consolidated to their regional canonical page
- Organization, page-specific WebPage, Service, BlogPosting and breadcrumb structured data
- Clean sitemap and robots rules
- Permanent redirects for known legacy broken URLs
- Security headers and a same-origin quote endpoint with bounded input, durable storage, idempotency and deployment-wide abuse limits
- Non-submitting static quote form with a phone alternative until browser initialization succeeds
- No analytics, tracking pixels, reCAPTCHA or legacy WordPress scripts

## Local validation

```bash
npm ci
npm run lint
npm test
npx playwright install chromium
npm run test:browser
```

## Quote delivery setup

The form sends each lead straight to Resend and reports the outcome to the visitor. There is no database: a send that fails returns the business phone number rather than queueing the lead. A stable browser-generated submission ID is passed to Resend as an idempotency key, so a retried submission does not produce a second email.

Copy `.env.example` to `.env.local` for local development. Keep preview, development and production credentials isolated in Vercel Project Settings.

- `RESEND_API_KEY`: Resend API key
- `QUOTE_FROM_EMAIL`: a sender on a domain verified in Resend, for example `Ozi Quotes <quotes@ozicashforcars.com.au>`
- `RESEND_EMAIL_DOMAIN`: optional verified sender-domain fallback when `QUOTE_FROM_EMAIL` is not set
- `QUOTE_TO_EMAIL`: destination inbox; defaults to `contact@ozicashforcars.com.au`
- `QUOTE_EMAIL_TIMEOUT_MS`: optional provider timeout from 100–8,000 ms; defaults to 8,000 ms
- `QUOTE_CLIENT_RATE_LIMIT`: optional 15-minute per-client budget; defaults to 5
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: optional Google Search Console HTML-tag token; when set, the root layout renders the matching `google-site-verification` meta tag

No lead is stored anywhere in this application. The only copy of a submission is the email in the destination inbox, so mailbox retention is the retention policy.

When Resend cannot accept the message, the visitor is told plainly and given the business phone number; the lead is not retried and is not recoverable from this application. Rate limiting is per function instance and in memory, which deters casual repeat submissions rather than a distributed flood. Add Vercel Firewall in front of `POST /api/quote/` for that.

## Vercel release checklist

1. Import the repository as a Next.js project.
2. Provision a production Resend resource, then add the quote environment variables.
3. Deploy and verify quote submission and provider delivery on a protected preview.
4. Stage and review a Vercel Firewall rule for `POST /api/quote/`; publish it only after observing the log-only rule.
5. Confirm the deployment is publicly accessible (disable Vercel Authentication for the production domain).
6. Connect `www.ozicashforcars.com.au` and redirect the apex domain to it.
7. Submit `https://www.ozicashforcars.com.au/sitemap.xml` in Google Search Console after DNS cutover.

The included `vercel.json` uses the standard Next.js build with no custom output mode.

## Production monitoring and rollback

`POST /api/quote/` writes a structured error log and returns `502`, `503` or `504` when Resend rejects, is unconfigured or times out. Watch those statuses in Vercel runtime logs, and use a dedicated monitoring service if a delivery alert is required.

If quote delivery is unhealthy after release:

1. Check Resend for provider incidents, a suspended account or a sender domain that no longer verifies.
2. Roll back the Vercel application artifact and verify its quote path before directing customers to it.
3. Revert the custom-domain web records to the preserved WordPress host if traffic has already moved.
4. While delivery is down, the phone number on the form is the working path; submissions made during an outage are not recoverable.

Lead retention is now mailbox retention. Confirm the destination inbox's retention policy and deletion-request ownership before production cutover.
