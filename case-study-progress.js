// Direct reading progress for individual case studies; no smoothing or idle loop.
(() => {
  const page = document.body;
  const header = document.querySelector(".case-study-page .site-header");
  const article = document.querySelector(".case-study-page main");
  const track = document.querySelector(".case-reading-progress");
  const fill = track?.querySelector(".case-reading-progress-fill");
  if (!page || !header || !article || !track || !fill || !window.requestAnimationFrame) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let articleStart = 0;
  let articleEnd = 0;
  let headerBottom = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--project-header-height")
  ) || 0;
  let lastTop = Number.NaN;
  let lastProgress = Number.NaN;
  let frame = 0;
  let remeasure = false;

  const currentScroll = () => window.scrollY || window.pageYOffset || 0;
  const render = () => {
    const scrollTop = currentScroll();
    const range = articleEnd - articleStart;
    const progress = range > 0
      ? clamp((scrollTop - articleStart) / range, 0, 1)
      : scrollTop > articleStart ? 1 : 0;

    if (!Number.isFinite(lastTop) || Math.abs(headerBottom - lastTop) > 0.1) {
      track.style.top = `${headerBottom}px`;
      lastTop = headerBottom;
    }
    if (!Number.isFinite(lastProgress) || Math.abs(progress - lastProgress) > 0.000001) {
      fill.style.transform = `scaleX(${progress})`;
      lastProgress = progress;
    }
    page.classList.add("case-progress-ready");
  };

  const measure = () => {
    const scrollTop = currentScroll();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
    const headerRect = header.getBoundingClientRect();
    const articleRect = article.getBoundingClientRect();

    headerBottom = clamp(headerRect.bottom, 0, viewportHeight);
    articleStart = clamp(articleRect.top + scrollTop - headerRect.bottom, 0, maxScroll);
    const articleBottom = articleRect.bottom + scrollTop;
    // Finish when the end of <main> (including the next-project CTA) reaches
    // the viewport's lower reading edge. The global footer is outside <main>.
    articleEnd = clamp(articleBottom - viewportHeight, articleStart, maxScroll);
    render();
  };

  const schedule = (shouldMeasure = false) => {
    remeasure ||= shouldMeasure;
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const mustMeasure = remeasure;
      remeasure = false;
      if (mustMeasure) measure();
      else render();
    });
  };

  try {
    // Initialize synchronously so restored positions are reflected immediately.
    measure();

    window.addEventListener("scroll", () => schedule(), { passive: true });
    window.addEventListener("resize", () => schedule(true), { passive: true });
    window.addEventListener("orientationchange", () => schedule(true), { passive: true });
    window.addEventListener("load", () => schedule(true), { once: true });
    window.addEventListener("pageshow", () => schedule(true));
    window.addEventListener("hashchange", () => schedule(true));
    window.addEventListener("popstate", () => schedule(true));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) schedule(true);
    });

    if ("ResizeObserver" in window) {
      const geometryObserver = new ResizeObserver(() => schedule(true));
      // The navbar changes padding at responsive breakpoints. Observe its
      // border box so measurements follow the animated height through its final size.
      geometryObserver.observe(header, { box: "border-box" });
      geometryObserver.observe(article);
    }
    if (document.fonts?.ready) document.fonts.ready.then(() => schedule(true));
    document.fonts?.addEventListener?.("loadingdone", () => schedule(true));
  } catch (_) {
    page.classList.remove("case-progress-ready");
  }
})();
