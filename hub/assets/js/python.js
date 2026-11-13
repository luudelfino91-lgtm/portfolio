/* =====================================================================
   Playground de Python do Hub (T-402, D10). Pagina (origem do site).
   - Nenhum arquivo do Pyodide e pedido ate o clique em Executar (PRV-14).
     No primeiro Executar a pagina cria <iframe sandbox="allow-scripts"> (SEM
     allow-same-origin: origem opaca) com runner.html. O runner cria um Worker
     modulo de data: (herda a CSP do runner: sem eval, sem rede de fora) e so
     entao carrega o Pyodide autohospedado (assets/vendor/pyodide/).
   - Antes de qualquer codigo do usuario o Worker roda um CANARIO (eval e
     fetch/WebSocket para fora devem estar bloqueados). Se falhar, recusamos
     executar (refused). Falha fechada tambem se o navegador nao emitir o
     evento securitypolicyviolation.
   - Mensagens do iframe: so aceitas se event.source === iframe.contentWindow;
     formatos conhecidos; tudo e texto e entra por textContent; teto de linhas
     e bytes tambem aqui (a ultima camada).
   - Parar / tempo limite = remover o iframe (o navegador encerra o Worker; o
     runner tambem recebe 'stop' e chama worker.terminate()). Python recarrega
     no proximo Executar (estado perdido, ~6 MB de novo: cache nao reaproveitado
     em iframe de origem opaca, medido em docs/security/phase-4-worker-isolation.md).
   - Dados (D11): NAO existe upload nem escolha de arquivo. Os unicos dados sao as tabelas do cenario escolhido
     (5 cenarios embutidos), em hub/assets/data/csv/<cenario>/<tabela>.csv. A PAGINA (origem do site) busca esses
     CSV na mesma origem (fetch relativo, sem credenciais; por isso a CSP desta pagina tem connect-src 'self') e os
     entrega por postMessage ao iframe, que os grava em /data/<tabela>.csv no sistema de arquivos virtual. O iframe nao
     tem rede nem origem para buscar nada. Os arquivos sao reenviados a CADA execucao (cada Run comeca com /data intacto).
   - EXTENSAO FUTURA (pandas, outro agente): pacotes seriam carregados DENTRO do Worker (ver o ponto de extensao em
     python-worker-src.js) com wheels hospedados no proprio site; esta pagina nao muda: os CSV em /data/ ja servem de entrada.
   - Dados do usuario nunca saem do navegador: sem telemetria, nada gravado (nem localStorage; so ld-lang/ld-theme
     do Hub, em outros arquivos). O unico fetch e o dos CSV do cenario, da mesma origem.
   - FLAG UNICA do fallback B2 (Worker de blob na propria pagina, sem isolamento
     de armazenamento): NAO implementado. So seria necessario se o GitHub Pages
     nao enviar Access-Control-Allow-Origin nos arquivos do Pyodide (SEC-P4-03).
   ===================================================================== */
