// Admin-only endpoint behind /admin. Every call proves who the caller is by sending their
// Supabase session token; Supabase confirms the user, and only the admin email(s) may continue.
// The service-role key never leaves this server.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ayyaezzatt@gmail.com')
  .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
const BANNED_FOREVER = '876000h';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return response.status(503).json({ message: 'Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
  const service = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ message: 'Inicia sesión primero.' });
  const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
  if (!who.ok) return response.status(401).json({ message: 'Tu sesión ha caducado. Inicia sesión de nuevo.' });
  const caller = await who.json();
  if (!ADMIN_EMAILS.includes(String(caller.email || '').toLowerCase())) return response.status(403).json({ message: 'Solo el administrador puede ver esta página.' });

  const action = request.method === 'GET' ? request.query.action : (request.body || {}).action;
  try {
    if (action === 'check') return response.status(200).json({ admin: true });
    if (request.method === 'GET' && action === 'overview') return response.status(200).json(await overview(url, service));
    if (request.method === 'POST') return await mutate(url, service, caller, request.body || {}, response);
    return response.status(400).json({ message: 'Acción desconocida.' });
  } catch (error) {
    console.error('admin:', action, error.message);
    return response.status(500).json({ message: 'Algo salió mal. Inténtalo de nuevo.' });
  }
}

async function getJson(target, headers) {
  const result = await fetch(target, { headers });
  if (!result.ok) {
    const body = await result.json().catch(() => ({}));
    // A missing table just means the SQL file has not been run yet; show what we can.
    if (body.code === 'PGRST205') return [];
    throw new Error(`${result.status} ${body.message || body.msg || ''}`);
  }
  return result.json();
}

async function overview(url, service) {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = await getJson(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, service);
    users.push(...(batch.users || []));
    if ((batch.users || []).length < 200) break;
  }
  const [progress, events] = await Promise.all([
    getJson(`${url}/rest/v1/student_progress?select=user_id,activity_key,status,last_played_at,completed_at`, service),
    getJson(`${url}/rest/v1/student_events?select=id,user_id,event_type,activity_key,created_at&order=created_at.desc&limit=200`, service)
  ]);
  const now = Date.now();
  const students = users
    .filter((user) => !ADMIN_EMAILS.includes(String(user.email || '').toLowerCase()))
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || '',
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || null,
      disabled: Boolean(user.banned_until && Date.parse(user.banned_until) > now),
      progress: progress.filter((item) => item.user_id === user.id)
    }))
    .sort((a, b) => (Date.parse(b.lastSignInAt || b.createdAt) || 0) - (Date.parse(a.lastSignInAt || a.createdAt) || 0));
  const studentIds = new Set(students.map((student) => student.id));
  return { students, events: events.filter((event) => studentIds.has(event.user_id)) };
}

async function mutate(url, service, caller, body, response) {
  const { action } = body;
  const userId = String(body.userId || '');
  const password = String(body.password || '');
  const passwordError = password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : '';

  if (action === 'create') {
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim().slice(0, 80);
    if (!/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ message: 'El correo electrónico no es válido.' });
    if (!name) return response.status(400).json({ message: 'Escribe el nombre del alumno.' });
    if (passwordError) return response.status(400).json({ message: passwordError });
    const result = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST', headers: service,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name } })
    });
    if (result.ok) return response.status(200).json({ ok: true });
    const detail = await result.json().catch(() => ({}));
    const text = `${detail.error_code || ''} ${detail.msg || detail.message || ''}`;
    if (/already|exists|registered/i.test(text)) return response.status(409).json({ message: 'Ya existe un alumno con este correo.' });
    if (/password/i.test(text)) return response.status(400).json({ message: 'Supabase no acepta esta contraseña. Usa una más larga o con números y letras.' });
    throw new Error(`create ${result.status} ${text}`);
  }

  if (!/^[0-9a-f-]{36}$/i.test(userId)) return response.status(400).json({ message: 'Alumno no válido.' });
  if (userId === caller.id) return response.status(400).json({ message: 'No puedes modificar tu propia cuenta de administrador desde aquí.' });
  const target = `${url}/auth/v1/admin/users/${userId}`;
  let update;
  if (action === 'password') {
    if (passwordError) return response.status(400).json({ message: passwordError });
    update = { password };
  } else if (action === 'rename') {
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) return response.status(400).json({ message: 'Escribe el nombre del alumno.' });
    update = { user_metadata: { full_name: name } };
  } else if (action === 'disable') {
    update = { ban_duration: body.disabled ? BANNED_FOREVER : 'none' };
  } else if (action === 'delete') {
    const result = await fetch(target, { method: 'DELETE', headers: service });
    if (!result.ok) throw new Error(`delete ${result.status}`);
    return response.status(200).json({ ok: true });
  } else {
    return response.status(400).json({ message: 'Acción desconocida.' });
  }
  const result = await fetch(target, { method: 'PUT', headers: service, body: JSON.stringify(update) });
  if (!result.ok) {
    const detail = await result.json().catch(() => ({}));
    const text = detail.msg || detail.message || '';
    if (/password/i.test(text)) return response.status(400).json({ message: 'Supabase no acepta esta contraseña. Usa una más larga o con números y letras.' });
    throw new Error(`${action} ${result.status} ${text}`);
  }
  return response.status(200).json({ ok: true });
}
