import { SITE } from "../../app/site-config";
import type { StoredQuoteLead } from "./store";

const DEFAULT_EMAIL_TIMEOUT_MS = 8_000;
const MIN_EMAIL_TIMEOUT_MS = 100;
const MAX_EMAIL_TIMEOUT_MS = 8_000;

export type QuoteDeliveryResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; errorCode: string; providerStatus?: number };

type QuoteEmailLead = Pick<
  StoredQuoteLead,
  | "environment"
  | "submissionId"
  | "name"
  | "phone"
  | "email"
  | "suburb"
  | "vehicle"
  | "condition"
  | "expectedPrice"
  | "sourcePath"
>;

function emailTimeoutMs() {
  const raw = process.env.QUOTE_EMAIL_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_EMAIL_TIMEOUT_MS;
  const configured = Number(raw);
  if (!Number.isFinite(configured)) return DEFAULT_EMAIL_TIMEOUT_MS;
  return Math.min(MAX_EMAIL_TIMEOUT_MS, Math.max(MIN_EMAIL_TIMEOUT_MS, Math.trunc(configured)));
}

function senderAddress() {
  const configured = process.env.QUOTE_FROM_EMAIL?.trim();
  if (configured) return configured;
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim();
  return domain && /^[a-z0-9.-]+$/i.test(domain) ? `Ozi Quotes <quotes@${domain}>` : "";
}

function formatExpectedPrice(value: string) {
  const amount = Number(value);
  if (!value || !Number.isFinite(amount)) return "Not provided";
  // A cents amount must reach the operator as "A$3,500.50", never "A$3,500.5".
  return `A$${amount.toLocaleString("en-AU", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export function quoteDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && senderAddress());
}

export async function sendQuoteEmail(lead: QuoteEmailLead): Promise<QuoteDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = senderAddress();
  const to = process.env.QUOTE_TO_EMAIL?.trim() || SITE.email;
  if (!apiKey || !from) return { ok: false, errorCode: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "Idempotency-Key": `quote/${lead.environment}/${lead.submissionId}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email || undefined,
        subject: `Vehicle quote: ${lead.vehicle} — ${lead.suburb}`,
        text: [
          `Name: ${lead.name}`,
          `Phone: ${lead.phone}`,
          `Email: ${lead.email || "Not provided"}`,
          `Suburb: ${lead.suburb}`,
          `Vehicle: ${lead.vehicle}`,
          `Condition: ${lead.condition || "Not provided"}`,
          `Expected price: ${formatExpectedPrice(lead.expectedPrice)}`,
          `Source: ${lead.sourcePath}`,
          `Reference: ${lead.submissionId}`,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(emailTimeoutMs()),
    });

    if (!response.ok) {
      return { ok: false, errorCode: `provider_${response.status}`, providerStatus: response.status };
    }

    const body: unknown = await response.json().catch(() => null);
    const providerMessageId =
      typeof body === "object" && body !== null && !Array.isArray(body) && typeof (body as Record<string, unknown>).id === "string"
        ? String((body as Record<string, unknown>).id).trim()
        : "";
    if (!providerMessageId) {
      return { ok: false, errorCode: "provider_invalid_response" };
    }
    return { ok: true, providerMessageId };
  } catch (error) {
    return { ok: false, errorCode: isTimeoutError(error) ? "timeout" : "transport_error" };
  }
}
