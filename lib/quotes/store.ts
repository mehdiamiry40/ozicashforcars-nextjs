import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_LEASE_SECONDS = 120;
const WORKER_LEASE_SECONDS = 70;
const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600, 7200] as const;

type Sql = ReturnType<typeof neon>;

let quoteSql: Sql | null = null;

export type QuoteLeadInput = {
  environment: string;
  submissionId: string;
  payloadFingerprint: string;
  name: string;
  phone: string;
  email: string;
  suburb: string;
  vehicle: string;
  condition: string;
  sourcePath: string;
  consentVersion: string;
  consentedAt: Date;
  retentionUntil: Date;
};

export type RateLimitInput = {
  clientHash: string;
  contactHash: string;
  globalHash: string;
  windowStart: Date;
  windowExpiresAt: Date;
  clientLimit: number;
  contactLimit: number;
  globalLimit: number;
};

export type StoredQuoteLead = {
  environment: string;
  submissionId: string;
  name: string;
  phone: string;
  email: string;
  suburb: string;
  vehicle: string;
  condition: string;
  sourcePath: string;
  attemptCount: number;
  leaseToken: string;
};

export type AcceptQuoteResult = {
  outcome: "accepted" | "existing" | "conflict";
  status: "accepted" | "sending" | "sent" | "failed";
};

export class QuoteStoreUnavailableError extends Error {
  constructor(message = "Quote storage is unavailable") {
    super(message);
    this.name = "QuoteStoreUnavailableError";
  }
}

export class QuoteRateLimitError extends Error {
  constructor(readonly scope: string) {
    super("Quote rate limit exceeded");
    this.name = "QuoteRateLimitError";
  }
}

export function isQuoteOutboxEnabled() {
  return process.env.QUOTE_OUTBOX_ENABLED?.trim().toLowerCase() === "true";
}

export function quoteEnvironment() {
  return process.env.VERCEL_ENV?.trim() || "development";
}

function getQuoteSql() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new QuoteStoreUnavailableError("DATABASE_URL is required");
  if (!quoteSql) quoteSql = neon(databaseUrl);
  return quoteSql;
}

