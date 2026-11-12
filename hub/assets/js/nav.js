/* Menu móvel do Hub: abre/fecha o painel #links; Esc e clique fora fecham. */
(function () {
  'use strict';
  var btn = document.getElementById('menuBtn');
  var panel = document.getElementById('links');
  if (!btn || !panel) return;

  function setOpen(open) {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  }
  btn.addEventListener('click', function () {
    setOpen(!panel.classList.contains('open'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    setOpen(false);
  });
})();
