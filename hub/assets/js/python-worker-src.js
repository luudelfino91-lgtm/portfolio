/* =====================================================================
   Fonte do Worker de Python (T-402, D10). NAO e carregado como Worker de URL.
   Este arquivo (script classico externo, permitido pela CSP 'self' do runner)
   so expoe o codigo de workerMain como TEXTO em window.__PY_WORKER_SRC. O
   runner cria o Worker a partir de uma URL data: (modulo), que herda a CSP do
   runner.html (sem eval, sem rede de fora). Um Worker de URL http(s) NAO herda
   a CSP e deixaria o Python do usuario exfiltrar dados (SEC-P3-03, SEC-P4-01).
   Por isso workerMain nao pode depender de nada fora de si mesma (e serializada
   com toString), nem de variaveis deste arquivo.

   Protocolo (tudo texto, numeros e ArrayBuffer):
     runner -> worker: {t:'init', indexURL}                      carrega (canario, depois Pyodide)
                       {t:'run', id, code, files|null}           executa; files substitui /data/*
     worker -> runner: {t:'status', s:'canary-ok'|'loading'|'ready'}
                       {t:'refused', reason, detail}             canario falhou: NAO roda codigo
                       {t:'fatal', detail}
                       {t:'started', id}
                       {t:'out', id, parts:[[stream, texto], ...]}   stream 'out' | 'err'
                       {t:'done', id, ok}
   Sem micropip, sem loadPackage: lista de pacotes vazia (MVP so com Python padrao).
   ===================================================================== */
