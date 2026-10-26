// Resume-M1: lightweight one-time reveals for the existing resume page.
(() => {
  const page = document.body;
  if (!page?.classList.contains("resume-page")) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) return;

  const title = document.querySelector("#resume-heading");
  const introduction = document.querySelector(".resume-intro-copy > p");
  const closing = document.querySelector(".resume-closing");
  const targets = [title, introduction, closing].filter(Boolean);
  if (!title || !introduction || !targets.length) return;

  let observer;
  const complete = (element) => {
    element.classList.remove("resume-motion-visible");
    element.classList.add("resume-motion-complete");
    observer?.unobserve(element);
  };
  const reveal = (element) => {
    if (element.classList.contains("resume-motion-complete")) return;
    element.classList.add("resume-motion-visible");
    observer?.unobserve(element);
  };
  const onAnimationEnd = (event) => {
    if (event.animationName !== "resume-editorial-enter") return;
    complete(event.target);
  };

  try {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    targets.forEach((element) => {
      element.classList.add("resume-motion-item");
      element.addEventListener("animationend", onAnimationEnd);
    });
    page.classList.add("resume-motion-ready");

    targets.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom <= 0) complete(element);
      else if (bounds.top < window.innerHeight) reveal(element);
      else observer.observe(element);
    });

    // If keyboard focus reaches a below-fold CTA before its observer fires,
    // reveal it immediately so the focused link is never visually hidden.
    page.addEventListener("focusin", (event) => {
      const target = event.target.closest?.(".resume-motion-item");
      if (target) reveal(target);
    });

    reduceMotion.addEventListener?.("change", (event) => {
      if (!event.matches) return;
      observer.disconnect();
      page.classList.remove("resume-motion-ready");
      targets.forEach((element) => {
        element.classList.remove("resume-motion-visible");
        element.classList.add("resume-motion-complete");
      });
    });
  } catch (_) {
    observer?.disconnect();
    page.classList.remove("resume-motion-ready");
    targets.forEach((element) => {
      element.classList.remove("resume-motion-item", "resume-motion-visible");
      element.removeEventListener("animationend", onAnimationEnd);
    });
  }
})();
