const accountMessage = document.querySelector('#accountMessage');
const showAccountMessage = (text) => accountMessage.textContent = text;
async function loadAccount() {
  try {
    const response = await fetch('/api/auth-config', { cache: 'no-store' }); const config = await response.json();
    if (!config.url || !config.anonKey || !window.supabase) throw new Error('missing config');
    const client = window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.replace('/auth'); return; }
    document.querySelector('#studentName').textContent = user.user_metadata?.full_name || user.email.split('@')[0];
    document.querySelector('#studentEmail').textContent = user.email;
    const { data: progress, error } = await client.from('student_progress').select('activity_key,status,last_played_at,completed_at').eq('user_id', user.id);
    if (error) { showAccountMessage('فعّل جدول الإنجازات من ملف AUTH_SETUP.md ليظهر تقدم الطالب.'); return; }
    const entries = progress || []; document.querySelector('#progressNumber').textContent = entries.length;
    entries.forEach((item) => { const card = document.querySelector(`[data-key="${item.activity_key}"]`); if (!card) return; card.classList.add(item.status === 'completed' ? 'is-completed' : 'is-started'); card.querySelector('.activity-state').textContent = item.status === 'completed' ? '✓ مكتمل' : 'قمت بالتجربة'; });
  } catch { showAccountMessage('تعذر فتح الحساب الآن. تأكد من إعداد Supabase في Vercel.'); }
}
document.querySelector('#signOut').addEventListener('click', async () => { const response = await fetch('/api/auth-config', { cache: 'no-store' }); const config = await response.json(); if (config.url && config.anonKey && window.supabase) { const client = window.supabase.createClient(config.url, config.anonKey); await client.auth.signOut(); } window.location.href = '/auth'; });
loadAccount();