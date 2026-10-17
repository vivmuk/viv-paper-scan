#!/usr/bin/env node
// Same as scan-upload.mjs but event-driven: we wait for the scan request's own loadingFinished
// before reading its body, and we never treat pre-rendered example text as "scan complete".
import fs from "node:fs"; import path from "node:path";
const endpoint = process.env.CDP || "http://127.0.0.1:9222";
const pdf = path.resolve(process.argv[2] || "recon/paper.pdf");
const list = await (await fetch(`${endpoint}/json/list`)).json();
const target = list.filter(t => t.type === "page" && t.webSocketDebuggerUrl)[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const m = ++id; pending.set(m, { res, rej });
  ws.send(JSON.stringify({ id: m, method, params }));
});
const reqs = new Map();       // requestId -> meta
const finished = new Set();   // requestIds whose response fully loaded
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return;
  }
  const p = m.params || {};
  if (m.method === "Network.requestWillBeSent" && /\/api\//.test(p.request?.url || ""))
    reqs.set(p.requestId, { url: p.request.url, method: p.request.method, postData: p.request.postData });
  if (m.method === "Network.loadingFinished" && reqs.has(p.requestId)) finished.add(p.requestId);
});
await new Promise(r => ws.addEventListener("open", r, { once: true }));
await send("Network.enable"); await send("DOM.enable"); await send("Runtime.enable"); await send("Page.enable");
const doc = await send("DOM.getDocument", { depth: -1 });
const node = await send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "#rs-file" });
await send("DOM.setFileInputFiles", { files: [pdf], nodeId: node.nodeId });
console.log("uploaded:", path.basename(pdf));
for (let i = 0; i < 45 && !(finished.size >= 2); i++) {
  await new Promise(r => setTimeout(r, 2000));
  if (i % 4 === 0) console.log(`  t+${(i + 1) * 2}s  api calls=${reqs.size} finished=${finished.size}`);
}
fs.mkdirSync("recon", { recursive: true });
const out = [];
for (const [rid, meta] of reqs) {
  let body = null;
  try { const b = await send("Network.getResponseBody", { requestId: rid }); body = b.base64Encoded ? Buffer.from(b.body, "base64").toString("utf8") : b.body; } catch (e) { body = null; }
  out.push({ ...meta, body });
}
fs.writeFileSync("recon/api-traffic.json", JSON.stringify(out, null, 1));
console.log(`\ncaptured ${out.length} calls`);
for (const o of out) console.log(`  ${o.method} ${o.url}  req=${o.postData?.length || 0}b  resp=${o.body?.length || 0}b`);
ws.close();
