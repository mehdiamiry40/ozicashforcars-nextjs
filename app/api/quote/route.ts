import { randomUUID } from "node:crypto";
import { SITE } from "../../site-config";
import { quoteDeliveryConfigured, sendQuoteEmail } from "../../../lib/quotes/delivery";
import {
  acceptAndDeliverQuote,
  QuoteRateLimitError,
  QuoteStoreUnavailableError,
  unavailableQuoteResult,
} from "../../../lib/quotes/service";
import { isQuoteOutboxEnabled } from "../../../lib/quotes/store";

type QuotePayload = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  suburb?: unknown;
  vehicle?: unknown;
  condition?: unknown;
  company?: unknown;
  consent?: unknown;
  sourcePath?: unknown;
  startedAt?: unknown;
  submissionId?: unknown;
};

const requestLog = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const MAX_BODY_BYTES = 25_000;

function isQuotePayload(value: unknown): value is QuotePayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedRequestOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const allowed = new Set([requestUrl.origin, new URL(SITE.url).origin]);
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host"))
    ?.split(",", 1)[0]
    ?.trim();
  const protocol = (request.headers.get("x-forwarded-proto") || requestUrl.protocol)
    .split(",", 1)[0]
    .trim()
    .replace(/:$/, "");
  if (host && (protocol === "http" || protocol === "https")) {
    const forwardedOrigin = normalizeOrigin(`${protocol}://${host}`);
    if (forwardedOrigin) allowed.add(forwardedOrigin);
  }
  return allowed;
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[<>]/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function clientKey(request: Request) {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  requestLog.set(key, recent);
  if (requestLog.size > 5000) requestLog.delete(requestLog.keys().next().value ?? "");
  return false;
}

function response(message: string, status: number, ok = false, headers: HeadersInit = {}) {
  return Response.json(
    { ok, message },
    { status, headers: { "cache-control": "no-store", ...Object.fromEntries(new Headers(headers)) } },
  );
}

async function readLimitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return { text: "", tooLarge: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { text: "", tooLarge: true };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(body), tooLarge: false };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (origin && (!normalizedOrigin || !allowedRequestOrigins(request).has(normalizedOrigin))) {
    return response("This request origin is not allowed.", 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return response("Unsupported request format.", 415);
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return response("The quote request is too large.", 413);
  }
  let payload: QuotePayload;
  try {
    const body = await readLimitedBody(request);
    if (body.tooLarge) return response("The quote request is too large.", 413);
    const parsed: unknown = JSON.parse(body.text);
    if (!isQuotePayload(parsed)) return response("The quote request was not valid.", 400);
    payload = parsed;
  } catch {
    return response("The quote request was not valid.", 400);
  }

  if (clean(payload.company, 100)) return Response.json({ ok: true }, { status: 200 });
  const startedAt = typeof payload.startedAt === "number" ? payload.startedAt : 0;
  if (!startedAt || Date.now() - startedAt < 1500 || Date.now() - startedAt > 2 * 60 * 60 * 1000) {
    return response("Please refresh the page and try again.", 400);
  }

  const quote = {
    name: clean(payload.name, 100),
    phone: clean(payload.phone, 30),
    email: clean(payload.email, 160),
    suburb: clean(payload.suburb, 100),
    vehicle: clean(payload.vehicle, 160),
    condition: clean(payload.condition, 1200),
    sourcePath: clean(payload.sourcePath, 300) || "/",
  };
  if (!quote.name || !quote.phone || !quote.suburb || !quote.vehicle || payload.consent !== "yes") {
    return response("Please complete the required fields and confirm consent.", 400);
  }
  if (!/^[+\d][\d\s()-]{7,29}$/.test(quote.phone)) {
    return response("Please enter a valid phone number.", 400);
  }
  if (quote.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.email)) {
    return response("Please enter a valid email address.", 400);
  }

  const requestedSubmissionId = clean(payload.submissionId, 64);
  if (requestedSubmissionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedSubmissionId)) {
    return response("The quote request reference was not valid.", 400);
  }
  const submissionId = requestedSubmissionId || randomUUID();
  const clientIdentity = clientKey(request);

  if (isQuoteOutboxEnabled()) {
    try {
      const result = await acceptAndDeliverQuote({ ...quote, submissionId }, clientIdentity);
      return response(result.message, result.status, result.ok);
    } catch (error) {
      if (error instanceof QuoteRateLimitError) {
        return response(
          `Too many requests. Please call ${SITE.phoneDisplay}.`,
          429,
          false,
          { "retry-after": String(RATE_WINDOW_MS / 1000) },
        );
      }
      console.error(
        "Durable quote acceptance failed",
        error instanceof QuoteStoreUnavailableError ? "store-unavailable" : "store-error",
      );
      const unavailable = unavailableQuoteResult();
      return response(unavailable.message, unavailable.status, unavailable.ok);
    }
  }

  if (process.env.VERCEL) {
    console.error("Durable quote outbox is not enabled for this Vercel environment");
    const unavailable = unavailableQuoteResult();
    return response(unavailable.message, unavailable.status, unavailable.ok);
  }

  if (rateLimited(clientIdentity)) {
    return response(`Too many requests. Please call ${SITE.phoneDisplay}.`, 429);
  }

  if (!quoteDeliveryConfigured()) {
    console.error("Quote email is not configured: RESEND_API_KEY and QUOTE_FROM_EMAIL are required.");
    return response(`Online quotes are temporarily unavailable. Please call ${SITE.phoneDisplay}.`, 503);
  }

  const delivery = await sendQuoteEmail({
    ...quote,
    environment: "local",
    submissionId,
  });
  if (!delivery.ok) {
    console.error("Quote email delivery failed", delivery.errorCode);
    return response(
      `We could not send the request. Please call ${SITE.phoneDisplay}.`,
      delivery.errorCode === "timeout" ? 504 : 502,
    );
  }

  return response("Your quote request has been sent.", 200, true);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}
