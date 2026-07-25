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

  const eventSearch = document.querySelector("[data-event-search]");
  const eventCards = [...document.querySelectorAll("[data-event-card]")];
  if (eventSearch && eventCards.length) {
    const status = document.querySelector("[data-event-search-status]");
    const empty = document.querySelector("[data-event-empty]");
    const clear = document.querySelector("[data-event-search-clear]");
    const normalize = (value) => String(value).toLocaleLowerCase("zh-Hant").replace(/\s+/g, "");
    const filterEvents = () => {
      const query = normalize(eventSearch.value);
      let visible = 0;
      eventCards.forEach((card) => {
        const matches = !query || normalize(card.dataset.eventKeywords).includes(query);
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      document.querySelectorAll("[data-event-group]").forEach((group) => {
        group.hidden = ![...group.querySelectorAll("[data-event-card]")].some((card) => !card.hidden);
      });
      if (empty) empty.hidden = visible !== 0;
      if (status) status.textContent = query ? `找到 ${visible} 個相關事件。` : `目前顯示全部 ${eventCards.length} 個事件。`;
    };
    eventSearch.addEventListener("input", filterEvents);
    clear?.addEventListener("click", () => {
      eventSearch.value = "";
      filterEvents();
      eventSearch.focus();
    });
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