function parseStoredLead(row: Record<string, unknown>): StoredQuoteLead {
  return {
    environment: String(row.environment),
    submissionId: String(row.submission_id),
    name: String(row.name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : "",
    suburb: String(row.suburb),
    vehicle: String(row.vehicle),
    condition: row.vehicle_condition ? String(row.vehicle_condition) : "",
    sourcePath: String(row.source_path),
    attemptCount: Number(row.attempt_count),
    leaseToken: String(row.lease_token),
  };
}

export async function acceptQuoteLead(
  lead: QuoteLeadInput,
  limits: RateLimitInput,
): Promise<AcceptQuoteResult> {
  const sql = getQuoteSql();
  try {
    const rows = (await sql`
      SELECT result_outcome, result_status
      FROM accept_quote_lead(
        ${lead.environment},
        ${lead.submissionId}::uuid,
        ${lead.payloadFingerprint},
        ${lead.name},
        ${lead.phone},
        ${lead.email},
        ${lead.suburb},
        ${lead.vehicle},
        ${lead.condition},
        ${lead.sourcePath},
        ${lead.consentVersion},
        ${lead.consentedAt.toISOString()}::timestamptz,
        ${lead.retentionUntil.toISOString()}::timestamptz,
        ${limits.clientHash},
        ${limits.contactHash},
        ${limits.globalHash},
        ${limits.windowStart.toISOString()}::timestamptz,
        ${limits.windowExpiresAt.toISOString()}::timestamptz,
        ${limits.clientLimit},
        ${limits.contactLimit},
        ${limits.globalLimit}
      )
    `) as Record<string, unknown>[];
    const row = rows[0];
    if (!row) throw new QuoteStoreUnavailableError("Quote acceptance returned no result");
    return {
      outcome: String(row.result_outcome) as AcceptQuoteResult["outcome"],
      status: String(row.result_status) as AcceptQuoteResult["status"],
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("quote_rate_limited:")) {
      throw new QuoteRateLimitError(error.message.split("quote_rate_limited:")[1]?.split(/\s/)[0] || "unknown");
    }
    throw error;
  }
}

export async function claimQuoteLead(environment: string, submissionId: string) {
  const sql = getQuoteSql();
  const leaseToken = randomUUID();
  const rows = (await sql`
    WITH claimed AS (
      UPDATE quote_lead
         SET status = 'sending',
             attempt_count = attempt_count + 1,
             lease_token = ${leaseToken}::uuid,
             lease_until = now() + (${DELIVERY_LEASE_SECONDS} * interval '1 second'),
             last_attempt_at = now(),
             updated_at = now()
       WHERE environment = ${environment}
         AND submission_id = ${submissionId}::uuid
         AND attempt_count < ${MAX_DELIVERY_ATTEMPTS}
         AND (
           (status = 'accepted' AND next_attempt_at <= now())
           OR (status = 'sending' AND lease_until < now())
         )
      RETURNING *
    ), recorded AS (
      INSERT INTO quote_delivery_attempt (environment, submission_id, attempt_no, outcome)
      SELECT environment, submission_id, attempt_count, 'started' FROM claimed
      ON CONFLICT (environment, submission_id, attempt_no) DO NOTHING
    )
    SELECT * FROM claimed
  `) as Record<string, unknown>[];
  const row = rows[0];
  return row ? parseStoredLead(row) : null;
}

export async function claimDueQuoteLeads(environment: string, limit = 10) {
  const sql = getQuoteSql();
  const boundedLimit = Math.min(25, Math.max(1, Math.trunc(limit)));
  const rows = (await sql`
    WITH due AS (
      SELECT environment, submission_id
        FROM quote_lead
       WHERE environment = ${environment}
         AND attempt_count < ${MAX_DELIVERY_ATTEMPTS}
         AND (
           (status = 'accepted' AND next_attempt_at <= now())
           OR (status = 'sending' AND lease_until < now())
         )
       ORDER BY created_at
       LIMIT ${boundedLimit}
       FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE quote_lead AS lead
         SET status = 'sending',
             attempt_count = lead.attempt_count + 1,
             lease_token = gen_random_uuid(),
             lease_until = now() + (${DELIVERY_LEASE_SECONDS} * interval '1 second'),
             last_attempt_at = now(),
             updated_at = now()
        FROM due
       WHERE lead.environment = due.environment
         AND lead.submission_id = due.submission_id
      RETURNING lead.*
    ), recorded AS (
      INSERT INTO quote_delivery_attempt (environment, submission_id, attempt_no, outcome)
      SELECT environment, submission_id, attempt_count, 'started' FROM claimed
      ON CONFLICT (environment, submission_id, attempt_no) DO NOTHING
    )
    SELECT * FROM claimed
  `) as Record<string, unknown>[];
  return rows.map(parseStoredLead);
}

export async function acquireQuoteWorkerLease(environment: string) {
  const sql = getQuoteSql();
  const leaseToken = randomUUID();
  const rows = (await sql`
    INSERT INTO quote_worker_lease (environment, lease_token, lease_until)
    VALUES (
      ${environment},
      ${leaseToken}::uuid,
      now() + (${WORKER_LEASE_SECONDS} * interval '1 second')
    )
    ON CONFLICT (environment)
    DO UPDATE SET
      lease_token = EXCLUDED.lease_token,
      lease_until = EXCLUDED.lease_until,
      updated_at = now()
    WHERE quote_worker_lease.lease_until < now()
    RETURNING lease_token
  `) as Record<string, unknown>[];
  return rows.length === 1 ? leaseToken : null;
}

export async function releaseQuoteWorkerLease(environment: string, leaseToken: string) {
  const sql = getQuoteSql();
  const rows = (await sql`
    DELETE FROM quote_worker_lease
     WHERE environment = ${environment}
       AND lease_token = ${leaseToken}::uuid
    RETURNING lease_token
  `) as Record<string, unknown>[];
  return rows.length === 1;
}

export async function markQuoteSent(lead: StoredQuoteLead, providerMessageId: string) {
  const sql = getQuoteSql();
  const rows = (await sql`
    WITH updated AS (
      UPDATE quote_lead
         SET status = 'sent',
             provider_message_id = ${providerMessageId},
             last_error_code = NULL,
             lease_token = NULL,
             lease_until = NULL,
             sent_at = now(),
             updated_at = now()
       WHERE environment = ${lead.environment}
         AND submission_id = ${lead.submissionId}::uuid
         AND lease_token = ${lead.leaseToken}::uuid
      RETURNING environment, submission_id, attempt_count
    )
    UPDATE quote_delivery_attempt AS attempt
       SET outcome = 'sent', finished_at = now()
      FROM updated
     WHERE attempt.environment = updated.environment
       AND attempt.submission_id = updated.submission_id
       AND attempt.attempt_no = updated.attempt_count
    RETURNING attempt.attempt_no
  `) as Record<string, unknown>[];
  return rows.length === 1;
}

export async function markQuoteDeliveryFailed(
  lead: StoredQuoteLead,
  errorCode: string,
  providerStatus?: number,
) {
  const sql = getQuoteSql();
  const terminal = lead.attemptCount >= MAX_DELIVERY_ATTEMPTS;
  const delay = RETRY_DELAYS_SECONDS[Math.min(lead.attemptCount - 1, RETRY_DELAYS_SECONDS.length - 1)];
  const rows = (await sql`
    WITH updated AS (
      UPDATE quote_lead
         SET status = ${terminal ? "failed" : "accepted"},
             next_attempt_at = now() + (${delay} * interval '1 second'),
             last_error_code = ${errorCode.slice(0, 80)},
             lease_token = NULL,
             lease_until = NULL,
             updated_at = now()
       WHERE environment = ${lead.environment}
         AND submission_id = ${lead.submissionId}::uuid
         AND lease_token = ${lead.leaseToken}::uuid
      RETURNING environment, submission_id, attempt_count
    )
    UPDATE quote_delivery_attempt AS attempt
       SET outcome = ${terminal ? "failed_terminal" : "retry_scheduled"},
           provider_status = ${providerStatus ?? null},
           error_code = ${errorCode.slice(0, 80)},
           finished_at = now()
      FROM updated
     WHERE attempt.environment = updated.environment
       AND attempt.submission_id = updated.submission_id
       AND attempt.attempt_no = updated.attempt_count
    RETURNING attempt.attempt_no
  `) as Record<string, unknown>[];
  return { updated: rows.length === 1, terminal };
}

export async function purgeExpiredQuoteData() {
  const sql = getQuoteSql();
  const [leadRows, bucketRows] = (await sql.transaction((tx) => [
    tx`DELETE FROM quote_lead WHERE expires_at < now() RETURNING submission_id`,
    tx`DELETE FROM quote_rate_bucket WHERE expires_at < now() - interval '1 day' RETURNING subject_hash`,
  ])) as Record<string, unknown>[][];
  return { leads: leadRows.length, buckets: bucketRows.length };
}

export async function getQuoteQueueHealth(environment: string) {
  const sql = getQuoteSql();
  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE status = 'failed')::int AS failed,
      count(*) FILTER (WHERE status = 'accepted' AND next_attempt_at <= now())::int AS due,
      count(*) FILTER (WHERE status = 'sending' AND lease_until < now())::int AS expired_leases,
      COALESCE(
        EXTRACT(EPOCH FROM now() - (min(next_attempt_at) FILTER (
          WHERE status = 'accepted' AND next_attempt_at <= now()
        ))),
        0
      )::int AS oldest_due_seconds
      FROM quote_lead
     WHERE environment = ${environment}
  `) as Record<string, unknown>[];
  const row = rows[0] ?? {};
  return {
    failed: Number(row.failed ?? 0),
    due: Number(row.due ?? 0),
    expiredLeases: Number(row.expired_leases ?? 0),
    oldestDueSeconds: Number(row.oldest_due_seconds ?? 0),
  };
}
