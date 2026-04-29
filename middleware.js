import { NextResponse } from 'next/server';

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

export function middleware(request) {
  const clientIp = getClientIp(request);
  const allowedIps = getAllowedIps();

  if (!allowedIps.includes(clientIp)) {
    return new NextResponse(
      `Forbidden. Your IP (${clientIp || 'unknown'}) is not allowed.`,
      {
        status: 403,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/api/indexnow/:path*',
  ],
};
