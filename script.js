// Shared navigation and the existing photo/screenshot viewer.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#year, [data-current-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-navigation");
  if (navToggle && mainNav) {
    try {
      const mobileViewport = window.matchMedia("(max-width: 900px)");
      const closeMenu = (restoreFocus = false) => {
        mainNav.classList.remove("mobile-open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-drawer-open");
        if (restoreFocus) navToggle.focus();
      };

      navToggle.addEventListener("click", () => {
        if (mainNav.classList.contains("mobile-open")) {
          closeMenu();
          return;
        }
        mainNav.classList.add("mobile-open");
        navToggle.classList.add("open");
        navToggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("nav-drawer-open");
        mainNav.querySelector("a")?.focus();
      });
      mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
      document.addEventListener("click", (event) => {
        if (!event.target.closest(".navbar")) closeMenu();
      });
      document.addEventListener("focusin", (event) => {
        if (!event.target.closest(".navbar")) closeMenu();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && mainNav.classList.contains("mobile-open")) {
          event.preventDefault();
          closeMenu(true);
        }
      });
      mobileViewport.addEventListener("change", () => {
        if (!mobileViewport.matches) closeMenu();
      });
      // Do not hide a link already reached while the script was loading.
      if (mobileViewport.matches && mainNav.contains(document.activeElement)) {
        mainNav.classList.add("mobile-open");
        navToggle.classList.add("open");
        navToggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("nav-drawer-open");
      }
      // Collapse mobile navigation only after every required handler is installed.
      document.body.classList.add("nav-enhanced");
      // Paint the initial state before enabling the existing drawer transitions.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => document.body.classList.add("nav-transitions"));
      });
    } catch (_) {
      // Partial/failed setup keeps the original links available without a toggle.
      document.body.classList.remove("nav-enhanced");
      document.body.classList.remove("nav-transitions");
    }
  }

  // Enhance native About journals with measured expansion and a restrained photo reveal.
  const journalMotionRoot = document.querySelector("body.about-v2");
  const reducedJournalMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let journalMotionReady = false;
  document.querySelectorAll("[data-journal-toggle]").forEach((button) => {
    const disclosure = document.getElementById(button.getAttribute("data-journal-toggle"));
    const gallery = document.getElementById(button.getAttribute("aria-controls"));
    const summary = disclosure?.querySelector("summary");
    const label = button.querySelector(".journal-label");
    const symbol = button.querySelector(".journal-symbol");
    if (!disclosure || !gallery || !summary || !label || !symbol) return;

    try {
      let frame = 0;
      let timer = 0;
      let transitionHandler = null;
      let run = 0;
      const clearRun = () => {
        run += 1;
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        if (transitionHandler) gallery.removeEventListener("transitionend", transitionHandler);
        frame = 0;
        timer = 0;
        transitionHandler = null;
      };
      const syncJournal = (expanded = disclosure.open) => {
        button.setAttribute("aria-expanded", String(expanded));
        label.textContent = button.getAttribute(expanded ? "data-expanded-label" : "data-collapsed-label");
        symbol.textContent = expanded ? "−" : "+";
      };
      const clearTemporaryStyles = () => {
        gallery.style.removeProperty("height");
        gallery.style.removeProperty("overflow");
        gallery.style.removeProperty("transition");
        delete gallery.dataset.galleryReveal;
        gallery.querySelectorAll(":scope > .about-photo").forEach((photo) => photo.style.removeProperty("--journal-photo-delay"));
        disclosure.removeAttribute("data-gallery-state");
      };
      const finish = (expanded, currentRun) => {
        if (currentRun !== run) return;
        if (transitionHandler) gallery.removeEventListener("transitionend", transitionHandler);
        transitionHandler = null;
        clearTimeout(timer);
        timer = 0;
        cancelAnimationFrame(frame);
        frame = 0;
        if (!expanded) disclosure.open = false;
        gallery.inert = false;
        clearTemporaryStyles();
        syncJournal(expanded);
      };
      const settleExpandedHeight = (currentRun) => {
        if (currentRun !== run || disclosure.dataset.galleryState !== "opening") return;
        clearTimeout(timer);
        timer = 0;
        gallery.style.removeProperty("height");
        gallery.style.removeProperty("overflow");
        gallery.style.removeProperty("transition");
        disclosure.dataset.galleryState = "revealing";
        timer = window.setTimeout(() => finish(true, currentRun), 450);
      };
      const animateGallery = (expanded) => {
        const currentHeight = disclosure.open ? gallery.getBoundingClientRect().height : 0;
        clearRun();
        const currentRun = run;
        if (reducedJournalMotion?.matches || !window.matchMedia) {
          disclosure.open = expanded;
          gallery.inert = !expanded;
          clearTemporaryStyles();
          syncJournal(expanded);
          return;
        }

        if (expanded) {
          disclosure.open = true;
          gallery.inert = false;
          disclosure.dataset.galleryState = "opening";
          gallery.dataset.galleryReveal = "false";
          gallery.querySelectorAll(":scope > .about-photo").forEach((photo, index) => {
            // Orientation and CSR figures already use the approved M1 reveal.
            if (!photo.hasAttribute("data-about-reveal")) {
              photo.style.setProperty("--journal-photo-delay", `${Math.min(index * 80, 320)}ms`);
            }
          });
          gallery.style.height = `${currentHeight}px`;
          gallery.style.overflow = "hidden";
          gallery.style.transition = "height 420ms cubic-bezier(.22, 1, .36, 1)";
          syncJournal(true);
          void gallery.offsetHeight;
          frame = requestAnimationFrame(() => {
            if (currentRun !== run) return;
            gallery.dataset.galleryReveal = "true";
            gallery.style.height = `${gallery.scrollHeight}px`;
          });
          transitionHandler = (event) => {
            if (event.target === gallery && event.propertyName === "height") settleExpandedHeight(currentRun);
          };
          gallery.addEventListener("transitionend", transitionHandler);
          timer = window.setTimeout(() => settleExpandedHeight(currentRun), 520);
        } else {
          if (gallery.contains(document.activeElement)) button.focus({ preventScroll: true });
          gallery.inert = true;
          disclosure.dataset.galleryState = "closing";
          delete gallery.dataset.galleryReveal;
          gallery.style.height = `${currentHeight}px`;
          gallery.style.overflow = "hidden";
          gallery.style.transition = "height 280ms cubic-bezier(.22, 1, .36, 1)";
          syncJournal(false);
          void gallery.offsetHeight;
          frame = requestAnimationFrame(() => {
            if (currentRun !== run) return;
            gallery.style.height = "0px";
          });
          transitionHandler = (event) => {
            if (event.target === gallery && event.propertyName === "height") finish(false, currentRun);
          };
          gallery.addEventListener("transitionend", transitionHandler);
          timer = window.setTimeout(() => finish(false, currentRun), 380);
        }
      };

      button.addEventListener("click", () => {
        const currentlyClosing = disclosure.dataset.galleryState === "closing";
        animateGallery(currentlyClosing || !disclosure.open);
      });
      disclosure.addEventListener("toggle", () => {
        if (disclosure.dataset.galleryState !== "closing") syncJournal(disclosure.open);
      });
      summary.hidden = true;
      button.hidden = false;
      syncJournal();
      journalMotionReady = true;
    } catch (_) {
      // Keep the native <details>/<summary> fallback available if enhancement fails.
    }
  });
  if (journalMotionReady && journalMotionRoot) journalMotionRoot.dataset.journalMotion = "ready";

  // About: one shared story panel follows its card on mobile and its row on desktop.
  const storyButtons = [...document.querySelectorAll("[data-story-target]")];
  const storyHost = document.getElementById("story-panel-host");
  const storyGrid = document.getElementById("personal-story-grid");
  if (storyButtons.length && storyHost && storyGrid) {
    const panels = [...storyHost.querySelectorAll(".personal-story-panel")];
    const singleColumnStories = window.matchMedia("(max-width: 768px)");
    const storyMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const reduceStoryMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let selectedButton = null;
    let storyFrame = 0;
    let storyTimer = 0;
    let storyRun = 0;
    let storyScrollRun = 0;
    let storyLayoutFrame = 0;
    let storyTargetHeight = null;
    let storyClosing = false;
    let pendingStoryScroll = null;

    const storyRowSize = Math.ceil(storyButtons.length / 2);
    const placeStory = (button) => {
      const selectedIndex = storyButtons.indexOf(button);
      const anchor = singleColumnStories.matches
        ? button
        : selectedIndex < storyRowSize
          ? storyButtons[storyRowSize - 1]
          : storyButtons[storyButtons.length - 1];
      if (anchor && storyHost.previousElementSibling !== anchor) {
        const focusedElement = storyHost.contains(document.activeElement) ? document.activeElement : null;
        anchor.insertAdjacentElement("afterend", storyHost);
        if (focusedElement && document.activeElement !== focusedElement) {
          focusedElement.focus({ preventScroll: true });
        }
      }
    };
    placeStory(storyButtons[0]);

    const clearStoryAnimation = () => {
      storyRun += 1;
      cancelAnimationFrame(storyFrame);
      clearTimeout(storyTimer);
      storyFrame = 0;
      storyTimer = 0;
      storyTargetHeight = null;
    };
    const clearStoryStyles = () => {
      storyHost.style.removeProperty("height");
      storyHost.style.removeProperty("overflow");
      storyHost.style.removeProperty("transition");
      storyHost.removeAttribute("data-story-state");
    };
    const finishStoryOpen = () => {
      clearStoryAnimation();
      clearStoryStyles();
      storyHost.hidden = false;
      storyClosing = false;
      const activePanel = panels.find((panel) => !panel.hidden);
      panels.forEach((panel) => { panel.inert = panel !== activePanel; });
      storyHost.dataset.storyState = "open";
        if (pendingStoryScroll && pendingStoryScroll.panel === activePanel) {
          const pending = pendingStoryScroll;
          pendingStoryScroll = null;
          scrollStoryHeading(pending.panel, pending.run);
        }
    };
    const finishStoryClose = () => {
      clearStoryAnimation();
      panels.forEach((panel) => { panel.hidden = true;panel.inert = false; });
      storyHost.hidden = true;
      clearStoryStyles();
      storyClosing = false;
        pendingStoryScroll = null;
    };
    const animateStoryHeight = (from, to, opening, duration = 420, fadeContent = opening) => {
      clearStoryAnimation();
      const run = storyRun;
      storyHost.hidden = false;
      storyHost.style.transition = "none";
      storyHost.style.overflow = "hidden";
      storyHost.style.height = `${Math.max(0, from)}px`;
      storyClosing = !opening;
      storyHost.dataset.storyState = fadeContent ? "opening" : (opening ? "open" : "closing");
      void storyHost.offsetHeight;
      storyTargetHeight = Math.max(0, to);
      storyFrame = requestAnimationFrame(() => {
        storyFrame = 0;
        if (run !== storyRun) return;
        storyHost.style.transition = `height ${duration}ms cubic-bezier(.76, 0, .24, 1)`;
        storyHost.style.height = `${storyTargetHeight}px`;
        if (opening && fadeContent) storyHost.dataset.storyState = "open";
        storyTimer = setTimeout(() => {
          if (run === storyRun) (opening ? finishStoryOpen : finishStoryClose)();
        }, duration + 100);
      });
    };
    const measureNaturalStoryHeight = () => {
      const height = storyHost.style.height;
      const transition = storyHost.style.transition;
      storyHost.style.transition = "none";
      storyHost.style.height = "auto";
      const naturalHeight = storyHost.scrollHeight;
      storyHost.style.height = height;
      storyHost.style.transition = transition;
      return naturalHeight;
    };
    const closeStoryPanel = (previousButton) => {
      storyScrollRun += 1;
      pendingStoryScroll = null;
      const activePanel = panels.find((panel) => !panel.hidden);
      const from = storyHost.hidden ? 0 : storyHost.getBoundingClientRect().height;
      storyButtons.forEach((button) => setCardState(button, false));
      selectedButton = null;
      previousButton?.focus({ preventScroll: true });
      if (!activePanel) { finishStoryClose();return; }
      if (!storyMotion.matches || reduceStoryMotion.matches) { finishStoryClose();return; }
      storyHost.hidden = false;
      activePanel.inert = true;
      animateStoryHeight(from, 0, false);
    };

    const setCardState = (button, expanded) => {
      button.setAttribute("aria-expanded", String(expanded));
      const label = button.querySelector(".story-card-action > span");
      const symbol = button.querySelector(".story-card-symbol");
      if (label) label.textContent = expanded ? "Close the story" : "Read the story";
      if (symbol) symbol.textContent = expanded ? "−" : "+";
    };
    const focusAndQueueStoryScroll = (panel) => {
      const heading = panel.querySelector(".story-panel-heading");
      if (!heading) return;

      panel.focus({ preventScroll: true });
      const run = ++storyScrollRun;
      pendingStoryScroll = { panel, run };
    };
    const scrollStoryHeading = (panel, run) => {
      const heading = panel.querySelector(".story-panel-heading");
      if (!heading) return;

      requestAnimationFrame(() => {
        if (run !== storyScrollRun || storyHost.hidden || panel.hidden) return;
        const header = document.querySelector(".site-header");
        const headerStyle = header ? window.getComputedStyle(header) : null;
        const headerRect = header?.getBoundingClientRect();
        const headerOverlaysContent = headerStyle && ["fixed", "sticky"].includes(headerStyle.position);
        const headerClearance = headerOverlaysContent && headerRect
          ? Math.max(0, Math.min(window.innerHeight, headerRect.bottom))
          : 0;
        const headingTop = heading.getBoundingClientRect().top + window.scrollY;
        const scrollTop = Math.max(0, headingTop - headerClearance - 20);

        window.scrollTo({
          top: scrollTop,
          behavior: reduceStoryMotion.matches ? "instant" : "smooth"
        });
      });
    };
    const closeStory = () => {
      const previousButton = selectedButton;
      closeStoryPanel(previousButton);
    };
    storyButtons.forEach((button) => button.addEventListener("click", () => {
      if (selectedButton === button) {
        closeStory();
        return;
      }
      const from = storyHost.hidden ? 0 : storyHost.getBoundingClientRect().height;
      const panel = document.getElementById(button.getAttribute("data-story-target"));
      if (!panel) return;
      placeStory(button);
      panels.forEach((entry) => { entry.hidden = entry !== panel; });
      panels.forEach((entry) => { entry.inert = entry !== panel; });
      storyButtons.forEach((entry) => setCardState(entry, entry === button));
      selectedButton = button;
      storyHost.hidden = false;
      // Wait for the accordion to finish changing document height before scrolling.
      // A lower-row target can be beyond the current scroll limit until that space exists.
      focusAndQueueStoryScroll(panel);
      if (storyMotion.matches && !reduceStoryMotion.matches) {
        const target = measureNaturalStoryHeight();
        animateStoryHeight(from, target, true);
      } else {
        finishStoryOpen();
      }
    }));
    storyHost.querySelectorAll("[data-close-story]").forEach((button) => button.addEventListener("click", closeStory));
    storyHost.addEventListener("transitionend", (event) => {
      if (event.target !== storyHost || event.propertyName !== "height" || storyTargetHeight === null) return;
      if (Math.abs(storyHost.getBoundingClientRect().height - storyTargetHeight) > 1) return;
      (storyClosing ? finishStoryClose : finishStoryOpen)();
    });
    storyHost.addEventListener("load", (event) => {
      if (!(event.target instanceof HTMLImageElement) || storyHost.hidden || storyClosing || !storyHost.style.height) return;
      const from = storyHost.getBoundingClientRect().height;
      animateStoryHeight(from, measureNaturalStoryHeight(), true, 240, false);
    }, true);
    const syncStoryLayout = () => {
      cancelAnimationFrame(storyLayoutFrame);
      storyLayoutFrame = requestAnimationFrame(() => {
        storyLayoutFrame = 0;
        if (storyHost.hidden || storyClosing || !selectedButton) return;
        const from = storyHost.getBoundingClientRect().height;
        placeStory(selectedButton);
        if (!storyHost.style.height || reduceStoryMotion.matches) return;
        animateStoryHeight(from, measureNaturalStoryHeight(), true, 240, false);
      });
    };
    window.addEventListener("resize", syncStoryLayout, { passive: true });
    singleColumnStories.addEventListener("change", syncStoryLayout);
    reduceStoryMotion.addEventListener("change", () => {
      if (!reduceStoryMotion.matches) return;
      if (storyClosing) finishStoryClose();
      else if (!storyHost.hidden) finishStoryOpen();
    });
    storyMotion.addEventListener("change", () => {
      if (!storyMotion.matches || reduceStoryMotion.matches) return;
      document.body.dataset.storyMotion = "ready";
    });
    if (storyMotion.matches && !reduceStoryMotion.matches) document.body.dataset.storyMotion = "ready";
  }

  // The existing shared viewer also handles grouped About and project galleries.
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  if (!lightbox || !lightboxImg || !lightboxCaption) return;

  const itemSelector = ".screenshot-item, .gallery-item, .about-photo-item, [data-full]";
  const galleryItems = [...document.querySelectorAll(itemSelector)];
  const dismissButtons = [...lightbox.querySelectorAll(".lightbox-close, .lightbox-back-btn, .lightbox-bottom-back")];
  const navigation = document.createElement("div");
  navigation.className = "lightbox-navigation";
  navigation.hidden = true;
  navigation.innerHTML = '<button class="lightbox-previous" type="button" aria-label="Previous photo">← Previous</button><span class="lightbox-counter" role="status" aria-live="polite" aria-atomic="true"></span><button class="lightbox-next" type="button" aria-label="Next photo">Next →</button>';
  const content = lightbox.querySelector(".lightbox-content");
  content.insertBefore(navigation, lightbox.querySelector(".lightbox-bottom-back"));
  const previousButton = navigation.querySelector(".lightbox-previous");
  const nextButton = navigation.querySelector(".lightbox-next");
  const counter = navigation.querySelector(".lightbox-counter");
  let returnFocus = null;
  let clearImageTimer;
  let previousBodyOverflow = "";
  let previousRootOverflow = "";
  let previousRootScrollbarGutter = "";
  let previousRootOverscrollBehaviorY = "";
  let captionFocusFrame = 0;
  let backgroundState = [];
  let currentGallery = [];
  let currentIndex = 0;
  let touchStart = null;

  const photoData = (item) => {
    const image = item.querySelector("img");
    return {
      src: item.getAttribute("data-full") || image?.getAttribute("src"),
      caption: item.getAttribute("data-caption") || "",
      alt: item.getAttribute("data-alt") || image?.alt || item.getAttribute("data-caption") || "Photo or screenshot preview"
    };
  };
  const galleryFor = (item) => {
    const group = item.getAttribute("data-gallery");
    const owner = item.closest(".gallery-wrapper, .project-detail-section");
    const candidates = group ? galleryItems.filter((entry) => entry.getAttribute("data-gallery") === group) : owner ? [...owner.querySelectorAll(itemSelector)] : [item];
    const seen = new Set();
    return candidates.map(photoData).filter((photo) => {
      if (!photo.src || seen.has(photo.src)) return false;
      seen.add(photo.src);
      return true;
    });
  };
  const showPhoto = (index) => {
    if (!currentGallery.length) return;
    currentIndex = (index + currentGallery.length) % currentGallery.length;
    const photo = currentGallery[currentIndex];
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt;
    lightboxCaption.textContent = photo.caption;
    counter.textContent = `${currentIndex + 1} / ${currentGallery.length}`;
    cancelAnimationFrame(captionFocusFrame);
    captionFocusFrame = requestAnimationFrame(() => {
      captionFocusFrame = 0;
      const captionCanScroll = lightbox.classList.contains("has-gallery-controls")
        && lightboxCaption.scrollHeight > lightboxCaption.clientHeight + 1;
      lightboxCaption.tabIndex = captionCanScroll ? 0 : -1;
    });
  };
  const openLightbox = (item, trigger) => {
    clearTimeout(clearImageTimer);
    currentGallery = galleryFor(item);
    if (!currentGallery.length) return;
    const selected = photoData(item);
    showPhoto(Math.max(0, currentGallery.findIndex((photo) => photo.src === selected.src)));
    navigation.hidden = currentGallery.length < 2;
    lightbox.classList.toggle("has-gallery-controls", currentGallery.length > 1);
    returnFocus = trigger;
    previousBodyOverflow = document.body.style.overflow;
    previousRootOverflow = document.documentElement.style.overflow;
    previousRootScrollbarGutter = document.documentElement.style.scrollbarGutter;
    previousRootOverscrollBehaviorY = document.documentElement.style.overscrollBehaviorY;
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.scrollbarGutter = "stable";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehaviorY = "none";
    document.body.style.overflow = "hidden";
    backgroundState = [...document.querySelectorAll("body > header, body > main, body > footer")].map((element) => ({ element, inert: element.inert }));
    backgroundState.forEach(({ element }) => { element.inert = true; });
    lightbox.querySelector(".lightbox-close")?.focus();
    // Preserve browser/hardware Back as a way to dismiss the viewer.
    try { history.pushState({ ...history.state, lightboxOpen: true }, ""); } catch (_) {}
  };

  const closeLightbox = (stepHistoryBack = true) => {
    if (!lightbox.classList.contains("active")) return;
    touchStart = null;
    cancelAnimationFrame(captionFocusFrame);
    captionFocusFrame = 0;
    lightboxCaption.tabIndex = -1;
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousRootOverflow;
    document.documentElement.style.scrollbarGutter = previousRootScrollbarGutter;
    document.documentElement.style.overscrollBehaviorY = previousRootOverscrollBehaviorY;
    backgroundState.forEach(({ element, inert }) => { element.inert = inert; });
    returnFocus?.focus();
    clearImageTimer = setTimeout(() => { lightboxImg.removeAttribute("src"); }, 250);
    if (stepHistoryBack && history.state?.lightboxOpen) {
      try { history.back(); } catch (_) {}
    }
  };

  galleryItems.forEach((item) => {
    const trigger = item.querySelector(".bento-portrait-wrap") || item;
    if (!trigger.matches("a, button")) {
      trigger.tabIndex = 0;
      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-label", item.getAttribute("data-caption") || "Open image preview");
      trigger.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === trigger) {
          event.preventDefault();
          trigger.click();
        }
      });
    }
    item.addEventListener("click", (event) => {
      const link = event.target.closest("a, button");
      if (link && link !== item) return;
      if (!photoData(item).src) return;
      event.preventDefault();
      openLightbox(item, trigger);
    });
  });

  dismissButtons.forEach((button) => button.addEventListener("click", () => closeLightbox()));
  previousButton.addEventListener("click", () => showPhoto(currentIndex - 1));
  nextButton.addEventListener("click", () => showPhoto(currentIndex + 1));
  lightbox.querySelector(".lightbox-backdrop")?.addEventListener("click", () => closeLightbox());
  // Passive touch handlers leave vertical scrolling and pinch zoom to the browser.
  lightboxImg.addEventListener("touchstart", (event) => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  lightboxImg.addEventListener("touchend", (event) => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) showPhoto(currentIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });
  lightboxImg.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });
  window.addEventListener("popstate", () => closeLightbox(false));
  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(currentIndex + (event.key === "ArrowLeft" ? -1 : 1));
    } else if (event.key === "Tab") {
      const controls = [...lightbox.querySelectorAll("button, [tabindex='0']")]
        .filter((control) => !control.disabled && !control.closest("[hidden]"));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
});
