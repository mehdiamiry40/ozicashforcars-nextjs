# Launch and operational acceptance

The September 2026 remediation preserves all 282 known URLs and their existing suburb-indexing policy. Code changes do not themselves redirect the public business domain, migrate an external database or prove email/alert receipt.

## Source fixes and checks

- The form uses explicit POST semantics and disabled fields until safe browser initialization. If scripts or identity creation fail, the phone alternative remains visible. This is a phone fallback, not native no-JavaScript online acceptance.
- The importer validates initial and redirect destinations before requests, requires its exact HTTPS origin, rejects credentials, and limits response time, size and redirects.
- All 18 services have authored content. All 37 retained indexable routes are linked from the homepage. Anonymous stars, unsupported maximum-offer/one-hour claims and the guarantee ribbon were removed.
- Informational schema reflects page type; unknown publication/review dates and snapshot-derived sitemap dates are omitted.
- Required CI jobs are `Validate` and `Isolated outbox`. The latter uses a disposable PostgreSQL service without deployment secrets. See [OUTBOX_TESTING.md](OUTBOX_TESTING.md).
- Expiration cleanup binds the current environment. Reapply the repeatable quote migration to deploy the stored-function change; source deployment alone does not update PostgreSQL functions.

## Before database changes

Select the exact production or preview Neon project and branch. Verify the selected connection endpoint and database against that resource in the provider, and retain backup/restore evidence. `NEON_PROJECT_ID` is a configured label; the migration's equality check does not discover the connection's real project. Review both `DATABASE_URL_UNPOOLED` (preferred by migration) and runtime `DATABASE_URL` for the same intended branch. Never infer isolation merely from environment labels.

The changed migration uses `CREATE OR REPLACE` for the acceptance function and preserves existing records; the isolated replay test verifies this with a sentinel. Do not down-migrate or delete retained records during application rollback. The final environment-specific migration remains an explicit release action against a verified resource.

## Read-only health monitor

1. Generate a separate random `QUOTE_MONITOR_SECRET` for production and place the same value in the GitHub repository secret. Use a different value for preview; do not reuse `CRON_SECRET`.
2. Set `QUOTE_MONITOR_ORIGIN` in repository variables to the selected HTTPS production origin. While the main domain still serves WordPress, the current candidate alias is `https://ozicashforcars-nextjs-seven.vercel.app`.
3. Deploy the new health endpoint before enabling the scheduled workflow on main. The hourly schedule is intentionally bounded; it is not a five-minute detection guarantee.
4. Confirm healthy authenticated GET returns 200, invalid authentication returns 401, and a synthetic stale/failed queue in an isolated release environment returns 503 without changing any record or sending mail.
5. Assign the repository owner or an explicit delegate to respond. Verify their GitHub Actions failure-notification settings and one deliberate test failure/recovery. No alert receipt should be claimed from the existence of the workflow or a secret alone.

The endpoint returns aggregate counts, never names, email addresses, phones or vehicle details. It does not prove provider credentials are accepted, mailbox delivery works or cron runs while the queue is empty. Keep provider/receipt and scheduled-execution checks in the release evidence.

## Search migration decision

All 242 suburb URLs retain the existing noindex/regional-canonical policy. Changing this policy needs old landing-page search, link and lead evidence. Export Search Console page-level performance and identify which specific locations deserve distinct content before choosing redirects/indexing. The audit's browser could not verify its administrator policy for Search Console, so access was unavailable; no substitute traffic figures were invented.

Use [the generated migration CSV](launch-url-map.csv) to record each decision and its owner. Regenerate it after a build with `node scripts/export-launch-map.mjs`. Every entry must end in one of: retained with distinct content, redirected to a relevant destination, or intentionally excluded. Keep low-value duplicate pages excluded until a supported content decision is made. Do not treat a 200 response as proof of preserved search visibility.

## Domain cutover and rollback

Observed 5 September 2026: apex `ozicashforcars.com.au` has A `43.250.142.133`; `www` is a CNAME to `ozicashforcars.com.au`. Nameservers are `ns1.syd5.hostingplatform.net.au` and `ns2.syd5.hostingplatform.net.au`; the observed www TTL is 14400 seconds. Recheck records immediately before any change.

After approving the landing-page map and release candidate, add/verify the business domains in Vercel and use the exact account-specific records that Vercel supplies. Retain the observed old web records for rollback. Change only web routing records; preserve existing email and verification records and nameservers unless separately required and reviewed. Verify TLS, www/apex direction, canonical URLs, redirects, robots/sitemap and quote acceptance after cutover. Keep the legacy host available through the rollback period.

For rollback, disable Vercel Cron Jobs before reverting to an older application, preserve Neon records, restore the reviewed web records if necessary, and reconcile unresolved leads under operator control. DNS propagation is subject to the actual TTL and resolver caches.

## Factual inputs still needed

Confirm actual service/equipment limits and Sunshine Coast coverage; publish only verified business identity/licences and genuine reviews. Database records have 90-day expiration, but provider/mailbox retention and deletion-request ownership must be checked separately. A source change cannot verify these business facts.

GitHub dependency alerts and automated security-fix PRs were enabled and read back successfully during remediation. The private repository's protection/ruleset API returned a plan restriction during the audit; an eligible private-repository plan is needed to enforce the required checks. Do not change repository visibility or purchase a plan as part of routine code fixes.
