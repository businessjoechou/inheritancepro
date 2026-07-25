const guideReady = () => {
  const links = [...document.querySelectorAll("[data-guide-link]")];
  const chapters = [...document.querySelectorAll("[data-guide-chapter]")];

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.slice(1);
      const chapter = id ? document.getElementById(id) : null;
      if (chapter?.matches("details")) chapter.open = true;
    });
  });

  if (!links.length || !chapters.length || !("IntersectionObserver" in window)) return;

  const setCurrent = (id) => {
    links.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting && entry.target.open)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setCurrent(visible[0].target.id);
    },
    { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.2] }
  );

  chapters.forEach((chapter) => {
    observer.observe(chapter);
    chapter.addEventListener("toggle", () => {
      if (chapter.open) setCurrent(chapter.id);
    });
  });
  setCurrent(chapters[0].id);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", guideReady, { once: true });
} else {
  guideReady();
}
