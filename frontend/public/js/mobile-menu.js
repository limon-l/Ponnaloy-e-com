/**
 * Mobile menu drawer — open/close with backdrop
 */
(function() {
  const drawer = document.querySelector('[data-mobile-menu]');
  if (!drawer) return;

  const openBtns = document.querySelectorAll('[data-mobile-menu-toggle]');
  const closeBtns = document.querySelectorAll('[data-mobile-menu-close]');

  function open() {
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtns.forEach(function(btn) { btn.addEventListener('click', open); });
  closeBtns.forEach(function(btn) { btn.addEventListener('click', close); });
  drawer.addEventListener('click', function(e) {
    if (e.target.hasAttribute('data-mobile-menu-close')) close();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) close();
  });
})();
