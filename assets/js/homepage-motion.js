(() => {
  const hero = document.querySelector('#section-resume-biography-3');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('homepage-motion-ready');

  const revealTargets = [
    hero.querySelector('.md\\:col-span-4'),
    hero.querySelector('.md\\:col-span-8'),
    document.querySelector('#availability .availability-heading'),
    document.querySelector('#availability .availability-card'),
  ].filter(Boolean);

  revealTargets.forEach((target, index) => {
    target.classList.add('homepage-reveal');
    target.style.setProperty('--reveal-delay', `${Math.min(index * 70, 210)}ms`);
  });

  const revealAll = () => {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  };

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  let observer;
  try {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {threshold: 0.12, rootMargin: '0px 0px -6%'});
  } catch {
    revealAll();
    return;
  }
  revealTargets.forEach((target) => observer.observe(target));

  if (!window.matchMedia('(pointer: fine)').matches) return;
  hero.querySelectorAll('[data-motion-tilt]').forEach((target) => {
    let frame = 0;
    const reset = () => {
      window.cancelAnimationFrame(frame);
      target.style.setProperty('--tilt-x', '0deg');
      target.style.setProperty('--tilt-y', '0deg');
    };
    target.addEventListener('pointermove', (event) => {
      const bounds = target.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        target.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`);
        target.style.setProperty('--tilt-y', `${(x * 4).toFixed(2)}deg`);
      });
    });
    target.addEventListener('pointerleave', reset);
    target.addEventListener('pointercancel', reset);
    target.addEventListener('blur', reset, true);
  });
})();
