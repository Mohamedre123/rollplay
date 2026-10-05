const activityNames = { 'a1-1': 'A1.1', 'a1-2': 'A1.2', conversation: 'Conversación' };
const eventVerbs = { login: 'ha entrado', started: 'ha empezado', completed: 'ha completado', answered: 'ha respondido en' };
const totals = { 'a1-1': 7, 'a1-2': 15, conversation: 4 };
const openStudents = new Set();
const formatDate = (value) => new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const words = ['Sol', 'Luna', 'Mar', 'Flor', 'Plaza', 'Tapas', 'Paella', 'Toledo', 'Sevilla', 'Mundo', 'Viento', 'Cielo'];
const $ = (selector) => document.querySelector(selector);
let client;
let data = { students: [], events: [] };
let filter = '';
let dialogAction = null;

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const newPassword = () => `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
function timeAgo(value) {
  if (!value) return 'nunca';
  const seconds = Math.max(0, (Date.now() - Date.parse(value)) / 1000);
  if (seconds < 60) return 'ahora mismo';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 86400 * 30) return `hace ${Math.floor(seconds / 86400)} d`;
  return new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function api(method, body) {
  const { data: { session } } = await client.auth.getSession();
  if (!session) { window.location.replace('/auth?next=/admin'); throw new Error('no session'); }
  const response = await fetch(method === 'GET' ? `/api/admin?action=${body}` : '/api/admin', {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(json.message || 'Algo salió mal.'); error.status = response.status; throw error; }
  return json;
}

function renderStats() {
  const week = Date.now() - 7 * 86400 * 1000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $('#statStudents').textContent = data.students.length;
  $('#statActive').textContent = data.students.filter((student) => Date.parse(student.lastSignInAt) > week).length;
  $('#statToday').textContent = data.events.filter((event) => event.event_type === 'login' && Date.parse(event.created_at) >= today.getTime()).length;
  $('#statCompleted').textContent = data.students.reduce((sum, student) => sum + student.progress.filter((item) => item.status === 'completed').length, 0);
}

function progressChips(student) {
  return Object.entries(activityNames).map(([key, label]) => {
    const item = student.progress.find((entry) => entry.activity_key === key);
    const state = item ? item.status : 'none';
    const title = state === 'completed' ? 'Completado' : state === 'started' ? 'Empezado' : 'Sin empezar';
    const score = (student.scores || {})[key] || 0;
    return `<span class="chip is-${state}" title="${label}: ${title}">${label} · ${score}/${totals[key]}${state === 'completed' ? ' ✓' : ''}</span>`;
  }).join('');
}

// Opened with a tap on the student: score per game and every answer they wrote.
function studentDetail(student) {
  const scores = Object.entries(activityNames).map(([key, label]) => {
    const score = (student.scores || {})[key] || 0;
    return `<div><span>${label}</span><span class="level-score"><span class="score-bar"><i style="width:${Math.min(100, (score / totals[key]) * 100)}%"></i></span><b class="score-text">${score}/${totals[key]}</b></span></div>`;
  }).join('');
  const answers = (student.answers || []).map((answer) => `
    <li>
      <div class="answer-meta"><span class="answer-game">${activityNames[answer.activity_key] || answer.activity_key}</span><time datetime="${answer.created_at}">${formatDate(answer.created_at)}</time></div>
      <p class="answer-prompt">${escapeHtml(answer.prompt)}</p>
      <blockquote>${escapeHtml(answer.answer)}</blockquote>
    </li>`).join('') || '<li class="answer-empty">Todavía no ha escrito respuestas.</li>';
  return `<div class="student-detail"><div class="detail-scores">${scores}</div><h4>Respuestas (${(student.answers || []).length})</h4><ol class="answer-list">${answers}</ol></div>`;
}

function renderStudents() {
  const query = filter.trim().toLowerCase();
  const list = data.students.filter((student) => !query || `${student.name} ${student.email}`.toLowerCase().includes(query));
  $('#studentsNote').textContent = data.students.length ? '' : 'Todavía no hay alumnos. Añade el primero con el formulario.';
  $('#studentList').innerHTML = list.map((student) => `
    <article class="student-row${student.disabled ? ' is-disabled' : ''}${openStudents.has(student.id) ? ' is-open' : ''}" data-id="${student.id}" tabindex="0" aria-expanded="${openStudents.has(student.id)}">
      <span class="student-avatar" aria-hidden="true">${escapeHtml((student.name || student.email).trim().charAt(0).toUpperCase())}</span>
      <div class="student-info">
        <strong>${escapeHtml(student.name || 'Sin nombre')}${student.disabled ? ' <em class="badge">Desactivado</em>' : ''}</strong>
        <span>${escapeHtml(student.email)}</span>
        <small>Último acceso: ${timeAgo(student.lastSignInAt)} · Alta: ${timeAgo(student.createdAt)}</small>
      </div>
      <div class="student-progress">${progressChips(student)}</div>
      <div class="student-actions">
        <button class="mini-button" type="button" data-action="password">Contraseña</button>
        <button class="mini-button" type="button" data-action="disable">${student.disabled ? 'Activar' : 'Desactivar'}</button>
        <button class="mini-button is-danger" type="button" data-action="delete">Eliminar</button>
      </div>
      ${openStudents.has(student.id) ? studentDetail(student) : ''}
    </article>`).join('') || (data.students.length ? '<p class="admin-note">Ningún alumno coincide con la búsqueda.</p>' : '');
}

function renderFeed() {
  const names = new Map(data.students.map((student) => [student.id, student.name || student.email]));
  $('#activityFeed').innerHTML = data.events.slice(0, 80).map((event) => `
    <li class="feed-${event.event_type}">
      <span class="feed-icon" aria-hidden="true">${event.event_type === 'login' ? '→' : event.event_type === 'completed' ? '✓' : event.event_type === 'answered' ? '✎' : '▶'}</span>
      <span><strong>${escapeHtml(names.get(event.user_id) || 'Alumno')}</strong> ${eventVerbs[event.event_type] || event.event_type}${event.activity_key ? ` <b>${activityNames[event.activity_key] || event.activity_key}</b>` : ''}</span>
      <time datetime="${event.created_at}">${timeAgo(event.created_at)}</time>
    </li>`).join('') || '<li class="feed-empty">Aquí verás cada entrada y cada juego de tus alumnos.</li>';
}

async function refresh() {
  $('#refreshButton').classList.add('is-spinning');
  try {
    data = await api('GET', 'overview');
    renderStats(); renderStudents(); renderFeed();
  } catch (error) {
    $('#studentsNote').textContent = error.message;
  } finally {
    setTimeout(() => $('#refreshButton').classList.remove('is-spinning'), 400);
  }
}

function openDialog(student, action) {
  dialogAction = { student, action };
  const name = student.name || student.email;
  const copy = {
    password: ['Contraseña', `Nueva contraseña para ${name}`, 'Escribe una contraseña nueva o genera una. Después envíasela al alumno.', 'Guardar contraseña'],
    disable: student.disabled
      ? ['Cuenta', `Activar a ${name}`, 'El alumno podrá volver a entrar con su correo y contraseña.', 'Activar']
      : ['Cuenta', `Desactivar a ${name}`, 'El alumno no podrá entrar hasta que lo actives de nuevo. Su progreso se conserva.', 'Desactivar'],
    delete: ['Eliminar', `¿Eliminar a ${name}?`, 'Se borrarán la cuenta y todo su progreso. No se puede deshacer.', 'Eliminar para siempre']
  }[action];
  [$('#dialogKicker').textContent, $('#dialogTitle').textContent, $('#dialogText').textContent, $('#dialogConfirm').textContent] = copy;
  $('#dialogConfirm').classList.toggle('is-danger', action === 'delete');
  $('#dialogPasswordRow').hidden = action !== 'password';
  $('#dialogPassword').value = action === 'password' ? newPassword() : '';
  $('#dialogNote').textContent = '';
  $('#adminDialog').showModal();
}

$('#dialogForm').addEventListener('submit', async (event) => {
  if (event.submitter?.value !== 'confirm' || !dialogAction) return;
  event.preventDefault();
  const { student, action } = dialogAction;
  const body = { action, userId: student.id };
  if (action === 'password') body.password = $('#dialogPassword').value.trim();
  if (action === 'disable') body.disabled = !student.disabled;
  $('#dialogConfirm').disabled = true;
  try {
    await api('POST', body);
    $('#adminDialog').close();
    if (action === 'password') showCredentials(student.name, student.email, body.password, 'Contraseña actualizada.');
    await refresh();
  } catch (error) {
    $('#dialogNote').textContent = error.message;
  } finally {
    $('#dialogConfirm').disabled = false;
  }
});

function showCredentials(name, email, password, message) {
  $('#addNote').textContent = message;
  $('#credentialsText').textContent = `Hola ${name || ''}:\nYa puedes entrar en Role Play de El Mundo Hispano.\n\nWeb: ${window.location.origin}/auth\nCorreo: ${email}\nContraseña: ${password}`;
  $('#credentials').hidden = false;
  $('#credentials').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

$('#addForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = $('#newName').value.trim();
  const email = $('#newEmail').value.trim().toLowerCase();
  const password = $('#newPassword').value.trim();
  if (!name || !$('#newEmail').checkValidity() || password.length < 6) {
    $('#addNote').textContent = password && password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : 'Completa el nombre, el correo y la contraseña.';
    return;
  }
  $('#addButton').disabled = true;
  $('#addNote').textContent = 'Creando la cuenta…';
  try {
    await api('POST', { action: 'create', name, email, password });
    showCredentials(name, email, password, `Cuenta creada para ${name}.`);
    $('#addForm').reset();
    $('#newPassword').value = newPassword();
    await refresh();
  } catch (error) {
    $('#addNote').textContent = error.message;
  } finally {
    $('#addButton').disabled = false;
  }
});

$('#studentList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) {
    // Tapping the student (outside the buttons and the opened details) shows or hides their work.
    const row = event.target.closest('.student-row');
    if (!row || event.target.closest('.student-detail')) return;
    if (openStudents.has(row.dataset.id)) openStudents.delete(row.dataset.id); else openStudents.add(row.dataset.id);
    renderStudents();
    return;
  }
  const student = data.students.find((item) => item.id === button.closest('.student-row').dataset.id);
  if (student) openDialog(student, button.dataset.action);
});
$('#studentList').addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('student-row')) { event.preventDefault(); event.target.click(); }
});
$('#generatePassword').addEventListener('click', () => { $('#newPassword').value = newPassword(); });
$('#dialogGenerate').addEventListener('click', () => { $('#dialogPassword').value = newPassword(); });
$('#studentSearch').addEventListener('input', (event) => { filter = event.target.value; renderStudents(); });
$('#refreshButton').addEventListener('click', refresh);
$('#copyCredentials').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#credentialsText').textContent); $('#copyCredentials').textContent = '¡Copiado!'; }
  catch { $('#copyCredentials').textContent = 'Selecciona y copia'; }
  setTimeout(() => { $('#copyCredentials').textContent = 'Copiar datos'; }, 1800);
});

async function start() {
  try {
    const config = await fetch('/api/auth-config').then((response) => response.json());
    if (!config.url || !config.anonKey || !window.supabase) throw new Error('El acceso todavía no está configurado.');
    client = window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    await api('GET', 'check');
  } catch (error) {
    $('#adminIntro').textContent = error.status === 403 ? 'Esta página es solo para el administrador.' : error.message;
    return;
  }
  $('#adminIntro').textContent = 'Crea cuentas, cambia contraseñas y sigue el progreso y la actividad de cada alumno.';
  $('#adminStats').hidden = false;
  $('#adminMain').hidden = false;
  $('#newPassword').value = newPassword();
  await refresh();
  // Keep the panel live: new logins and games show up without reloading.
  setInterval(() => { if (!document.hidden && !$('#adminDialog').open) refresh(); }, 30000);
}
start();
