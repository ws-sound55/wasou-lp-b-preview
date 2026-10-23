(() => {
  const trigger = document.querySelector('.site-menu-trigger, .hero-menu-trigger');
  const menu = document.querySelector('.site-mobile-nav');
  if (!trigger || !menu) return;
  const closeButton = menu.querySelector('.site-mobile-nav-close');
  const focusables = () => [...menu.querySelectorAll('a[href], button:not([disabled])')];
  const setOpenState = (isOpen, restoreFocus = false) => {
    menu.hidden = !isOpen;
    trigger.classList.toggle('is-open', isOpen);
    trigger.setAttribute('aria-expanded', String(isOpen));
    trigger.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    document.documentElement.classList.toggle('site-menu-open', isOpen);
    document.body.classList.toggle('site-menu-open', isOpen);
    if (isOpen) closeButton?.focus();
    if (!isOpen && restoreFocus) trigger.focus();
  };
  trigger.addEventListener('click', () => setOpenState(menu.hidden));
  closeButton?.addEventListener('click', () => setOpenState(false, true));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpenState(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); setOpenState(false, true); return; }
    if (event.key !== 'Tab' || menu.hidden) return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
