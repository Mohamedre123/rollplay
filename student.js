(() => {
  const configUrl = '/api/auth-config';
  const key = 'elm-supabase-ready';
  let client;

  const loadLibrary = () => new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; script.onload = resolve; script.onerror = reject; document.head.append(script);
  });
  const addStyles = () => { if (!document.querySelector('link[href="student.css"]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'student.css'; document.head.append(link); } };
  const injectAccountLink = (user) => {
    const header = document.querySelector('.site-header');
    if (!header || header.querySelector('.student-account-link')) return;
    const link = document.createElement('a'); link.className = 'student-account-link'; link.href = user ? '/account' : '/auth';
    link.innerHTML = user ? '<span class="student-dot"></span><span>Mi cuenta</span>' : '<span>Entrar</span>';
    header.append(link);
  };
  async function init() {
    addStyles();
    try {
      const response = await fetch(configUrl, { cache: 'no-store' }); const config = await response.json();
      if (!config.url || !config.anonKey) throw new Error('No configuration');
      await loadLibrary(); client = window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      window.elmStudentAuth = client;
      sessionStorage.setItem(key, '1');
      const { data: { user } } = await client.auth.getUser(); injectAccountLink(user);
      if (user) watchActivity(user.id);
    } catch { injectAccountLink(null); }
  }
  function watchActivity(userId) {
    const path = window.location.pathname.replace(/\/$/, '');
    const register = (selector, activity, completed = false) => {
      const element = document.querySelector(selector); if (!element) return;
      element.addEventListener('click', () => saveProgress(userId, activity, completed ? 'completed' : 'started'), { once: true });
    };
    if (path === '/a1-1' || path.endsWith('a1-1.html')) register('#drawButton', 'a1-1', false);
    if (path === '/a1-2' || path.endsWith('a1-2.html')) register('.play-card, #randomCard', 'a1-2', false);
    if (path === '/conversacion' || path.endsWith('conversacion.html')) {
      register('#spinTopic', 'conversation', false);
      const timer = document.querySelector('#timer');
      if (timer) new MutationObserver(() => { if (timer.classList.contains('is-done')) saveProgress(userId, 'conversation', 'completed'); }).observe(timer, { attributes: true, attributeFilter: ['class'] });
    }
  }
  async function saveProgress(userId, activityKey, status) {
    if (!client) return;
    const now = new Date().toISOString();
    const record = { user_id: userId, activity_key: activityKey, status, last_played_at: now };
    if (status === 'completed') record.completed_at = now;
    await client.from('student_progress').upsert(record, { onConflict: 'user_id,activity_key' });
  }
  init();
})();