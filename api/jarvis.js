const MAX_BODY_BYTES = 256 * 1024;

function json(res, status, body, headers = {}) {
  return res.status(status).setHeader('Content-Type', 'application/json').setHeader('Cache-Control', 'no-store').setHeader('X-Content-Type-Options', 'nosniff').setHeader('X-Request-Id', body.requestId || '').json(body);
}

export default async function handler(req, res) {
  const requestId = req.headers['x-request-id'] || `gw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed', requestId });
  }

  const providerKey = process.env.AI_PROVIDER_API_KEY || process.env.GROQ_API_KEY;
  const providerBase = process.env.AI_PROVIDER_BASE_URL || 'https://api.groq.com/openai/v1';
  if (!providerKey) {
    return json(res, 503, { error: 'AI provider is not configured on the server.', requestId });
  }

  const bodySize = Number(req.headers['content-length'] || 0);
  if (bodySize > MAX_BODY_BYTES) {
    return json(res, 413, { error: 'Request too large.', requestId });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json(res, 400, { error: 'messages[] is required.', requestId });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 30000));

    const endpoint = providerBase.endsWith('/chat/completions')
      ? providerBase
      : `${providerBase.replace(/\/$/, '')}/chat/completions`;

    const providerResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerKey}`,
        'X-Request-Id': String(requestId),
      },
      body: JSON.stringify({
        model: body.model || process.env.AI_PROVIDER_MODEL || 'openai/gpt-oss-20b',
        messages: body.messages,
        temperature: body.temperature ?? 0.3,
        max_tokens: body.max_tokens ?? 1024,
        ...(body.response_format ? { response_format: body.response_format } : {}),
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const raw = await providerResponse.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 500) }; }

    if (!providerResponse.ok) {
      const message = typeof data?.error === 'string'
        ? data.error
        : data?.error?.message || `Provider error (${providerResponse.status}).`;
      const headers = {};
      const retryAfter = providerResponse.headers.get('retry-after');
      if (retryAfter) headers['Retry-After'] = retryAfter;
      return json(res, providerResponse.status, { error: message, requestId }, headers);
    }

    return res
      .status(200)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Cache-Control', 'no-store')
      .setHeader('X-Request-Id', String(requestId))
      .json(data);
  } catch (error) {
    const status = error?.name === 'AbortError' ? 504 : 500;
    return json(res, status, {
      error: status === 504 ? 'AI provider request timed out.' : 'AI gateway request failed.',
      requestId,
    });
  }
}
