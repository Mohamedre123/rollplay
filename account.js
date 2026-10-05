const accountMessage = document.querySelector('#accountMessage');
const ringLength = 2 * Math.PI * 52;
const totals = { 'a1-1': 7, 'a1-2': 15, conversation: 4 };
const gameNames = { 'a1-1': 'A1.1 · El mazo', 'a1-2': 'A1.2 · Cartas', conversation: 'Conversación' };
const stateLabels = { started: 'En curso', completed: 'Completado ✓' };
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const formatDate = (value) => new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
let answers = [];
let answerFilter = 'all';

async function accountClient() {
  const config = await fetch('/api/auth-config').then((response) => response.json());
  if (!config.url || !config.anonKey || !window.supabase) throw new Error('missing config');
  return window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
}

function renderAnswers() {
  const list = answers.filter((answer) => answerFilter === 'all' || answer.activity_key === answerFilter);
  document.querySelector('#answerList').innerHTML = list.map((answer) => `
    <li>
      <div class="answer-meta"><span class="answer-game">${gameNames[answer.activity_key] || answer.activity_key}</span><time datetime="${answer.created_at}">${formatDate(answer.created_at)}</time></div>
      <p class="answer-prompt">${escapeHtml(answer.prompt)}</p>
      <blockquote>${escapeHtml(answer.answer)}</blockquote>
    </li>`).join('') || `<li class="answer-empty">${answers.length ? 'No hay respuestas en este juego todavía.' : 'Todavía no has escrito respuestas. Entra en un nivel y usa «Tu respuesta».'}</li>`;
}

async function loadAccount() {
  const ring = document.querySelector('#accountRing');
  ring.style.strokeDasharray = ringLength;
  ring.style.strokeDashoffset = ringLength;
  try {
    const client = await accountClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session) { window.location.replace('/auth?next=/account'); return; }
    const user = session.user;
    document.querySelector('#studentName').textContent = user.user_metadata?.full_name || user.email.split('@')[0];
    document.querySelector('#studentEmail').textContent = user.email;

    fetch('/api/admin?action=check', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((check) => { if (check.ok) document.querySelector('#adminLink').hidden = false; }, () => {});

    document.querySelector('#signOut').addEventListener('click', async () => {
      await client.auth.signOut();
      await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
      sessionStorage.clear();
      window.location.href = '/auth';
    });

    const [progress, items, saved] = await Promise.all([
      client.from('student_progress').select('activity_key,status').eq('user_id', user.id),
      client.from('student_items').select('activity_key,item_key').eq('user_id', user.id),
      client.from('student_answers').select('activity_key,item_key,prompt,answer,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300)
    ]);
    if (progress.error) { accountMessage.textContent = 'Todavía no podemos mostrar tu progreso.'; return; }

    let completed = 0;
    (progress.data || []).forEach((entry) => {
      const card = document.querySelector(`[data-key="${entry.activity_key}"]`);
      if (!card) return;
      card.classList.add(`is-${entry.status}`);
      card.querySelector('.level-state').textContent = stateLabels[entry.status] || 'Sin empezar';
      if (entry.status === 'completed') completed += 1;
    });
    document.querySelectorAll('.level-card').forEach((card) => {
      const key = card.dataset.key;
      const done = (items.data || []).filter((item) => item.activity_key === key).length;
      card.querySelector('.score-text').textContent = `${done}/${totals[key]}`;
      card.querySelector('.score-bar i').style.width = `${Math.min(100, (done / totals[key]) * 100)}%`;
    });
    document.querySelector('#progressNumber').textContent = completed;
    requestAnimationFrame(() => { ring.style.strokeDashoffset = ringLength * (1 - completed / 3); });

    answers = saved.data || [];
    renderAnswers();
  } catch {
    accountMessage.textContent = 'No pudimos abrir tu cuenta ahora. Inténtalo de nuevo.';
  }
}

document.querySelector('#answerFilters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  answerFilter = button.dataset.filter;
  document.querySelectorAll('#answerFilters button').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  renderAnswers();
});
loadAccount();
