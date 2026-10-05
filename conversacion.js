const topics = [
  { short: 'Mi día', prompt: 'Describe tu día.', questions: ['¿Qué haces desde que te levantas hasta que te acuestas?'], image: 'assets/conv/c01.jpg' },
  { short: 'Mi familia', prompt: 'Habla de tu familia.', questions: ['¿Quiénes son?', '¿Dónde viven?', '¿Qué hacen?'], image: 'assets/conv/c02.jpg' },
  { short: 'Mi rutina', prompt: 'Habla de tu rutina.', questions: ['¿Qué haces normalmente durante la semana?'], image: 'assets/conv/c03.jpg' },
  { short: 'Mis gustos', prompt: 'Habla de tus gustos.', questions: ['¿Qué te gusta hacer y qué no te gusta hacer?'], image: 'assets/conv/c04.jpg' }
];

const convReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tilesBox = document.querySelector('#convTiles');
const spinButton = document.querySelector('#spinTopic');
const convStage = document.querySelector('#convStage');
const convPhoto = convStage.querySelector('.conv-photo');
let spinning = false;
let current = -1;
let unseen = [];
let answerBox = null;

const tiles = topics.map((topic, index) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'conv-tile';
  tile.setAttribute('aria-pressed', 'false');
  tile.innerHTML = `<img src="${topic.image}" alt="" loading="lazy" decoding="async" /><span class="tile-num">Tema ${String(index + 1).padStart(2, '0')}</span><strong>${topic.short}</strong>`;
  tile.addEventListener('click', () => { if (!spinning) showTopic(index); });
  tilesBox.append(tile);
  return tile;
});

function showTopic(index) {
  const topic = topics[index];
  current = index;
  unseen = unseen.filter((item) => item !== index);
  tiles.forEach((tile, i) => { tile.classList.toggle('is-active', i === index); tile.setAttribute('aria-pressed', String(i === index)); });
  convStage.classList.remove('is-empty', 'is-new');
  void convStage.offsetWidth;
  convStage.classList.add('is-new');
  const photo = convPhoto.querySelector('img');
  convPhoto.style.setProperty('--img', `url("${topic.image}")`);
  photo.src = topic.image;
  photo.alt = topic.prompt;
  convPhoto.tabIndex = 0;
  convStage.querySelector('.conv-num').textContent = `Tema ${String(index + 1).padStart(2, '0')} · ${topic.short}`;
  convStage.querySelector('h3').textContent = topic.prompt;
  convStage.querySelector('.conv-questions').innerHTML = topic.questions.map((question) => `<li>${question}</li>`).join('');
  // The student can write a summary of what they said about this topic.
  if (window.elmAnswerBox) {
    if (!answerBox) { answerBox = window.elmAnswerBox('Escribe un resumen de lo que has dicho…'); convStage.querySelector('.timer').before(answerBox.element); }
    answerBox.setItem('conversation', index + 1, `${topic.prompt} ${topic.questions.join(' ')}`);
  }
  resetTimer();
}

// Slot-machine spin: the highlight races across the tiles and slows down on a topic you have not seen yet.
function spin() {
  if (spinning) return;
  if (!unseen.length) unseen = topics.map((_, i) => i).filter((i) => i !== current);
  const target = unseen[Math.floor(Math.random() * unseen.length)];
  if (convReduceMotion) { showTopic(target); return; }
  spinning = true;
  spinButton.disabled = true;
  const start = current < 0 ? 0 : current;
  const steps = topics.length * 3 + ((target - start + topics.length) % topics.length);
  let step = 0;
  let delay = 70;
  const tick = () => {
    const index = (start + step) % topics.length;
    tiles.forEach((tile, i) => tile.classList.toggle('is-spinning', i === index));
    if (step >= steps) {
      tiles.forEach((tile) => tile.classList.remove('is-spinning'));
      showTopic(target);
      spinning = false;
      spinButton.disabled = false;
      return;
    }
    step += 1;
    delay += step > steps - 5 ? 70 : 12;
    setTimeout(tick, delay);
  };
  tick();
}
spinButton.addEventListener('click', spin);

// Speaking timer
const timerTime = document.querySelector('#timerTime');
const timerToggle = document.querySelector('#timerToggle');
const timerNote = document.querySelector('#timerNote');
const timerBox = document.querySelector('#timer');
const ring = timerBox.querySelector('.ring-progress');
const ringLength = 2 * Math.PI * 52;
let total = 60;
let left = total;
let ticker = null;
let endsAt = 0;
ring.style.strokeDasharray = ringLength;

function paint() {
  const seconds = Math.ceil(left);
  timerTime.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  ring.style.strokeDashoffset = ringLength * (1 - left / total);
}

function stopTicker() { clearInterval(ticker); ticker = null; }

function resetTimer() {
  stopTicker();
  left = total;
  timerBox.classList.remove('is-running', 'is-done');
  timerToggle.textContent = 'Empezar';
  timerNote.textContent = 'Habla sin parar hasta que termine el tiempo.';
  paint();
}

timerToggle.addEventListener('click', () => {
  if (timerBox.classList.contains('is-done')) resetTimer();
  if (ticker) {
    stopTicker();
    timerBox.classList.remove('is-running');
    timerToggle.textContent = 'Seguir';
    return;
  }
  endsAt = Date.now() + left * 1000;
  timerBox.classList.add('is-running');
  timerToggle.textContent = 'Pausa';
  timerNote.textContent = '¡Habla! Tu compañero escucha.';
  ticker = setInterval(() => {
    left = Math.max(0, (endsAt - Date.now()) / 1000);
    paint();
    if (left <= 0) {
      stopTicker();
      timerBox.classList.remove('is-running');
      timerBox.classList.add('is-done');
      timerToggle.textContent = 'Otra vez';
      timerNote.textContent = '¡Tiempo! Ahora tu compañero te hace una pregunta.';
      // Speaking for the whole time completes this topic for the score.
      if (current >= 0) window.elmProgress?.done('conversation', current + 1);
    }
  }, 100);
});
document.querySelector('#timerReset').addEventListener('click', resetTimer);
timerBox.querySelectorAll('[data-seconds]').forEach((button) => {
  button.addEventListener('click', () => {
    total = Number(button.dataset.seconds);
    timerBox.querySelectorAll('[data-seconds]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    resetTimer();
  });
});
paint();
