const situations = [
  { situation: 'Tu amigo llega 30 minutos tarde.', question: '¿Está bien o está mal? ¿Por qué?' },
  { situation: 'Una persona usa el móvil durante una conversación.', question: '¿Qué piensas? ¿Es educado?' },
  { situation: 'Tu compañero no hace los deberes y quiere copiar los tuyos.', question: '¿Qué haces?' },
  { situation: 'Tu amigo quiere salir, pero tú estás cansado/a.', question: '¿Qué le dices?' },
  { situation: 'Una persona escucha música muy alta por la noche.', question: '¿Está bien? ¿Por qué?' },
  { situation: 'Tu amigo siempre llega tarde a las clases.', question: '¿Qué piensas de esto?' },
  { situation: 'Estás en un restaurante y la comida no te gusta.', question: '¿Qué haces?' },
  { situation: 'Tu compañero habla mucho durante la clase.', question: '¿Qué haces?' },
  { situation: 'Tu amigo quiere ir al cine, pero tú prefieres quedarte en casa.', question: '¿Qué propones?' },
  { situation: 'Una persona no responde a tu mensaje durante dos días.', question: '¿Qué piensas? ¿Le escribes otra vez?' },
  { situation: 'Tu amigo tiene un examen mañana, pero quiere salir contigo hoy.', question: '¿Qué le dices?' },
  { situation: 'Una persona come sola en un restaurante.', question: '¿Te parece normal? ¿Por qué?' },
  { situation: 'Tu compañero llega a clase sin preparar nada.', question: '¿Qué haces?' },
  { situation: 'Tu amigo te invita a una fiesta, pero no conoces a nadie.', question: '¿Vas o no? ¿Por qué?' },
  { situation: 'Una persona trabaja mucho y nunca tiene tiempo libre.', question: '¿Es una buena idea? ¿Por qué?' }
].map((item, index) => ({ ...item, number: String(index + 1).padStart(2, '0'), image: `assets/a12/q${String(index + 1).padStart(2, '0')}.jpg` }));

const cardTable = document.querySelector('#cardTable');
const cardsCount = document.querySelector('#cardsCount');
const randomButton = document.querySelector('#randomCard');
const shuffleButton = document.querySelector('#shuffleCards');
const stage = document.querySelector('#cardStage');
const stageCard = stage.querySelector('.stage-card');
const stageInner = stage.querySelector('.stage-inner');
const stagePhoto = stage.querySelector('.face-photo img');
const stageClose = stage.querySelector('#stageClose');
const stageNext = stage.querySelector('#stageNext');
const stageAnswer = stage.querySelector('#stageAnswer');
const answerSheet = stage.querySelector('#answerSheet');
let answerBox = null;

// The student can write what they would say for the open card; it is saved to their account.
function openAnswer() {
  if (!activeCard || !window.elmAnswerBox) return;
  const item = itemFor(activeCard);
  if (!answerBox) { answerBox = window.elmAnswerBox(); answerSheet.append(answerBox.element); }
  answerBox.setItem('a1-2', item.number, `${item.situation} ${item.question}`);
  answerSheet.querySelector('#sheetTitle').textContent = item.question;
  answerSheet.hidden = false;
  stage.classList.add('is-answering');
  void answerSheet.offsetWidth;
  answerSheet.classList.add('is-open');
  answerBox.focus();
}
function closeAnswer() {
  answerSheet.classList.remove('is-open');
  answerSheet.hidden = true;
  stage.classList.remove('is-answering');
}
const cardsReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cardEasing = 'cubic-bezier(.22,.8,.24,1)';
let activeCard = null;
let isBusy = false;

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildCard(item) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'play-card';
  card.dataset.number = item.number;
  card.setAttribute('aria-label', 'Carta boca abajo');
  card.innerHTML = `<span class="pc-inner"><span class="pc-face pc-back"><span class="back-small">ROLE PLAY</span><span class="back-main">¿?</span></span><span class="pc-face pc-front"><img alt="" decoding="async" /><span class="pc-num">${item.number}</span><span class="pc-check" aria-hidden="true">✓</span></span></span>`;
  card.addEventListener('click', () => openCard(card));
  return card;
}

