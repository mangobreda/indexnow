const DEFAULT_ALLOWED_IPS = ['92.65.51.76'];

function getAllowedIps() {
  return (process.env.ALLOWED_IPS || DEFAULT_ALLOWED_IPS.join(','))
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function normalizeIp(ip) {
  if (!ip) return '';
  return ip
    .replace(/^::ffff:/, '')
    .replace(/^\[|\]$/g, '')
    .trim();
}

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const firstForwardedIp = forwardedFor?.split(',')[0]?.trim();

  return normalizeIp(
    firstForwardedIp ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    ''
  );
}

function isAllowedIp(request) {
  return getAllowedIps().includes(getClientIp(request));
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Payload ontbreekt.';
  if (!payload.host || typeof payload.host !== 'string') return 'host ontbreekt.';
  if (!payload.key || typeof payload.key !== 'string') return 'key ontbreekt.';
  if (!Array.isArray(payload.urlList) || payload.urlList.length === 0) return 'urlList ontbreekt.';
  if (payload.urlList.length > 10000) return 'urlList mag maximaal 10.000 URLs bevatten.';

  for (const url of payload.urlList) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return `${url} is geen HTTP(S)-URL.`;
      if (parsed.host !== payload.host) return `${url} hoort niet bij host ${payload.host}.`;
    } catch {
      return `${url} is geen geldige URL.`;
    }
  }

  return null;
}

export async function POST(request) {
  if (!isAllowedIp(request)) {
    return Response.json(
      { error: 'Forbidden: IP not allowed.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const payload = await request.json();
    const validationError = validatePayload(payload);

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: payload.host,
        key: payload.key,
        ...(payload.keyLocation ? { keyLocation: payload.keyLocation } : {}),
        urlList: payload.urlList,
      }),
      cache: 'no-store',
    });

    const text = await response.text();

    return new Response(text || null, {
      status: response.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { error: 'Method Not Allowed. Use POST.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
