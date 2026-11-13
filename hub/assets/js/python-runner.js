/* =====================================================================
   Runner do Python (T-402, D10): roda DENTRO de <iframe sandbox="allow-scripts">
   (origem opaca, sem allow-same-origin). Papel: criar o Worker modulo de data:
   (herda a CSP do runner.html), repassar mensagens validadas entre a pagina e o
   Worker e agrupar a saida. Nada aqui executa o codigo do usuario.
   - A pagina e o unico remetente aceito (event.source === window.parent).
   - Tudo que vem do Worker e tratado como NAO confiavel (o Python pode chamar
     postMessage): so formatos conhecidos, textos com teto, ids conferidos.
   - A origem das mensagens e "null": o alvo do postMessage e '*' (inevitavel
     para origem opaca); a validacao e feita por event.source no lado da pagina.
   ===================================================================== */
(function () {
  'use strict';
  var CAP_LINES = 2000, CAP_BYTES = 262144, MAX_CODE = 204800, MAX_FILE = 1048576, MAX_FILES = 8, MAX_TOTAL = 4194304;   // CSV do cenario: ate 8 tabelas, 1 MiB cada, 4 MiB no total (D11)
  var parentWin = window.parent;
  // M3: so roda em iframe sandbox sem allow-same-origin. Aberto como pagina de topo ou emoldurado sem
  // sandbox, o documento teria a origem do site: recusa e nem registra o listener de 'run'.
  // (location.origin NAO serve: devolve a origem da URL, nao a do documento; window.origin e a do documento.)
  if (window.origin !== 'null' || self.origin !== 'null' || parentWin === window) {
    try { if (parentWin !== window) parentWin.postMessage({ t: 'fatal', detail: 'runner outside sandbox: refused' }, '*'); } catch (e) {}
    return;
  }
  var worker = null, workerReady = false, queued = [], running = false;
  var curId = 0, pending = [], pendBytes = 0, lines = 0, bytes = 0, trunc = false, timer = 0, truncSent = false;
  var INDEX_URL = new URL('../../assets/vendor/pyodide/', location.href).href;

  function up(m) { try { parentWin.postMessage(m, '*'); } catch (e) {} }
  function str(v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }

  function flushOut() {
    timer = 0;
    if (pending.length) { var p = pending; pending = []; pendBytes = 0; up({ t: 'out', id: curId, parts: p }); }
    if (trunc && !truncSent) { truncSent = true; up({ t: 'truncated', id: curId }); }
  }
  function schedule() { if (!timer) timer = setTimeout(flushOut, 50); }
  function addOut(parts) {
    for (var i = 0; i < parts.length && !trunc; i++) {
      var p = parts[i];
      if (!Array.isArray(p) || (p[0] !== 'out' && p[0] !== 'err') || typeof p[1] !== 'string') continue;
      var text = p[1], n = 0;
      for (var k = 0; k < text.length; k++) if (text.charCodeAt(k) === 10) n++;
      if (lines + n > CAP_LINES || bytes + text.length > CAP_BYTES) { trunc = true; break; }
      lines += n; bytes += text.length;
      var last = pending[pending.length - 1];
      if (last && last[0] === p[0]) last[1] += text; else pending.push([p[0], text]);
    }
    schedule();
  }

  function startWorker() {
    try {
      var url = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(window.__PY_WORKER_SRC || '');
      worker = new Worker(url, { type: 'module', name: 'python' });
    } catch (e) { up({ t: 'fatal', detail: 'worker: ' + str(e && e.message, 200) }); return; }
    worker.onerror = function (e) { up({ t: 'fatal', detail: 'worker error: ' + str(e && e.message, 300) }); };
    worker.onmessageerror = function () { up({ t: 'fatal', detail: 'worker messageerror' }); };
    worker.onmessage = function (e) {
      var d = e.data; if (!d || typeof d !== 'object') return;
      switch (d.t) {
        case 'status':
          if (workerReady) break;   // depois de pronto so o proprio runner fala de estado (o Python pode forjar mensagens)
          if (d.s === 'canary-ok' || d.s === 'loading' || d.s === 'ready') {
            up({ t: 'status', s: d.s });
            if (d.s === 'ready') { workerReady = true; queued.splice(0).forEach(sendRun); }
          }
          break;
        case 'refused': if (workerReady) break; up({ t: 'refused', reason: str(d.reason, 20), detail: str(d.detail, 600) }); break;
        case 'fatal': if (workerReady) break; up({ t: 'fatal', detail: str(d.detail, 600) }); break;
        case 'started': if (d.id === curId) up({ t: 'started', id: curId }); break;
        case 'out': if (d.id === curId) { if (Array.isArray(d.parts)) addOut(d.parts); if (d.truncated === true) { trunc = true; schedule(); } } break;
        case 'done':
          // uma vez por execucao, so com a execucao em andamento e ok booleano (o Python pode forjar)
          if (running && d.id === curId && typeof d.ok === 'boolean') { running = false; if (timer) clearTimeout(timer); flushOut(); up({ t: 'done', id: curId, ok: d.ok }); }
          break;
      }
    };
    worker.postMessage({ t: 'init', indexURL: INDEX_URL });
  }

  function sendRun(d) {
    curId = d.id; running = true; pending = []; pendBytes = 0; lines = 0; bytes = 0; trunc = false; truncSent = false;
    var files = null, transfer = [];
    if (Array.isArray(d.tables)) {
      files = [];
      var total = 0;
      d.tables.slice(0, MAX_FILES).forEach(function (f) {
        if (f && typeof f.name === 'string' && f.buf instanceof ArrayBuffer && f.buf.byteLength <= MAX_FILE && total + f.buf.byteLength <= MAX_TOTAL) { total += f.buf.byteLength; files.push({ name: f.name.slice(0, 200), buf: f.buf }); transfer.push(f.buf); }
      });
    }
    worker.postMessage({ t: 'run', id: d.id, code: d.code, tables: files }, transfer);
  }

  window.addEventListener('message', function (e) {
    if (e.source !== parentWin) return;
    var d = e.data; if (!d || typeof d !== 'object') return;
    if (d.t === 'run') {
      if (typeof d.id !== 'number' || typeof d.code !== 'string' || d.code.length > MAX_CODE) return;
      if (!worker) startWorker();
      if (worker) { if (workerReady) sendRun(d); else { queued.length = 0; queued.push(d); } }
    } else if (d.t === 'stop') {
      try { if (worker) worker.terminate(); } catch (err) {}
      worker = null; workerReady = false; running = false; queued.length = 0;
    }
  });
  up({ t: 'boot' });
})();
