// About-M1 only. No shared navigation, gallery or story behavior is replaced.
(() => {
  function init() {
    const root = document.querySelector('body.about-v2');
    if (!root || root.dataset.aboutMotion) return;
    const records = [];
    const add = (selector, direction = 'up', duration = 650, stagger = 0, entry = false) => {
      root.querySelectorAll(selector).forEach((element, index) => records.push({
        element, direction, duration, delay: index * stagger,
        mobileDelay: (index % 2) * stagger, entry, seen: false, watched: false
      }));
    };
    add('#profile .about-intro-copy', 'intro-left', 700, 0, true);
    add('#profile .intro-photo', 'intro-right', 750, 0, true);
    add('#awards > .about-section-heading');
    add('#awards .education-information');
    add('#awards .recognition-note');
    add('#awards .recognition-photos figure', 'up', 650, 110);
    add('#campus-life .about-section-heading');
    add('#oc > .campus-feature-photo', 'left', 750);
    add('#oc > .campus-feature-copy', 'right', 700);
    add('#csr > .campus-feature-copy', 'left', 700);
    add('#csr > .campus-feature-photo', 'right', 750);
    add('#journal-gallery-orientation > figure', 'photo', 650, 110);
    add('#journal-gallery-csr > figure', 'photo', 650, 110);
    add('.continue-exploring > div:first-child', 'continue', 600);
    add('.continue-exploring > .about-cta-links', 'continue', 600, 0);
    const ctas = records.find(record => record.element.matches('.about-cta-links'));
    if (ctas) ctas.delay = 110;
    if (!records.length) return;

    const byElement = new Map(records.map(record => [record.element, record]));
    const jobs = new Map();
    let observer, events, enabled = true;
    const available = record => !record.element.closest('details:not([open]), [hidden]');
    function finish(record) {
      const job = jobs.get(record);
      if (job) { cancelAnimationFrame(job.frame);clearTimeout(job.timer);jobs.delete(record); }
      observer?.unobserve(record.element);
      record.watched = false;
      record.seen = true;
      record.element.dataset.aboutState = 'settled';
    }
    function finishAll() {
      enabled = false;
      observer?.disconnect();
      events?.abort();
      records.forEach(finish);
      root.dataset.aboutMotion = 'complete';
    }
    function completeIfDone() {
      if (records.every(record => record.seen)) finishAll();
    }
    function reveal(record) {
      observer.unobserve(record.element);
      record.watched = false;
      if (record.seen || jobs.has(record)) return;
      const job = { frame: 0, timer: 0 };
      jobs.set(record, job);
      job.frame = requestAnimationFrame(() => {
        job.frame = 0;
        record.element.dataset.aboutState = 'revealing';
        job.timer = setTimeout(() => { finish(record);completeIfDone(); }, record.duration + record.delay + 180);
      });
    }
    function observe(record) {
      if (!enabled || record.seen || record.watched || !available(record)) return;
      observer.observe(record.element);
      record.watched = true;
    }
    function anchor() {
      try { return location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; }
      catch (_) { return null; }
    }
    function precedesAnchor(record, target) {
      return target && (target.contains(record.element) || record.element.contains(target)
        || !!(record.element.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING));
    }
    function settleAncestors(target) {
      for (const record of records) if (record.element.contains(target)) finish(record);
      completeIfDone();
    }

    try {
      if (!window.matchMedia || !('IntersectionObserver' in window)) { finishAll();return; }
      const preference = matchMedia('(prefers-reduced-motion: reduce)');
      if (preference.matches) { finishAll();return; }
      events = new AbortController();
      const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
      const upperRange = Math.max(document.documentElement.scrollHeight, innerHeight);
      observer = new IntersectionObserver(entries => {
        try {
          for (const entry of entries) {
            const record = byElement.get(entry.target);
            if (!enabled || record.seen || !available(record)) continue;
            if (entry.boundingClientRect.bottom <= 0) finish(record);
            else if (entry.isIntersecting) reveal(record);
          }
          completeIfDone();
        } catch (_) { finishAll(); }
      }, { rootMargin: `${upperRange}px 0px -48px 0px`, threshold: .12 });
      listen(root.querySelector('main'), 'focusin', event => settleAncestors(event.target));
      listen(root.querySelector('main'), 'transitionend', event => {
        const record = byElement.get(event.target);
        if (!record || event.propertyName !== 'opacity') return;
        finish(record);completeIfDone();
      });
      listen(preference, 'change', () => { if (preference.matches) finishAll(); });
      listen(window, 'hashchange', () => {
        const target = anchor();
        records.filter(record => precedesAnchor(record, target)).forEach(finish);
        completeIfDone();
      });
      listen(window, 'pagehide', finishAll);
      listen(window, 'pageshow', event => { if (event.persisted) finishAll(); });

      // Observe only these existing disclosures. Their native open/close state
      // and the shared toggle/lightbox implementation remain the sole controls.
      root.querySelectorAll('#journal-disclosure-orientation, #journal-disclosure-csr').forEach(details => {
        listen(details, 'toggle', () => {
          try {
            const children = records.filter(record => details.contains(record.element));
            if (details.open) {
              // Prevent nested parent/child travel when a gallery opens early.
              settleAncestors(details);
              children.forEach(observe);
            } else {
              for (const record of children) {
                observer.unobserve(record.element);
                record.watched = false;
                if (jobs.has(record)) finish(record);
              }
            }
            completeIfDone();
          } catch (_) { finishAll(); }
        });
      });

      const target = anchor();
      // Geometry is read before pre-reveal styles. Existing visible/restored
      // content stays readable; only the two intro groups enter on initial load.
      for (const record of records) {
        const rect = record.element.getBoundingClientRect();
        record.seen = !!precedesAnchor(record, target) || (available(record)
          && (rect.bottom <= 0 || ((!record.entry || scrollY > 8) && rect.top < innerHeight)));
      }
      records.forEach(observe);
      for (const record of records) {
        const element = record.element;
        element.dataset.aboutReveal = record.direction;
        element.dataset.aboutState = record.seen ? 'settled' : 'pending';
        element.style.setProperty('--about-duration', `${record.duration}ms`);
        element.style.setProperty('--about-delay', `${record.delay}ms`);
        element.style.setProperty('--about-mobile-delay', `${record.mobileDelay}ms`);
      }
      root.dataset.aboutMotion = 'ready';
      completeIfDone();
    } catch (_) {
      // Any partial initialization failure returns every registered group to its
      // normal presentation, including photographs inside closed disclosures.
      finishAll();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
