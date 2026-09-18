'use strict';
(() => {
  const tour = document.getElementById('libraryTour');
  if (!tour) return;
  const steps = [
    ['01 / EXPLORE', 'Start with a swatch.', 'Find a pattern that catches your eye. Open it for a closer look.', 'Digital Library', '0'],
    ['02 / COLLECT', 'Make it your collection.', 'Save your favorites in one place. Download a reference whenever you need it.', 'My Collection', '2'],
    ['03 / CONNECT', 'Bring your ideas to RTC.', 'Choose your saved fabrics and add your questions in the Connection Portal.', 'Connection Portal', '2']
  ];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, playing = !reduceMotion.matches, visible = false, timer;
  const play = document.getElementById('tourPlay');
  function sync() {
    clearInterval(timer);
    const active = playing && visible && !document.hidden;
    tour.classList.toggle('is-playing', active);
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', playing ? 'Pause walkthrough' : 'Play walkthrough');
    if (active) timer = setInterval(() => show((current + 1) % steps.length), 5500);
  }
  function show(index) {
    current = index;
    tour.dataset.step = String(index);
    const [number, caption, text, page, count] = steps[index];
    document.getElementById('tourNumber').textContent = number;
    document.getElementById('tourCaption').textContent = caption;
    document.getElementById('tourText').textContent = text;
    document.getElementById('demoPage').textContent = page;
    document.getElementById('demoCount').textContent = count;
    tour.querySelectorAll('[data-scene]').forEach(e => e.hidden = Number(e.dataset.scene) !== index);
    tour.querySelectorAll('[data-tour-step]').forEach(e => e.setAttribute('aria-pressed', String(Number(e.dataset.tourStep) === index)));
    sync();
  }
  tour.querySelectorAll('[data-tour-step]').forEach(button => button.addEventListener('click', () => {
    playing = false;
    show(Number(button.dataset.tourStep));
  }));
  play.addEventListener('click', () => { playing = !playing; sync(); });
  document.getElementById('tourReplay').addEventListener('click', () => {
    playing = !reduceMotion.matches;
    show(0);
  });
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) playing = false; sync(); });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, { threshold: .2 });
  observer.observe(tour);
  show(0);
})();
