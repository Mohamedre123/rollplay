export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ message: 'Method not allowed' });
  const { email = '', mode = '' } = request.body || {};
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !['login', 'signup'].includes(mode)) {
    return response.status(400).json({ message: 'بيانات البريد الإلكتروني غير صحيحة.' });
  }
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return response.status(503).json({ message: 'خدمة الحسابات غير جاهزة بعد.' });
  try {
    const query = `${url}/rest/v1/student_profiles?select=id&email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`;
    const result = await fetch(query, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!result.ok) throw new Error('Profile query failed');
    const profiles = await result.json();
    const exists = profiles.length > 0;
    if (mode === 'login' && !exists) return response.status(404).json({ message: 'هذا البريد غير مسجل. اختر «إنشاء حساب» أولًا.' });
    if (mode === 'signup' && exists) return response.status(409).json({ message: 'هذا البريد مسجل بالفعل. اختر «تسجيل الدخول».' });
    return response.status(200).json({ allowed: true });
  } catch {
    return response.status(503).json({ message: 'تعذر التحقق من الحساب الآن. حاول مرة أخرى.' });
  }
}