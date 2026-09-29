// Site-wide motion: light, touch-friendly and disabled for users who prefer less motion.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  document.body.classList.add('has-motion');
  const revealItems = document.querySelectorAll('.hero-content, .section-heading, .deck-area, .challenge-card, .steps > div, .cards-toolbar, .conv-tiles, .conv-stage, .footer-apps');
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

  function openLightbox(frame) {
    const source = frame.querySelector('img');
    if (!source?.getAttribute('src') || frame.closest('.is-empty, .is-rolling') || !lightbox.hidden) return;
    activeFrame = frame;
    // Reserve the final size before the picture decodes so the zoom animation can measure it.
    lbImage.width = source.naturalWidth || 640;
    lbImage.height = source.naturalHeight || 960;
    lbImage.src = source.currentSrc || source.src;
    lbImage.alt = source.alt;
    lbCaption.textContent = source.alt;
    lightbox.setAttribute('aria-label', source.alt || 'Imagen');
    lightbox.hidden = false;
    document.documentElement.classList.add('lightbox-open');
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
      document.documentElement.classList.remove('lightbox-open');
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
