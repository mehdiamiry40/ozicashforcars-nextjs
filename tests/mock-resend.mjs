import { appendFileSync } from "node:fs";

const originalFetch = globalThis.fetch;
const attemptsByKey = new Map();
// Set only by a test that needs to read what the operator would receive; the
// mock stays silent when the path is absent.
const deliveredLog = process.env.QUOTE_TEST_DELIVERED_FILE?.trim();

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  if (url !== "https://api.resend.com/emails") return originalFetch(input, init);

  const payload = JSON.parse(String(init.body ?? "{}"));
  const subject = typeof payload.subject === "string" ? payload.subject : "";
  const idempotencyKey = new Headers(init.headers).get("Idempotency-Key");
  if (!idempotencyKey?.startsWith("quote/")) {
    return Response.json({ message: "missing idempotency key" }, { status: 400 });
  }
  if (deliveredLog) appendFileSync(deliveredLog, `${JSON.stringify(payload)}\n`);
  const attempt = (attemptsByKey.get(idempotencyKey) || 0) + 1;
  attemptsByKey.set(idempotencyKey, attempt);

  if (subject.includes("[provider-error]")) {
    return Response.json({ message: "provider detail must not reach the visitor" }, { status: 500 });
  }
  if (subject.includes("[invalid-response]")) {
    return Response.json({ accepted: true }, { status: 200 });
  }
  if (subject.includes("[fail-once]") && attempt === 1) {
    return Response.json({ message: "simulated transient failure" }, { status: 503 });
  }
  if (subject.includes("[transport-error]")) {
    throw new Error("simulated provider transport failure");
  }
  if (subject.includes("[slow-success]")) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(Response.json({ id: "mock-email-id" })), 150);
      init.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(init.signal.reason);
        },
        { once: true },
      );
    });
  }
  if (subject.includes("[timeout]")) {
    return new Promise((_, reject) => {
      const signal = init.signal;
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  }

  return Response.json({ id: "mock-email-id" }, { status: 200 });
};
