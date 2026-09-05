const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function allowedUrl(value, origin, base) {
  let url;
  try {
    url = new URL(value, base);
  } catch {
    throw new Error("Rejected malformed snapshot URL");
  }
  if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) {
    throw new Error("Rejected snapshot URL outside the allowed HTTPS origin");
  }
  url.hash = "";
  return url;
}

// Every sitemap, page and asset request uses this boundary. Redirects stay
// manual so a rejected destination is never contacted from the operator host.
export async function fetchSnapshotResource(value, {
  origin,
  userAgent,
  accept = "*/*",
  maxBytes = 5 * 1024 * 1024,
  timeoutMs = 15_000,
  maxRedirects = 5,
  fetchImpl = fetch,
}) {
  const expected = new URL(origin);
  if (expected.protocol !== "https:" || expected.username || expected.password) {
    throw new Error("Snapshot origin must be HTTPS without credentials");
  }
  let url = allowedUrl(value, expected.origin);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const visited = new Set();
  try {
    for (let redirects = 0; ; redirects += 1) {
      if (visited.has(url.href)) throw new Error("Rejected snapshot redirect loop");
      visited.add(url.href);
      const response = await fetchImpl(url.href, {
        headers: { "user-agent": userAgent, accept },
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.url) allowedUrl(response.url, expected.origin);
      if (REDIRECT_STATUSES.has(response.status)) {
        await response.body?.cancel();
        if (redirects >= maxRedirects) throw new Error("Snapshot redirect limit exceeded");
        const location = response.headers.get("location");
        if (!location) throw new Error("Rejected snapshot redirect without a location");
        url = allowedUrl(location, expected.origin, url);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Snapshot request failed with HTTP ${response.status}`);
      }
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw new Error("Snapshot response exceeds the byte limit");
      }
      const chunks = [];
      let total = 0;
      const reader = response.body?.getReader();
      if (reader) {
        try {
          while (true) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            total += chunk.byteLength;
            if (total > maxBytes) {
              await reader.cancel();
              throw new Error("Snapshot response exceeds the byte limit");
            }
            chunks.push(chunk);
          }
        } finally {
          reader.releaseLock();
        }
      }
      return {
        url: url.href,
        body: Buffer.concat(chunks, total),
        contentType: response.headers.get("content-type") ?? "",
      };
    }
  } finally {
    clearTimeout(timer);
  }
}
