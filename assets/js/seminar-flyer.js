(() => {
  const primaryApply = document.querySelector('[data-apply-primary]');
  const mobileApply = document.querySelector('[data-mobile-apply]');

  if (primaryApply && mobileApply) {
    const updateMobileApply = () => {
      const { bottom } = primaryApply.getBoundingClientRect();
      mobileApply.classList.toggle('is-visible', bottom <= 0);
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
