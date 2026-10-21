(() => {
  const dialog = document.querySelector('.image-dialog');
  const dialogImage = dialog?.querySelector('img');
  const dialogClose = dialog?.querySelector('.dialog-close');

  document.querySelectorAll('.diagram-zoom').forEach((button) => {
    button.addEventListener('click', () => {
      if (!dialog || !dialogImage) return;
      dialogImage.src = button.dataset.zoomImage || '';
      dialogImage.alt = button.dataset.zoomAlt || '';
      dialog.showModal();
      dialogClose?.focus();
    });
  });

  dialogClose?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  const floatingApply = document.querySelector('.floating-apply');
  const hero = document.querySelector('.hero');
  const finalMessage = document.querySelector('.final-cta');
  if (!floatingApply || !hero || !finalMessage || !window.matchMedia('(max-width: 850px)').matches) return;

  let heroPassed = false;
  let finalVisible = false;
  const updateFloatingApply = () => floatingApply.classList.toggle('is-visible', heroPassed && !finalVisible);

  new IntersectionObserver(([entry]) => {
    heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
    updateFloatingApply();
  }, { threshold: 0 }).observe(hero);

  new IntersectionObserver(([entry]) => {
    finalVisible = entry.isIntersecting;
    updateFloatingApply();
  }, { threshold: 0.08 }).observe(finalMessage);
})();