(function () {
  'use strict';
  var MAX_CODE = 204800;                 // 200 KB (bytes UTF-8)
  var MAX_FILE = 1048576;                // 1 MiB por tabela (as maiores tem ~60 KB); o runner confere de novo
  var DATA_URL = new URL('../../assets/data/csv/', location.href).href;   // hub/assets/data/csv/
  var SC = window.HubScenarios;
  var CAP_LINES = 2000, CAP_BYTES = 262144;
  var T_MIN = 5, T_MAX = 120, T_DEFAULT = 30;
  var LOAD_TIMEOUT_MS = 120000;          // carregar Pyodide + canario
  var RUNNER_URL = new URL('runner.html', location.href).href;   // mesma pasta desta pagina

  function $(id) { return document.getElementById(id); }
  var tool = $('pyTool'), editor = $('pyEditor'), runBtn = $('pyRun'), stopBtn = $('pyStop'), clearBtn = $('pyClear');
  var timeoutIn = $('pyTimeout'), dataFiles = $('pyDataFiles'), dataNote = $('pyDataNote');
  var picker = null;
  var statusEl = $('pyStatus'), errBox = $('pyErr'), errT = $('pyErrT'), errM = $('pyErrM'), warnBox = $('pyWarn');
  var outEl = $('pyOut'), outEmpty = $('pyOutEmpty'), outNone = $('pyOutNone');
  if (!tool || !editor) return;
  function t(k, v) { return window.Hub.t(k, v); }
  function nf(n) { return new Intl.NumberFormat(window.Hub.lang === 'pt' ? 'pt-BR' : 'en-US').format(n); }

  var frame = null, runId = 0, state = 'idle', engineReady = false;
  var loadTimer = 0, runTimer = 0, startedAt = 0;
  var dataCache = {};              // slug -> [{name, buf}] (CSV do cenario, em cache de memoria; copiados a cada execucao)
  var lines = 0, bytes = 0, truncated = false, anyOut = false;
  var lastStatus = null;           // para refazer o texto ao trocar de idioma: [chave, vars]
  var lastErr = null;
  var pendingCode = '', pendingSecs = T_DEFAULT, pendingSlug = SC.defaultSlug;

  function setState(s) { state = s; tool.dataset.state = s; runBtn.disabled = s !== 'idle'; stopBtn.disabled = s === 'idle'; if (picker) picker.setDisabled(s !== 'idle'); }
  function vv(v) { return typeof v === 'function' ? v() : v; }   // vars podem ser funcao: refeitas ao trocar de idioma
  function setStatus(key, vars) { lastStatus = key ? [key, vars] : null; statusEl.textContent = key ? t(key, vv(vars)) : ''; }
  function showErr(tk, mk, vars) { lastErr = [tk, mk, vars]; errT.textContent = t(tk); errM.textContent = t(mk, vars); errBox.hidden = false; }
  function hideErr() { lastErr = null; errBox.hidden = true; }
  function showWarn(key, vars) { warnBox.textContent = ''; var p = document.createElement('p'); p.textContent = t(key, vars); warnBox.appendChild(p); warnBox.dataset.k = key; warnBox.hidden = false; }
  function hideWarn() { warnBox.hidden = true; delete warnBox.dataset.k; warnBox.textContent = ''; }

  // ---- saida
  function clearOutput() {
    outEl.textContent = ''; outEl.hidden = true; outEmpty.hidden = false; outNone.hidden = true;
    lines = 0; bytes = 0; truncated = false; anyOut = false; hideWarn();
  }
  function appendOut(parts) {
    for (var i = 0; i < parts.length && !truncated; i++) {
      var p = parts[i];
      if (!Array.isArray(p) || (p[0] !== 'out' && p[0] !== 'err') || typeof p[1] !== 'string') continue;
      var text = p[1], n = 0;
      for (var k = 0; k < text.length; k++) if (text.charCodeAt(k) === 10) n++;
      if (lines + n > CAP_LINES || bytes + text.length > CAP_BYTES) { markTruncated(); break; }
      lines += n; bytes += text.length; anyOut = true;
      var span = document.createElement('span');
      span.className = p[0] === 'err' ? 'py-err' : 'py-std';
      span.textContent = text;
      outEl.appendChild(span);
    }
    if (anyOut) { outEl.hidden = false; outEmpty.hidden = true; outNone.hidden = true; }
  }
  function markTruncated() { if (!truncated) { truncated = true; showWarn('hub.py.out.trunc', { lines: nf(CAP_LINES), kib: '256' }); } }

  // ---- iframe
  function killFrame() {
    clearTimeout(loadTimer); clearTimeout(runTimer);
    if (frame) {
      try { frame.contentWindow.postMessage({ t: 'stop' }, '*'); } catch (e) {}
      frame.remove(); frame = null;
    }
    engineReady = false;
  }
  function makeFrame() {
    var f = document.createElement('iframe');
    f.className = 'py-frame';
    f.setAttribute('sandbox', 'allow-scripts');   // NUNCA allow-same-origin
    f.setAttribute('allow', '');
    f.setAttribute('referrerpolicy', 'no-referrer');
    f.setAttribute('tabindex', '-1');
    f.setAttribute('aria-hidden', 'true');
    f.setAttribute('title', t('hub.py.frame.title'));
    f.src = RUNNER_URL;
    document.body.appendChild(f);
    return f;
  }

  // As tabelas do cenario vao a CADA execucao (copias: o cache da pagina nao e transferido); o Worker recria /data com elas.
  function sendRun(id, code) {
    var files = (dataCache[pendingSlug] || []).map(function (f) { return { name: f.name, buf: f.buf.slice(0) } });
    frame.contentWindow.postMessage({ t: 'run', id: id, code: code, tables: files }, '*', files.map(function (f) { return f.buf; }));
  }

  function finishRun(statusKey, vars) {
    clearTimeout(runTimer);
    setState('idle');
    if (!anyOut && !truncated) { outEmpty.hidden = true; outNone.hidden = false; }
    setStatus(statusKey, vars);
  }

  function onMessage(e) {
    if (!frame || e.source !== frame.contentWindow) return;   // so o nosso iframe
    var d = e.data;
    if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
    switch (d.t) {
      case 'boot': if (state === 'loading') sendRun(runId, pendingCode); break;
      case 'status':
        if (d.s === 'canary-ok') setStatus('hub.py.status.canary.ok');
        else if (d.s === 'loading') setStatus('hub.py.status.loading');
        else if (d.s === 'ready') { engineReady = true; clearTimeout(loadTimer); tool.dataset.engine = 'ready'; }
        break;
      case 'refused':
        killFrame(); setState('idle'); setStatus('hub.py.status.refused');
        showErr('hub.py.err.refused.t', 'hub.py.err.refused.m', { why: d.reason === 'eval' ? t('hub.py.err.refused.eval') : t('hub.py.err.refused.net') });
        tool.dataset.engine = 'refused';
        break;
      case 'fatal':
        killFrame(); setState('idle'); setStatus('hub.py.status.failed'); tool.dataset.engine = 'none';
        showErr('hub.py.err.fatal.t', 'hub.py.err.fatal.m', { detail: String(d.detail || '').slice(0, 300) });
        break;
      case 'started':
        if (d.id !== runId) return;
        clearTimeout(loadTimer);
        setState('running'); setStatus('hub.py.status.running'); startedAt = performance.now();
        var secs = pendingSecs; runTimer = setTimeout(function () { onTimeout(secs); }, secs * 1000);
        break;
      case 'out': if (d.id === runId && Array.isArray(d.parts)) appendOut(d.parts); break;
      case 'truncated': if (d.id === runId) markTruncated(); break;
      case 'done':
        if (d.id !== runId || state !== 'running') return;
        var ms = Math.round(performance.now() - startedAt);
        var nl = lines;
        finishRun(d.ok ? 'hub.py.status.done' : 'hub.py.status.error', function () { return { ms: nf(ms), lines: t(nl === 1 ? 'hub.py.lines.one' : 'hub.py.lines.other', { n: nf(nl) }) }; });
        break;
    }
  }
  window.addEventListener('message', onMessage);

  function onTimeout(secs) {
    killFrame(); tool.dataset.engine = 'none';
    setState('idle');
    showErr('hub.py.err.timeout.t', 'hub.py.err.timeout.m', { s: secs });
    setStatus('hub.py.status.stopped');
  }
  function stop() {
    if (state === 'idle') return;
    killFrame(); tool.dataset.engine = 'none';
    setState('idle'); showWarn('hub.py.warn.stopped'); setStatus('hub.py.status.stopped');
    runBtn.focus();
  }

  function run() {
    if (state !== 'idle') return;
    hideErr();
    var code = editor.value;
    if (!code.trim()) { showErr('hub.py.err.empty.t', 'hub.py.err.empty.m'); editor.focus(); return; }
    var size = new TextEncoder().encode(code).length;
    if (size > MAX_CODE) { showErr('hub.py.err.size.t', 'hub.py.err.size.m', { n: nf(size) }); editor.focus(); return; }
    var raw = timeoutIn.value.trim(), secs = Number(raw);
    if (!/^\d+$/.test(raw) || secs < T_MIN || secs > T_MAX) { showErr('hub.py.err.timeoutval.t', 'hub.py.err.timeoutval.m', { min: T_MIN, max: T_MAX }); timeoutIn.focus(); return; }
    clearOutput();
    runId++;
    var id = runId, slug = picker.get();
    pendingCode = code; pendingSecs = secs; pendingSlug = slug;
    setState('loading'); setStatus('hub.py.status.data');
    getData(slug).then(function () {
      if (id !== runId || state !== 'loading') return;   // Parar (ou outra execucao) enquanto os dados vinham
      if (!frame) {
        setStatus('hub.py.status.loading');
        tool.dataset.engine = 'loading';
        frame = makeFrame();
        loadTimer = setTimeout(function () {
          killFrame(); setState('idle'); tool.dataset.engine = 'none'; setStatus('hub.py.status.failed');
          showErr('hub.py.err.fatal.t', 'hub.py.err.fatal.m', { detail: 'timeout' });
        }, LOAD_TIMEOUT_MS);
      } else {
        setStatus('hub.py.status.starting');
        sendRun(id, code);
      }
    }, function (e) {
      if (id !== runId || state !== 'loading') return;
      setState('idle'); setStatus(null);
      showErr('hub.py.err.data.t', 'hub.py.err.data.m', { detail: String(e && e.message || e).slice(0, 200) });
    });
  }

  // ---- dados do cenario (D11): fetch same-origin dos CSV; nada de escolha de arquivo
  function getData(slug) {
    if (dataCache[slug]) return Promise.resolve(dataCache[slug]);
    var tables = SC.bySlug[slug].tables;
    return Promise.all(tables.map(function (tb) {
      return fetch(DATA_URL + slug + '/' + tb + '.csv', { credentials: 'omit', cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + tb + '.csv');
        return r.arrayBuffer();
      }).then(function (buf) {
        if (buf.byteLength === 0 || buf.byteLength > MAX_FILE) throw new Error(tb + '.csv: ' + buf.byteLength + ' bytes');
        return { name: tb + '.csv', buf: buf };
      });
    })).then(function (files) { dataCache[slug] = files; return files; });
  }
  function renderData() {
    var slug = picker.get(), list = SC.bySlug[slug].tables.map(function (tb) { return '/data/' + tb + '.csv'; }).join(', ');
    dataFiles.textContent = t('hub.py.data.list', { list: list });
    dataNote.textContent = t('hub.py.data.note', { example: '/data/' + SC.bySlug[slug].tables[0] + '.csv' });
  }

  runBtn.addEventListener('click', run);
  stopBtn.addEventListener('click', stop);
  clearBtn.addEventListener('click', function () { clearOutput(); });
  editor.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });

  // idioma: refaz os textos dinamicos
  window.Hub.onLang.push(function () {
    if (lastStatus) statusEl.textContent = t(lastStatus[0], vv(lastStatus[1]));
    if (lastErr) { errT.textContent = t(lastErr[0]); errM.textContent = t(lastErr[1], lastErr[2]); }
    if (warnBox.dataset.k) { var k = warnBox.dataset.k; showWarn(k, k === 'hub.py.out.trunc' ? { lines: nf(CAP_LINES), kib: '256' } : undefined); }
    if (frame) frame.setAttribute('title', t('hub.py.frame.title'));
    renderData();
  });
  picker = SC.mount($('pyPicker'), { name: 'pyScenario', value: SC.defaultSlug, er: true, onChange: renderData });
  renderData();
  setState('idle');
})();
