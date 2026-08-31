const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  if (url !== "https://api.resend.com/emails") return originalFetch(input, init);

  const payload = JSON.parse(String(init.body ?? "{}"));
  const subject = typeof payload.subject === "string" ? payload.subject : "";

  if (subject.includes("[provider-error]")) {
    return Response.json({ message: "provider detail must not reach the visitor" }, { status: 500 });
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
