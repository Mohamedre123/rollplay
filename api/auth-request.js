// Tells the login page whether an email already has an account, so it can show a friendly
// "use Crear cuenta / Iniciar sesión" message. If the lookup is not available (missing
// service key or student_profiles table), it lets the request through: Supabase itself
// still refuses OTP logins for unknown emails, so nothing is unlocked by skipping it.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'POST') return response.status(405).json({ message: 'Method not allowed' });
  const { email = '', mode = '' } = request.body || {};
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !['login', 'signup'].includes(mode)) {
    return response.status(400).json({ message: 'El correo electrónico no es válido.' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const skip = (reason) => {
    console.warn(`auth-request: account check skipped (${reason})`);
    return response.status(200).json({ allowed: true, checked: false, reason });
  };
  if (!url) return response.status(503).json({ message: 'El servicio de cuentas todavía no está configurado.', reason: 'missing_supabase_url' });
  if (!serviceKey) return skip('missing_service_role_key');

  try {
    const query = `${url}/rest/v1/student_profiles?select=id&email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`;
    const result = await fetch(query, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      if (body.code === 'PGRST205' || result.status === 404) return skip('student_profiles_table_missing');
      if (result.status === 401 || result.status === 403) return skip('service_role_key_rejected');
      return skip(`lookup_failed_${result.status}`);
    }
    const exists = (await result.json()).length > 0;
    if (mode === 'login' && !exists) return response.status(404).json({ message: 'Este correo no está registrado. Elige «Crear cuenta» primero.' });
    if (mode === 'signup' && exists) return response.status(409).json({ message: 'Este correo ya está registrado. Elige «Iniciar sesión».' });
    return response.status(200).json({ allowed: true, checked: true });
  } catch (error) {
    return skip(`network_error: ${error.message}`);
  }
}
