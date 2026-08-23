(() => {
  const hero = document.querySelector('#section-resume-biography-3');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  document.documentElement.classList.add('homepage-motion-ready');
  document.body.classList.add('homepage-ambient-ready');

  const revealTargets = [
    hero.querySelector('.md\\:col-span-4'),
    hero.querySelector('.md\\:col-span-8'),
    document.querySelector('#availability .availability-heading'),
    document.querySelector('#availability .availability-card'),
    document.querySelector('#availability .meeting-request'),
    ...document.querySelectorAll([
      '#experience > div:not(.home-section-bg)',
      '#publications > div:not(.home-section-bg)',
      '#projects > div:not(.home-section-bg)',
    ].join(',')),
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
  document.body.prepend(canvas);
  const context = canvas.getContext('2d', {alpha: true});
  const pointer = {x: 0.58, y: 0.32, targetX: 0.58, targetY: 0.32};
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let scrollProgress = 0;
  let targetScrollProgress = 0;
  let lastFrame = 0;
  let animationFrame = 0;
  let animationRunning = false;

  const resizeCanvas = () => {
    if (!context) return;
    width = Math.max(1, Math.round(window.innerWidth));
    height = Math.max(1, Math.round(window.innerHeight));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const updateScrollProgress = () => {
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetScrollProgress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
  };

  const drawColorField = (field, phase) => {
    const angle = phase * field.speed + field.offset;
    const pointerX = (pointer.x - 0.5) * field.pointer * width;
    const pointerY = (pointer.y - 0.5) * field.pointer * height;
    const orbitX = Math.sin(angle) * field.driftX * width;
    const orbitY = Math.cos(angle * 0.78) * field.driftY * height;
    const scrollX = Math.sin(scrollProgress * Math.PI * 2.2 + field.offset) * field.scroll * width;
    const scrollY = Math.cos(scrollProgress * Math.PI * 1.7 + field.offset) * field.scroll * height;
    const centerX = field.x * width + pointerX + orbitX + scrollX;
    const centerY = field.y * height + pointerY + orbitY + scrollY;
    const fieldWidth = field.width * width;
    const fieldHeight = field.height * height;
    const breathe = 1 + Math.sin(angle * 0.62) * field.breathe;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(field.rotation + Math.sin(angle * 0.42) * 0.08);
    context.scale((fieldWidth / 2) * breathe, (fieldHeight / 2) / breathe);
    const gradient = context.createRadialGradient(-0.18, -0.2, 0.04, 0, 0, 1);
    gradient.addColorStop(0, field.core);
    gradient.addColorStop(0.46, field.middle);
    gradient.addColorStop(1, field.edge);
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.restore();
  };

  const drawLightRibbon = (phase, dark) => {
    const travel = Math.sin(phase * 0.42 + scrollProgress * Math.PI * 1.4);
    const lift = Math.cos(phase * 0.34 - scrollProgress * Math.PI) * height * 0.12;
    const top = height * (0.36 + travel * 0.12) + lift;
    const thickness = height * (0.18 + Math.sin(phase * 0.27) * 0.035);
    const gradient = context.createLinearGradient(-width * 0.1, top, width * 1.1, top + thickness);
    if (dark) {
      gradient.addColorStop(0, 'rgba(89, 231, 214, 0)');
      gradient.addColorStop(0.28, 'rgba(89, 231, 214, 0.10)');
      gradient.addColorStop(0.58, 'rgba(150, 169, 255, 0.12)');
      gradient.addColorStop(0.82, 'rgba(255, 157, 132, 0.08)');
      gradient.addColorStop(1, 'rgba(255, 157, 132, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(72, 183, 169, 0)');
      gradient.addColorStop(0.28, 'rgba(72, 183, 169, 0.12)');
      gradient.addColorStop(0.58, 'rgba(112, 143, 224, 0.13)');
      gradient.addColorStop(0.82, 'rgba(226, 135, 111, 0.10)');
      gradient.addColorStop(1, 'rgba(226, 135, 111, 0)');
    }

    context.save();
    context.translate((pointer.x - 0.5) * width * 0.06, (pointer.y - 0.5) * height * 0.04);
    context.rotate(-0.08 + travel * 0.035);
    context.beginPath();
    context.moveTo(-width * 0.18, top);
    context.bezierCurveTo(width * 0.2, top - height * 0.15, width * 0.72, top + height * 0.19, width * 1.18, top - height * 0.03);
    context.lineTo(width * 1.18, top + thickness);
    context.bezierCurveTo(width * 0.7, top + thickness + height * 0.14, width * 0.2, top + thickness - height * 0.13, -width * 0.18, top + thickness);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.restore();
  };

  const drawPointerBloom = (dark) => {
    if (!finePointer) return;
    const radius = Math.max(width, height) * 0.48;
    const gradient = context.createRadialGradient(
      pointer.x * width,
      pointer.y * height,
      0,
      pointer.x * width,
      pointer.y * height,
      radius,
    );
    gradient.addColorStop(0, dark ? 'rgba(205, 252, 246, 0.075)' : 'rgba(255, 255, 255, 0.48)');
    gradient.addColorStop(0.34, dark ? 'rgba(205, 252, 246, 0.025)' : 'rgba(255, 255, 255, 0.16)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  };

  const drawAmbientField = (timestamp = 0) => {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    const dark = document.documentElement.classList.contains('dark');
    const phase = reducedMotion ? 0 : timestamp / 8200;
    const palette = dark
      ? [
        ['rgba(56, 184, 165, 0.42)', 'rgba(31, 112, 111, 0.30)', 'rgba(16, 44, 48, 0)'],
        ['rgba(103, 135, 224, 0.40)', 'rgba(45, 67, 128, 0.30)', 'rgba(23, 31, 61, 0)'],
        ['rgba(221, 117, 100, 0.30)', 'rgba(126, 63, 75, 0.24)', 'rgba(52, 24, 34, 0)'],
        ['rgba(184, 153, 230, 0.28)', 'rgba(81, 64, 121, 0.22)', 'rgba(34, 27, 55, 0)'],
        ['rgba(225, 190, 93, 0.23)', 'rgba(108, 91, 52, 0.18)', 'rgba(48, 39, 20, 0)'],
      ]
      : [
        ['rgba(83, 206, 185, 0.58)', 'rgba(154, 229, 216, 0.40)', 'rgba(215, 247, 239, 0)'],
        ['rgba(104, 145, 229, 0.52)', 'rgba(169, 196, 242, 0.40)', 'rgba(225, 235, 252, 0)'],
        ['rgba(234, 128, 105, 0.43)', 'rgba(244, 186, 170, 0.34)', 'rgba(253, 229, 220, 0)'],
        ['rgba(174, 126, 226, 0.36)', 'rgba(211, 184, 239, 0.30)', 'rgba(241, 229, 252, 0)'],
        ['rgba(224, 180, 69, 0.32)', 'rgba(236, 213, 146, 0.28)', 'rgba(249, 239, 205, 0)'],
      ];
    const fields = [
      {x: 0.04, y: 0.06, width: 1.18, height: 0.88, rotation: -0.18, pointer: 0.10, scroll: 0.13, driftX: 0.18, driftY: 0.14, breathe: 0.09, speed: 0.54, offset: 0.2},
      {x: 0.96, y: 0.08, width: 1.08, height: 0.92, rotation: 0.22, pointer: -0.08, scroll: 0.11, driftX: 0.16, driftY: 0.18, breathe: 0.08, speed: 0.43, offset: 1.5},
      {x: 0.18, y: 0.88, width: 1.04, height: 0.86, rotation: 0.12, pointer: 0.07, scroll: -0.14, driftX: 0.20, driftY: 0.13, breathe: 0.10, speed: 0.62, offset: 2.7},
      {x: 0.92, y: 0.74, width: 0.94, height: 1.02, rotation: -0.24, pointer: -0.09, scroll: 0.16, driftX: 0.17, driftY: 0.20, breathe: 0.075, speed: 0.38, offset: 3.9},
      {x: 0.52, y: 0.46, width: 0.88, height: 0.76, rotation: 0.08, pointer: 0.06, scroll: -0.10, driftX: 0.14, driftY: 0.17, breathe: 0.085, speed: 0.49, offset: 5.2},
    ].map((field, index) => ({
      ...field,
      core: palette[index][0],
      middle: palette[index][1],
      edge: palette[index][2],
    }));

    context.save();
    context.filter = `blur(${Math.max(46, Math.min(92, width * 0.065))}px) saturate(118%)`;
    fields.forEach((field) => drawColorField(field, phase));
    drawLightRibbon(phase, dark);
    context.restore();

    drawPointerBloom(dark);
    context.fillStyle = dark ? 'rgba(6, 9, 13, 0.18)' : 'rgba(255, 255, 255, 0.18)';
    context.fillRect(0, 0, width, height);
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
      scrollProgress += (targetScrollProgress - scrollProgress) * 0.06;
      drawAmbientField(timestamp);
    }
    animationFrame = window.requestAnimationFrame(animateAmbientField);
  };

  const startAmbientAnimation = () => {
    if (reducedMotion || animationRunning) return;
    animationRunning = true;
    animationFrame = window.requestAnimationFrame(animateAmbientField);
  };

  const stopAmbientAnimation = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    animationRunning = false;
  };

  if (context) {
    updateScrollProgress();
    scrollProgress = targetScrollProgress;
    resizeCanvas();
    drawAmbientField();
    startAmbientAnimation();
    const redrawAfterResize = () => {
      resizeCanvas();
      drawAmbientField(lastFrame);
    };
    window.addEventListener('resize', redrawAfterResize, {passive: true});
    window.addEventListener('scroll', updateScrollProgress, {passive: true});
    new MutationObserver(() => drawAmbientField(lastFrame)).observe(
      document.documentElement,
      {attributes: true, attributeFilter: ['class']},
    );
    if (finePointer) {
      window.addEventListener('pointermove', (event) => {
        pointer.targetX = Math.min(1, Math.max(0, event.clientX / width));
        pointer.targetY = Math.min(1, Math.max(0, event.clientY / height));
      }, {passive: true});
      document.documentElement.addEventListener('pointerleave', () => {
        pointer.targetX = 0.58;
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