let cards = shuffle(situations).map(buildCard);
cardTable.append(...cards);
cards.forEach((card, index) => card.style.setProperty('--i', index));

function itemFor(card) { return situations.find((item) => item.number === card.dataset.number); }

function updateCount() {
  const left = cards.filter((card) => !card.classList.contains('is-revealed')).length;
  cardsCount.textContent = left === situations.length ? `${left} cartas por descubrir`
    : left ? `Te queda${left === 1 ? '' : 'n'} ${left} carta${left === 1 ? '' : 's'} por descubrir`
    : '¡Has descubierto todas las cartas! Baraja para empezar otra vez.';
}

// Warm the image cache once the page is idle so the flip never waits on the network.
(window.requestIdleCallback || ((fn) => setTimeout(fn, 1200)))(() => situations.forEach(({ image }) => { new Image().src = image; }));

// Decode the new picture on the element itself, so the previous card's image never flashes on screen.
function settle(img) {
  return Promise.race([img.decode().catch(() => {}), wait(900)]);
}

// Where the card should fly from/to; fall back to the bottom of the screen if it is scrolled away.
function cardRect(card) {
  const rect = card.getBoundingClientRect();
  if (rect.bottom > 0 && rect.top < window.innerHeight) return rect;
  const width = Math.min(120, window.innerWidth * .28);
  return { left: window.innerWidth / 2 - width / 2, top: window.innerHeight, width, height: width * 1.5 };
}

function offsetTo(rect) {
  const target = stageCard.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - (target.left + target.width / 2),
    y: rect.top + rect.height / 2 - (target.top + target.height / 2),
    s: rect.width / target.width
  };
}

