/* =====================================================================
   Tema claro/escuro do Hub
   - Chave "ld-theme", compartilhada com o portfólio. Só 'light' | 'dark'
     são aceitos; qualquer outro valor é ignorado.
   - Sem preferência salva, segue prefers-color-scheme.
   - Carregado no <head>, sem defer, para definir data-theme antes do
     primeiro paint. O botão #themeBtn é ligado em DOMContentLoaded.
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'ld-theme';
  var root = document.documentElement;
  var mq = null;
  try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) {}

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) { return null; }
  }
  function system() { return mq && mq.matches ? 'dark' : 'light'; }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  apply(stored() || system());

  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (!stored()) apply(system()); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) {}
      apply(next);
    });
  });
})();
