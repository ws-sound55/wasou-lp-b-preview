(() => {
  const button = document.querySelector('.menu-button');
  const nav = document.getElementById('mobileNav');
  if (!button || !nav) return;
  const close = () => { nav.hidden = true; button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-label', 'メニューを開く'); };
  button.addEventListener('click', () => {
    const opening = nav.hidden;
    nav.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    button.setAttribute('aria-label', opening ? 'メニューを閉じる' : 'メニューを開く');
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !nav.hidden) { close(); button.focus(); } });
})();
