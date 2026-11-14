/* Página de apoio (PIX): botão "Copiar código PIX".
   - Copia exatamente o texto de #pixCode (Clipboard API; fallback: seleção + execCommand;
     se nada funcionar, deixa o código selecionado e avisa por texto).
   - Aviso em #pixStatus (role="status", aria-live="polite"); sem alert(); o foco não se move.
   - Nenhuma requisição de rede: o código vem do próprio HTML. Textos via Hub.t/textContent. */
(function () {
  'use strict';
  var btn = document.getElementById('pixCopy');
  var code = document.getElementById('pixCode');
  var status = document.getElementById('pixStatus');
  if (!btn || !code || !status) return;
  var msgKey = '';

  function say(key) {
    msgKey = key;
    status.textContent = key && window.Hub ? window.Hub.t(key) : '';
  }
  function selectCode() {
    var sel = window.getSelection && window.getSelection();
    if (!sel) return false;
    var r = document.createRange();
    r.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }
  function legacyCopy() {
    try { return selectCode() && document.execCommand('copy'); } catch (e) { return false; }
  }
  function done(ok) {
    if (!ok) selectCode();
    say(ok ? 'hub.pix.copied' : 'hub.pix.manual');
  }

  btn.addEventListener('click', function () {
    var text = code.textContent.trim();
    var cb = navigator.clipboard;
    if (cb && typeof cb.writeText === 'function') {
      var p;
      try { p = cb.writeText(text); } catch (e) { p = Promise.reject(e); }
      p.then(function () { done(true); }, function () { done(legacyCopy()); });
    } else {
      done(legacyCopy());
    }
  });

  if (window.Hub && window.Hub.onLang) window.Hub.onLang.push(function () { if (msgKey) say(msgKey); });
})();
