(() => {
  const floatingApply = document.querySelector('.floating-apply');
  const hero = document.querySelector('.hero');
  const finalMessage = document.querySelector('.final-cta');

  if (!floatingApply || !hero || !finalMessage || !window.matchMedia('(max-width: 850px)').matches) return;

  const updateFloatingApply = () => {
    const heroPassed = hero.getBoundingClientRect().bottom < 0;
    // 一度最終CTAが画面に入った後は、フッターまで再表示させない。
    const finalReached = finalMessage.getBoundingClientRect().top < window.innerHeight;
    floatingApply.classList.toggle('is-visible', heroPassed && !finalReached);
  };

  window.addEventListener('scroll', updateFloatingApply, { passive: true });
  window.addEventListener('resize', updateFloatingApply);
  updateFloatingApply();
})();
