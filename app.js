// Locking the page hides the scrollbar; pad the body by its width so nothing behind jumps sideways.
const scrollLocks = ['menu-open', 'stage-open', 'lightbox-open'];
function lockScroll(name) {
  const root = document.documentElement;
  if (!scrollLocks.some((lock) => root.classList.contains(lock))) root.style.setProperty('--scrollbar', `${window.innerWidth - document.documentElement.clientWidth}px`);
  root.classList.add(name);
}
function unlockScroll(name) {
  document.documentElement.classList.remove(name);
}

// Mobile side menu, built from the header links so every page stays in sync.
const siteNav = document.querySelector('.site-nav');
const menuToggle = document.querySelector('.menu-toggle');
if (siteNav && menuToggle) {
  const sideMenu = document.createElement('div');
  sideMenu.className = 'side-menu';
  sideMenu.id = 'sideMenu';
  sideMenu.hidden = true;
  sideMenu.setAttribute('role', 'dialog');
  sideMenu.setAttribute('aria-modal', 'true');
  sideMenu.setAttribute('aria-label', 'Menú de niveles');
  const items = [...siteNav.querySelectorAll('a')].map((link, index) => {
    const current = link.getAttribute('aria-current') === 'page' ? ' aria-current="page"' : '';
    return `<a href="${link.getAttribute('href')}"${current} style="--k:${index}"><span class="menu-num">${index ? String(index).padStart(2, '0') : '⌂'}</span><span class="menu-label"><strong>${link.textContent}</strong><small>${link.dataset.sub || ''}</small></span><b aria-hidden="true">→</b></a>`;
  }).join('');
  sideMenu.innerHTML = `<div class="side-backdrop"></div><aside class="side-panel"><div class="side-top"><img src="assets/elm-logo.png" alt="El Mundo Hispano" /><button class="side-close" type="button" aria-label="Cerrar menú"><span></span></button></div><p class="eyebrow">Elige tu nivel</p><nav class="side-links">${items}</nav><a class="side-instagram" href="https://www.instagram.com/elmundohispano_/" target="_blank" rel="noopener">@elmundohispano_</a></aside>`;
  document.body.append(sideMenu);
  const closeButton = sideMenu.querySelector('.side-close');
  let menuTimer = null;

  const openMenu = () => {
    clearTimeout(menuTimer);
    sideMenu.hidden = false;
    lockScroll('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    void sideMenu.offsetWidth;
    sideMenu.classList.add('is-open');
    closeButton.focus({ preventScroll: true });
  };
  const closeMenu = () => {
    if (sideMenu.hidden) return;
    sideMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    unlockScroll('menu-open');
    menuTimer = setTimeout(() => { sideMenu.hidden = true; }, 420);
    menuToggle.focus({ preventScroll: true });
  };
  menuToggle.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  sideMenu.querySelector('.side-backdrop').addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  // Rotating a tablet into the desktop layout should not leave the drawer open.
  window.matchMedia('(min-width: 761px)').addEventListener('change', (query) => { if (query.matches) closeMenu(); });
}

// Site-wide motion: light, touch-friendly and disabled for users who prefer less motion.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  document.body.classList.add('has-motion');
  const revealItems = document.querySelectorAll('.hero-content, .section-heading, .deck-area, .challenge-card, .steps > div, .cards-toolbar, .conv-tiles, .conv-stage, .footer-apps, .game-feature, .feature-grid, .home-cta, .level-grid');
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
    // Start downloading the next page as soon as the pointer or finger lands on the link,
    // so it is usually ready by the time the transition ends.
    const prefetch = () => {
      if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = href;
      document.head.append(hint);
    };
    link.addEventListener('pointerenter', prefetch, { once: true });
    link.addEventListener('touchstart', prefetch, { once: true, passive: true });
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      transition.classList.add('is-leaving');
      setTimeout(() => { window.location.href = href; }, 340);
    });
  });
}
// Image lightbox: any [data-zoom-frame] (even ones added later) opens its photo full screen over a blurred backdrop.
{
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.innerHTML = '<div class="lightbox-backdrop"></div><figure class="lightbox-figure"><img class="lightbox-img" alt="" /><figcaption class="lightbox-caption"></figcaption></figure><button class="lightbox-close" type="button" aria-label="Cerrar imagen"><span></span></button>';
  document.body.append(lightbox);
  const lbImage = lightbox.querySelector('.lightbox-img');
  const lbCaption = lightbox.querySelector('.lightbox-caption');
  const lbClose = lightbox.querySelector('.lightbox-close');
  const easing = 'cubic-bezier(.2,.8,.2,1)';
  let activeFrame = null;
  let isClosing = false;

  // A contained photo only fills part of its box, so measure the visible picture, not the whole box.
  function visibleRect(img) {
    const box = img.getBoundingClientRect();
    if (getComputedStyle(img).objectFit !== 'contain') return box;
    const ratio = (img.naturalWidth || 2) / (img.naturalHeight || 3);
    let width = box.width;
    let height = width / ratio;
    if (height > box.height) { height = box.height; width = height * ratio; }
    return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
  }

  function flipFrom(rect) {
    const target = lbImage.getBoundingClientRect();
    const scale = rect.width / target.width;
    const x = rect.left + rect.width / 2 - (target.left + target.width / 2);
    const y = rect.top + rect.height / 2 - (target.top + target.height / 2);
    return `translate(${x}px, ${y}px) scale(${scale})`;
  }

  let isOpening = false;
  async function openLightbox(frame) {
    const source = frame.querySelector('img');
    if (!source?.getAttribute('src') || frame.closest('.is-empty, .is-rolling') || !lightbox.hidden || isOpening) return;
    isOpening = true;
    activeFrame = frame;
    // Reserve the final size before the picture decodes so the zoom animation can measure it.
    lbImage.width = source.naturalWidth || 640;
    lbImage.height = source.naturalHeight || 960;
    lbImage.src = source.currentSrc || source.src;
    // Wait for the new picture so the previously viewed one never flashes before it.
    await Promise.race([lbImage.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 900))]);
    isOpening = false;
    lbImage.alt = source.alt;
    lbCaption.textContent = source.alt;
    lightbox.setAttribute('aria-label', source.alt || 'Imagen');
    lightbox.hidden = false;
    lockScroll('lightbox-open');
    frame.classList.add('is-zoomed');
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    if (!reduceMotion) {
      lbImage.animate([{ transform: flipFrom(visibleRect(source)), borderRadius: '4px' }, { transform: 'none', borderRadius: '10px' }], { duration: 560, easing });
    }
    lbClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (lightbox.hidden || isClosing) return;
    isClosing = true;
    lightbox.classList.remove('is-open');
    const source = activeFrame?.querySelector('img');
    const box = source?.getBoundingClientRect();
    const onScreen = box && box.bottom > 0 && box.top < window.innerHeight;
    const finish = () => {
      lightbox.hidden = true;
      isClosing = false;
      unlockScroll('lightbox-open');
      activeFrame?.classList.remove('is-zoomed');
      activeFrame?.focus({ preventScroll: true });
      activeFrame = null;
    };
    if (reduceMotion) { finish(); return; }
    const frames = onScreen
      ? [{ transform: 'none', opacity: 1 }, { transform: flipFrom(visibleRect(source)), opacity: 1 }]
      : [{ transform: 'none', opacity: 1 }, { transform: 'scale(.92)', opacity: 0 }];
    lbImage.animate(frames, { duration: 420, easing, fill: 'forwards' }).finished.then(() => {
      lbImage.getAnimations().forEach((animation) => animation.cancel());
      finish();
    });
  }

  document.addEventListener('click', (event) => {
    const frame = event.target.closest('[data-zoom-frame]');
    if (frame) openLightbox(frame);
  });
  document.addEventListener('keydown', (event) => {
    const frame = event.target.closest?.('[data-zoom-frame]');
    if (frame && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openLightbox(frame); }
  });
  lightbox.addEventListener('click', (event) => { if (event.target !== lbImage) closeLightbox(); });
  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'Tab') { event.preventDefault(); lbClose.focus(); }
  });
}

