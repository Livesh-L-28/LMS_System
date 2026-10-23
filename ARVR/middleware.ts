import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Enforce HTTPS in Production Environment for public domains (301 Permanent Redirect)
  if (process.env.NODE_ENV === 'production') {
    const host = request.headers.get('host') || request.nextUrl.host || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = request.headers.get('x-forwarded-proto');
    if (!isLocalhost && proto === 'http') {
      return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
    }
  }


  // 1. Correlation Tracking: Extract or generate unique Request ID
  const incomingRequestId = request.headers.get('x-request-id') || request.headers.get('traceparent');
  const requestId = incomingRequestId || crypto.randomUUID();

  // 2. Clone request headers and inject correlation ID downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // 3. Client IP extraction
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  // 4. Structured Access Logging
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/_next') && !pathname.includes('.')) {
    const accessLog = {
      timestamp: new Date().toISOString(),
      requestId,
      method: request.method,
      path: pathname,
      ip: clientIp,
      userAgent: request.headers.get('user-agent') || 'unknown',
    };
    console.log(`[HTTP_REQUEST] ${JSON.stringify(accessLog)}`);
  }

  // 5. Build response and set correlation ID header for frontend/client correlation
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-request-id', requestId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
