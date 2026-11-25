(() => {
  const filter = document.querySelector('[data-column-filter]');
  const cards = [...document.querySelectorAll('[data-column-card]')];
  const noResults = document.querySelector('[data-column-no-results]');
  if (!filter || !cards.length) return;
  const setFilter = (category) => {
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.categories || '').split('|').filter(Boolean);
      const show = category === 'all' || categories.includes(category);
      card.hidden = !show;
      if (show) visible += 1;
    });
    [...filter.querySelectorAll('button')].forEach(button => {
      const active = button.dataset.category === category;
      button.setAttribute('aria-pressed', String(active));
    });
    if (noResults) noResults.hidden = visible !== 0;
  };
  filter.addEventListener('click', event => {
    const button = event.target.closest('button[data-category]');
    if (button) setFilter(button.dataset.category);
  });
})();
