// Case pages only: keep anchor navigation and reading state in sync.
document.addEventListener("DOMContentLoaded", () => {
  const navigation = document.querySelector(".case-section-nav");
  if (!navigation) return;

  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const sections = links.map((link) => document.getElementById(link.hash.slice(1)));
  const motionOffset = (element) => {
    const motionItem = element.closest(".case-motion-item");
    if (!motionItem) return 0;
    const transform = getComputedStyle(motionItem).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
  };
  const headings = sections.map((section) => {
    const headingId = section?.getAttribute("aria-labelledby");
    return (headingId && document.getElementById(headingId)) || section?.querySelector("h1, h2");
  });
  const contentStarts = sections.map((section, index) => {
    const content = section?.matches(".case-section")
      ? section
      : section?.querySelector(".case-section") || section;
    const candidates = [
      content?.querySelector(".case-section-heading > .project-label"),
      content?.querySelector(".case-prose > :first-child"),
      content?.querySelector(".case-feature-list > :first-child"),
      content?.querySelector(".case-gallery-heading .project-label"),
      headings[index]
    ].filter(Boolean);
    return candidates.reduce((earliest, candidate) => {
      if (!earliest) return candidate;
      const candidateTop = candidate.getBoundingClientRect().top - motionOffset(candidate);
      const earliestTop = earliest.getBoundingClientRect().top - motionOffset(earliest);
      return candidateTop < earliestTop ? candidate : earliest;
    }, null);
  });
  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".case-reading-progress");
  if (sections.some((section) => !section) || headings.some((heading) => !heading) || contentStarts.some((start) => !start)) return;

  let scheduled = false;
  const headingTop = (heading) => heading.getBoundingClientRect().top - motionOffset(heading);
  const setActive = (current) => {
    links.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  const stickyStackBottom = () => {
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const navTop = Number.parseFloat(getComputedStyle(navigation).top) || 0;
    const stickyNavigationBottom = navTop + navigation.getBoundingClientRect().height;
    const progressBottom = progress?.getBoundingClientRect().bottom || 0;
    return Math.max(headerBottom, stickyNavigationBottom, progressBottom);
  };
  const update = () => {
    scheduled = false;
    const threshold = stickyStackBottom() + 24;
    let current = 0;
    headings.forEach((heading, index) => {
      if (headingTop(contentStarts[index]) <= threshold) current = index;
    });
    setActive(current);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };
  const scrollToContent = (contentStart, behavior) => {
    const documentTop = window.scrollY + headingTop(contentStart);
    window.scrollTo({ top: Math.max(0, documentTop - stickyStackBottom() - 20), behavior });
  };

  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(history.state, "", link.hash);
      setActive(index);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollToContent(contentStarts[index], reducedMotion ? "auto" : "smooth");
    });
  });

  const alignCurrentHash = () => {
    const index = links.findIndex((link) => link.hash === location.hash);
    if (index < 0) {
      schedule();
      return;
    }
    setActive(index);
    scrollToContent(contentStarts[index], "instant");
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("load", schedule, { once: true });
  window.addEventListener("hashchange", alignCurrentHash);
  window.addEventListener("popstate", schedule);
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted && location.hash) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(alignCurrentHash));
    } else {
      schedule();
    }
  });
  update();
});
