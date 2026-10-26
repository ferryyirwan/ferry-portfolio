(() => {
  "use strict";

  const body = document.body;
  if (!body?.classList.contains("projects-v2")) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || typeof window.requestAnimationFrame !== "function") return;

  const intro = document.querySelector(".project-index-intro");
  const feature = document.querySelector(".project-feature");
  const featureText = feature?.querySelector(".project-feature-heading");
  const featureImage = feature?.querySelector(".project-feature-preview");
  const entries = [...document.querySelectorAll(".project-index-entry")];
  let observer = null;
  let failed = false;

  const clearProgress = () => {
    [featureText, featureImage].forEach((element) => {
      if (!element) return;
      ["--odds-motion-offset", "--odds-motion-opacity"].forEach((property) => element.style.removeProperty(property));
    });
  };
  const showAllEntries = () => {
    entries.forEach((entry) => {
      entry.classList.remove("project-entry-pending");
      entry.classList.add("project-entry-revealed");
    });
  };
  const stopMotion = () => {
    failed = true;
    observer?.disconnect();
    body.classList.remove("projects-motion-ready");
    intro?.querySelectorAll(".project-intro-reveal").forEach((element) => element.classList.remove("project-intro-reveal"));
    showAllEntries();
    clearProgress();
  };

  if (!intro || !feature || !featureText || !featureImage) return;

  try {
    const observeEntries = "IntersectionObserver" in window && entries.length > 0;
    if (observeEntries) {
      observer = new IntersectionObserver((records) => {
        records.forEach((record) => {
          if (!record.isIntersecting) return;
          const entry = record.target;
          observer.unobserve(entry);
          entry.classList.remove("project-entry-pending");
          entry.classList.add("project-entry-revealed");
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    }

    let currentText = 1;
    let currentImage = 1;
    let targetText = 1;
    let targetImage = 1;
    let frame = 0;
    let lastFrameTime = 0;
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const progressAt = (top, height, finishFraction) => clamp(((height * 0.85) - top) / (height * (0.85 - finishFraction)));
    const measureProgress = () => {
      const height = window.innerHeight || document.documentElement.clientHeight;
      const textTravel = Number.parseFloat(featureText.style.getPropertyValue("--odds-motion-offset")) || 0;
      const textLayoutTop = featureText.getBoundingClientRect().top - textTravel;
      targetText = progressAt(textLayoutTop, height, 0.57);
      targetImage = progressAt(featureImage.getBoundingClientRect().top, height, 0.45);
    };
    const setMotionValue = (element, progress, travel) => {
      const offset = Math.max(0, travel * (1 - progress));
      element.style.setProperty("--odds-motion-offset", `${offset.toFixed(3)}px`);
      element.style.setProperty("--odds-motion-opacity", (0.2 + progress * 0.8).toFixed(4));
    };
    const applyProgress = () => {
      const styles = window.getComputedStyle(body);
      const textTravel = Number.parseFloat(styles.getPropertyValue("--odds-text-travel")) || 30;
      const imageTravel = Number.parseFloat(styles.getPropertyValue("--odds-image-travel")) || 45;
      setMotionValue(featureText, currentText, textTravel);
      setMotionValue(featureImage, currentImage, imageTravel);
    };
    const tick = (time) => {
      frame = 0;
      if (failed || reducedMotion.matches) return;
      const elapsed = lastFrameTime ? Math.max(1, Math.min(50, time - lastFrameTime)) : 16;
      lastFrameTime = time;
      const blend = 1 - Math.exp(-elapsed / 145);
      currentText += (targetText - currentText) * blend;
      currentImage += (targetImage - currentImage) * blend;
      if (Math.abs(targetText - currentText) < 0.001) currentText = targetText;
      if (Math.abs(targetImage - currentImage) < 0.001) currentImage = targetImage;
      applyProgress();
      if (currentText !== targetText || currentImage !== targetImage) frame = requestAnimationFrame(tick);
    };
    const queueFrame = () => {
      if (!frame && !failed && !reducedMotion.matches) frame = requestAnimationFrame(tick);
    };
    const syncPosition = () => {
      if (failed || reducedMotion.matches) return;
      measureProgress();
      currentText = targetText;
      currentImage = targetImage;
      lastFrameTime = 0;
      applyProgress();
    };
    const onScroll = () => {
      if (failed || reducedMotion.matches) return;
      measureProgress();
      queueFrame();
    };
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      requestAnimationFrame(syncPosition);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pageshow", onResize);
    window.addEventListener("hashchange", onResize);
    window.addEventListener("popstate", onResize);
    feature.addEventListener("load", (event) => {
      if (event.target instanceof HTMLImageElement) onResize();
    }, true);
    document.addEventListener("focusin", (event) => {
      const entry = event.target.closest?.(".project-entry-pending");
      if (!entry) return;
      observer?.unobserve(entry);
      entry.classList.remove("project-entry-pending");
      entry.classList.add("project-entry-revealed");
    });

    intro.querySelector("h1")?.classList.add("project-intro-reveal");
    intro.querySelector(".project-intro-grid > p")?.classList.add("project-intro-reveal");
    entries.forEach((entry) => {
      if (observer) {
        observer.observe(entry);
        entry.classList.add("project-entry-pending");
      }
    });
    body.classList.add("projects-motion-ready");
    syncPosition();

    if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", (event) => { if (event.matches) stopMotion(); });
    else if (reducedMotion.addListener) reducedMotion.addListener((event) => { if (event.matches) stopMotion(); });
  } catch (_) {
    stopMotion();
  }
})();
