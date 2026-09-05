# Isolated outbox verification

Every pull request and main-branch push runs the **Isolated outbox** CI job. It starts an ephemeral PostgreSQL 17 service without deployment or provider secrets, builds the real Next application, applies the checked-in quote migration twice, and runs the durable-delivery suite against a newly created database. A sentinel row verifies that reapplying the migration preserves existing data. Make `Validate` and `Isolated outbox` required branch checks when repository rules are configured.

The suite covers concurrent idempotent acceptance, atomic contact-rate limiting, transient provider failures, competing workers, paced backlog delivery, unhealthy stale and failed queues, cron authentication, transaction rollback, retention isolation and cascade deletion. Email delivery uses the existing Resend mock; no message is sent.

## Run locally

Use a disposable local PostgreSQL 17 server with a `quote_ci` user that can create databases. With Docker:

```sh
docker run --rm --name ozi-quote-tests -e POSTGRES_USER=quote_ci -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=postgres -p 127.0.0.1:55432:5432 postgres:17
```

In a separate terminal, after PostgreSQL reports that it is ready:

```sh
env -u DATABASE_URL -u DATABASE_URL_UNPOOLED -u NEON_PROJECT_ID OUTBOX_TEST_POSTGRES_URL=postgresql://quote_ci:local-test-only@127.0.0.1:55432/postgres npm run test:outbox
```

If the current source has already been built, use `npm run test:outbox:integration`. Stop the disposable server after the run. No `.env.local` file is loaded by the runner. Ordinary database configuration, non-loopback hosts, application database names and connection-query overrides are rejected before any connection. Each run creates a random `outbox_test_*` database and drops that same database in cleanup.

## What this verifies

The application continues to use its production Neon HTTP driver. A test-only preload directs its synthetic `outbox.test` connection to a loopback HTTP bridge. The bridge forwards the original SQL and parameters to real PostgreSQL through `pg`; it does not implement quote acceptance, rate limits, locks or delivery state in JavaScript. Batch requests run on one PostgreSQL connection inside a transaction, including rollback on failure. Concurrent requests use separate pooled connections, so database constraints, advisory locks and worker claims are exercised. The preload rejects external network fetches; Resend requests are intercepted by the existing mock before reaching it.

This validates SQL behavior and the application/driver boundary. It does not establish live Neon connectivity, deployment credentials, Resend deliverability or the natural production cron schedule; those need separate deployment verification.

## Retention migration

The acceptance function in `migrations/001_quote_outbox.sql` now deletes expired rate buckets only for its supplied environment. Reapply the guarded migration to an explicitly selected deployment database before considering this change live. The migration replaces the function without deleting retained leads, rate buckets, attempts or leases. The runtime reconciler likewise scopes expired lead and bucket deletion to its active environment. This repository change and the isolated suite do not migrate any external database.
