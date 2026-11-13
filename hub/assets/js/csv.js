/* =====================================================================
   Leitor de CSV do Hub (T-302, T-306a, T-309).
   - Tudo local: o arquivo é lido por um Web Worker (csv-worker.js), que usa
     o Papa Parse vendorizado. Este arquivo não faz fetch/XHR com o conteúdo.
   - Conteúdo do arquivo (nomes, células) entra SEMPRE por textContent.
   - Cancelar = worker.terminate(); o estado anterior é mantido.
   - Textos: chaves hub.csv.* em i18n.js (PT/EN); Hub.onLang re-renderiza.
   ===================================================================== */
(function () {
  'use strict';
  var LIMIT = 10485760;      // 10 MiB, exibido como "10 MB"
  var PREVIEW = 100;
  var MAX_COLS = 2000;       // igual a MAX_COLS de csv-worker.js (só para a mensagem)
  var WORKER_URL = new URL('csv-worker.js', document.currentScript.src).href;
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, v) { return Hub.t(k, v); };

  var tool = $('csvTool'), drop = $('csvDrop'), input = $('csvFile');
  var selDelim = $('csvDelim'), selEnc = $('csvEnc');
  var run = $('csvRun'), prog = $('csvProg'), pct = $('csvPct'), cancelBtn = $('csvCancel');
  var statusEl = $('csvStatus'), errBox = $('csvErr'), errT = $('csvErrT'), errM = $('csvErrM'), warnBox = $('csvWarn');
  var result = $('csvResult');

  var worker = null, job = 0;
  var file = null;       // File em leitura ou carregado (para reler com outras opções)
  var shown = null;      // {file:{name,size}, res} atualmente exibido
  var pending = null;    // arquivo em leitura {name,size}
  var err = null;        // {code, vars}
  var statusKey = null;  // {key, vars}

  function setState(s) { tool.setAttribute('data-state', s); }
  function locale() { return Hub.lang === 'pt' ? 'pt-BR' : 'en-US'; }
  function num(n) { return new Intl.NumberFormat(locale()).format(n); }
  function size(b) {
    var nf = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 });
    if (b < 1024) return num(b) + ' bytes';
    if (b < 1048576) return nf.format(b / 1024) + ' KB';
    return nf.format(b / 1048576) + ' MB';
  }
  function plural(k, n) { return t(k + (n === 1 ? '.one' : '.other'), { n: num(n) }); }
  function delimName(d) {
    return { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' }[d] ? t('hub.csv.delim.' + { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' }[d]) : t('hub.csv.delim.none');
  }
  function encName(r) { return r.encoding === 'windows-1252' ? t('hub.csv.enc.w1252') : (r.bom ? t('hub.csv.enc.utf8bom') : t('hub.csv.enc.utf8')); }

  // ---------- renderização ----------
  function renderStatus() {
    statusEl.textContent = statusKey ? t(statusKey.key, statusKey.vars) : '';
  }
  function say(key, vars) { statusKey = key ? { key: key, vars: vars } : null; renderStatus(); }

  function renderError() {
    if (!err) { errBox.hidden = true; return; }
    errT.textContent = t('hub.csv.err.' + err.code + '.t');
    var m = t('hub.csv.err.' + err.code + '.m', err.vars);
    if (shown) m += ' ' + t('hub.csv.err.keep');
    errM.textContent = m;
    errBox.hidden = false;
  }

  function renderWarnings() {
    warnBox.textContent = '';
    var r = shown && shown.res, items = [];
    if (r) {
      if (r.fallback) items.push(t('hub.csv.warn.fallback'));
      else if (r.replacement) items.push(t('hub.csv.warn.replacement'));
      if (r.previewCols && r.previewCols < r.colCount) items.push(t('hub.csv.warn.colcap', { n: num(r.previewCols), total: num(r.colCount) }));
      if (r.ragged) items.push(t('hub.csv.warn.ragged', { n: num(r.ragged) }));
      if (r.quoteErrors) items.push(t('hub.csv.warn.quotes'));
    }
    items.forEach(function (s) { var p = document.createElement('p'); p.textContent = s; warnBox.appendChild(p); });
    warnBox.hidden = items.length === 0;
  }

  function stat(name, text) { tool.querySelector('[data-stat="' + name + '"]').textContent = text; }

  function renderResult() {
    if (!shown) { result.hidden = true; return; }
    var r = shown.res;
    stat('file', t('hub.csv.stat.file', { v: shown.file.name }));
    stat('size', t('hub.csv.stat.size', { v: size(shown.file.size) }));
    stat('rows', plural('hub.csv.rows', r.rowCount));
    stat('cols', plural('hub.csv.cols', r.colCount));
    stat('delim', t('hub.csv.stat.delim', { v: delimName(r.delimiter) }));
    stat('enc', t('hub.csv.stat.enc', { v: encName(r) }));

    // colunas e tipos
    var cb = $('csvCols').tBodies[0]; cb.textContent = '';
    r.header.forEach(function (h, i) {
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = String(i + 1);
      var tdn = document.createElement('td'); setName(tdn, h);
      var tdt = document.createElement('td'); tdt.setAttribute('data-type', r.types[i]); tdt.textContent = t('hub.csv.type.' + r.types[i]);
      tr.appendChild(th); tr.appendChild(tdn); tr.appendChild(tdt); cb.appendChild(tr);
    });

    // dados (primeiras linhas)
    var tbl = $('csvData'), thead = tbl.tHead, tbody = tbl.tBodies[0];
    thead.textContent = ''; tbody.textContent = '';
    var htr = document.createElement('tr');
    var pc = Math.min(r.colCount, r.previewCols || r.colCount);
    r.header.slice(0, pc).forEach(function (h) { var th = document.createElement('th'); th.scope = 'col'; setName(th, h); htr.appendChild(th); });
    thead.appendChild(htr);
    var frag = document.createDocumentFragment();
    r.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      for (var i = 0; i < pc; i++) {
        var td = document.createElement('td'), d = document.createElement('div');
        d.className = 'csv-cell';
        d.textContent = i < row.length ? row[i] : '';
        td.appendChild(d); tr.appendChild(td);
      }
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    $('csvDataCap').textContent = r.rowCount > r.rows.length
      ? t('hub.csv.data.cap.some', { n: num(r.rows.length), total: num(r.rowCount) })
      : t('hub.csv.data.cap.all', { n: num(r.rowCount) });
    var empty = $('csvDataEmpty'); empty.hidden = r.rowCount !== 0; empty.textContent = r.rowCount === 0 ? t('hub.csv.data.empty') : '';
    result.hidden = false;
  }
  function setName(el, h) {
    el.textContent = h === '' ? t('hub.csv.noname') : h;
    el.classList.toggle('csv-noname', h === '');
  }

  function renderAll() { renderStatus(); renderError(); renderWarnings(); renderResult(); }

  // ---------- leitura ----------
  function stopWorker() { if (worker) { worker.onmessage = worker.onerror = null; worker.terminate(); worker = null; } }
  function busy(on) {
    run.hidden = !on;
    result.setAttribute('aria-busy', on ? 'true' : 'false');
    selDelim.disabled = selEnc.disabled = false;
  }
  function fail(code, vars) {
    stopWorker(); busy(false); pending = null;
    err = { code: code, vars: vars || {} };
    setState(shown ? 'ready' : 'error');
    // O erro nunca apaga o arquivo anterior; a seleção volta ao que está exibido
    if (shown) { file = shown.fileObj; selDelim.value = shown.opts.delim; selEnc.value = shown.opts.enc; }
    say(null); renderError();
  }

  function start(f) {
    stopWorker(); job++;
    var my = job;
    err = null; renderError();
    if (f.size > LIMIT) { return fail('size', { size: size(f.size), bytes: num(f.size) }); }
    if (f.size === 0) { return fail('empty'); }
    if (typeof Worker === 'undefined') { return fail('noworker'); }
    file = f; pending = { name: f.name, size: f.size };
    var opts = { delim: selDelim.value, enc: selEnc.value };
    prog.value = 0; pct.textContent = '0%'; busy(true); setState('loading');
    say('hub.csv.status.loading', { name: f.name });
    try { worker = new Worker(WORKER_URL); } catch (e) { return fail('worker'); }
    worker.onerror = function (ev) { if (my === job) { if (ev && ev.preventDefault) ev.preventDefault(); fail('worker'); } };
    worker.onmessage = function (ev) {
      if (my !== job) return;
      var m = ev.data;
      if (m.type === 'progress') { prog.value = m.pct; pct.textContent = m.pct + '%'; }
      else if (m.type === 'error') { fail(m.code, m.code === 'cols' ? { n: num(+m.detail), max: num(MAX_COLS) } : { detail: m.detail }); }
      else if (m.type === 'result') {
        stopWorker(); busy(false); pending = null;
        shown = { file: { name: f.name, size: f.size }, fileObj: f, res: m, opts: opts };
        err = null;
        setState('ready');
        say('hub.csv.status.ready', { rows: plural('hub.csv.rows', m.rowCount), cols: plural('hub.csv.cols', m.colCount) });
        renderAll();
      }
    };
    worker.postMessage({ type: 'parse', file: f, delimiter: opts.delim, encoding: opts.enc, preview: PREVIEW });
  }

  function cancel() {
    if (!worker) return;
    job++; stopWorker(); busy(false); pending = null;
    if (shown) { file = shown.fileObj; selDelim.value = shown.opts.delim; selEnc.value = shown.opts.enc; }
    setState(shown ? 'ready' : 'idle');
    say(shown ? 'hub.csv.status.canceled.prev' : 'hub.csv.status.canceled.none');
    input.focus();
  }

  // Arquivo novo volta às opções automáticas (escolha manual vale só para o arquivo atual)
  function resetOpts() { selDelim.value = 'auto'; selEnc.value = 'auto'; }

  // ---------- eventos ----------
  input.addEventListener('change', function () {
    var f = input.files && input.files[0];
    if (f) { resetOpts(); start(f); }
    input.value = '';
  });
  cancelBtn.addEventListener('click', cancel);
  [selDelim, selEnc].forEach(function (s) { s.addEventListener('change', function () { if (file) start(file); }); });

  var depth = 0;
  function over(on) { drop.classList.toggle('is-over', on); $('csvDropTitle').textContent = on ? t('hub.csv.drop.over') : t('hub.csv.drop.title'); }
  drop.addEventListener('dragenter', function (e) { e.preventDefault(); depth++; over(true); });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
  drop.addEventListener('dragleave', function () { depth = Math.max(0, depth - 1); if (!depth) over(false); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault(); depth = 0; over(false);
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { resetOpts(); start(f); }
  });
  // soltar fora da zona não deve navegar para o arquivo
  ['dragover', 'drop'].forEach(function (n) { window.addEventListener(n, function (e) { if (!drop.contains(e.target)) e.preventDefault(); }); });

  Hub.onLang.push(function () { over(drop.classList.contains('is-over')); renderAll(); });
})();
