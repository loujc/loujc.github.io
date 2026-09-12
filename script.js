// Jincheng Lou — homepage redesign (branch glm53flash)
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Sticky header state
  const head = document.querySelector(".site-head");
  const onScroll = () => head.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reveal on scroll
  const revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  if (matchMedia("(pointer: fine)").matches && !reduceMotion.matches) {
    // Ambient parallax
    let queued = false;
    addEventListener(
      "pointermove",
      (event) => {
        const x = event.clientX / innerWidth - 0.5;
        const y = event.clientY / innerHeight - 0.5;
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--mx", `${x * 55}px`);
          document.documentElement.style.setProperty("--my", `${y * 38}px`);
          queued = false;
        });
      },
      { passive: true }
    );

    // Portrait spotlight
    const portrait = document.querySelector(".portrait");
    portrait?.addEventListener("pointermove", (event) => {
      const rect = portrait.getBoundingClientRect();
      portrait.style.setProperty("--sx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      portrait.style.setProperty("--sy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  }

  // Pause ambient drift in hidden tabs
  document.addEventListener("visibilitychange", () => {
    document.querySelectorAll(".ambient i").forEach((el) => {
      el.style.animationPlayState = document.hidden ? "paused" : "running";
    });
  });

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
