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
  const applyPageTransition = (link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const overlay = document.querySelector('.page-transition');
      if (!overlay) return;
      event.preventDefault();
      overlay.classList.add('is-leaving');
      setTimeout(() => { window.location.href = link.href; }, 560);
    });
  };
  const injectAccountLink = (user) => {
    const destination = user ? '/account' : '/auth';
    const label = user ? 'Mi cuenta' : 'Entrar';
    const nav = document.querySelector('.site-nav');
    if (nav && !nav.querySelector('.student-account-link')) {
      const link = document.createElement('a');
      link.className = 'student-account-link'; link.href = destination;
      link.innerHTML = user ? '<span class="student-dot"></span>Mi cuenta' : 'Entrar';
      applyPageTransition(link); nav.append(link);
    }
    const sideLinks = document.querySelector('#sideMenu .side-links');
    if (sideLinks && !sideLinks.querySelector('.student-menu-link')) {
      const link = document.createElement('a');
      link.className = 'student-menu-link'; link.href = destination; link.style.setProperty('--k', '4');
      link.innerHTML = `<span class="menu-num">${user ? '⌾' : '→'}</span><span class="menu-label"><strong>${label}</strong><small>${user ? 'Tu progreso y actividades' : 'Accede con tu correo'}</small></span><b aria-hidden="true">→</b>`;
      applyPageTransition(link); sideLinks.append(link);
    }
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