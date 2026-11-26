(() => {
  'use strict';

  const init = () => {
    const trigger = document.querySelector('.site-menu-trigger, .hero-menu-trigger');
    const controlledId = trigger?.getAttribute('aria-controls');
    const menu = (controlledId && document.getElementById(controlledId)) || document.querySelector('.site-mobile-nav');
    if (!trigger || !menu || trigger.dataset.siteMenuReady === 'true') return;
    trigger.dataset.siteMenuReady = 'true';
    trigger.classList.add('site-menu-trigger');
    document.body.classList.add('site-menu-enabled');
    if (!menu.id) menu.id = 'siteMobileNav';
    trigger.setAttribute('aria-controls', menu.id);

    // header内・body直下のどちらのHTMLも受け入れ、sticky/transform/z-indexの
    // 影響を避ける。ロゴ・PCナビ・本文は移動しない。
    document.body.appendChild(trigger);
    document.body.appendChild(menu);
    const closeButton = menu.querySelector('.site-mobile-nav-close');
    const desktopMedia = window.matchMedia('(min-width: 1101px)');
    const desktopNav = document.querySelector('.corporate-desktop-nav, .family-desktop-nav, .column-desktop-nav, .site-header .desktop-nav, .site-desktop-nav');
    const headerInner = desktopNav?.closest('.corporate-header-inner, .family-header-inner, .column-header-inner, .header-inner, .global-site-header-inner, .flyer-header-inner');
    const brand = headerInner?.querySelector('.corporate-brand, .family-brand, .column-brand, .brand, .global-site-brand, .flyer-brand');
    let isOpen = false;
    let scrollSnapshot = null;
    let previousFocus = null;
    let resizeFrame = 0;

    // modal表示中のみダイアログとして扱う。closed時は通常navの意味を維持。
    const originalRole = menu.getAttribute('role');
    const originalTabindex = menu.getAttribute('tabindex');
    const canFocus = element => element instanceof HTMLElement && !element.hidden && !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true' && !element.matches(':disabled') && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0;
    const focusables = () => [...menu.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].filter(element => element.tabIndex >= 0 && canFocus(element));
    const focusInside = () => {
      const target = (canFocus(closeButton) && closeButton) || focusables()[0] || menu;
      target.focus({ preventScroll: true });
    };
    const restoreAttribute = (name, value) => value === null ? menu.removeAttribute(name) : menu.setAttribute(name, value);

    // overflowだけではiOSで背景が動くため、body固定も併用。
    // 既存inline指定を保存し、閉じる・画面切替・BFcache時に完全に戻す。
    const lockScroll = () => {
      if (scrollSnapshot) return;
      const properties = ['position', 'top', 'left', 'width', 'padding-right'];
      scrollSnapshot = {
        x: window.scrollX,
        y: window.scrollY,
        properties: properties.map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)])
      };
      const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.setProperty('position', 'fixed');
      document.body.style.setProperty('top', `${-scrollSnapshot.y}px`);
      document.body.style.setProperty('left', `${-scrollSnapshot.x}px`);
      document.body.style.setProperty('width', '100%');
      if (scrollbar) document.body.style.setProperty('padding-right', `${padding + scrollbar}px`);
      document.documentElement.classList.add('site-menu-open');
      document.body.classList.add('site-menu-open');
    };
    const unlockScroll = () => {
      document.documentElement.classList.remove('site-menu-open');
      document.body.classList.remove('site-menu-open');
      if (!scrollSnapshot) return;
      const snapshot = scrollSnapshot;
      scrollSnapshot = null;
      snapshot.properties.forEach(([name, value, priority]) => {
        if (value) document.body.style.setProperty(name, value, priority);
        else document.body.style.removeProperty(name);
      });
      // 全ページの既存scroll-behavior:smoothに左右されず、元位置へ即時復帰。
      const rootStyle = document.documentElement.style;
      const behavior = rootStyle.getPropertyValue('scroll-behavior');
      const priority = rootStyle.getPropertyPriority('scroll-behavior');
      rootStyle.setProperty('scroll-behavior', 'auto', 'important');
      window.scrollTo(snapshot.x, snapshot.y);
      if (behavior) rootStyle.setProperty('scroll-behavior', behavior, priority);
      else rootStyle.removeProperty('scroll-behavior');
    };

    const mobileMode = () => !desktopMedia.matches || document.body.classList.contains('site-nav-compact');
    const setOpenState = (open, restoreFocus = false) => {
      if (open && !mobileMode()) return;
      if (open && !isOpen) previousFocus = document.activeElement;
      isOpen = open;
      menu.hidden = !open;
      trigger.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      if (open) {
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-modal', 'true');
        menu.setAttribute('tabindex', '-1');
        menu.scrollTop = 0;
        lockScroll();
        focusInside();
      } else {
        menu.removeAttribute('aria-modal');
        restoreAttribute('role', originalRole);
        restoreAttribute('tabindex', originalTabindex);
        unlockScroll();
        if (restoreFocus) {
          const target = canFocus(previousFocus) ? previousFocus : canFocus(trigger) ? trigger : null;
          target?.focus({ preventScroll: true });
        }
        previousFocus = null;
      }
    };

    // 文字を小さくせず、拡大文字/ロゴ/8項目が実際に収まるかを計測。
    // compactを一時解除して同一frame内で測るため、隠れたnavの幅も得られる。
    const updateLayout = () => {
      resizeFrame = 0;
      document.body.classList.remove('site-nav-compact');
      if (desktopMedia.matches && desktopNav && headerInner && brand) {
        const styles = getComputedStyle(headerInner);
        const available = headerInner.clientWidth - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0);
        const gap = parseFloat(styles.columnGap) || 0;
        const navWidth = Math.max(desktopNav.scrollWidth, desktopNav.getBoundingClientRect().width);
        const needed = brand.getBoundingClientRect().width + navWidth + gap + 8;
        document.body.classList.toggle('site-nav-compact', needed > available);
      }
      if (!mobileMode() && isOpen) {
        const focusWasInside = menu.contains(document.activeElement);
        setOpenState(false);
        if (focusWasInside) desktopNav?.querySelector('a[href]')?.focus({ preventScroll: true });
      }
    };
    const scheduleLayout = () => {
      if (!resizeFrame) resizeFrame = window.requestAnimationFrame(updateLayout);
    };

    trigger.addEventListener('click', () => setOpenState(!isOpen, isOpen));
    closeButton?.addEventListener('click', () => setOpenState(false, true));
    menu.addEventListener('click', event => {
      const link = event.target instanceof Element && event.target.closest('a[href]');
      // リンクの標準挙動（新規タブ・アンカー等）を妨げず必ずロック解除。
      if (link && menu.contains(link)) setOpenState(false, true);
    });
    document.addEventListener('keydown', event => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenState(false, true);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        menu.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !items.includes(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !items.includes(active))) {
        event.preventDefault();
        first.focus();
      }
    });
    // Tab以外のprogrammatic focusも背景へ抜けない。body.inertは使用しない。
    document.addEventListener('focusin', event => {
      if (isOpen && !menu.contains(event.target)) focusInside();
    });

    const onBoundaryChange = () => {
      // 1100/1101境界は両方向とも閉じる。compactが続く場合もロックを解除。
      const needsFocus = (isOpen && menu.contains(document.activeElement)) || document.activeElement === trigger;
      setOpenState(false);
      updateLayout();
      if (needsFocus) {
        const target = mobileMode() ? trigger : desktopNav?.querySelector('a[href]');
        target?.focus({ preventScroll: true });
      }
    };
    if (desktopMedia.addEventListener) desktopMedia.addEventListener('change', onBoundaryChange);
    else desktopMedia.addListener(onBoundaryChange);
    window.addEventListener('resize', scheduleLayout, { passive: true });
    window.addEventListener('pagehide', () => setOpenState(false));
    window.addEventListener('pageshow', () => {
      setOpenState(false);
      updateLayout();
    });
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(scheduleLayout);
      if (headerInner) observer.observe(headerInner);
      if (desktopNav) observer.observe(desktopNav);
      if (brand) observer.observe(brand);
    }
    document.fonts?.ready.then(scheduleLayout);
    document.fonts?.addEventListener?.('loadingdone', scheduleLayout);
    brand?.querySelectorAll('img').forEach(image => image.addEventListener('load', scheduleLayout, { once: true }));
    setOpenState(false);
    updateLayout();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
