(() => {
  const trigger = document.querySelector('.site-menu-trigger, .hero-menu-trigger');
  const menu = document.querySelector('.site-mobile-nav');
  if (!trigger || !menu) return;

  const close = () => {
    menu.hidden = true;
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'メニューを開く');
  };
  const open = () => {
    menu.hidden = false;
    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'メニューを閉じる');
    menu.querySelector('.site-mobile-nav-close').focus();
  };

  trigger.addEventListener('click', () => menu.hidden ? open() : close());
  menu.querySelector('.site-mobile-nav-close').addEventListener('click', () => {
    close();
    trigger.focus();
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      close();
      trigger.focus();
    }
  });
})();
