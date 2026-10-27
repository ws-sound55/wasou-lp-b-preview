(() => {
  const primaryApply = document.querySelector('[data-apply-primary]');
  const normalApplies = [...document.querySelectorAll('[data-apply-normal]')];
  const mobileApply = document.querySelector('[data-mobile-apply]');

  if (primaryApply && normalApplies.length && mobileApply) {
    let rafId = 0;
    const updateMobileApply = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const viewportInset = 36;
        const primaryHasPassed = primaryApply.getBoundingClientRect().bottom <= 0;
        const normalApplyIsVisible = normalApplies.some(button => {
          const rect = button.getBoundingClientRect();
          return rect.bottom > viewportInset && rect.top < window.innerHeight - viewportInset;
        });
        mobileApply.classList.toggle('is-visible', primaryHasPassed && !normalApplyIsVisible);
      });
    };

    window.addEventListener('scroll', updateMobileApply, { passive: true });
    window.addEventListener('resize', updateMobileApply);
    updateMobileApply();
  }

  document.querySelectorAll('.faq details').forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', String(details.open));
    details.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(details.open));
    });
    summary.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      details.open = !details.open;
    });
  });
})();