// Answer box shared by the games: the student writes what they would say and it is saved to
// their account (student.js → window.elmProgress), where they and the admin can read it later.
window.elmAnswerBox = function createAnswerBox(placeholder = 'Escribe aquí lo que dirías en español…') {
  const id = `answer-${Math.random().toString(36).slice(2, 8)}`;
  const form = document.createElement('form');
  form.className = 'answer-box';
  form.noValidate = true;
  form.innerHTML = `<label for="${id}">Tu respuesta <small>· se guarda en tu cuenta</small></label><textarea id="${id}" rows="3" maxlength="2000" placeholder="${placeholder}"></textarea><div class="answer-row"><span class="answer-status" role="status"></span><button class="button" type="submit">Guardar <span>✓</span></button></div>`;
  const textarea = form.querySelector('textarea');
  const status = form.querySelector('.answer-status');
  const button = form.querySelector('button');
  let item = null;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!item) return;
    if (!text) { status.textContent = 'Escribe tu respuesta primero.'; textarea.focus(); return; }
    if (!window.elmProgress) { status.textContent = 'Inicia sesión para guardar tu respuesta.'; return; }
    button.disabled = true;
    status.textContent = 'Guardando…';
    const result = await window.elmProgress.answer(item.activity, item.key, item.prompt, text);
    button.disabled = false;
    status.textContent = result.ok ? '✓ Guardada. La verás en «Mi cuenta».' : result.message;
    if (result.ok) { textarea.value = ''; form.classList.add('is-saved'); setTimeout(() => form.classList.remove('is-saved'), 900); }
  });
  return {
    element: form,
    setItem(activity, key, prompt) { item = { activity, key: String(key), prompt }; textarea.value = ''; status.textContent = ''; },
    focus() { textarea.focus({ preventScroll: true }); }
  };
};
