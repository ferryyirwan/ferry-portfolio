// Reversible homepage-only choreography. Native scrolling owns the timeline.
export function createHeroContinuity({ hero, getState, onProgress, debug = false }) {
  const section = document.getElementById('currently-building');
  const visual = section?.querySelector('.building-visual');
  const surface = visual?.querySelector('.screenshot-surface');
  const space = hero.querySelector('.hero-scene-space');
  const inert = { get recession() { return 0; }, refresh() {}, dispose() {} };
  if (!section || !visual || !surface || !space) return inert;

  const events = new AbortController();
  const visible = new Set([hero, section]);
  const written = new Map();
  let frame = 0, recession = 0, disposed = false, ticks = 0;
  let visibilityObserver, resizeObserver;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);
  const listen = (target, name, handler, options = {}) => target.addEventListener(name, handler, { ...options, signal: events.signal });
  function write(element, name, value) {
    const key = `${element === space ? 'lattice' : 'screen'}:${name}`;
    if (written.get(key) === value) return;
    written.set(key, value);
    element.style.setProperty(name, value);
  }
  function settle() {
    recession = 0;
    if (section.dataset.continuity !== 'settled') section.dataset.continuity = 'settled';
    write(space, '--continuity-intensity', '1');
    write(surface, '--continuity-transform', 'none');
    write(surface, '--continuity-opacity', '1');
    write(visual, '--continuity-line', '0');
  }
  function refresh() {
    if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  function update() {
    frame = 0;
    if (disposed || document.hidden) return;
    const state = getState();
    const previousRecession = recession;
    let reveal = 1;
    const enabled = state.ready && !state.paused && !state.reduced;
    if (!enabled) settle();
    else {
      // Read only untransformed layout boxes, before any visual writes. Moving
      // the child screen cannot feed its own transform back into progress.
      const heroBounds = hero.getBoundingClientRect();
      const visualBounds = visual.getBoundingClientRect();
      const height = Math.max(1, innerHeight);
      const leaving = smooth(clamp(-heroBounds.top / (heroBounds.height * .85)));
      reveal = smooth(clamp((height * .92 - visualBounds.top) / (height * .5)));
      const remaining = 1 - reveal;
      const intensity = innerWidth <= 1024 ? .7 : 1;
      recession = state.compact ? 0 : leaving * intensity;
      if (section.dataset.continuity !== 'active') section.dataset.continuity = 'active';
      write(space, '--continuity-intensity', (1 - leaving * (state.compact ? .16 : .36)).toFixed(4));
      const transform = remaining === 0 ? 'none' : state.compact
        ? `translate3d(0, ${(8 * remaining).toFixed(3)}px, 0)`
        : `perspective(1000px) translate3d(0, ${(24 * remaining * intensity).toFixed(3)}px, 0) rotateX(${(5 * remaining * intensity).toFixed(3)}deg) rotateY(${(-8 * remaining * intensity).toFixed(3)}deg) scale(${(1 - .06 * remaining * intensity).toFixed(5)})`;
      write(surface, '--continuity-transform', transform);
      write(surface, '--continuity-opacity', state.compact ? (1 - .04 * remaining).toFixed(4) : '1');
      write(visual, '--continuity-line', (4 * reveal * remaining * (state.compact ? .55 : 1)).toFixed(4));
    }
    if (debug) section.dataset.continuityDebug = JSON.stringify({
      ticks: ++ticks, enabled, compact: state.compact, recession, reveal,
      paused: state.paused, reduced: state.reduced
    });
    // Compact scroll treatment is CSS-only; never wake its static renderer.
    if (state.ready && recession !== previousRecession) onProgress();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    events.abort();
    visibilityObserver?.disconnect();
    resizeObserver?.disconnect();
    // Keep this scoped guard so the earlier one-shot ODDS reveal cannot flash
    // back in after a renderer failure. The content remains in its normal pose.
    settle();
    if (debug) section.dataset.continuityDebug = JSON.stringify({ disposed: true, recession: 0, reveal: 1 });
  }

  try {
    settle();
    listen(window, 'scroll', () => { if (visible.size) refresh(); }, { passive: true });
    for (const name of ['resize', 'hashchange', 'pageshow', 'load']) listen(window, name, refresh, { passive: true });
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(frame);frame = 0; }
      else refresh();
    });
    listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
    const image = surface.querySelector('img');
    if (image && !image.complete) listen(image, 'load', refresh, { once: true });
    document.fonts?.ready.then(refresh).catch(() => {});
    if ('IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        refresh();
      });
      visibilityObserver.observe(hero);
      visibilityObserver.observe(section);
    }
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(hero);
      resizeObserver.observe(visual);
    }
    refresh();
    return {
      get recession() {
        const state = getState();
        return state.ready && !state.paused && !state.reduced && !state.compact ? recession : 0;
      },
      refresh, dispose
    };
  } catch (error) {
    dispose();
    console.info('Homepage continuity: settled fallback.', error.message);
    return inert;
  }
}
