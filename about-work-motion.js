// About-M2 only. The approved Work layout and native gallery/lightbox controls stay in charge.
(() => {
  function init() {
    const root = document.querySelector('body.about-v2');
    const timeline = root?.querySelector('#work .work-timeline');
    const entries = timeline ? [...timeline.querySelectorAll(':scope > .work-entry')] : [];
    if (entries.length !== 2 || !window.matchMedia || !window.requestAnimationFrame) return;

    const groups = entries.flatMap(entry => [
      { element: entry.querySelector('.work-story-copy'), kind: 'text', current: 1, target: 1 },
      { element: entry.querySelector('.work-cover'), kind: 'photo', current: 1, target: 1 }
    ]);
    if (groups.some(group => !group.element) || entries.some(entry => !entry.querySelector('.timeline-dot'))) return;

    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let active = false, events, observer, frame = 0, lastTime = 0;
    let line = { current: 1, target: 1, start: 0, end: 0, length: 1, milestones: [] };
    const clamp = value => Math.min(1, Math.max(0, value));
    const progress = (position, start, end) => clamp((position - start) / Math.max(1, end - start));

    function travel(group) {
      if (innerWidth <= 600) return 18;
      if (innerWidth <= 1024) return group.kind === 'text' ? 26 : 30;
      return group.kind === 'text' ? 35 : 55;
    }
    function render() {
      timeline.style.setProperty('--work-line-progress', line.current.toFixed(4));
      entries.forEach((entry, index) => {
        entry.dataset.workMilestone = line.current + .0005 >= line.milestones[index] ? 'active' : 'inactive';
      });
      for (const group of groups) {
        const offset = (1 - group.current) * travel(group);
        group.element.style.setProperty('--work-offset', `${offset.toFixed(2)}px`);
        group.element.style.setProperty('--work-opacity', (.2 + .8 * group.current).toFixed(4));
        group.offset = offset;
      }
    }
    function measure() {
      const scroll = scrollY;
      const track = timeline.getBoundingClientRect();
      const first = entries[0].querySelector('.timeline-dot').getBoundingClientRect();
      const top = first.top + first.height / 2 + scroll;
      const bottom = track.bottom + scroll;
      line.start = top - innerHeight * .72;
      line.end = bottom - innerHeight * .55;
      line.length = Math.max(1, bottom - top);
      line.milestones = entries.map(entry => {
        const dot = entry.querySelector('.timeline-dot').getBoundingClientRect();
        return clamp((dot.top + dot.height / 2 + scroll - top) / line.length);
      });
      for (const group of groups) {
        const rect = group.element.getBoundingClientRect();
        const topAtRest = rect.top + scroll -
          (group.kind === 'text' || innerWidth <= 600 ? (group.offset || 0) : 0);
        const begin = group.kind === 'photo' ? .80 : .85;
        const finish = group.kind === 'photo' ? .53 : .58;
        group.start = topAtRest - innerHeight * begin;
        group.end = topAtRest - innerHeight * finish;
      }
    }
    function targets() {
      const scroll = scrollY;
      line.target = progress(scroll, line.start, line.end);
      for (const group of groups) {
        group.target = group.element.contains(document.activeElement)
          ? 1 : progress(scroll, group.start, group.end);
      }
    }
    function settle() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      line.current = line.target;
      groups.forEach(group => { group.current = group.target; });
      render();
    }
    function tick(now) {
      frame = 0;
      if (!active || document.hidden) return;
      try {
        const elapsed = lastTime ? Math.min(64, now - lastTime) : 16;
        lastTime = now;
        // A 70ms time constant reaches about 90% of a change in 160ms.
        const fraction = 1 - Math.exp(-elapsed / 70);
        let moving = false;
        for (const item of [line, ...groups]) {
          item.current += (item.target - item.current) * fraction;
          if (Math.abs(item.target - item.current) < .001) item.current = item.target;
          else moving = true;
        }
        render();
        if (moving) frame = requestAnimationFrame(tick);
        else lastTime = 0;
      } catch (_) { deactivate(); }
    }
    function requestUpdate() {
      if (!active) return;
      try {
        targets();
        if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
      } catch (_) { deactivate(); }
    }
    function remeasure() {
      if (!active) return;
      try {
        measure();
        targets();
        settle();
      } catch (_) { deactivate(); }
    }
    function deactivate() {
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
      events?.abort();
      observer?.disconnect();
      root.removeAttribute('data-work-motion');
      entries.forEach(entry => entry.removeAttribute('data-work-milestone'));
      groups.forEach(group => { group.offset = 0; });
    }
    function activate() {
      if (active || preference.matches) return;
      try {
        events = new AbortController();
        const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler,
          { ...options, signal: events.signal });
        observer = new ResizeObserver(remeasure);
        observer.observe(timeline);
        listen(window, 'scroll', requestUpdate, { passive: true });
        listen(window, 'resize', remeasure);
        listen(window, 'orientationchange', remeasure);
        listen(window, 'load', remeasure);
        listen(window, 'pageshow', remeasure);
        listen(document, 'visibilitychange', () => { if (!document.hidden) remeasure(); });
        listen(root.querySelector('#work'), 'focusin', event => {
          const focused = groups.find(group => group.element.contains(event.target));
          if (focused) { focused.current = 1; focused.target = 1; render(); }
          requestUpdate();
        });
        listen(root.querySelector('#work'), 'focusout', requestUpdate);
        entries.forEach(entry => {
          entry.querySelectorAll('img').forEach(image => listen(image, 'load', remeasure));
          entry.querySelectorAll('details').forEach(details => listen(details, 'toggle', remeasure));
        });
        measure();
        targets();
        line.current = line.target;
        groups.forEach(group => { group.current = group.target; });
        render();
        active = true;
        root.dataset.workMotion = 'ready';
      } catch (_) { deactivate(); }
    }
    preference.addEventListener('change', () => {
      if (preference.matches) deactivate();
      else activate();
    });
    activate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
