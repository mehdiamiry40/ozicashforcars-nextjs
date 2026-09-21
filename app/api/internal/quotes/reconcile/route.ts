import { timingSafeEqual } from "node:crypto";
import { describeQuoteStoreError } from "../../../../../lib/quotes/diagnostics";
import { reconcileDueQuotes } from "../../../../../lib/quotes/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const NO_STORE_HEADERS = { "cache-control": "no-store" };
const MIN_SECRET_LENGTH = 32;

function configuredSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : "";
}

function authorized(request: Request) {
  const secret = configuredSecret();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const secretBuffer = Buffer.from(secret, "utf8");
  if (!secret || suppliedBuffer.length !== secretBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, secretBuffer);
}

export async function GET(request: Request) {
  if (!configuredSecret()) {
    return Response.json(
      { ok: false, message: "Reconciliation is not configured." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
  if (!authorized(request)) {
    return Response.json(
      { ok: false, message: "Unauthorized." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const result = await reconcileDueQuotes();
    if (result.failed > 0) {
      console.error(JSON.stringify({
        level: "error",
        message: "Quote reconciliation reached terminal delivery failures",
        failed: result.failed,
      }));
    }
    if (result.stateUpdateFailures > 0) {
      console.error(JSON.stringify({
        level: "error",
        message: "Quote reconciliation could not finalize delivery state",
        stateUpdateFailures: result.stateUpdateFailures,
      }));
    }
    if (result.backlog.failed > 0 || result.backlog.expiredLeases > 0) {
      console.error(JSON.stringify({
        level: "error",
        message: "Quote outbox requires operator attention",
        failedBacklog: result.backlog.failed,
        expiredLeases: result.backlog.expiredLeases,
      }));
    }
    const staleBacklog = result.backlog.due > 0 && result.backlog.oldestDueSeconds > 300;
    if (staleBacklog) {
      console.error(JSON.stringify({
        level: "error",
        message: "Quote outbox has a stale due backlog",
        due: result.backlog.due,
        oldestDueSeconds: result.backlog.oldestDueSeconds,
      }));
    }
    const healthy = result.stateUpdateFailures === 0
      && result.backlog.failed === 0
      && result.backlog.expiredLeases === 0
      && !staleBacklog;
    return Response.json(
      { ok: healthy, ...result },
      { status: healthy ? 200 : 503, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "Quote reconciliation failed",
      ...describeQuoteStoreError(error),
    }));
    return Response.json(
      { ok: false, message: "Quote reconciliation failed." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
