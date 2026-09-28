const challenges = [
  { title: 'PresÃ©ntate', task: 'Mira tu tarjeta de identidad. PresÃ©ntate a tu compaÃ±ero: di tu nombre, tu nacionalidad y la ciudad donde vives.', tip: 'DespuÃ©s, pregunta: Â«Â¿Y tÃº?Â»', image: 'assets/prompt-identity.png' },
  { title: 'Conoce a tu compaÃ±ero', task: 'Sois dos personas que se conocen por primera vez. Haz tres preguntas para descubrir informaciÃ³n personal de tu compaÃ±ero.', tip: 'Puedes preguntar: nombre, paÃ­s, ciudad o profesiÃ³n.', image: 'assets/prompt-conversation.png' },
  { title: 'En una cafeterÃ­a', task: 'EstÃ¡s en esta cafeterÃ­a. Pide una bebida y pregunta cuÃ¡nto cuesta. Tu compaÃ±ero es la persona que atiende.', tip: 'Usa: Â«Quieroâ€¦Â», Â«Â¿CuÃ¡nto cuesta?Â» y Â«Por favorÂ».', image: 'assets/prompt-cafe.png' },
  { title: 'Mi casa', task: 'Observa la habitaciÃ³n. Describe tu casa o tu habitaciÃ³n en tres frases: di quÃ© hay y cÃ³mo es.', tip: 'Usa: Â«Hayâ€¦Â», Â«Es grande/pequeÃ±aÂ» y colores.', image: 'assets/prompt-home.png' },
  { title: 'Una llamada', task: 'Llama a tu compaÃ±ero para organizar una cita. PropÃ³n un dÃ­a, una hora y un lugar.', tip: 'Usa: Â«Â¿Quedamos elâ€¦?Â» y Â«Â¿A quÃ© hora?Â»', image: 'assets/prompt-call.png' },
  { title: 'TÃº eliges', task: 'Elige un tema de esta unidad y habla durante 30 segundos. Tu compaÃ±ero escucha y hace una pregunta al final.', tip: 'Respira, piensa y empieza con una frase sencilla.', image: 'assets/prompt-choice.png' },
  { title: 'Cambio de personaje', task: 'Elegid una situaciÃ³n anterior. Cambiad los papeles y repetid el diÃ¡logo con el nuevo personaje.', tip: 'Intenta usar una frase diferente esta vez.', image: 'assets/prompt-roles.png' }
];

let remaining = [...challenges];
const drawButton = document.querySelector('#drawButton');
const challengeCard = document.querySelector('#challengeCard');
const deckNote = document.querySelector('#deckNote');

function showChallenge(challenge) {
  challengeCard.classList.remove('is-empty');
  challengeCard.querySelector('.card-image').style.backgroundImage = `url("${challenge.image}")`;
  challengeCard.querySelector('.card-number').textContent = `RETO · ${String(challenges.indexOf(challenge) + 1).padStart(2, '0')}`;
  challengeCard.querySelector('h3').textContent = challenge.title;
  challengeCard.querySelector('.card-content > p').textContent = challenge.task;
  challengeCard.querySelector('.tip').innerHTML = `<span>✦</span> ${challenge.tip}`;
}

function drawChallenge() {
  if (drawButton.disabled) return;
  if (!remaining.length) remaining = [...challenges];
  const index = Math.floor(Math.random() * remaining.length);
  const challenge = remaining.splice(index, 1)[0];
  const previewCards = challenges.filter((item) => item !== challenge).sort(() => Math.random() - .5);
  const rounds = previewCards.length;
  let currentRound = 0;
  let delay = 85;

  drawButton.disabled = true;
  drawButton.classList.remove('draw'); void drawButton.offsetWidth; drawButton.classList.add('draw');
  challengeCard.classList.add('is-rolling');

  function rollCard() {
    if (currentRound < rounds) {
      const preview = previewCards[currentRound];
      showChallenge(preview);
      challengeCard.classList.remove('card-swap'); void challengeCard.offsetWidth; challengeCard.classList.add('card-swap');
      currentRound += 1;
      delay += 38;
      setTimeout(rollCard, delay);
      return;
    }
    showChallenge(challenge);
    challengeCard.classList.remove('card-swap'); void challengeCard.offsetWidth; challengeCard.classList.add('card-swap', 'is-selected');
    challengeCard.classList.remove('is-rolling');
    deckNote.textContent = remaining.length ? `${remaining.length} reto${remaining.length === 1 ? '' : 's'} más en el mazo` : '¡Mazo terminado! El próximo toque empieza de nuevo.';
    setTimeout(() => { drawButton.disabled = false; }, 420);
  }
  rollCard();
}
drawButton?.addEventListener('click', drawChallenge);
// Site-wide motion: light, touch-friendly and disabled for users who prefer less motion.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  document.body.classList.add('has-motion');
  const revealItems = document.querySelectorAll('.hero-content, .section-heading, .deck-area, .challenge-card, .steps > div, .coming-soon');
  revealItems.forEach((item, index) => {
    item.classList.add('reveal');
    item.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.16 });
  revealItems.forEach((item) => observer.observe(item));

  const hero = document.querySelector('.hero');
  hero?.addEventListener('pointermove', (event) => {
    const box = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${((event.clientX - box.left) / box.width - .5) * 16}px`);
    hero.style.setProperty('--my', `${((event.clientY - box.top) / box.height - .5) * 16}px`);
  });
  hero?.addEventListener('pointerleave', () => { hero.style.setProperty('--mx', '0px'); hero.style.setProperty('--my', '0px'); });

  if (window.matchMedia('(pointer: fine)').matches) {
    const orb = document.createElement('div');
    orb.className = 'pointer-orb';
    document.body.append(orb);
    window.addEventListener('pointermove', (event) => {
      orb.style.transform = `translate(${event.clientX - 15}px, ${event.clientY - 15}px)`;
    });
  }
}
// Branded transition between the A1.1 and A1.2 pages.
if (!reduceMotion) {
  const transition = document.createElement('div');
  transition.className = 'page-transition is-entering';
  transition.setAttribute('aria-hidden', 'true');
  document.body.append(transition);
  requestAnimationFrame(() => { requestAnimationFrame(() => transition.classList.remove('is-entering')); });

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    const isPageLink = href && !href.startsWith('#') && !link.target && !link.hasAttribute('download');
    if (!isPageLink) return;
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      transition.classList.add('is-leaving');
      setTimeout(() => { window.location.href = href; }, 560);
    });
  });
}