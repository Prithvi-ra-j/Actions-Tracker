import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/jarvis.js';

function createResponse() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createRequest(overrides = {}) {
  return {
    method: 'POST',
    headers: { 'content-length': '32', 'x-request-id': 'request-test-1' },
    body: { messages: [{ role: 'user', content: 'Hello' }] },
    ...overrides,
  };
}

describe('Jarvis server gateway', () => {
  beforeEach(() => {
    vi.stubEnv('AI_PROVIDER_API_KEY', 'server-test-key');
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('AI_PROVIDER_BASE_URL', 'https://provider.example/v1');
    vi.stubEnv('AI_PROVIDER_MODEL', 'test-model');
    vi.stubEnv('AI_TIMEOUT_MS', '30000');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects unsupported methods without calling the provider', async () => {
    const response = createResponse();

    await handler(createRequest({ method: 'GET' }), response);

    expect(response.statusCode).toBe(405);
    expect(response.body.error).toBe('Method not allowed');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns a configuration error when no provider key is available', async () => {
    vi.stubEnv('AI_PROVIDER_API_KEY', '');
    vi.stubEnv('GROQ_API_KEY', '');
    const response = createResponse();

    await handler(createRequest(), response);

    expect(response.statusCode).toBe(503);
    expect(response.body.error).toMatch(/not configured/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an oversized request before calling the provider', async () => {
    const response = createResponse();

    await handler(createRequest({ headers: { 'content-length': '262145' } }), response);

    expect(response.statusCode).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an oversized parsed body even when Content-Length is missing or understated', async () => {
    const response = createResponse();
    const body = { messages: [{ role: 'user', content: 'x'.repeat(256 * 1024) }] };

    await handler(createRequest({ headers: {}, body }), response);

    expect(response.statusCode).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('requires a non-empty messages array', async () => {
    const response = createResponse();

    await handler(createRequest({ body: { messages: [] } }), response);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('messages[] is required.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards validated chat input with the server key and request id', async () => {
    const providerBody = { choices: [{ message: { content: 'Hello back' } }] };
    global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(providerBody) });
    const response = createResponse();

    await handler(createRequest(), response);

    expect(global.fetch).toHaveBeenCalledWith('https://provider.example/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer server-test-key', 'X-Request-Id': 'request-test-1' }),
    }));
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(providerBody);
    expect(response.headers['Cache-Control']).toBe('no-store');
  });

  it('returns a gateway timeout when the provider request is aborted', async () => {
    vi.stubEnv('AI_TIMEOUT_MS', '1');
    global.fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));
    const response = createResponse();

    await handler(createRequest(), response);

    expect(response.statusCode).toBe(504);
    expect(response.body.error).toMatch(/timed out/i);
  });

  it('preserves provider retry timing on rate-limit responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: name => name === 'retry-after' ? '3' : null },
      text: async () => JSON.stringify({ error: { message: 'Rate limited' } }),
    });
    const response = createResponse();

    await handler(createRequest(), response);

    expect(response.statusCode).toBe(429);
    expect(response.headers['Retry-After']).toBe('3');
    expect(response.body.error).toBe('Rate limited');
  });
});