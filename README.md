# Ozi Cash for Cars

A production-focused Next.js rebuild of the Ozi Cash for Cars website. It keeps all 282 known public routes while replacing the former WordPress snapshot runtime with fast, accessible, statically generated pages.

## What is included

- Responsive, keyboard-accessible page templates and quote forms
- One consistent offer message: up to $19,999, subject to vehicle value
- Indexable service and regional pages, with local suburb URLs consolidated to their regional canonical page
- LocalBusiness, Service, FAQ, BlogPosting and breadcrumb structured data
- Clean sitemap and robots rules
- Permanent redirects for known legacy broken URLs
- Security headers and a same-origin, rate-limited quote endpoint
- No analytics, tracking pixels, reCAPTCHA or legacy WordPress scripts

## Local validation

```bash
npm install
npm run lint
npm test
```

## Quote email setup

The form sends mail through the Resend HTTPS API from the Vercel function. Copy `.env.example` to `.env.local` for local development and set the same values in Vercel Project Settings → Environment Variables.

- `RESEND_API_KEY`: Resend API key
- `QUOTE_FROM_EMAIL`: a sender on a domain verified in Resend, for example `Ozi Quotes <quotes@ozicashforcars.com.au>`
- `QUOTE_TO_EMAIL`: destination inbox; defaults to `contact@ozicashforcars.com.au`

If email is not configured or delivery fails, visitors receive a clear message with the business phone number instead of a false success screen.

## Vercel release checklist

1. Import the repository as a Next.js project.
2. Add the three quote environment variables.
3. Deploy and confirm the deployment is publicly accessible (disable Vercel Authentication for the production domain).
4. Connect `www.ozicashforcars.com.au` and redirect the apex domain to it.
5. Submit `https://www.ozicashforcars.com.au/sitemap.xml` in Google Search Console after DNS cutover.

The included `vercel.json` uses the standard Next.js build with no custom output mode.
