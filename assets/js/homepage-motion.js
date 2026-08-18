(() => {
  const hero = document.querySelector('#section-resume-biography-3');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  document.documentElement.classList.add('homepage-motion-ready');

  const revealTargets = [
    hero.querySelector('.md\\:col-span-4'),
    hero.querySelector('.md\\:col-span-8'),
    document.querySelector('#availability .availability-heading'),
    document.querySelector('#availability .availability-card'),
    document.querySelector('#availability .meeting-request'),
  ].filter(Boolean);

  revealTargets.forEach((target, index) => {
    target.classList.add('homepage-reveal');
    target.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);
  });

  const revealAll = () => revealTargets.forEach((target) => target.classList.add('is-visible'));
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    try {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, {threshold: 0.12, rootMargin: '0px 0px -6%'});
      revealTargets.forEach((target) => observer.observe(target));
    } catch {
      revealAll();
    }
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'homepage-ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);
  const context = canvas.getContext('2d', {alpha: true});
  const pointer = {x: 0.68, y: 0.32, targetX: 0.68, targetY: 0.32};
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastFrame = 0;
  let animationFrame = 0;
  let animationRunning = false;

  const resizeCanvas = () => {
    if (!context) return;
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const drawAmbientField = (timestamp = 0) => {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    const dark = document.documentElement.classList.contains('dark');
    const phase = reducedMotion || !finePointer ? 0 : timestamp / 5200;
    const centerX = pointer.x * width;
    const centerY = pointer.y * height;
    const lineGap = Math.max(42, Math.min(66, height / 12));
    const lineCount = Math.ceil(height / lineGap) + 5;

    context.lineWidth = 1;
    context.lineCap = 'round';
    for (let index = -2; index < lineCount; index += 1) {
      const baseY = index * lineGap;
      const warm = index % 5 === 0;
      context.strokeStyle = dark
        ? (warm ? 'rgba(226, 232, 240, 0.075)' : 'rgba(148, 163, 184, 0.085)')
        : (warm ? 'rgba(100, 116, 139, 0.06)' : 'rgba(148, 163, 184, 0.07)');
      context.beginPath();
      for (let x = -60; x <= width + 60; x += 36) {
        const distance = (x - centerX) / Math.max(width * 0.26, 1);
        const pointerInfluence = Math.exp(-(distance * distance)) * (centerY - baseY) * 0.075;
        const wave = Math.sin(x / 190 + phase + index * 0.72) * 7;
        const y = baseY + wave + pointerInfluence;
        if (x === -60) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }

    const railCount = 7;
    for (let index = 0; index < railCount; index += 1) {
      const baseX = ((index + 0.5) / railCount) * width;
      const distance = (baseX - centerX) / Math.max(width * 0.32, 1);
      const influence = Math.exp(-(distance * distance)) * (pointer.x - 0.5) * 22;
      context.strokeStyle = dark ? 'rgba(226, 232, 240, 0.035)' : 'rgba(15, 23, 42, 0.035)';
      context.beginPath();
      context.moveTo(baseX, -20);
      context.bezierCurveTo(
        baseX + influence,
        height * 0.28,
        baseX - influence,
        height * 0.72,
        baseX,
        height + 20,
      );
      context.stroke();
    }
  };

  const animateAmbientField = (timestamp) => {
    if (document.hidden) {
      animationRunning = false;
      animationFrame = 0;
      return;
    }
    if (timestamp - lastFrame >= 32) {
      lastFrame = timestamp;
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;
      drawAmbientField(timestamp);
    }
    animationFrame = window.requestAnimationFrame(animateAmbientField);
  };

  const startAmbientAnimation = () => {
    if (reducedMotion || !finePointer || animationRunning) return;
    animationRunning = true;
    animationFrame = window.requestAnimationFrame(animateAmbientField);
  };

  const stopAmbientAnimation = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    animationRunning = false;
  };

  if (context) {
    resizeCanvas();
    drawAmbientField();
    startAmbientAnimation();
    const redrawAfterResize = () => {
      resizeCanvas();
      drawAmbientField(lastFrame);
    };
    if ('ResizeObserver' in window) new ResizeObserver(redrawAfterResize).observe(hero);
    else window.addEventListener('resize', redrawAfterResize, {passive: true});
    new MutationObserver(() => drawAmbientField(lastFrame)).observe(
      document.documentElement,
      {attributes: true, attributeFilter: ['class']},
    );
    if (finePointer) {
      hero.addEventListener('pointermove', (event) => {
        const bounds = hero.getBoundingClientRect();
        pointer.targetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        pointer.targetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      }, {passive: true});
      hero.addEventListener('pointerleave', () => {
        pointer.targetX = 0.68;
        pointer.targetY = 0.32;
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAmbientAnimation();
      else startAmbientAnimation();
    });
  }

  hero.querySelectorAll('[data-motion-tilt]').forEach((target) => {
    let frame = 0;
    const portrait = target.matches('[data-portrait-spotlight]');
    const locked = () => target.classList.contains('is-spotlight-locked');
    const setSpotlight = (x, y) => {
      target.style.setProperty('--spot-x', `${(x * 100).toFixed(1)}%`);
      target.style.setProperty('--spot-y', `${(y * 100).toFixed(1)}%`);
    };
    const reset = () => {
      window.cancelAnimationFrame(frame);
      target.style.setProperty('--tilt-x', '0deg');
      target.style.setProperty('--tilt-y', '0deg');
      if (portrait && !locked()) {
        setSpotlight(0.5, 0.34);
        target.classList.remove('is-spotlight-active');
      }
    };

    if (finePointer && !reducedMotion) {
      target.addEventListener('pointermove', (event) => {
        const bounds = target.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          target.style.setProperty('--tilt-x', `${(-(y - 0.5) * 3).toFixed(2)}deg`);
          target.style.setProperty('--tilt-y', `${((x - 0.5) * 4).toFixed(2)}deg`);
          if (portrait) {
            setSpotlight(x, y);
            target.classList.add('is-spotlight-active');
          }
        });
      });
      target.addEventListener('pointerleave', reset);
      target.addEventListener('pointercancel', reset);
    }

    if (!portrait) return;
    setSpotlight(0.5, 0.34);
    target.addEventListener('focus', () => target.classList.add('is-spotlight-active'));
    target.addEventListener('blur', reset);
    target.addEventListener('click', () => {
      const nextLocked = !locked();
      target.classList.toggle('is-spotlight-locked', nextLocked);
      target.classList.add('is-spotlight-active', 'is-spotlight-pulse');
      target.setAttribute('aria-pressed', String(nextLocked));
      window.setTimeout(() => target.classList.remove('is-spotlight-pulse'), 700);
      if (!nextLocked && !target.matches(':hover, :focus-visible')) reset();
    });
  });
})();
