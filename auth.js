const loginForm = document.querySelector('#loginForm');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const showPassword = document.querySelector('#showPassword');
const loginButton = document.querySelector('#loginButton');
const statusMessage = document.querySelector('#statusMessage');
// Where to go after logging in: the level the student tried to open, or their account.
const requested = new URLSearchParams(window.location.search).get('next') || '';
const nextPage = /^\/(?!\/)[\w\-/]*$/.test(requested) ? requested : '';
let supabaseClient;

function setStatus(message = '', success = false) { statusMessage.textContent = message; statusMessage.classList.toggle('is-success', success); }
function setBusy(busy, text) { loginButton.disabled = busy; loginButton.querySelector('span').textContent = busy ? text : 'Entrar'; }

// Exchange the Supabase session for the server cookie that unlocks the levels, then pick where to go:
// the page the student asked for, the admin panel for the admin, or the student's account.
async function destination(session) {
  const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: session.access_token }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'No pudimos abrir tu sesión. Inténtalo de nuevo.');
  sessionStorage.setItem('elm-session-renewed', String(Date.now()));
  return nextPage || (result.admin ? '/admin' : '/account');
}

async function initAuth() {
  try {
    const response = await fetch('/api/auth-config', { cache: 'no-store' });
    const config = await response.json();
    if (!config.url || !config.anonKey || !window.supabase) throw new Error('not configured');
    supabaseClient = window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      try { window.location.replace(await destination(session)); }
      catch (error) { await supabaseClient.auth.signOut().catch(() => {}); setStatus(error.message); }
    }
  } catch {
    setStatus('El acceso todavía no está configurado. Inténtalo más tarde.');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) { setStatus('El acceso todavía no está configurado. Inténtalo más tarde.'); return; }
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!emailInput.checkValidity() || !password) { loginForm.reportValidity(); return; }
  setStatus();
  setBusy(true, 'Comprobando…');
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setBusy(false);
    if (/banned/i.test(error.message)) setStatus('Tu cuenta está desactivada. Habla con tu profesor/a.');
    else if (/invalid|credentials/i.test(error.message)) setStatus('El correo o la contraseña no son correctos.');
    else if (/rate|too many/i.test(error.message)) setStatus('Demasiados intentos. Espera un momento y vuelve a intentarlo.');
    else setStatus(`No pudimos iniciar sesión: ${error.message}`);
    passwordInput.select();
    return;
  }
  // Every successful login is logged for the admin panel.
  await supabaseClient.from('student_events').insert({ user_id: data.user.id, event_type: 'login' }).then(() => {}, () => {});
  try {
    const target = await destination(data.session);
    setStatus('¡Bienvenido/a! Te estamos redirigiendo…', true);
    setTimeout(() => { window.location.href = target; }, 450);
  } catch (sessionError) {
    await supabaseClient.auth.signOut().catch(() => {});
    setBusy(false);
    setStatus(sessionError.message);
  }
});

showPassword.addEventListener('click', () => {
  const visible = passwordInput.type === 'password';
  passwordInput.type = visible ? 'text' : 'password';
  showPassword.textContent = visible ? 'Ocultar' : 'Ver';
  showPassword.setAttribute('aria-pressed', String(visible));
  showPassword.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

initAuth();
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const transition = document.createElement('div');
  transition.className = 'auth-page-transition is-entering';
  transition.setAttribute('aria-hidden', 'true');
  document.body.append(transition);
  requestAnimationFrame(() => requestAnimationFrame(() => transition.classList.remove('is-entering')));
  document.querySelectorAll('a[href="/"]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    transition.classList.add('is-leaving');
    setTimeout(() => { window.location.href = '/'; }, 560);
  }));
}