(function () {
  'use strict';
  function workerMain() {
    var CAP_LINES = 2000, CAP_BYTES = 262144;   // iguais aos do runner e da pagina (3 camadas)
    var violations = [];
    self.addEventListener('securitypolicyviolation', function (e) {
      violations.push(String(e.effectiveDirective || e.violatedDirective || ''));
    });
    var pyodide = null, cur = 0;
    var enc = new TextEncoder();

    // ---- saida em lotes com teto (a thread do Worker fica bloqueada durante runPython: sem timers)
    var buf = [], bufBytes = 0, lastFlush = 0, lines = 0, bytes = 0, truncated = false;
    function flush() {
      if (!buf.length) return;
      var parts = buf; buf = []; bufBytes = 0; lastFlush = performance.now();
      self.postMessage({ t: 'out', id: cur, parts: parts });
    }
    function emit(stream, text) {
      if (truncated) return;
      text = String(text);
      var n = 1;
      for (var i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
      var b = enc.encode(text).length + 1;
      if (lines + n > CAP_LINES || bytes + b > CAP_BYTES) {
        truncated = true; flush();
        self.postMessage({ t: 'out', id: cur, parts: [], truncated: true });
        return;
      }
      lines += n; bytes += b;
      push(stream, text + '\n');
    }
    function push(stream, s) {
      var last = buf[buf.length - 1];
      if (last && last[0] === stream) last[1] += s; else buf.push([stream, s]);
      bufBytes += s.length;
      // as primeiras linhas saem na hora: se o programa travar logo depois (laco infinito), o que ja foi impresso nao se perde
      if (lines <= 100 || bufBytes >= 32768 || performance.now() - lastFlush >= 50) flush();
    }

    // ---- canario: a CSP do runner foi herdada? (falha fechada)
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    async function canary() {
      var evalOpen = false, fnOpen = false, fetchOpen = false, wsOpen = false;
      try { (0, eval)('1'); evalOpen = true; } catch (e) {}
      try { new Function('return 1')(); fnOpen = true; } catch (e) {}
      var v0 = violations.length;
      // .invalid nunca resolve: mesmo se a CSP falhar nao ha trafego util nem dado do usuario na requisicao
      try { await fetch('https://canary.invalid/c', { mode: 'no-cors', cache: 'no-store' }); fetchOpen = true; } catch (e) {}
      try { var ws = new WebSocket('wss://canary.invalid/c'); ws.onerror = function () {}; wsOpen = true; setTimeout(function () { try { ws.close(); } catch (e) {} }, 0); } catch (e) { wsOpen = false; }
      await wait(100);
      var seen = violations.slice(v0);
      var fetchBlocked = !fetchOpen && seen.some(function (d) { return /^connect-src/.test(d); });
      var detail = JSON.stringify({ evalOpen: evalOpen, fnOpen: fnOpen, fetchOpen: fetchOpen, fetchBlocked: fetchBlocked, violations: seen.slice(0, 6) });
      if (evalOpen || fnOpen) return { ok: false, reason: 'eval', detail: detail };
      if (!fetchBlocked) return { ok: false, reason: 'fetch', detail: detail };
      return { ok: true };
    }

    // ---- arquivos do usuario em /data/<nome> (so open()/csv; sem pandas)
    function safeName(n) {
      n = String(n || '').split(/[\\/]/).pop().replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^\.+/, '').slice(0, 100);
      return n || 'data.csv';
    }
    function syncFiles(files) {
      var FS = pyodide.FS;
      try { FS.mkdir('/data'); } catch (e) {}
      FS.readdir('/data').forEach(function (n) { if (n !== '.' && n !== '..') { try { FS.unlink('/data/' + n); } catch (e) {} } });
      files.forEach(function (f) {
        if (f && f.buf instanceof ArrayBuffer) FS.writeFile('/data/' + safeName(f.name), new Uint8Array(f.buf));
      });
    }

    // traceback sem os quadros internos do Pyodide (_pyodide/...): so o codigo do usuario fica visivel
    function cleanTb(msg) {
      var L = String(msg).split('\n'), out = [];
      for (var i = 0; i < L.length; i++) {
        if (/^\s+File "\/lib\/python[^"]*\/_pyodide\//.test(L[i]) || /^\s+File "\/lib\/python[^"]*\/pyodide\//.test(L[i])) {
          while (i + 1 < L.length && /^ {4,}/.test(L[i + 1]) && !/^\s+File /.test(L[i + 1])) i++;
          continue;
        }
        out.push(L[i]);
      }
      return out.join('\n');
    }

    async function init(indexURL) {
      var c = await canary();
      if (!c.ok) { self.postMessage({ t: 'refused', reason: c.reason, detail: c.detail }); return; }
      self.postMessage({ t: 'status', s: 'canary-ok' });
      self.postMessage({ t: 'status', s: 'loading' });
      var mod = await import(indexURL + 'pyodide.mjs');
      pyodide = await mod.loadPyodide({
        indexURL: indexURL,
        packages: [],                       // lista fechada: nenhum pacote
        stdin: function () { return null; }, // input() -> EOFError
        stdout: function (s) { emit('out', s); },
        stderr: function (s) { emit('err', s); }
      });
      // loadPackage/loadPackagesFromImports desativados (sem micropip, sem wheels hospedados)
      var off = function () { throw new Error('Package loading is disabled in this playground.'); };
      try { pyodide.loadPackage = off; pyodide.loadPackagesFromImports = off; } catch (e) {}
      self.postMessage({ t: 'status', s: 'ready' });
    }

    async function run(d) {
      cur = d.id; lines = 0; bytes = 0; truncated = false; buf = []; bufBytes = 0; lastFlush = performance.now();
      var ok = true, g = null;
      try {
        if (d.files) syncFiles(d.files);
        self.postMessage({ t: 'started', id: cur });
        g = pyodide.globals.get('dict')();
        g.set('__name__', '__main__');
        pyodide.runPython(String(d.code), { globals: g, filename: '<main>' });
      } catch (e) {
        ok = false;
        var m = String((e && e.message) || e);
        emit('err', cleanTb(m).replace(/\n+$/, ''));
      } finally {
        try { if (g) g.destroy(); } catch (e) {}
      }
      flush();
      self.postMessage({ t: 'done', id: cur, ok: ok });
    }

    self.onmessage = function (e) {
      var d = e.data || {};
      if (d.t === 'init' && typeof d.indexURL === 'string') {
        init(d.indexURL).catch(function (err) { self.postMessage({ t: 'fatal', detail: String((err && err.message) || err).slice(0, 500) }); });
      } else if (d.t === 'run' && pyodide) {
        run(d).catch(function (err) { self.postMessage({ t: 'fatal', detail: String((err && err.message) || err).slice(0, 500) }); });
      }
    };
  }
  window.__PY_WORKER_SRC = '(' + workerMain.toString() + ')();';
})();
