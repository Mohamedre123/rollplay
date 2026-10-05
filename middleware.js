// Vercel Routing Middleware: game pages, their scripts and their images are served only to
// visitors holding a valid session cookie. The cookie is issued by /api/session after Supabase
// confirms the login, and is signed so it cannot be forged.
export const config = {
  matcher: [
    '/(a1-1|a1-2|conversacion|account|admin)',
    '/(a1-1|a1-2|conversacion|account|admin).html',
    '/(a1-1|a1-2|conversacion|account|admin).js',
    '/assets/(a12|conv)/:path*',
    '/assets/:file(prompt-[^/]+)'
  ]
};

const encoder = new TextEncoder();
const isPage = (path) => !/\.(js|jpe?g|png|webp|svg|css)$/i.test(path);
const isAdminOnly = (path) => /^\/admin(\.html|\.js)?$/.test(path);
const isProtected = (path) => /^\/(a1-1|a1-2|conversacion|account|admin)(\.html|\.js)?$/.test(path)
  || /^\/assets\/(a12|conv)\//.test(path)
  || /^\/assets\/prompt-[^/]+$/.test(path);

function base64url(bytes) {
  let text = '';
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readSession(request) {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  const match = (request.headers.get('cookie') || '').match(/(?:^|;\s*)elm_session=([^;]+)/);
  if (!match) return null;
  const [payload, signature] = match[1].split('.');
  if (!payload || !signature) return null;
  const key = await crypto.subtle.importKey('raw', encoder.encode(`elm-session:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  if (expected.length !== signature.length) return null;
  let difference = 0;
  for (let i = 0; i < expected.length; i += 1) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (difference !== 0) return null;
  try {
    const session = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return session.e * 1000 > Date.now() ? session : null;
  } catch {
    return null;
  }
}

// Same as next() from @vercel/functions: let the request through unchanged.
const pass = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!isProtected(path)) return pass();

  const session = await readSession(request);
  if (session && (!isAdminOnly(path) || session.a === 1)) return pass();

  if (isPage(path) || path.endsWith('.html')) {
    const target = session ? '/account' : `/auth?next=${encodeURIComponent(path.replace(/\.html$/, ''))}`;
    return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
  }
  return new Response(session ? 'Forbidden' : 'Unauthorized', { status: session ? 403 : 401, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' } });
}
