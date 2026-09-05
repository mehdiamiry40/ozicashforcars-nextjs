import { timingSafeEqual } from "node:crypto";
import { quoteDeliveryConfigured } from "../../../../../lib/quotes/delivery";
import { getQuoteQueueHealth, isQuoteOutboxEnabled, quoteEnvironment } from "../../../../../lib/quotes/store";

export const dynamic = "force-dynamic";
export const maxDuration = 15;
const NO_STORE = { "cache-control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.QUOTE_MONITOR_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    return Response.json({ ok: false, message: "Quote monitoring is not configured." }, { status: 503, headers: NO_STORE });
  }
  const supplied = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ ok: false, message: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  if (!isQuoteOutboxEnabled() || !quoteDeliveryConfigured()
    || (process.env.QUOTE_RATE_SECRET?.trim().length ?? 0) < 32
    || (process.env.CRON_SECRET?.trim().length ?? 0) < 32) {
    return Response.json({ ok: false, message: "The quote pipeline is not configured." }, { status: 503, headers: NO_STORE });
  }
  try {
    // Monitoring must never deliver, claim, modify or purge customer records.
    const queue = await getQuoteQueueHealth(quoteEnvironment());
    const ok = queue.failed === 0 && queue.expiredLeases === 0
      && !(queue.due > 0 && queue.oldestDueSeconds > 300);
    return Response.json({ ok, queue }, { status: ok ? 200 : 503, headers: NO_STORE });
  } catch {
    console.error(JSON.stringify({ level: "error", message: "Quote health check could not read the queue" }));
    return Response.json({ ok: false, message: "Quote health is unavailable." }, { status: 503, headers: NO_STORE });
  }
}
