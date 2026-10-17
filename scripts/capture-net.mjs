#!/usr/bin/env node
// Capture every /api/* request and response on a page target over CDP: enable Network+Page, reload,
// then pull the response bodies. This is how we learn the real request shape instead of guessing.
import fs from "node:fs";
const endpoint = process.env.CDP || "http://127.0.0.1:9222";
const list = await (await fetch(`${endpoint}/json/list`)).json();
const target = list.filter(t => t.type === "page" && t.webSocketDebuggerUrl)[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const m = ++id; pending.set(m, { res, rej });
  ws.send(JSON.stringify({ id: m, method, params }));
});
const reqs = new Map(); const interesting = [];
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return;
  }
  if (m.method === "Network.requestWillBeSent") {
    const r = m.params.request;
    if (/\/api\//.test(r.url)) {
      reqs.set(m.params.requestId, { url: r.url, method: r.method, post: r.postData, headers: r.headers });
      interesting.push(m.params.requestId);
    }
  }
});
await new Promise(r => ws.addEventListener("open", r, { once: true }));
await send("Network.enable"); await send("Page.enable");
await send("Page.reload", { ignoreCache: false });
await new Promise(r => setTimeout(r, 12000));
const out = [];
for (const rid of interesting) {
  const meta = reqs.get(rid) || {};
  let body = null;
  try { const b = await send("Network.getResponseBody", { requestId: rid }); body = b.base64Encoded ? Buffer.from(b.body, "base64").toString("utf8") : b.body; }
  catch (e) { body = `[body unavailable: ${e.message}]`; }
  out.push({ ...meta, body: body ? body.slice(0, 200000) : null });
}
fs.writeFileSync("recon/api-traffic.json", JSON.stringify(out, null, 1));
console.log(`captured ${out.length} /api/* calls`);
for (const o of out) console.log(`  ${o.method} ${o.url}  post=${o.post ? o.post.length : 0}b  resp=${o.body ? o.body.length : 0}b`);
ws.close();
