#!/usr/bin/env node
// Drive the REA chromium over CDP: evaluate an expression on the page target and print the result.
// Usage: node scripts/cdp.mjs <expressionFile|expression> [--wait ms] [--targetId id]
const endpoint = process.env.CDP || "http://127.0.0.1:9222";
const args = process.argv.slice(2);
const exprArg = args[0];
const waitIdx = args.indexOf("--wait");
const waitMs = waitIdx > -1 ? Number(args[waitIdx + 1]) : 0;
const tIdx = args.indexOf("--targetId");
const wantId = tIdx > -1 ? args[tIdx + 1] : null;
const fs = await import("node:fs");
const expr = fs.existsSync(exprArg) ? fs.readFileSync(exprArg, "utf8") : exprArg;

const list = await (await fetch(`${endpoint}/json/list`)).json();
const pages = list.filter(t => t.type === "page" && t.webSocketDebuggerUrl);
const target = wantId ? pages.find(t => t.id === wantId) : pages[0];
if (!target) { console.error("no page target", pages.map(p => [p.id, p.url])); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const msgId = ++id;
  pending.set(msgId, { res, rej });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
await new Promise(r => ws.addEventListener("open", r, { once: true }));
await send("Runtime.enable");
if (waitMs) await new Promise(r => setTimeout(r, waitMs));
const out = await send("Runtime.evaluate", {
  expression: expr, awaitPromise: true, returnByValue: true, userGesture: true,
});
const v = out.result?.value ?? out.result?.description ?? null;
console.log(typeof v === "string" ? v : JSON.stringify(v, null, 1));
ws.close();
