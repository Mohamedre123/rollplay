const challenges = [
  { title: 'Preséntate', task: 'Mira tu tarjeta de identidad. Preséntate a tu compañero: di tu nombre, tu nacionalidad y la ciudad donde vives.', tip: 'Después, pregunta: «¿Y tú?»', image: 'assets/prompt-identity.jpg' },
  { title: 'Conoce a tu compañero', task: 'Sois dos personas que se conocen por primera vez. Haz tres preguntas para descubrir información personal de tu compañero.', tip: 'Puedes preguntar: nombre, país, ciudad o profesión.', image: 'assets/prompt-conversation.jpg' },
  { title: 'En una cafetería', task: 'Estás en esta cafetería. Pide una bebida y pregunta cuánto cuesta. Tu compañero es la persona que atiende.', tip: 'Usa: «Quiero…», «¿Cuánto cuesta?» y «Por favor».', image: 'assets/prompt-cafe.jpg' },
  { title: 'Mi casa', task: 'Observa la habitación. Describe tu casa o tu habitación en tres frases: di qué hay y cómo es.', tip: 'Usa: «Hay…», «Es grande/pequeña» y colores.', image: 'assets/prompt-home.jpg' },
  { title: 'Una llamada', task: 'Llama a tu compañero para organizar una cita. Propón un día, una hora y un lugar.', tip: 'Usa: «¿Quedamos el…?» y «¿A qué hora?»', image: 'assets/prompt-call.jpg' },
  { title: 'Tú eliges', task: 'Elige un tema de esta unidad y habla durante 30 segundos. Tu compañero escucha y hace una pregunta al final.', tip: 'Respira, piensa y empieza con una frase sencilla.', image: 'assets/prompt-choice.jpg' },
  { title: 'Cambio de personaje', task: 'Elegid una situación anterior. Cambiad los papeles y repetid el diálogo con el nuevo personaje.', tip: 'Intenta usar una frase diferente esta vez.', image: 'assets/prompt-roles.jpg' }
];

const preloadedImages = challenges.map(({ image }) => { const preload = new Image(); preload.src = image; return preload; });

let remaining = [...challenges];
const drawButton = document.querySelector('#drawButton');
const challengeCard = document.querySelector('#challengeCard');
const deckNote = document.querySelector('#deckNote');

function showChallenge(challenge) {
  challengeCard.classList.remove('is-empty');
  const frame = challengeCard.querySelector('.card-image');
  const photo = frame.querySelector('.card-photo');
  frame.style.setProperty('--img', `url("${challenge.image}")`);
  photo.src = challenge.image;
  photo.alt = challenge.title;
  frame.tabIndex = 0;
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
