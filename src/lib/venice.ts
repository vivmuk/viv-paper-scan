/**
 * The Venice client. One module knows about the API so nothing else has to.
 *
 * Two behaviours are here deliberately, both copied from an earlier project where their absence
 * caused real, expensive failures:
 *
 *  1. Rate limits are honoured using the SERVER'S OWN reset value. Guessing a backoff wastes time
 *     when the server has already told you when the window clears; Venice returns that as a
 *     millisecond epoch on 429.
 *  2. A model that returns null content is retried, then its reasoning field is used, and only then
 *     does it raise. One of our earlier debates crashed eight rounds deep on a single null reply.
 *
 * The key is read from the environment at call time and is never included in an error message.
 */

const ENDPOINT = 'https://api.venice.ai/api/v1/chat/completions';

export const DEFAULT_MODEL = 'openai-gpt-6-luna';

export interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ChatResult {
  content: string;
  usage: ChatUsage;
  model: string;
  attempts: number;
}

export class VeniceError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'VeniceError';
    this.status = status;
  }
}

export function apiKey(): string {
  const key = process.env.VENICE_API_KEY;
  if (!key || !key.trim()) {
    throw new VeniceError(
      'VENICE_API_KEY is not set. The scanner needs it server-side; it is never sent to the browser.',
    );
  }
  return key;
}

export function model(): string {
  return process.env.VIV_SCAN_MODEL?.trim() || DEFAULT_MODEL;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How long the server says to wait, in milliseconds.
 * Accepts a millisecond epoch (Venice's own reset header), a delta-seconds header, or nothing.
 */
export function resetDelayMs(headers: Headers, now = Date.now()): number | null {
  const reset = headers.get('x-ratelimit-reset') ?? headers.get('ratelimit-reset');
  if (reset) {
    const value = Number(reset);
    if (Number.isFinite(value) && value > 0) {
      // A millisecond epoch in the future, or a small delta in seconds: tell them apart by size.
      const asEpoch = value > 1_000_000_000_000 ? value : null;
      if (asEpoch !== null) return Math.max(0, asEpoch - now) + 250;
      if (value < 3600) return value * 1000 + 250;
    }
  }
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000 + 250;
  }
  return null;
}

export interface ChatOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask for a JSON object back. Venice supports response_format; we also tolerate prose-wrapped JSON. */
  json?: boolean;
  attempts?: number;
  fetchImpl?: typeof fetch;
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const attempts = opts.attempts ?? 3;
  const target = opts.model ?? model();
  // Resolve the key once, outside the retry loop: a missing key is a configuration error and
  // retrying it three times only delays a clear message.
  const key = apiKey();
  let lastDetail = '';

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response: Response;
    try {
      response = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: target,
          messages: opts.messages,
          max_tokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
    } catch (err) {
      lastDetail = `network error: ${(err as Error).message}`;
      if (attempt === attempts) throw new VeniceError(`Could not reach Venice: ${lastDetail}`);
      await sleep(1000 * attempt);
      continue;
    }

    if (response.status === 429) {
      const wait = resetDelayMs(response.headers);
      if (attempt === attempts) {
        throw new VeniceError('Venice rate limit reached and the retry budget is spent.', 429);
      }
      await sleep(wait ?? 5000 * attempt);
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new VeniceError(
        `Venice returned ${response.status}${body ? ': ' + body.slice(0, 300) : ''}`,
        response.status,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; reasoning?: string | null } }>;
      usage?: ChatUsage;
      model?: string;
    };

    const message = payload.choices?.[0]?.message;
    const content = message?.content?.trim() ?? '';
    // A model may legitimately answer inside the reasoning field and leave content empty.
    const reasoning = message?.reasoning?.trim() ?? '';
    const usable = content || reasoning;

    if (usable) {
      return { content: usable, usage: payload.usage ?? {}, model: payload.model ?? target, attempts: attempt };
    }

    lastDetail = `empty reply (keys: ${Object.keys(message ?? {}).join(',') || 'no message'})`;
    if (attempt < attempts) await sleep(500 * attempt);
  }

  throw new VeniceError(`Venice returned no usable content after ${attempts} attempts: ${lastDetail}`);
}

/**
 * Pull a JSON object out of a reply that may be wrapped in prose or a code fence.
 * Throws rather than returning a guess: a silently invented object here would become a fabricated
 * verdict somewhere downstream.
 */
export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new VeniceError(`Expected a JSON object, got: ${candidate.slice(0, 200)}`);
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch (err) {
    throw new VeniceError(`Reply was not valid JSON (${(err as Error).message}): ${candidate.slice(0, 200)}`);
  }
}
