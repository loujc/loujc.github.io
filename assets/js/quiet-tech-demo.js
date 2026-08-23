(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const isZh = root.lang === "zh";
  const text = isZh
    ? {
      dark: "深色预览已开启",
      light: "浅色预览已开启",
      labOn: "Signal Layer 已开启 · 按 L 关闭",
      labOff: "Signal Layer 已关闭",
      spotOn: "人像聚光已锁定",
      spotOff: "人像聚光已释放",
    }
    : {
      dark: "Dark preview enabled",
      light: "Light preview enabled",
      labOn: "Signal Layer enabled · press L to close",
      labOff: "Signal Layer disabled",
      spotOn: "Portrait spotlight locked",
      spotOff: "Portrait spotlight released",
    };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, amount) => start + (end - start) * amount;
  const toast = document.querySelector(".qt-toast");
  let toastTimer = 0;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
  };

  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) body.classList.add("qt-dark");
  themeToggle?.setAttribute("aria-pressed", String(body.classList.contains("qt-dark")));

  const setTheme = (dark) => {
    body.classList.toggle("qt-dark", dark);
    themeToggle?.setAttribute("aria-pressed", String(dark));
    showToast(dark ? text.dark : text.light);
  };
  themeToggle?.addEventListener("click", () => {
    setTheme(!body.classList.contains("qt-dark"));
  });

  const toggleLab = () => {
    const enabled = !body.classList.contains("qt-lab");
    body.classList.toggle("qt-lab", enabled);
    showToast(enabled ? text.labOn : text.labOff);
  };

  const revealItems = [...document.querySelectorAll(".qt-reveal")];
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {rootMargin: "0px 0px -8%", threshold: 0.08});
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const techStage = document.querySelector(".qt-tech-stage");
  if (techStage && "IntersectionObserver" in window) {
    const techObserver = new IntersectionObserver(([entry]) => {
      body.classList.toggle("qt-in-tech", entry.isIntersecting && entry.intersectionRatio > 0.18);
    }, {threshold: [0, 0.18, 0.4]});
    techObserver.observe(techStage);
  }

  const pointer = document.querySelector(".qt-pointer");
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight * 0.3;
  let cursorX = pointerX;
  let cursorY = pointerY;

  const updatePointer = (x, y) => {
    pointerX = x;
    pointerY = y;
    root.style.setProperty("--qt-pointer-x", `${x}px`);
    root.style.setProperty("--qt-pointer-y", `${y}px`);
  };

  const animatePointer = () => {
    cursorX = lerp(cursorX, pointerX, 0.16);
    cursorY = lerp(cursorY, pointerY, 0.16);
    root.style.setProperty("--cursor-x", `${cursorX}px`);
    root.style.setProperty("--cursor-y", `${cursorY}px`);
    window.requestAnimationFrame(animatePointer);
  };

  if (finePointer.matches && !reduceMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      updatePointer(event.clientX, event.clientY);
      pointer?.classList.add("is-active");
    }, {passive: true});
    document.documentElement.addEventListener("mouseleave", () => pointer?.classList.remove("is-active"));
    document.querySelectorAll("a, button").forEach((interactive) => {
      interactive.addEventListener("pointerenter", () => pointer?.classList.add("is-hover"));
      interactive.addEventListener("pointerleave", () => pointer?.classList.remove("is-hover"));
    });
    window.requestAnimationFrame(animatePointer);
  }

  document.querySelectorAll(".qt-magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      if (!finePointer.matches || reduceMotion.matches) return;
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * 0.09;
      const y = (event.clientY - bounds.top - bounds.height / 2) * 0.09;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    element.addEventListener("pointerleave", () => { element.style.transform = ""; });
  });

  const portrait = document.querySelector(".qt-portrait");
  if (portrait) {
    const positionLight = (clientX, clientY) => {
      const bounds = portrait.getBoundingClientRect();
      const x = clamp((clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((clientY - bounds.top) / bounds.height, 0, 1);
      portrait.style.setProperty("--spot-x", `${x * 100}%`);
      portrait.style.setProperty("--spot-y", `${y * 100}%`);
      portrait.style.setProperty("--portrait-x", (x * 2 - 1).toFixed(3));
      portrait.style.setProperty("--portrait-y", (y * 2 - 1).toFixed(3));
    };
    portrait.addEventListener("pointermove", (event) => {
      if (!reduceMotion.matches && portrait.getAttribute("aria-pressed") !== "true") {
        positionLight(event.clientX, event.clientY);
      }
    });
    portrait.addEventListener("click", (event) => {
      const locked = portrait.getAttribute("aria-pressed") !== "true";
      portrait.setAttribute("aria-pressed", String(locked));
      if (locked) {
        const bounds = portrait.getBoundingClientRect();
        positionLight(event.detail ? event.clientX : bounds.left + bounds.width * .58, event.detail ? event.clientY : bounds.top + bounds.height * .3);
      }
      showToast(locked ? text.spotOn : text.spotOff);
    });
  }

  document.querySelectorAll(".qt-project").forEach((card) => {
    const visual = card.querySelector(".qt-project__visual");
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

  const command = document.querySelector(".qt-command");
  const openCommand = () => {
    if (!command || command.open) return;
    command.showModal();
    command.querySelector("[data-jump]")?.focus();
  };
  const closeCommand = () => { if (command?.open) command.close(); };
  document.querySelectorAll("[data-command-open]").forEach((button) => button.addEventListener("click", openCommand));
  document.querySelector("[data-command-close]")?.addEventListener("click", closeCommand);
  command?.addEventListener("click", (event) => { if (event.target === command) closeCommand(); });

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({behavior: reduceMotion.matches ? "auto" : "smooth", block: "start"});
    closeCommand();
  };
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => jumpTo(button.dataset.jump));
  });

  const sectionKeys = {"1": "qt-about", "2": "qt-work", "3": "qt-papers", "4": "qt-path", "5": "qt-contact"};
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      command?.open ? closeCommand() : openCommand();
      return;
    }
    if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (sectionKeys[key]) {
      event.preventDefault();
      jumpTo(sectionKeys[key]);
    } else if (key === "d") {
      event.preventDefault();
      setTheme(!body.classList.contains("qt-dark"));
    } else if (key === "l") {
      event.preventDefault();
      toggleLab();
    }
  });

  reduceMotion.addEventListener?.("change", (event) => {
    if (event.matches) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      pointer?.classList.remove("is-active");
    }
  });
})();
