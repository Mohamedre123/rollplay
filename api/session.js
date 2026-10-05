// Turns a Supabase login into the signed, httpOnly cookie that middleware.js checks before
// serving any game page, script or image. POST { accessToken } sets it, DELETE clears it.
import { createHmac } from 'node:crypto';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ayyaezzatt@gmail.com')
  .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
const MAX_AGE = 6 * 3600; // student.js renews it while the student keeps using the site

const cookie = (value, maxAge) => `elm_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const base64url = (input) => Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method === 'DELETE') {
    response.setHeader('Set-Cookie', cookie('', 0));
    return response.status(200).json({ ok: true });
  }
  if (request.method !== 'POST') return response.status(405).json({ message: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.SESSION_SECRET || serviceKey;
  if (!url || !serviceKey) return response.status(503).json({ message: 'El acceso todavía no está configurado.' });

  const token = String((request.body || {}).accessToken || '');
  if (!token) return response.status(400).json({ message: 'Falta la sesión.' });
  const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
  if (!who.ok) {
    response.setHeader('Set-Cookie', cookie('', 0));
    return response.status(401).json({ message: 'Tu sesión ha caducado. Inicia sesión de nuevo.' });
  }
  const user = await who.json();
  if (user.banned_until && Date.parse(user.banned_until) > Date.now()) {
    response.setHeader('Set-Cookie', cookie('', 0));
    return response.status(403).json({ message: 'Tu cuenta está desactivada. Habla con tu profesor/a.' });
  }

  const admin = ADMIN_EMAILS.includes(String(user.email || '').toLowerCase());
  const payload = base64url(JSON.stringify({ u: user.id, a: admin ? 1 : 0, e: Math.floor(Date.now() / 1000) + MAX_AGE }));
  const signature = base64url(createHmac('sha256', `elm-session:${secret}`).update(payload).digest());
  response.setHeader('Set-Cookie', cookie(`${payload}.${signature}`, MAX_AGE));
  return response.status(200).json({ ok: true, admin });
}
