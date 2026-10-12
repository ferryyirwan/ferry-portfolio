
// Dynamic footer year
const yearElement = document.getElementById("year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Lightbox Modal for Screenshots
document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = document.querySelector(".lightbox-close");
  const backdrop = document.querySelector(".lightbox-backdrop");

  if (!lightbox || !lightboxImg || !lightboxCaption) return;

  const openLightbox = (src, caption) => {
    lightboxImg.src = src;
    lightboxImg.alt = caption || "Screenshot preview";
    lightboxCaption.textContent = caption || "";
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => {
      lightboxImg.src = "";
    }, 250);
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

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (backdrop) backdrop.addEventListener("click", closeLightbox);

  // Close with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      closeLightbox();
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
});


