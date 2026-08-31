import { createHash, createHmac } from "node:crypto";
import { SITE } from "../../app/site-config";
import { sendQuoteEmail } from "./delivery";
import {
  acceptQuoteLead,
  claimDueQuoteLeads,
  claimQuoteLead,
  isQuoteOutboxEnabled,
  markQuoteDeliveryFailed,
  markQuoteSent,
  purgeExpiredQuoteData,
  quoteEnvironment,
  QuoteRateLimitError,
  QuoteStoreUnavailableError,
  type QuoteLeadInput,
  type StoredQuoteLead,
} from "./store";

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RETENTION_DAYS = 90;
const CONSENT_VERSION = "quote-contact-v1";

export type QuoteInput = {
  submissionId: string;
  name: string;
  phone: string;
  email: string;
  suburb: string;
  vehicle: string;
  condition: string;
  sourcePath: string;
};

export type QuoteSubmissionResult = {
  ok: boolean;
  status: number;
  message: string;
  queued?: boolean;
  retryAfter?: number;
};

function boundedLimit(name: string, fallback: number, maximum: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(1, Math.trunc(parsed))) : fallback;
}

function normalizedContact(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0061")) digits = digits.slice(2);
  if (/^0\d{9}$/.test(digits)) digits = `61${digits.slice(1)}`;
  return digits;
}

function rateHash(secret: string, scope: string, value: string) {
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

function payloadFingerprint(quote: QuoteInput) {
  return createHash("sha256")
    .update(JSON.stringify({
      name: quote.name,
      phone: quote.phone,
      email: quote.email,
      suburb: quote.suburb,
      vehicle: quote.vehicle,
      condition: quote.condition,
      sourcePath: quote.sourcePath,
    }))
    .digest("hex");
}

function acceptedMessage() {
  return "Your quote request has been saved. We will contact you shortly.";
}

async function deliverClaimedLead(lead: StoredQuoteLead) {
  const delivery = await sendQuoteEmail(lead);
  try {
    if (delivery.ok) {
      const updated = await markQuoteSent(lead, delivery.providerMessageId);
      if (!updated) {
        console.error("Quote delivery state update was rejected", "sent", lead.submissionId);
        return { sent: false, terminal: false, stateUpdated: false };
      }
      return { sent: true, terminal: false, stateUpdated: true };
    }
    const failure = await markQuoteDeliveryFailed(lead, delivery.errorCode, delivery.providerStatus);
    if (!failure.updated) {
      console.error("Quote delivery state update was rejected", "failed", lead.submissionId);
      return { sent: false, terminal: false, stateUpdated: false };
    }
    return { sent: false, terminal: failure.terminal, stateUpdated: true };
  } catch {
    console.error("Quote delivery state update failed", lead.submissionId);
    return { sent: false, terminal: false, stateUpdated: false };
  }
}

export async function acceptAndDeliverQuote(
  quote: QuoteInput,
  clientIdentity: string,
): Promise<QuoteSubmissionResult> {
  if (!isQuoteOutboxEnabled()) {
    throw new QuoteStoreUnavailableError("The durable quote outbox is disabled");
  }
  const rateSecret = process.env.QUOTE_RATE_SECRET?.trim();
  if (!rateSecret || rateSecret.length < 32) {
    throw new QuoteStoreUnavailableError("QUOTE_RATE_SECRET must contain at least 32 characters");
  }

  const environment = quoteEnvironment();
  const now = new Date();
  const windowStartMs = Math.floor(now.getTime() / RATE_WINDOW_MS) * RATE_WINDOW_MS;
  const windowStart = new Date(windowStartMs);
  const windowExpiresAt = new Date(windowStartMs + RATE_WINDOW_MS);
  const lead: QuoteLeadInput = {
    ...quote,
    environment,
    payloadFingerprint: payloadFingerprint(quote),
    consentVersion: CONSENT_VERSION,
    consentedAt: now,
    retentionUntil: new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
  };

  const result = await acceptQuoteLead(lead, {
    clientHash: rateHash(rateSecret, "client", clientIdentity),
    contactHash: rateHash(rateSecret, "contact", normalizedContact(quote.phone)),
    globalHash: rateHash(rateSecret, "global", environment),
    windowStart,
    windowExpiresAt,
    clientLimit: boundedLimit("QUOTE_CLIENT_RATE_LIMIT", 5, 100),
    contactLimit: boundedLimit("QUOTE_CONTACT_RATE_LIMIT", 5, 100),
    globalLimit: boundedLimit("QUOTE_GLOBAL_RATE_LIMIT", 100, 10_000),
  });

  if (result.outcome === "conflict") {
    return { ok: false, status: 409, message: "This quote reference was already used. Please submit again." };
  }
  if (result.status === "sent") {
    return { ok: true, status: 200, message: "Your quote request has already been sent." };
  }
  if (result.status === "failed") {
    return {
      ok: false,
      status: 409,
      message: `We could not deliver this saved request. Please submit again or call ${SITE.phoneDisplay}.`,
    };
  }

  const claimed = await claimQuoteLead(environment, quote.submissionId);
  if (!claimed) return { ok: true, status: 202, message: acceptedMessage(), queued: true };
  const delivery = await deliverClaimedLead(claimed);
  return delivery.sent
    ? { ok: true, status: 200, message: "Your quote request has been sent." }
    : { ok: true, status: 202, message: acceptedMessage(), queued: true };
}

export async function reconcileDueQuotes(limit = 25) {
  if (!isQuoteOutboxEnabled()) throw new QuoteStoreUnavailableError("The durable quote outbox is disabled");
  const environment = quoteEnvironment();
  const leads = await claimDueQuoteLeads(environment, limit);
  const outcomes = await Promise.all(leads.map(deliverClaimedLead));
  const purged = await purgeExpiredQuoteData();
  return {
    claimed: leads.length,
    sent: outcomes.filter((outcome) => outcome.sent).length,
    retrying: outcomes.filter((outcome) => outcome.stateUpdated && !outcome.sent && !outcome.terminal).length,
    failed: outcomes.filter((outcome) => outcome.terminal).length,
    stateUpdateFailures: outcomes.filter((outcome) => !outcome.stateUpdated).length,
    purged,
  };
}

export { QuoteRateLimitError, QuoteStoreUnavailableError };

export function unavailableQuoteResult(): QuoteSubmissionResult {
  return {
    ok: false,
    status: 503,
    message: `Online quotes are temporarily unavailable. Please call ${SITE.phoneDisplay}.`,
  };
}
