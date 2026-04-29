export const runtime = 'nodejs';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const MAX_URLS = 10000;

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validatePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Payload ontbreekt of is geen JSON-object.'];
  }

  if (!payload.host || typeof payload.host !== 'string') {
    errors.push('host is verplicht.');
  }

  if (!payload.key || typeof payload.key !== 'string') {
    errors.push('key is verplicht.');
  }

  if (!Array.isArray(payload.urlList) || payload.urlList.length === 0) {
    errors.push('urlList moet minimaal één URL bevatten.');
  }

  if (Array.isArray(payload.urlList) && payload.urlList.length > MAX_URLS) {
    errors.push(`urlList mag maximaal ${MAX_URLS} URLs bevatten.`);
  }

  if (Array.isArray(payload.urlList)) {
    const invalidUrls = payload.urlList.filter((url) => typeof url !== 'string' || !isHttpUrl(url));
    if (invalidUrls.length) {
      errors.push('urlList bevat ongeldige HTTP(S)-URLs.');
    }
  }

  if (payload.keyLocation && !isHttpUrl(payload.keyLocation)) {
    errors.push('keyLocation moet een geldige HTTP(S)-URL zijn.');
  }

  return errors;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const errors = validatePayload(payload);

    if (errors.length) {
      return Response.json({ errors }, { status: 400 });
    }

    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: payload.host,
        key: payload.key,
        ...(payload.keyLocation ? { keyLocation: payload.keyLocation } : {}),
        urlList: payload.urlList,
      }),
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
    { ok: true, message: 'IndexNow proxy is actief. Gebruik POST om URLs te versturen.' },
    { status: 200 }
  );
}
