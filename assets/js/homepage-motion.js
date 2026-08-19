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

  const roundedBlock = (block, index, phase) => {
    const pointerX = (pointer.x - 0.5) * block.pointer * width;
    const pointerY = (pointer.y - 0.5) * block.pointer * height;
    const scrollX = Math.sin(scrollProgress * Math.PI * 1.7 + index) * block.scroll * width;
    const scrollY = (scrollProgress - 0.5) * block.scroll * height;
    const driftX = Math.sin(phase * block.speed + block.offset) * block.drift * width;
    const driftY = Math.cos(phase * block.speed * 0.8 + block.offset) * block.drift * height;
    const x = block.x * width + pointerX + scrollX + driftX;
    const y = block.y * height + pointerY + scrollY + driftY;
    const blockWidth = block.width * width;
    const blockHeight = block.height * height;
    const radius = Math.min(blockWidth, blockHeight) * 0.28;
    const breathe = 1 + Math.sin(phase * block.speed * 0.65 + block.offset) * 0.035;

    context.save();
    context.translate(x + blockWidth / 2, y + blockHeight / 2);
    context.rotate(block.rotation + Math.sin(phase * 0.35 + index) * 0.025);
    context.scale(breathe, 1 / breathe);
    context.beginPath();
    context.roundRect(-blockWidth / 2, -blockHeight / 2, blockWidth, blockHeight, radius);
    context.fillStyle = block.color;
    context.fill();
    context.restore();
  };

  const drawAmbientField = (timestamp = 0) => {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    const dark = document.documentElement.classList.contains('dark');
    const phase = reducedMotion ? 0 : timestamp / 7000;
    const palette = dark
      ? [
        'rgba(39, 111, 111, 0.34)',
        'rgba(45, 72, 122, 0.32)',
        'rgba(126, 66, 75, 0.25)',
        'rgba(67, 84, 103, 0.30)',
        'rgba(108, 91, 52, 0.20)',
      ]
      : [
        'rgba(151, 222, 211, 0.50)',
        'rgba(165, 195, 239, 0.47)',
        'rgba(239, 181, 164, 0.40)',
        'rgba(195, 207, 219, 0.44)',
        'rgba(230, 211, 154, 0.34)',
      ];
    const blocks = [
      {x: -0.16, y: -0.12, width: 0.78, height: 0.42, rotation: -0.08, pointer: 0.035, scroll: 0.06, drift: 0.026, speed: 0.65, offset: 0.2},
      {x: 0.48, y: -0.03, width: 0.72, height: 0.38, rotation: 0.09, pointer: -0.028, scroll: 0.05, drift: 0.031, speed: 0.55, offset: 1.4},
      {x: 0.12, y: 0.30, width: 0.62, height: 0.36, rotation: 0.04, pointer: 0.025, scroll: -0.05, drift: 0.026, speed: 0.75, offset: 2.6},
      {x: 0.56, y: 0.48, width: 0.62, height: 0.42, rotation: -0.07, pointer: -0.035, scroll: 0.07, drift: 0.034, speed: 0.48, offset: 3.8},
      {x: -0.12, y: 0.70, width: 0.82, height: 0.38, rotation: 0.06, pointer: 0.02, scroll: -0.06, drift: 0.028, speed: 0.58, offset: 5.1},
    ].map((block, index) => ({...block, color: palette[index]}));

    context.save();
    context.filter = `blur(${Math.max(38, Math.min(74, width * 0.052))}px) saturate(108%)`;
    blocks.forEach((block, index) => roundedBlock(block, index, phase));
    context.restore();

    context.fillStyle = dark ? 'rgba(7, 10, 14, 0.28)' : 'rgba(255, 255, 255, 0.28)';
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
