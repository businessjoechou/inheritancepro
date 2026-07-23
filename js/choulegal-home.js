document.documentElement.classList.add("js");

const ready = () => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add("is-ready");
  });

  const toggle = document.querySelector("[data-network-toggle]");
  const network = document.querySelector("[data-network]");

  if (toggle && network) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      network.dataset.open = String(open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    network.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.focus({ preventScroll: true });
      }
    });
  }

  const track = document.querySelector("[data-process-track]");
  if (track) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            track.classList.add("is-drawn");
            observer.disconnect();
          }
        },
        { threshold: 0.24 }
      );
      observer.observe(track);
    } else {
      track.classList.add("is-drawn");
    }
  }

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ready, { once: true });
} else {
  ready();
}
