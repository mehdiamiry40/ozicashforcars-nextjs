# Launch and operational acceptance

The September 2026 remediation preserves all 282 known URLs and their existing suburb-indexing policy. Code changes do not themselves redirect the public business domain, migrate an external database or prove email/alert receipt.

## Source fixes and checks

- The form uses explicit POST semantics and disabled fields until safe browser initialization. If scripts or identity creation fail, the phone alternative remains visible. This is a phone fallback, not native no-JavaScript online acceptance.
- The importer validates initial and redirect destinations before requests, requires its exact HTTPS origin, rejects credentials, and limits response time, size and redirects.
- All 18 services have authored content. All 37 retained indexable routes are linked from the homepage. Anonymous stars, unsupported maximum-offer/one-hour claims and the guarantee ribbon were removed.
- Informational schema reflects page type; unknown publication/review dates and snapshot-derived sitemap dates are omitted.
- The required CI job is `Validate`. It runs lint, type-check, the integration suite and the browser suite; no database is involved.

## Quote delivery has no database

The application stores nothing. A submission is sent to Resend during the request and the only copy is the email in the destination inbox, so mailbox retention is the retention policy and a deletion request is a mailbox operation.

A failed send is not retried and not recoverable: the visitor is shown the business phone number, and that call is the only remaining path. Verify the sender domain, the destination inbox and a real end-to-end send before cutover, and confirm who watches the inbox during business hours.

## Search migration decision

All 242 suburb URLs retain the existing noindex/regional-canonical policy. Changing this policy needs old landing-page search, link and lead evidence. Export Search Console page-level performance and identify which specific locations deserve distinct content before choosing redirects/indexing. The audit's browser could not verify its administrator policy for Search Console, so access was unavailable; no substitute traffic figures were invented.

Use [the generated migration CSV](launch-url-map.csv) to record each decision and its owner. Regenerate it after a build with `node scripts/export-launch-map.mjs`. Every entry must end in one of: retained with distinct content, redirected to a relevant destination, or intentionally excluded. Keep low-value duplicate pages excluded until a supported content decision is made. Do not treat a 200 response as proof of preserved search visibility.

## Domain cutover and rollback

Observed 5 September 2026: apex `ozicashforcars.com.au` has A `43.250.142.133`; `www` is a CNAME to `ozicashforcars.com.au`. Nameservers are `ns1.syd5.hostingplatform.net.au` and `ns2.syd5.hostingplatform.net.au`; the observed www TTL is 14400 seconds. Recheck records immediately before any change.

After approving the landing-page map and release candidate, add/verify the business domains in Vercel and use the exact account-specific records that Vercel supplies. Retain the observed old web records for rollback. Change only web routing records; preserve existing email and verification records and nameservers unless separately required and reviewed. Verify TLS, www/apex direction, canonical URLs, redirects, robots/sitemap and quote acceptance after cutover. Keep the legacy host available through the rollback period.

For rollback, revert to an older application artifact, restore the reviewed web records if necessary, and confirm the quote form's delivery path works before directing customers to it. DNS propagation is subject to the actual TTL and resolver caches.

## Factual inputs still needed

Confirm actual service/equipment limits and Sunshine Coast coverage; publish only verified business identity/licences and genuine reviews. Database records have 90-day expiration, but provider/mailbox retention and deletion-request ownership must be checked separately. A source change cannot verify these business facts.

GitHub dependency alerts and automated security-fix PRs were enabled and read back successfully during remediation. The private repository's protection/ruleset API returned a plan restriction during the audit; an eligible private-repository plan is needed to enforce the required checks. Do not change repository visibility or purchase a plan as part of routine code fixes.
