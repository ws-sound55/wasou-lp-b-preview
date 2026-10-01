(() => {
  const pageTop = document.querySelector('.site-page-top');
  if (!pageTop) return;

  const mobileCta = document.querySelector('.mobile-cta');
  if (mobileCta) pageTop.classList.add('has-mobile-cta');

  const update = () => {
    const visible = window.scrollY >= window.innerHeight;
    pageTop.classList.toggle('is-visible', visible);
    pageTop.setAttribute('aria-hidden', String(!visible));
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  pageTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
