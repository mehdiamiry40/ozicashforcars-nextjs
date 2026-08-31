import { timingSafeEqual } from "node:crypto";
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
      console.error("Quote reconciliation reached terminal delivery failures", result.failed);
    }
    if (result.stateUpdateFailures > 0) {
      console.error("Quote reconciliation could not finalize delivery state", result.stateUpdateFailures);
    }
    return Response.json({ ok: true, ...result }, { headers: NO_STORE_HEADERS });
  } catch {
    console.error("Quote reconciliation failed");
    return Response.json(
      { ok: false, message: "Quote reconciliation failed." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
