
// Dynamic footer year
const yearElement = document.getElementById("year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Lightbox Modal for Screenshots & Photos
document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const backdrop = document.querySelector(".lightbox-backdrop");
  const dismissButtons = document.querySelectorAll(".lightbox-close, .lightbox-back-btn, .lightbox-bottom-back");

  if (!lightbox || !lightboxImg || !lightboxCaption) return;

  const openLightbox = (src, caption) => {
    lightboxImg.src = src;
    lightboxImg.alt = caption || "Screenshot preview";
    lightboxCaption.textContent = caption || "";
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Push state to browser history so mobile hardware/gesture back returns to the page
    try {
      history.pushState({ lightboxOpen: true }, "");
    } catch (_) {}
  };

  const closeLightbox = (stepHistoryBack = true) => {
    if (!lightbox.classList.contains("active")) return;
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => {
      lightboxImg.src = "";
    }, 250);

    // Pop the dummy history entry if closed via UI click/Esc
    if (stepHistoryBack && history.state && history.state.lightboxOpen) {
      try {
        history.back();
      } catch (_) {}
    }
  };

  // Attach click listener to all screenshot and gallery items
  const screenshotItems = document.querySelectorAll(".screenshot-item, .gallery-item, .about-photo-item, [data-full]");
  screenshotItems.forEach((item) => {
    item.addEventListener("click", () => {
      const fullSrc = item.getAttribute("data-full");
      const caption = item.getAttribute("data-caption");
      const img = item.querySelector("img");
      const src = fullSrc || (img ? img.src : "");
      if (src) {
        openLightbox(src, caption);
      }
    });
  });

  // Wire all dismiss buttons: top-left Back button, top-right Close button, bottom Back to page button
  dismissButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeLightbox(true);
    });
  });

  if (backdrop) {
    backdrop.addEventListener("click", () => closeLightbox(true));
  }

  // Handle phone gesture back / hardware back button
  window.addEventListener("popstate", () => {
    if (lightbox.classList.contains("active")) {
      closeLightbox(false);
    }
  });

  // Close with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      closeLightbox(true);
    }
  });

  // Make project cards on index.html conveniently clickable
  const projectCards = document.querySelectorAll(".project-card");
  projectCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // If the user clicked the GitHub link specifically, don't hijack it
      if (e.target.closest(".btn-project-gh")) return;
      const detailLink = card.querySelector(".btn-project-detail");
      if (detailLink) {
        window.location.href = detailLink.getAttribute("href");
      }
    });
  });

  // Copy profile JSON button
  const copyBtn = document.getElementById("copy-profile-btn");
  const toast = document.getElementById("copy-toast");

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const codeSnippet = document.querySelector(".term-code code");
      const textToCopy = codeSnippet ? codeSnippet.innerText : "";
      if (textToCopy && navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast("Developer profile copied to clipboard!");
          const originalText = copyBtn.querySelector(".copy-text");
          if (originalText) {
            originalText.textContent = "copied!";
            setTimeout(() => {
              originalText.textContent = "copy";
            }, 2000);
          }
        });
      }
    });
  }

  // Mobile Navigation Drawer Toggle
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.querySelector(".navbar nav");

  if (navToggle && mainNav) {
    const toggleMenu = () => {
      const isOpen = mainNav.classList.toggle("mobile-open");
      navToggle.classList.toggle("open", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.classList.toggle("nav-drawer-open", isOpen);
    };

    const closeMenu = () => {
      mainNav.classList.remove("mobile-open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-drawer-open");
    };

    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close when clicking any nav link
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".navbar") && mainNav.classList.contains("mobile-open")) {
        closeMenu();
      }
    });

    // Close with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mainNav.classList.contains("mobile-open")) {
        closeMenu();
      }
    });
  }

  // Smooth animated scroll to top when clicking header logo <FERRY .DEV />
  const logoElements = document.querySelectorAll(".navbar .logo");
  logoElements.forEach((logo) => {
    logo.addEventListener("click", (e) => {
      const currentPath = window.location.pathname.replace(/\\/g, "/");
      const isIndex = currentPath.endsWith("index.html") || 
                      currentPath.endsWith("/ferry-portfolio/") || 
                      currentPath.endsWith("/ferry-portfolio") || 
                      currentPath.endsWith("/") || 
                      currentPath === "";

      // If already on the homepage OR if scrolled down on any page
      if (isIndex || window.scrollY > 80) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth"
        });

        // Close mobile navigation drawer if open
        const mainNav = document.querySelector(".navbar nav");
        const navToggle = document.getElementById("nav-toggle");
        if (mainNav && mainNav.classList.contains("mobile-open")) {
          mainNav.classList.remove("mobile-open");
          if (navToggle) {
            navToggle.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
          }
          document.body.classList.remove("nav-drawer-open");
        }
      }
    });
  });
});


