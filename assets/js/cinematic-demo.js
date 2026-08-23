(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const lang = root.lang === "zh" ? "zh" : "en";

  const copy = {
    en: {
      spotlightOn: "Spotlight locked. A little more cinematic.",
      spotlightOff: "Spotlight released.",
    },
    zh: {
      spotlightOn: "聚光灯已锁定。多一点电影感。",
      spotlightOff: "聚光灯已释放。",
    },
  }[lang];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, amount) => start + (end - start) * amount;

  function splitStatement() {
    document.querySelectorAll("[data-split-text]").forEach((element) => {
      const text = element.textContent.trim();
      element.textContent = "";
      const segments = lang === "zh"
        ? Array.from(text)
        : text.split(/\s+/).map((word) => `${word} `);

      segments.forEach((segment, index) => {
        const span = document.createElement("span");
        span.className = "word";
        span.style.setProperty("--word-index", index);
        span.textContent = segment;
        element.appendChild(span);
      });
    });
  }

  splitStatement();

  const revealItems = [...document.querySelectorAll(".reveal, [data-split-text]")];
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -11%", threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const scenes = [...document.querySelectorAll("[data-scene-name]")];
  if ("IntersectionObserver" in window) {
    const sceneVisibility = new Map();
    const sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => sceneVisibility.set(entry.target, entry.intersectionRatio));
      let active = scenes[0];
      let highestRatio = -1;
      scenes.forEach((scene) => {
        const ratio = sceneVisibility.get(scene) || 0;
        if (ratio > highestRatio) {
          highestRatio = ratio;
          active = scene;
        }
      });
      if (active) body.dataset.scene = active.dataset.sceneName;
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75] });
    scenes.forEach((scene) => sceneObserver.observe(scene));
  }

  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty("--scroll-progress", clamp(window.scrollY / scrollable, 0, 1));
  };
  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }, { passive: true });
  updateScroll();

  const cursor = document.querySelector(".cursor-orbit");
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let cursorX = pointerX;
  let cursorY = pointerY;

  function updatePointerVariables(x, y) {
    pointerX = x;
    pointerY = y;
    root.style.setProperty("--pointer-x", `${x}px`);
    root.style.setProperty("--pointer-y", `${y}px`);
    const normalizedX = (x / window.innerWidth) * 2 - 1;
    const normalizedY = (y / window.innerHeight) * 2 - 1;
    root.style.setProperty("--mx-a", `${normalizedX * window.innerWidth * 0.028}px`);
    root.style.setProperty("--my-a", `${normalizedY * window.innerHeight * 0.024}px`);
    root.style.setProperty("--mx-b", `${normalizedX * window.innerWidth * -0.034}px`);
    root.style.setProperty("--my-b", `${normalizedY * window.innerHeight * 0.032}px`);
    root.style.setProperty("--mx-c", `${normalizedX * window.innerWidth * 0.02}px`);
    root.style.setProperty("--my-c", `${normalizedY * window.innerHeight * -0.037}px`);
    root.style.setProperty("--mx-light", `${normalizedX * window.innerWidth * 0.01}px`);
    root.style.setProperty("--my-light", `${normalizedY * window.innerHeight * 0.01}px`);
  }

  function animateCursor() {
    cursorX = lerp(cursorX, pointerX, 0.17);
    cursorY = lerp(cursorY, pointerY, 0.17);
    root.style.setProperty("--cursor-x", `${cursorX}px`);
    root.style.setProperty("--cursor-y", `${cursorY}px`);
    requestAnimationFrame(animateCursor);
  }

  if (finePointer.matches && !reduceMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      updatePointerVariables(event.clientX, event.clientY);
      cursor?.classList.add("is-active");
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", () => cursor?.classList.remove("is-active"));
    document.querySelectorAll("a, button").forEach((interactive) => {
      interactive.addEventListener("pointerenter", () => cursor?.classList.add("is-hovering"));
      interactive.addEventListener("pointerleave", () => cursor?.classList.remove("is-hovering"));
    });
    requestAnimationFrame(animateCursor);
  }

  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      if (!finePointer.matches || reduceMotion.matches) return;
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * 0.12;
      const y = (event.clientY - bounds.top - bounds.height / 2) * 0.12;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    element.addEventListener("pointerleave", () => {
      element.style.transform = "";
    });
  });

  const portrait = document.querySelector(".portrait");
  const toast = document.querySelector(".easter-toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  if (portrait) {
    const setSpotlight = (clientX, clientY) => {
      const bounds = portrait.getBoundingClientRect();
      const localX = clamp((clientX - bounds.left) / bounds.width, 0, 1);
      const localY = clamp((clientY - bounds.top) / bounds.height, 0, 1);
      portrait.style.setProperty("--spot-x", `${localX * 100}%`);
      portrait.style.setProperty("--spot-y", `${localY * 100}%`);
      portrait.style.setProperty("--portrait-x", (localX * 2 - 1).toFixed(3));
      portrait.style.setProperty("--portrait-y", (localY * 2 - 1).toFixed(3));
    };

    portrait.addEventListener("pointermove", (event) => {
      if (!reduceMotion.matches && portrait.getAttribute("aria-pressed") !== "true") {
        setSpotlight(event.clientX, event.clientY);
      }
    });
    portrait.addEventListener("click", (event) => {
      const next = portrait.getAttribute("aria-pressed") !== "true";
      portrait.setAttribute("aria-pressed", String(next));
      if (next) setSpotlight(event.clientX || window.innerWidth * 0.75, event.clientY || window.innerHeight * 0.45);
      showToast(next ? copy.spotlightOn : copy.spotlightOff);
    });
  }

  document.querySelectorAll(".project-card").forEach((card) => {
    const visual = card.querySelector(".project-visual");
    if (!visual) return;
    card.addEventListener("pointermove", (event) => {
      if (!finePointer.matches || reduceMotion.matches) return;
      const bounds = visual.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
      visual.style.setProperty("--card-x", (x * 2 - 1).toFixed(3));
      visual.style.setProperty("--card-y", (y * 2 - 1).toFixed(3));
      visual.style.setProperty("--glare-x", `${x * 100}%`);
      visual.style.setProperty("--glare-y", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      visual.style.setProperty("--card-x", 0);
      visual.style.setProperty("--card-y", 0);
    });
  });

  const onMotionPreferenceChange = (event) => {
    if (event.matches) {
      document.querySelectorAll(".reveal, [data-split-text]").forEach((item) => item.classList.add("is-visible"));
      cursor?.classList.remove("is-active");
      ["--mx-a", "--my-a", "--mx-b", "--my-b", "--mx-c", "--my-c", "--mx-light", "--my-light"].forEach((property) => {
        root.style.setProperty(property, "0px");
      });
    }
  };

  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", onMotionPreferenceChange);
  } else if (typeof reduceMotion.addListener === "function") {
    reduceMotion.addListener(onMotionPreferenceChange);
  }
})();
