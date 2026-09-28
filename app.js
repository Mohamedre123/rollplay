const challenges = [
  { title: 'PresÃ©ntate', task: 'Mira tu tarjeta de identidad. PresÃ©ntate a tu compaÃ±ero: di tu nombre, tu nacionalidad y la ciudad donde vives.', tip: 'DespuÃ©s, pregunta: Â«Â¿Y tÃº?Â»', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Conoce a tu compaÃ±ero', task: 'Sois dos personas que se conocen por primera vez. Haz tres preguntas para descubrir informaciÃ³n personal de tu compaÃ±ero.', tip: 'Puedes preguntar: nombre, paÃ­s, ciudad o profesiÃ³n.', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85' },
  { title: 'En una cafeterÃ­a', task: 'EstÃ¡s en esta cafeterÃ­a. Pide una bebida y pregunta cuÃ¡nto cuesta. Tu compaÃ±ero es la persona que atiende.', tip: 'Usa: Â«Quieroâ€¦Â», Â«Â¿CuÃ¡nto cuesta?Â» y Â«Por favorÂ».', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Mi casa', task: 'Observa la habitaciÃ³n. Describe tu casa o tu habitaciÃ³n en tres frases: di quÃ© hay y cÃ³mo es.', tip: 'Usa: Â«Hayâ€¦Â», Â«Es grande/pequeÃ±aÂ» y colores.', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Una llamada', task: 'Llama a tu compaÃ±ero para organizar una cita. PropÃ³n un dÃ­a, una hora y un lugar.', tip: 'Usa: Â«Â¿Quedamos elâ€¦?Â» y Â«Â¿A quÃ© hora?Â»', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85' },
  { title: 'TÃº eliges', task: 'Elige un tema de esta unidad y habla durante 30 segundos. Tu compaÃ±ero escucha y hace una pregunta al final.', tip: 'Respira, piensa y empieza con una frase sencilla.', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Cambio de personaje', task: 'Elegid una situaciÃ³n anterior. Cambiad los papeles y repetid el diÃ¡logo con el nuevo personaje.', tip: 'Intenta usar una frase diferente esta vez.', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=85' }
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
  const previewCards = challenges.filter((item) => item !== challenge);
  const rounds = 9;
  let currentRound = 0;
  let delay = 85;

  drawButton.disabled = true;
  drawButton.classList.remove('draw'); void drawButton.offsetWidth; drawButton.classList.add('draw');
  challengeCard.classList.add('is-rolling');

  function rollCard() {
    if (currentRound < rounds) {
      const preview = previewCards[Math.floor(Math.random() * previewCards.length)];
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