async function openCard(card) {
  if (isBusy || !stage.hidden) return;
  isBusy = true;
  activeCard = card;
  const item = itemFor(card);
  stagePhoto.src = item.image;
  stagePhoto.alt = item.situation;
  stage.querySelector('.face-num').textContent = `Situación ${item.number} · 15`;
  stage.querySelector('#stageSituation').textContent = item.situation;
  stage.querySelector('.face-question').textContent = item.question;
  await settle(stagePhoto);

  const from = cardRect(card);
  lockScroll('stage-open');
  stage.hidden = false;
  card.classList.add('is-lifted');
  void stage.offsetWidth;
  stage.classList.add('is-open');
  if (!cardsReduceMotion) {
    const { x, y, s } = offsetTo(from);
    const mid = (s + 1) / 2 * 1.06;
    // Pin the starting pose before the first paint so the big card never shows for a frame.
    stageInner.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotateY(0deg)`;
    const flight = stageInner.animate([
      { transform: `translate(${x}px, ${y}px) scale(${s}) rotateY(0deg)` },
      { transform: `translate(${x * .35}px, ${y * .35 - 40}px) scale(${mid}) rotateY(95deg)`, offset: .5 },
      { transform: 'translate(0, 0) scale(1) rotateY(180deg)' }
    ], { duration: 900, easing: cardEasing });
    stageInner.style.transform = '';
    await flight.finished;
  }
  card.querySelector('.pc-front img').src = item.image;
  card.classList.add('is-revealed');
  window.elmProgress?.done('a1-2', item.number);
  card.setAttribute('aria-label', `Carta ${item.number}: ${item.situation}`);
  updateCount();
  stageClose.focus({ preventScroll: true });
  isBusy = false;
}

async function closeCard() {
  if (isBusy || stage.hidden) return;
  isBusy = true;
  closeAnswer();
  stage.classList.remove('is-open');
  if (!cardsReduceMotion) {
    const { x, y, s } = offsetTo(cardRect(activeCard));
    const flight = stageInner.animate([
      { transform: 'translate(0, 0) scale(1) rotateY(180deg)' },
      { transform: `translate(${x}px, ${y}px) scale(${s}) rotateY(180deg)` }
    ], { duration: 560, easing: cardEasing, fill: 'forwards' });
    await flight.finished;
    activeCard.classList.remove('is-lifted');
    flight.cancel();
  }
  activeCard.classList.remove('is-lifted');
  stage.hidden = true;
  unlockScroll('stage-open');
  activeCard.focus({ preventScroll: true });
  isBusy = false;
}

async function openRandom() {
  if (isBusy) return;
  const hidden = cards.filter((card) => !card.classList.contains('is-revealed'));
  const card = (hidden.length ? hidden : cards)[Math.floor(Math.random() * (hidden.length || cards.length))];
  const rect = card.getBoundingClientRect();
  if (rect.top < 80 || rect.bottom > window.innerHeight) {
    card.scrollIntoView({ block: 'center', behavior: cardsReduceMotion ? 'auto' : 'smooth' });
    await wait(cardsReduceMotion ? 0 : 450);
  }
  openCard(card);
}

async function reshuffle() {
  if (isBusy) return;
  isBusy = true;
  randomButton.disabled = shuffleButton.disabled = true;
  if (!cardsReduceMotion) {
    cards.forEach((card) => card.classList.remove('is-revealed'));
    await wait(cards.length ? 420 : 0);
    const box = cardTable.getBoundingClientRect();
    const gatherTo = (card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--gx', `${box.left + box.width / 2 - (rect.left + rect.width / 2)}px`);
      card.style.setProperty('--gy', `${box.top + box.height / 2 - (rect.top + rect.height / 2)}px`);
      card.style.setProperty('--gr', `${(Math.random() - .5) * 24}deg`);
    };
    cards.forEach(gatherTo);
    cardTable.classList.add('is-gathering');
    await wait(560);
    cards = shuffle(cards);
    cardTable.classList.add('no-transition');
    cardTable.append(...cards);
    cards.forEach((card, index) => { card.style.setProperty('--i', index); card.style.setProperty('--gx', '0px'); card.style.setProperty('--gy', '0px'); });
    cards.forEach(gatherTo);
    void cardTable.offsetWidth;
    cardTable.classList.remove('no-transition');
    await wait(120);
    cardTable.classList.remove('is-gathering');
    await wait(700);
  } else {
    cards = shuffle(cards);
    cards.forEach((card) => card.classList.remove('is-revealed'));
    cardTable.append(...cards);
  }
  cards.forEach((card) => { card.setAttribute('aria-label', 'Carta boca abajo'); card.querySelector('.pc-front img').removeAttribute('src'); });
  updateCount();
  randomButton.disabled = shuffleButton.disabled = false;
  isBusy = false;
}

randomButton.addEventListener('click', openRandom);
shuffleButton.addEventListener('click', reshuffle);
stageClose.addEventListener('click', closeCard);
stageAnswer.addEventListener('click', openAnswer);
answerSheet.querySelector('#sheetClose').addEventListener('click', closeAnswer);
stageNext.addEventListener('click', async () => { await closeCard(); openRandom(); });
stage.querySelector('.stage-backdrop').addEventListener('click', closeCard);
document.addEventListener('keydown', (event) => {
  if (stage.hidden || document.documentElement.classList.contains('lightbox-open')) return;
  if (event.key === 'Escape') { if (!answerSheet.hidden) closeAnswer(); else closeCard(); return; }
  if (!answerSheet.hidden) return;
  if (event.key === 'Tab') {
    const stops = [stage.querySelector('.face-photo'), stageAnswer, stageNext, stageClose];
    const index = stops.indexOf(document.activeElement);
    event.preventDefault();
    stops[(index + (event.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
  }
});

// Deal the cards onto the table the first time it scrolls into view.
if (!cardsReduceMotion) {
  cardTable.classList.add('is-waiting');
  new IntersectionObserver((entries, observer) => {
    if (!entries[0].isIntersecting) return;
    cardTable.classList.remove('is-waiting');
    cardTable.classList.add('is-dealing');
    setTimeout(() => cardTable.classList.remove('is-dealing'), 1600);
    observer.disconnect();
  }, { threshold: .15 }).observe(cardTable);
}
