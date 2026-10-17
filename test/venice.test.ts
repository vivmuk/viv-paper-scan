import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chat, extractJson, resetDelayMs, VeniceError, DEFAULT_MODEL, model } from '../src/lib/venice.ts';

process.env.VENICE_API_KEY = 'test-key-never-used';
delete process.env.VIV_SCAN_MODEL;

function headers(map) {
  return { get: (name) => map[name.toLowerCase()] ?? null };
}

function reply(payload, status = 200, headerMap = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: headers(headerMap),
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

test('the model defaults to GPT Luna and yields to the environment', () => {
  assert.equal(DEFAULT_MODEL, 'openai-gpt-6-luna');
  assert.equal(model(), 'openai-gpt-6-luna');
  process.env.VIV_SCAN_MODEL = 'deepseek-v4-1-flash';
  assert.equal(model(), 'deepseek-v4-1-flash');
  delete process.env.VIV_SCAN_MODEL;
});

test('a rate limit is waited out using the server own reset, not a guessed backoff', () => {
  const now = 1_800_000_000_000;
  assert.equal(resetDelayMs(headers({ 'x-ratelimit-reset': String(now + 5000) }), now), 5250);
  // A reset already past means no wait beyond the small cushion.
  assert.equal(resetDelayMs(headers({ 'x-ratelimit-reset': String(now - 60_000) }), now), 250);
  // Small values are a delta in seconds, not an epoch.
  assert.equal(resetDelayMs(headers({ 'x-ratelimit-reset': '30' }), now), 30250);
  assert.equal(resetDelayMs(headers({ 'retry-after': '2' }), now), 2250);
  assert.equal(resetDelayMs(headers({}), now), null);
});

test('JSON is recovered from fences and prose, and a missing object raises', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here you are:\n{"a":[1,2]}\nHope that helps.'), { a: [1, 2] });
  assert.throws(() => extractJson('no object here'), VeniceError);
  assert.throws(() => extractJson('{broken'), VeniceError);
});

test('a 429 is retried after the server reset and the next reply is used', async () => {
  const now = Date.now();
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    if (calls === 1) return reply({}, 429, { 'x-ratelimit-reset': String(now - 1) });
    return reply({ choices: [{ message: { content: 'recovered' } }], usage: { total_tokens: 3 } });
  };
  const result = await chat({ messages: [{ role: 'user', content: 'hi' }], fetchImpl: fakeFetch, attempts: 3 });
  assert.equal(result.content, 'recovered');
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);
});

test('a null content reply falls back to the reasoning field rather than crashing', async () => {
  const fakeFetch = async () =>
    reply({ choices: [{ message: { content: null, reasoning: 'answer living in the reasoning field' } }] });
  const result = await chat({ messages: [{ role: 'user', content: 'hi' }], fetchImpl: fakeFetch });
  assert.equal(result.content, 'answer living in the reasoning field');
});

test('an empty reply is retried, and a persistent one raises with the cause', async () => {
  let calls = 0;
  const empty = async () => {
    calls++;
    return calls === 1 ? reply({ choices: [{ message: { content: '   ' } }] }) : reply({ choices: [{ message: {} }] });
  };
  await assert.rejects(
    () => chat({ messages: [{ role: 'user', content: 'hi' }], fetchImpl: empty, attempts: 2 }),
    (err) => err instanceof VeniceError && /no usable content/.test(err.message),
  );
  assert.equal(calls, 2);
});

test('a server error surfaces its status instead of being swallowed', async () => {
  const failing = async () => reply({ error: 'nope' }, 500);
  await assert.rejects(
    () => chat({ messages: [{ role: 'user', content: 'hi' }], fetchImpl: failing, attempts: 1 }),
    (err) => err instanceof VeniceError && err.status === 500,
  );
});

test('a missing key is reported plainly and never echoed', async () => {
  const saved = process.env.VENICE_API_KEY;
  delete process.env.VENICE_API_KEY;
  await assert.rejects(
    () => chat({ messages: [{ role: 'user', content: 'hi' }], fetchImpl: async () => reply({}), attempts: 1 }),
    (err) => err instanceof VeniceError && /VENICE_API_KEY is not set/.test(err.message),
  );
  process.env.VENICE_API_KEY = saved;
});
