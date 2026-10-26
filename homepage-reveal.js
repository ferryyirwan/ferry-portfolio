// Beyond the Code pilot only. The approved layout is visible without this file.
(() => {
  function init() {
    const section = document.querySelector('.home-page .beyond-section');
    const copy = section?.querySelector('.beyond-copy');
    const collage = section?.querySelector('.personal-collage');
    const photos = [...(collage?.querySelectorAll(':scope > figure') || [])];
    if (!copy || !collage || photos.length !== 3 || section.dataset.beyondReveal) return;
    const items = [copy, ...photos];
    const groups = new Map([[copy, [copy]], [collage, photos]]);
    const jobs = new Map();
    let observer, events;

    function finish(item) {
      const job = jobs.get(item);
      if (job) { cancelAnimationFrame(job.frame);clearTimeout(job.timer);jobs.delete(item); }
      item.dataset.revealState = 'settled';
    }
    function finishAll() {
      observer?.disconnect();
      events?.abort();
      items.forEach(finish);
      // Also suppress the earlier homepage pilot for these four items only.
      section.dataset.beyondReveal = 'complete';
    }
    function reveal(target) {
      observer.unobserve(target);
      for (const item of groups.get(target)) {
        if (item.dataset.revealState !== 'pending') continue;
        const job = { frame: 0, timer: 0 };
        jobs.set(item, job);
        job.frame = requestAnimationFrame(() => {
          job.frame = 0;
          item.dataset.revealState = 'revealing';
          // Cleanup also works if transitionend is omitted by the browser.
          job.timer = setTimeout(() => {
            finish(item);
            if (items.every(el => el.dataset.revealState === 'settled')) finishAll();
          }, 1200);
        });
      }
    }
    function anchorSkipsReveal() {
      if (!location.hash) return false;
      let target;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
      catch (_) { return false; }
      return target && (section.contains(target) || target.getBoundingClientRect().top >= section.getBoundingClientRect().top);
    }

    try {
      if (!window.matchMedia || !('IntersectionObserver' in window)) { finishAll();return; }
      const preference = matchMedia('(prefers-reduced-motion: reduce)');
      if (preference.matches || anchorSkipsReveal()) { finishAll();return; }
      events = new AbortController();
      const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
      // Keep already-passed content inside the observer's upper range so even
      // a jump over the entire section is reported, without a scroll listener.
      const upperRange = Math.max(document.documentElement.scrollHeight, innerHeight);
      observer = new IntersectionObserver(entries => {
        try {
          for (const entry of entries) {
            if (entry.boundingClientRect.bottom <= 0) {
              groups.get(entry.target).forEach(finish);
              observer.unobserve(entry.target);
            }
            else if (entry.isIntersecting) reveal(entry.target);
          }
          if (items.every(el => el.dataset.revealState === 'settled')) finishAll();
        } catch (_) { finishAll(); }
      }, { rootMargin: `${upperRange}px 0px -48px 0px`, threshold: .12 });
      listen(section, 'focusin', finishAll);
      listen(section, 'transitionend', event => {
        if (!items.includes(event.target) || event.propertyName !== 'opacity') return;
        finish(event.target);
        if (items.every(el => el.dataset.revealState === 'settled')) finishAll();
      });
      listen(preference, 'change', () => { if (preference.matches) finishAll(); });
      listen(window, 'hashchange', () => { if (anchorSkipsReveal()) finishAll(); });
      listen(window, 'pagehide', finishAll);
      listen(window, 'pageshow', event => { if (event.persisted) finishAll(); });

      // Read geometry before writing states. Already visible/restored content
      // stays still; no delayed concealment or replay on direct navigation.
      const pending = [...groups.keys()].filter(target => target.getBoundingClientRect().top >= innerHeight);
      pending.forEach(target => observer.observe(target));
      section.dataset.beyondReveal = 'ready';
      for (const [target, children] of groups) {
        for (const item of children) {
          item.dataset.beyondItem = '';
          item.dataset.revealState = pending.includes(target) ? 'pending' : 'settled';
        }
      }
      if (!pending.length) finishAll();
    } catch (_) {
      // A partial setup failure never leaves content waiting for an observer.
      finishAll();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
