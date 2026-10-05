(() => {
  const configUrl = '/api/auth-config';
  const isGated = document.documentElement.hasAttribute('data-gate');
  const here = window.location.pathname.replace(/\/$/, '') || '/';
  const toLogin = () => window.location.replace(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
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
      setTimeout(() => { window.location.href = link.href; }, 340);
    });
  };

  // "Entrar" / "Mi cuenta" (and "Admin" for the admin) in the header and in the phone menu.
  const addNavLink = ({ href, label, sub, icon, className }) => {
    const nav = document.querySelector('.site-nav');
    if (nav && !nav.querySelector(`a[href="${href}"]`)) {
      const link = document.createElement('a');
      link.className = `student-account-link ${className || ''}`; link.href = href;
      link.innerHTML = className === 'is-account' ? `<span class="student-dot"></span>${label}` : label;
      if (here === href) link.setAttribute('aria-current', 'page');
      applyPageTransition(link); nav.append(link);
    }
    const sideLinks = document.querySelector('#sideMenu .side-links');
    if (sideLinks && !sideLinks.querySelector(`a[href="${href}"]`)) {
      const link = document.createElement('a');
      link.className = 'student-menu-link'; link.href = href; link.style.setProperty('--k', String(sideLinks.children.length));
      if (here === href) link.setAttribute('aria-current', 'page');
      link.innerHTML = `<span class="menu-num">${icon}</span><span class="menu-label"><strong>${label}</strong><small>${sub}</small></span><b aria-hidden="true">→</b>`;
      applyPageTransition(link); sideLinks.append(link);
    }
  };

  async function isAdmin(session) {
    const cacheKey = `elm-admin-${session.user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached === '1';
    try {
      const check = await fetch('/api/admin?action=check', { headers: { Authorization: `Bearer ${session.access_token}` } });
      sessionStorage.setItem(cacheKey, check.ok ? '1' : '0');
      return check.ok;
    } catch { return false; }
  }

  async function init() {
    addStyles();
    try {
      const response = await fetch(configUrl); const config = await response.json();
      if (!config.url || !config.anonKey) throw new Error('No configuration');
      await loadLibrary(); client = window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      window.elmStudentAuth = client;
      // The saved session is read from this device, so the menu appears without waiting for the network.
      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        resolveUser(null);
        if (isGated) { await endServerSession(); toLogin(); return; }
        addNavLink({ href: '/auth', label: 'Entrar', sub: 'Accede con tu correo y contraseña', icon: '→' });
        return;
      }
      addNavLink({ href: '/account', label: 'Mi cuenta', sub: 'Tu progreso y tus niveles', icon: '⌾', className: 'is-account' });
      watchActivity(session.user.id);
      resolveUser(session.user.id);
      renewServerSession(session);
      isAdmin(session).then((admin) => { if (admin) addNavLink({ href: '/admin', label: 'Admin', sub: 'Alumnos y actividad', icon: '★', className: 'is-admin' }); });
      // Then confirm with Supabase in the background: an expired or deactivated account must not stay in a level.
      client.auth.getUser().then(async ({ data: { user } }) => {
        if (user || !isGated) return;
        await client.auth.signOut().catch(() => {}); await endServerSession(); toLogin();
      }, () => {});
    } catch {
      resolveUser(null);
      addNavLink({ href: '/auth', label: 'Entrar', sub: 'Accede con tu correo y contraseña', icon: '→' });
    }
  }

  // The levels' files are served only with the server cookie (see middleware.js). It lasts six
  // hours, so renew it at most once an hour while the student keeps using the site.
  async function renewServerSession(session) {
    const last = Number(sessionStorage.getItem('elm-session-renewed') || 0);
    if (Date.now() - last < 3600e3) return;
    const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: session.access_token }) }).catch(() => null);
    if (response?.ok) sessionStorage.setItem('elm-session-renewed', String(Date.now()));
    else if (response && (response.status === 401 || response.status === 403) && isGated) { await client.auth.signOut().catch(() => {}); toLogin(); }
  }
  async function endServerSession() {
    sessionStorage.removeItem('elm-session-renewed');
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
  }
  window.elmEndSession = endServerSession;

  function watchActivity(userId) {
    const started = (selector, activity) => {
      document.querySelectorAll(selector).forEach((element) => element.addEventListener('click', () => record(userId, activity, 'started'), { once: true }));
    };
    // Calls back once, the first time `test` is true after the element's text or classes change.
    const whenDone = (selector, test, activity) => {
      const element = document.querySelector(selector); if (!element) return;
      const observer = new MutationObserver(() => { if (test(element)) { observer.disconnect(); record(userId, activity, 'completed'); } });
      observer.observe(element, { attributes: true, childList: true, characterData: true, subtree: true });
    };
    if (here === '/a1-1') {
      started('#drawButton', 'a1-1');
      whenDone('#deckNote', (note) => /terminado/i.test(note.textContent), 'a1-1');
    }
    if (here === '/a1-2') {
      started('.play-card, #randomCard', 'a1-2');
      whenDone('#cardsCount', (count) => /todas las cartas/i.test(count.textContent), 'a1-2');
    }
    if (here === '/conversacion') {
      started('#spinTopic, .conv-tile', 'conversation');
      whenDone('#timer', (timer) => timer.classList.contains('is-done'), 'conversation');
    }
  }

  const startedOnce = new Set();
  async function record(userId, activityKey, status) {
    if (!client) return;
    if (status === 'started') { if (startedOnce.has(activityKey)) return; startedOnce.add(activityKey); }
    const now = new Date().toISOString();
    // "started" leaves an existing status alone, so a finished level never goes back to "started".
    const row = { user_id: userId, activity_key: activityKey, last_played_at: now };
    if (status === 'completed') Object.assign(row, { status: 'completed', completed_at: now });
    await Promise.all([
      client.from('student_progress').upsert(row, { onConflict: 'user_id,activity_key' }),
      client.from('student_events').insert({ user_id: userId, event_type: status, activity_key: activityKey })
    ]).catch(() => {});
  }

  // Score and answers. Each challenge, card or topic counts once towards the level's score;
  // when all of them are done, the level is marked as completed.
  const totals = { 'a1-1': 7, 'a1-2': 15, conversation: 4 };
  let resolveUser;
  const userReady = new Promise((resolve) => { resolveUser = resolve; });
  window.elmProgress = {
    totals,
    async done(activityKey, itemKey) {
      const userId = await userReady;
      if (!userId || !client) return;
      await client.from('student_items').upsert({ user_id: userId, activity_key: activityKey, item_key: String(itemKey) }, { onConflict: 'user_id,activity_key,item_key', ignoreDuplicates: true });
      const { count } = await client.from('student_items').select('item_key', { count: 'exact', head: true }).eq('user_id', userId).eq('activity_key', activityKey);
      if (count >= totals[activityKey]) record(userId, activityKey, 'completed');
    },
    async answer(activityKey, itemKey, prompt, text) {
      const userId = await userReady;
      if (!userId || !client) return { ok: false, message: 'Inicia sesión para guardar tu respuesta.' };
      const { error } = await client.from('student_answers').insert({ user_id: userId, activity_key: activityKey, item_key: String(itemKey), prompt: String(prompt).slice(0, 400), answer: String(text).trim().slice(0, 2000) });
      if (error) return { ok: false, message: 'No pudimos guardar tu respuesta. Inténtalo de nuevo.' };
      client.from('student_events').insert({ user_id: userId, event_type: 'answered', activity_key: activityKey }).then(() => {}, () => {});
      this.done(activityKey, itemKey);
      return { ok: true };
    }
  };

  init();
})();
