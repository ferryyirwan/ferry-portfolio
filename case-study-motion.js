// Gentle, one-time reveals for the five individual project case studies.
// Content remains visible unless this enhancement initializes successfully.
(() => {
  const page = document.body;
  if (!page?.classList.contains("case-study-page")) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const hero = document.querySelector(".case-hero");
  const heroItems = hero ? [
    hero.querySelector(":scope > .project-label"),
    hero.querySelector(":scope > h1"),
    hero.querySelector(":scope > .case-deck"),
    hero.querySelector(":scope > .project-facts"),
    hero.querySelector(":scope > .case-cover")
  ].filter(Boolean) : [];

  const targets = [
    ...document.querySelectorAll([
      ".case-overview .case-section-heading",
      ".case-overview .case-prose",
      ".case-feature-surface .case-section-heading",
      ".case-feature-list > li",
      ".case-development .case-section-heading",
      ".case-development .case-prose",
      ".case-gallery-heading",
      ".case-gallery > .project-shot",
      ".case-reflection .case-section-heading",
      ".case-reflection .case-prose",
      ".case-next > *"
    ].join(","))
  ];
  const stagger = (selector) => {
    document.querySelectorAll(selector).forEach((group) => {
      [...group.children].forEach((element, index) => {
        element.style.setProperty("--case-motion-delay", `${Math.min(index * 55, 220)}ms`);
      });
    });
  };

  if (!heroItems.length || !targets.length) return;

  let observer;
  let scrollScheduled = false;
  const reveal = (element) => {
    element.classList.add("case-motion-visible");
    observer?.unobserve(element);
  };
  const revealInView = () => {
    scrollScheduled = false;
    targets.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom < 0 || (bounds.top < window.innerHeight && bounds.bottom > 0)) reveal(element);
    });
  };
  const scheduleRevealCheck = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(revealInView);
  };

  try {
    targets.forEach((element) => element.classList.add("case-motion-item"));
    stagger(".case-feature-list, .case-gallery, .case-next");
    heroItems.forEach((element, index) => {
      element.classList.add("case-hero-motion");
      if (index === heroItems.length - 1) element.classList.add("case-hero-visual-motion");
      element.style.setProperty("--case-motion-delay", `${index * 65}ms`);
    });

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach((element) => observer.observe(element));
    page.classList.add("case-motion-ready");

    document.addEventListener("focusin", (event) => {
      const item = event.target.closest?.(".case-motion-item");
      if (item) reveal(item);
    });
    window.addEventListener("scroll", scheduleRevealCheck, { passive: true });
    window.addEventListener("resize", scheduleRevealCheck, { passive: true });
    revealInView();

    const stopMotion = () => {
      if (!reducedMotion.matches) return;
      observer.disconnect();
      targets.forEach((element) => reveal(element));
      page.classList.remove("case-motion-ready");
    };
    reducedMotion.addEventListener?.("change", stopMotion);
  } catch (error) {
    observer?.disconnect();
    targets.forEach((element) => element.classList.add("case-motion-visible"));
    page.classList.remove("case-motion-ready");
  }
})();
