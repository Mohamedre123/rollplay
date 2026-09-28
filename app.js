const challenges = [
  { title: 'Preséntate', task: 'Mira tu tarjeta de identidad. Preséntate a tu compañero: di tu nombre, tu nacionalidad y la ciudad donde vives.', tip: 'Después, pregunta: «¿Y tú?»', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Conoce a tu compañero', task: 'Sois dos personas que se conocen por primera vez. Haz tres preguntas para descubrir información personal de tu compañero.', tip: 'Puedes preguntar: nombre, país, ciudad o profesión.', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85' },
  { title: 'En una cafetería', task: 'Estás en esta cafetería. Pide una bebida y pregunta cuánto cuesta. Tu compañero es la persona que atiende.', tip: 'Usa: «Quiero…», «¿Cuánto cuesta?» y «Por favor».', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Mi casa', task: 'Observa la habitación. Describe tu casa o tu habitación en tres frases: di qué hay y cómo es.', tip: 'Usa: «Hay…», «Es grande/pequeña» y colores.', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Una llamada', task: 'Llama a tu compañero para organizar una cita. Propón un día, una hora y un lugar.', tip: 'Usa: «¿Quedamos el…?» y «¿A qué hora?»', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Tú eliges', task: 'Elige un tema de esta unidad y habla durante 30 segundos. Tu compañero escucha y hace una pregunta al final.', tip: 'Respira, piensa y empieza con una frase sencilla.', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85' },
  { title: 'Cambio de personaje', task: 'Elegid una situación anterior. Cambiad los papeles y repetid el diálogo con el nuevo personaje.', tip: 'Intenta usar una frase diferente esta vez.', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=85' }
];

let remaining = [...challenges];
const drawButton = document.querySelector('#drawButton');
const challengeCard = document.querySelector('#challengeCard');
const deckNote = document.querySelector('#deckNote');
function drawChallenge() {
  if (!remaining.length) remaining = [...challenges];
  const index = Math.floor(Math.random() * remaining.length);
  const challenge = remaining.splice(index, 1)[0];
  drawButton.classList.remove('draw'); void drawButton.offsetWidth; drawButton.classList.add('draw');
  challengeCard.classList.add('changing');
  setTimeout(() => {
    challengeCard.classList.remove('is-empty', 'changing');
    challengeCard.querySelector('.card-image').style.backgroundImage = `url("${challenge.image}")`;
    challengeCard.querySelector('.card-number').textContent = `RETO · ${String(challenges.indexOf(challenge) + 1).padStart(2, '0')}`;
    challengeCard.querySelector('h3').textContent = challenge.title;
    challengeCard.querySelector('.card-content > p').textContent = challenge.task;
    challengeCard.querySelector('.tip').innerHTML = `<span>✦</span> ${challenge.tip}`;
    deckNote.textContent = remaining.length ? `${remaining.length} reto${remaining.length === 1 ? '' : 's'} más en el mazo` : '¡Mazo terminado! El próximo toque empieza de nuevo.';
  }, 180);
}
drawButton?.addEventListener('click', drawChallenge);
