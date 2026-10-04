const startView = document.querySelector('#startView');
const otpView = document.querySelector('#otpView');
const emailForm = document.querySelector('#emailForm');
const otpForm = document.querySelector('#otpForm');
const emailInput = document.querySelector('#email');
const nameInput = document.querySelector('#fullName');
const nameField = document.querySelector('#nameField');
const otpInput = document.querySelector('#otpCode');
const sentEmail = document.querySelector('#sentEmail');
const statusMessage = document.querySelector('#statusMessage');
const sendButton = document.querySelector('#sendButton');
const verifyButton = document.querySelector('#verifyButton');
let mode = 'login'; let supabaseClient; let currentEmail = '';
function setStatus(message = '', success = false) { statusMessage.textContent = message; statusMessage.classList.toggle('is-success', success); }
function setBusy(button, busy, text) { button.disabled = busy; button.querySelector('span').textContent = busy ? text : button.dataset.label; }
function showStart() { otpView.hidden = true; startView.hidden = false; otpInput.value = ''; setStatus(); emailInput.focus(); }
function showOtp() { startView.hidden = true; otpView.hidden = false; sentEmail.textContent = currentEmail; setStatus('Introduce el código de 6 dígitos que enviamos a tu correo.', true); setTimeout(() => otpInput.focus(), 80); }
function setMode(nextMode) { mode = nextMode; document.querySelectorAll('.mode-button').forEach((button) => { const active = button.dataset.mode === mode; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', active); }); nameField.hidden = mode !== 'signup'; nameInput.required = mode === 'signup'; setStatus(); }
async function initAuth() { try { const response = await fetch('/api/auth-config', { cache: 'no-store' }); const config = await response.json(); if (!config.url || !config.anonKey || !window.supabase) throw new Error('not configured'); supabaseClient = window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }); const { data: { session } } = await supabaseClient.auth.getSession(); if (session) window.location.replace('account.html'); } catch {} }
async function sendCode() {
  if (!supabaseClient) { setStatus('El acceso todavía no está configurado. Añade las variables de Supabase en Vercel.'); return; }
  currentEmail = emailInput.value.trim().toLowerCase(); const fullName = nameInput.value.trim();
  if (!emailInput.checkValidity() || (mode === 'signup' && !fullName)) { emailForm.reportValidity(); return; }
  setBusy(sendButton, true, 'Comprobando…');
  try { const checkResponse = await fetch('/api/auth-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: currentEmail, mode }) }); const check = await checkResponse.json().catch(() => ({})); if ([400, 404, 409].includes(checkResponse.status)) { setBusy(sendButton, false, ''); setStatus(check.message || 'No pudimos comprobar la cuenta.'); return; } } catch { /* The pre-check is only for friendlier messages; Supabase still validates the request below. */ }
  setBusy(sendButton, true, 'Enviando el código…'); const options = { shouldCreateUser: mode === 'signup' }; if (mode === 'signup') options.data = { full_name: fullName };
  const { error } = await supabaseClient.auth.signInWithOtp({ email: currentEmail, options }); setBusy(sendButton, false, '');
  if (error) { setStatus(error.message.includes('signups not allowed') ? 'No existe una cuenta con este correo. Elige «Crear cuenta» primero.' : `No pudimos enviar el código: ${error.message}`); return; } showOtp();
}
emailForm.addEventListener('submit', (event) => { event.preventDefault(); sendCode(); });
otpForm.addEventListener('submit', async (event) => { event.preventDefault(); const token = otpInput.value.replace(/\D/g, ''); if (token.length !== 6) { setStatus('Introduce el código de 6 dígitos.'); return; } setBusy(verifyButton, true, 'Comprobando…'); const { error } = await supabaseClient.auth.verifyOtp({ email: currentEmail, token, type: 'email' }); setBusy(verifyButton, false, ''); if (error) { setStatus('El código no es válido o ha caducado. Solicita uno nuevo.'); return; } setStatus('Código confirmado. Te estamos redirigiendo…', true); setTimeout(() => { window.location.href = 'account.html'; }, 650); });
document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.querySelector('#changeEmail').addEventListener('click', showStart); document.querySelector('#resendCode').addEventListener('click', sendCode);
otpInput.addEventListener('input', () => { otpInput.value = otpInput.value.replace(/\D/g, ''); if (otpInput.value.length === 6) otpForm.requestSubmit(); });
[sendButton, verifyButton].forEach((button) => { button.dataset.label = button.querySelector('span').textContent; }); initAuth();
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const transition = document.createElement('div'); transition.className = 'auth-page-transition is-entering'; transition.setAttribute('aria-hidden', 'true'); document.body.append(transition); requestAnimationFrame(() => requestAnimationFrame(() => transition.classList.remove('is-entering'))); document.querySelectorAll('a[href="/"]').forEach((link) => link.addEventListener('click', (event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); transition.classList.add('is-leaving'); setTimeout(() => { window.location.href = '/'; }, 560); })); }