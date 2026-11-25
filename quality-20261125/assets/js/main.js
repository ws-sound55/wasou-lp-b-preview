document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.faq-item').classList.toggle('open'));
});

const mcta = document.getElementById('mobileCta');
const hero = document.querySelector('.approved-fv');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) mcta.classList.add('show');
      else mcta.classList.remove('show');
    });
  }, {threshold:0.02});
  io.observe(hero);
}
