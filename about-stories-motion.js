// About-M3 card reveal only. Story panel interactions remain in the existing shared controller.
(() => {
  function init() {
    const root = document.querySelector('body.about-v2');
    const grid = root?.querySelector('#personal-story-grid');
    if (!root || !grid) return;
    const cards = [...grid.querySelectorAll('.personal-story-card[data-story-target]')];
    if (cards.length !== 4 || !window.matchMedia) return;

    const motion = matchMedia('(prefers-reduced-motion: no-preference)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const records = cards.map((element, index) => ({ element, index, seen: false, timer: 0 }));
    const byCard = new Map(records.map(record => [record.element, record]));
    let observer, events, active = false;

    function settle(record) {
      record.seen = true;
      clearTimeout(record.timer);
      observer?.unobserve(record.element);
      record.element.dataset.storyRevealState = 'settled';
      record.element.style.removeProperty('--story-reveal-delay');
    }
    function reveal(record) {
      if (!active || record.seen) return;
      observer.unobserve(record.element);
      record.element.style.setProperty('--story-reveal-delay', `${record.index * (innerWidth <= 768 ? 70 : 110)}ms`);
      record.element.dataset.storyRevealState = 'revealing';
      const delay = record.index * (innerWidth <= 768 ? 70 : 110);
      record.timer = setTimeout(() => settle(record), 700 + delay + 100);
      record.seen = true;
    }
    function fail() {
      active = false;
      observer?.disconnect();
      events?.abort();
      records.forEach(settle);
      root.dataset.storyReveal = 'complete';
    }
    function start() {
      if (active || !motion.matches || !('IntersectionObserver' in window)) return;
      try {
        events = new AbortController();
        observer = new IntersectionObserver(entries => {
          try {
            entries.forEach(entry => {
              const record = byCard.get(entry.target);
              if (record && entry.isIntersecting) reveal(record);
            });
          } catch (_) { fail(); }
        }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
        root.querySelector('#personal-stories').addEventListener('focusin', event => {
          const card = event.target.closest('.personal-story-card');
          const record = byCard.get(card);
          if (record) settle(record);
        }, { signal: events.signal });

        // Keep content already on screen or above the viewport visible on initialization.
        records.forEach(record => {
          const rect = record.element.getBoundingClientRect();
          record.seen = rect.top < innerHeight || rect.bottom <= 0;
          record.element.dataset.storyRevealState = record.seen ? 'settled' : 'pending';
          if (!record.seen) observer.observe(record.element);
        });
        active = true;
        root.dataset.storyReveal = 'ready';
      } catch (_) { fail(); }
    }

    if (!reduced.matches) start();
    motion.addEventListener('change', () => {
      if (motion.matches && !reduced.matches) start();
      else fail();
    });
    reduced.addEventListener('change', () => {
      if (reduced.matches) fail();
      else start();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
