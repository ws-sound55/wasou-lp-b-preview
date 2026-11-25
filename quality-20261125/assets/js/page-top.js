(() => {
  const init = () => {
    const pageTop = document.querySelector('.site-page-top');
    if (!pageTop || pageTop.dataset.pageTopReady === 'true') return;
    pageTop.dataset.pageTopReady = 'true';

    const root = document.documentElement;
    const menu = document.querySelector('.site-mobile-nav');
    // Verified fixed CTA selectors; never collect ordinary in-content apply buttons.
    const fixedCtas = [...document.querySelectorAll('.mobile-apply, [data-mobile-apply], .mobile-cta')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previousObstruction = -1;
    let restoreTopTabIndex = null;

    const isMenuOpen = () => {
      if (!menu || menu.hidden || menu.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(menu);
      return style.display !== 'none' && style.visibility !== 'hidden' && menu.getClientRects().length > 0;
    };

    const focusPageStart = () => {
      const headerLink = document.querySelector('body > header a[href]');
      const headerLinkVisible = headerLink && headerLink.getClientRects().length > 0 &&
        window.getComputedStyle(headerLink).visibility !== 'hidden';
      const target = headerLinkVisible ? headerLink : document.querySelector('h1, main, [role="main"]');
      if (!target) return;
      if (restoreTopTabIndex) restoreTopTabIndex();
      // Native links need no alteration. A heading/main is temporarily focusable.
      if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        const restore = () => {
          target.removeEventListener('blur', restore);
          // Do not overwrite a tabindex subsequently changed by another script.
          if (target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
          restoreTopTabIndex = null;
        };
        restoreTopTabIndex = restore;
        target.addEventListener('blur', restore, { once: true });
      }
      target.focus({ preventScroll: true });
      if (document.activeElement !== target && restoreTopTabIndex) restoreTopTabIndex();
    };

    const measureObstruction = () => {
      const viewportHeight = window.innerHeight;
      const buttonRect = pageTop.getBoundingClientRect();
      let obstruction = 0;
      fixedCtas.forEach(cta => {
        if (cta.hidden || cta.getAttribute('aria-hidden') === 'true') return;
        const style = window.getComputedStyle(cta);
        const bottom = Number.parseFloat(style.bottom);
        if (style.position !== 'fixed' || style.display === 'none' ||
            style.visibility === 'hidden' || !Number.isFinite(bottom)) return;
        const rect = cta.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.right <= buttonRect.left || rect.left >= buttonRect.right) return;
        const enteringOrVisible = cta.matches('.mobile-apply.is-visible, [data-mobile-apply].is-visible, .mobile-cta.show');
        const stillOnScreen = Number.parseFloat(style.opacity) > 0 && rect.top < viewportHeight && rect.bottom > 0;
        const transitioning = typeof cta.getAnimations === 'function' &&
          cta.getAnimations().some(animation => animation.playState === 'running');
        // The flyer's hidden translateY(120%) can leave a pixel at the edge;
        // an absent visibility class is not an active CTA after transition end.
        if (!enteringOrVisible && !(transitioning && stillOnScreen)) return;
        // Reserve the final visible height before an entry transition starts, and
        // retain it through exit. transitionend/cancel rechecks the actual state.
        const top = Math.min(rect.top, viewportHeight - bottom - rect.height);
        obstruction = Math.max(obstruction, viewportHeight - top);
      });
      return Math.max(0, Math.ceil(obstruction));
    };

    const update = () => {
      frame = 0;
      const scrollingElement = document.scrollingElement || root;
      const viewportHeight = root.clientHeight || window.innerHeight;
      const maxScroll = Math.max(0, scrollingElement.scrollHeight - viewportHeight);
      const scrollY = Math.max(0, window.scrollY || scrollingElement.scrollTop || 0);
      const menuOpen = isMenuOpen();
      // Even a very short scrollable page gets a reachable threshold; long pages
      // never require a full viewport of scrolling just to reveal the control.
      const threshold = Math.min(160, maxScroll * .25);
      const visible = !menuOpen && maxScroll > 0 && scrollY > 0 && scrollY >= threshold;
      const obstruction = measureObstruction();
      if (obstruction !== previousObstruction) {
        pageTop.style.setProperty('--page-top-obstruction', `${obstruction}px`);
        previousObstruction = obstruction;
      }
      if (!visible && document.activeElement === pageTop) {
        if (menuOpen) {
          menu.querySelector('.site-mobile-nav-close, a[href], button:not([disabled])')?.focus({ preventScroll: true });
        } else {
          focusPageStart();
        }
      }
      pageTop.classList.toggle('is-visible', visible);
      pageTop.setAttribute('aria-hidden', String(!visible));
      pageTop.tabIndex = visible ? 0 : -1;
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    pageTop.addEventListener('click', () => {
      if (pageTop.getAttribute('aria-hidden') === 'true' || isMenuOpen()) return;
      // Move keyboard reading order to the start, not to an about-to-hide button.
      // preventScroll keeps focus movement from interrupting the requested scroll.
      focusPageStart();
      window.scrollTo({ top: 0, left: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      scheduleUpdate();
    });

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('load', scheduleUpdate, { once: true });
    window.addEventListener('pageshow', scheduleUpdate);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleUpdate);
      window.visualViewport.addEventListener('scroll', scheduleUpdate, { passive: true });
    }
    fixedCtas.forEach(cta => {
      cta.addEventListener('transitionrun', scheduleUpdate);
      cta.addEventListener('transitionend', scheduleUpdate);
      cta.addEventListener('transitioncancel', scheduleUpdate);
    });

    // A single observer follows only the finite, known state holders. No polling,
    // subtree-wide observation, or observation of this button's own mutations.
    if (window.MutationObserver) {
      const states = new MutationObserver(scheduleUpdate);
      states.observe(root, { attributes: true, attributeFilter: ['class'] });
      states.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      [menu, ...fixedCtas].filter(Boolean).forEach(element => {
        states.observe(element, { attributes: true, attributeFilter: ['class', 'hidden', 'style', 'aria-hidden'] });
      });
    }
    if (window.ResizeObserver) {
      const sizes = new ResizeObserver(scheduleUpdate);
      [root, document.body, menu, ...fixedCtas].filter(Boolean).forEach(element => sizes.observe(element));
    }
    update();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
