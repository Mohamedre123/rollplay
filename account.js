const accountMessage = document.querySelector('#accountMessage');
const ringLength = 2 * Math.PI * 52;
const stateLabels = { started: 'En curso', completed: 'Completado ✓' };

async function accountClient() {
  const config = await fetch('/api/auth-config', { cache: 'no-store' }).then((response) => response.json());
  if (!config.url || !config.anonKey || !window.supabase) throw new Error('missing config');
  return window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
}

async function loadAccount() {
  const ring = document.querySelector('#accountRing');
  ring.style.strokeDasharray = ringLength;
  ring.style.strokeDashoffset = ringLength;
  try {
    const client = await accountClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.replace('/auth?next=/account'); return; }
    document.querySelector('#studentName').textContent = user.user_metadata?.full_name || user.email.split('@')[0];
    document.querySelector('#studentEmail').textContent = user.email;

    const { data: { session } } = await client.auth.getSession();
    fetch('/api/admin?action=check', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((check) => { if (check.ok) document.querySelector('#adminLink').hidden = false; }, () => {});

    document.querySelector('#signOut').addEventListener('click', async () => {
      await client.auth.signOut();
      await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
      sessionStorage.clear();
      window.location.href = '/auth';
    });

    const { data: progress, error } = await client.from('student_progress').select('activity_key,status').eq('user_id', user.id);
    if (error) { accountMessage.textContent = 'Todavía no podemos mostrar tu progreso.'; return; }
    let completed = 0;
    (progress || []).forEach((item) => {
      const card = document.querySelector(`[data-key="${item.activity_key}"]`);
      if (!card) return;
      card.classList.add(`is-${item.status}`);
      card.querySelector('.level-state').textContent = stateLabels[item.status] || 'Sin empezar';
      if (item.status === 'completed') completed += 1;
    });
    document.querySelector('#progressNumber').textContent = completed;
    requestAnimationFrame(() => { ring.style.strokeDashoffset = ringLength * (1 - completed / 3); });
  } catch {
    accountMessage.textContent = 'No pudimos abrir tu cuenta ahora. Inténtalo de nuevo.';
  }
}
loadAccount();
