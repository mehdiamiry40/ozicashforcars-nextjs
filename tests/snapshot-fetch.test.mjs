import assert from "node:assert/strict";
import test from "node:test";
import { fetchSnapshotResource } from "../scripts/snapshot-fetch.mjs";

const origin = "https://www.ozicashforcars.com.au";
const options = { origin, userAgent: "snapshot-test" };

test("snapshot rejects unsafe initial destinations before making any request", async () => {
  const called = [];
  for (const url of [
    "http://www.ozicashforcars.com.au/page",
    "https://www.ozicashforcars.com.au.attacker.example/page",
    "https://www.ozicashforcars.com.au:8443/page",
    "https://user:secret@www.ozicashforcars.com.au/page",
    "https://127.0.0.1/admin", "http://169.254.169.254/", "file:///etc/hosts",
    "//attacker.example/page", "not a URL",
  ]) {
    await assert.rejects(fetchSnapshotResource(url, { ...options, fetchImpl: async (value) => {
      called.push(value);
      return new Response("unexpected");
    }}), /Rejected/);
  }
  assert.deepEqual(called, []);
});

test("snapshot normalizes a legitimate HTTPS origin and follows allowed relative redirects", async () => {
  const called = [];
  let cancelled = false;
  const result = await fetchSnapshotResource("https://WWW.OZICASHFORCARS.COM.AU:443/original", {
    ...options,
    fetchImpl: async (url, init) => {
      called.push(url);
      assert.equal(init.redirect, "manual");
      if (called.length === 1) return new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
        status: 302, headers: { location: "/assets/final.css" },
      });
      return new Response("body{color:red}", { headers: { "content-type": "text/css" } });
    },
  });
  assert.equal(cancelled, true);
  assert.deepEqual(called, [origin + "/original", origin + "/assets/final.css"]);
  assert.equal(result.url, origin + "/assets/final.css");
  assert.equal(result.body.toString(), "body{color:red}");
  assert.equal(result.contentType, "text/css");
});

test("a redirect chain never requests its forbidden hop", async () => {
  for (const location of ["//127.0.0.1/admin", "http://www.ozicashforcars.com.au/", "https://user@www.ozicashforcars.com.au/", "https://attacker.example/"]) {
    const called = [];
    await assert.rejects(fetchSnapshotResource(origin + "/start", {
      ...options,
      fetchImpl: async (url) => {
        called.push(url);
        return new Response(null, {status:307, headers:{location:called.length === 1 ? "/second" : location}});
      },
    }), /Rejected/);
    assert.deepEqual(called, [origin + "/start", origin + "/second"]);
  }
});

test("snapshot rejects missing locations, loops and excess redirects", async () => {
  await assert.rejects(fetchSnapshotResource(origin, {...options, fetchImpl:async()=>new Response(null,{status:302})}), /without a location/);
  await assert.rejects(fetchSnapshotResource(origin, {...options, fetchImpl:async()=>new Response(null,{status:302,headers:{location:"/"}})}), /loop/);
  let calls = 0;
  await assert.rejects(fetchSnapshotResource(origin, {...options,maxRedirects:2,fetchImpl:async()=>new Response(null,{status:302,headers:{location:`/hop-${++calls}`}})}), /redirect limit/);
  assert.equal(calls, 3);
});

test("stream byte limits apply even when content length is missing or understated", async () => {
  for (const headers of [{}, {"content-length":"1"}]) {
    let cancelled = false;
    await assert.rejects(fetchSnapshotResource(origin, {...options,maxBytes:5,fetchImpl:async()=>new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(4)); },
      cancel() { cancelled = true; },
    }),{headers})}), /byte limit/);
    assert.equal(cancelled, true);
  }
});

test("the request deadline stays active while the body is stalled", async () => {
  let receivedSignal;
  await assert.rejects(fetchSnapshotResource(origin, {...options,timeoutMs:25,fetchImpl:async(_url,{signal})=>{
    receivedSignal=signal;
    return new Response(new ReadableStream({start(controller){
      signal.addEventListener("abort",()=>controller.error(new DOMException("Aborted","AbortError")),{once:true});
    }}));
  }}), { name:"AbortError" });
  assert.equal(receivedSignal.aborted,true);
});
