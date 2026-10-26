// Homepage-only progressive enhancement. No content depends on this script.
(() => {
  const init = () => {
    const page = document.body;
    if (!page.classList.contains("home-page") || !window.matchMedia || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;

    // Each group follows the existing reading order. The largest stagger is 210ms.
    const groups = [
      ["#currently-building .home-section-heading"],
      [".building-overview, .building-visual", 80],
      ["#selected-projects .home-section-heading"],
      [".selected-project", 80],
      ["#skills .home-section-heading"],
      [".home-skill-category", 70],
      [".beyond-copy"],
      [".personal-collage figure", 70],
      [".contact-layout > div", 80]
    ];
    const delays = new Map();
    groups.forEach(([selector, stagger = 0]) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        delays.set(element, Math.min(index * stagger, 210));
      });
    });
    let observer;
    const revealed = new WeakSet();
    const finish = (element) => {
      element.classList.remove("motion-reveal");
      element.style.removeProperty("--motion-item-delay");
    };
    const onEnd = (event) => {
      if (event.animationName === "home-section-enter") finish(event.target);
    };
    const onFocus = (event) => {
      // Keyboard users receive the finished state immediately, without a later replay.
      if (event.target.closest(".hero-introduction")) page.classList.remove("home-motion-ready");
      delays.forEach((_, element) => {
        if (!element.contains(event.target)) return;
        revealed.add(element);
        observer.unobserve(element);
        finish(element);
      });
    };
    const stop = () => {
      observer?.disconnect();
      page.classList.remove("home-motion-ready");
      delays.forEach((_, element) => finish(element));
      page.removeEventListener("animationend", onEnd);
      page.removeEventListener("focusin", onFocus);
      preference.removeEventListener?.("change", onPreference);
    };
    const onPreference = () => { if (preference.matches) stop(); };

    try {
      observer = new window.IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting || revealed.has(target)) return;
          revealed.add(target);
          observer.unobserve(target);
          if (preference.matches || target.contains(document.activeElement)) return;
          target.style.setProperty("--motion-item-delay", `${delays.get(target)}ms`);
          target.classList.add("motion-reveal");
        });
      }, { rootMargin: "0px 0px 48px 0px", threshold: 0 });

      // Read geometry before applying classes. Already-visible/restored content stays still.
      const viewport = window.innerHeight;
      const pending = [...delays.keys()].filter((element) => element.getBoundingClientRect().top >= viewport);
      pending.forEach((element) => observer.observe(element));
      page.addEventListener("animationend", onEnd);
      page.addEventListener("focusin", onFocus);
      preference.addEventListener?.("change", onPreference);
      page.classList.add("home-motion-ready");
    } catch (_) {
      // A failed observer setup leaves the complete static page available.
      stop();
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
