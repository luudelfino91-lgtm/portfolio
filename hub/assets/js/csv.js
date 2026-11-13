/* =====================================================================
   Explorador de dados do Hub (antigo "leitor de CSV"; D11).
   - NENHUM arquivo do usuario: o explorador so abre as tabelas dos 5 cenarios que vem com o site,
     em hub/assets/data/csv/<cenario>/<tabela>.csv (+ schema.json), geradas por
     docs/testing/fixtures/export_scenarios_csv.py a partir dos mesmos .sql do SQL playground.
   - Arquitetura (menor mudanca que preserva valor): sem sql.js e sem Worker. Os arquivos sao pequenos
     (<= 60 KB cada) e de formato fixo e conhecido; um leitor de CSV de ~25 linhas basta. O tipo de cada
     coluna, a chave (PK/FK) e a ordem das tabelas vem do schema.json, que o gerador extrai do proprio
     SQLite (PRAGMA table_info / foreign_key_list): tipo DECLARADO, sem inferencia. A contagem de linhas
     e a de valores ausentes (celula vazia = NULL) saem da leitura do CSV, nao de metadados.
     Isso mantem a CSP desta pagina como estava (sem 'wasm-unsafe-eval') e nao baixa o motor SQL.
   - Unico acesso a rede: fetch de arquivos da MESMA origem, por caminho relativo, sem credenciais.
   - Conteudo (nomes, celulas) entra SEMPRE por textContent.
   - Textos: chaves hub.csv.* e hub.sc.* em i18n.js (PT/EN); Hub.onLang re-renderiza sem novo fetch.
   ===================================================================== */
(function () {
  'use strict';
  var PREVIEW = 100;
  var BASE = new URL('../data/csv/', document.currentScript.src).href;
  var SC = window.HubScenarios;
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, v) { return Hub.t(k, v); };

  var tool = $('csvTool'), sel = $('csvTable'), statusEl = $('csvStatus'), errBox = $('csvErr'), errT = $('csvErrT'), errM = $('csvErrM'), result = $('csvResult');
  var picker = null;
  var job = 0;
  var schemas = {};          // slug -> {tables:[{name, columns:[{name,type,pk,fk}]}]}
  var shown = null;          // {slug, table, def, header, rows, rowCount, nulls:[...], nullCells}
  var err = null;            // {kind:'load'|'data', vars}
  var statusKey = null;

  function setState(s) { tool.setAttribute('data-state', s); }
  function locale() { return Hub.lang === 'pt' ? 'pt-BR' : 'en-US'; }
  function num(n) { return new Intl.NumberFormat(locale()).format(n); }
  function plural(k, n) { return t(k + (n === 1 ? '.one' : '.other'), { n: num(n) }); }

  // ---------- leitor de CSV (formato fixo: UTF-8, LF, aspas so quando preciso) ----------
  function parseCsv(text) {
    var rows = [], row = [], f = '', q = false, i = 0, n = text.length, c;
    if (text.charCodeAt(0) === 0xFEFF) i = 1;
    for (; i < n; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f === '') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function fetchText(url) {
    return fetch(url, { credentials: 'omit', cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(BASE.length));
      return r.text();
    });
  }
  function getSchema(slug) {
    if (schemas[slug]) return Promise.resolve(schemas[slug]);
    return fetchText(BASE + slug + '/schema.json').then(function (txt) {
      var s = JSON.parse(txt), want = SC.bySlug[slug].tables;
      var got = (s.tables || []).map(function (x) { return x.name; });
      if (s.slug !== slug || got.join() !== want.join()) throw new Error('schema.json ' + slug);
      schemas[slug] = s; return s;
    });
  }

  // ---------- renderizacao ----------
  function renderStatus() { statusEl.textContent = statusKey ? t(statusKey.key, statusKey.vars) : ''; }
  function say(key, vars) { statusKey = key ? { key: key, vars: vars } : null; renderStatus(); }
  function renderError() {
    if (!err) { errBox.hidden = true; return; }
    errT.textContent = t('hub.csv.err.' + err.kind + '.t');
    errM.textContent = t('hub.csv.err.' + err.kind + '.m', err.vars);
    errBox.hidden = false;
  }
  function stat(name, text) { tool.querySelector('[data-stat="' + name + '"]').textContent = text; }
  function typeText(ty) { var k = 'hub.csv.type.' + String(ty).toLowerCase().replace('real', 'decimal'); return /^(INTEGER|REAL|TEXT)$/i.test(ty) ? t(k) : String(ty); }
  function keyText(c) {
    var k = [];
    if (c.pk) k.push(t('hub.sql.schema.key.pk'));
    if (c.fk) k.push(t('hub.sql.schema.key.fk', { ref: c.fk }));
    return k.join(', ');
  }

  function renderResult() {
    if (!shown) { result.hidden = true; return; }
    var s = shown, scName = t('hub.sc.' + s.slug + '.name');
    stat('scenario', t('hub.csv.stat.scenario', { v: scName }));
    stat('table', t('hub.csv.stat.table', { v: s.table }));
    stat('rows', plural('hub.csv.rows', s.rowCount));
    stat('cols', plural('hub.csv.cols', s.def.columns.length));
    stat('nulls', t('hub.csv.stat.nulls', { v: num(s.nullCells) }));

    var cb = $('csvCols').tBodies[0]; cb.textContent = '';
    s.def.columns.forEach(function (c, i) {
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = String(i + 1);
      var tdn = document.createElement('td'); tdn.textContent = c.name;
      var tdt = document.createElement('td'); tdt.setAttribute('data-type', c.type); tdt.textContent = typeText(c.type);
      var tdk = document.createElement('td'); tdk.textContent = keyText(c);
      var tdz = document.createElement('td'); tdz.textContent = num(s.nulls[i]);
      [th, tdn, tdt, tdk, tdz].forEach(function (e) { tr.appendChild(e); });
      cb.appendChild(tr);
    });

    var tbl = $('csvData'), thead = tbl.tHead, tbody = tbl.tBodies[0];
    thead.textContent = ''; tbody.textContent = '';
    var htr = document.createElement('tr');
    s.header.forEach(function (h) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = h; htr.appendChild(th); });
    thead.appendChild(htr);
    var frag = document.createDocumentFragment();
    s.rows.slice(0, PREVIEW).forEach(function (row) {
      var tr = document.createElement('tr');
      for (var i = 0; i < s.header.length; i++) {
        var td = document.createElement('td');
        if (row[i] === '') { var nl = document.createElement('span'); nl.className = 'csv-null'; nl.textContent = 'NULL'; td.appendChild(nl); }
        else { var d = document.createElement('div'); d.className = 'csv-cell'; d.textContent = row[i]; td.appendChild(d); }
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    $('csvDataCap').textContent = s.rowCount > PREVIEW
      ? t('hub.csv.data.cap.some', { n: num(PREVIEW), total: num(s.rowCount) })
      : t('hub.csv.data.cap.all', { n: num(s.rowCount) });
    result.hidden = false;
  }
  function renderAll() { renderStatus(); renderError(); renderResult(); }

  // ---------- carga ----------
  function fillTables(slug, keep) {
    var tables = schemas[slug].tables;
    sel.textContent = '';
    tables.forEach(function (tb) { var o = document.createElement('option'); o.value = tb.name; o.textContent = tb.name; sel.appendChild(o); });
    var has = tables.some(function (tb) { return tb.name === keep; });
    sel.value = has ? keep : tables[0].name;
    sel.disabled = false;
  }
  function fail(kind, vars) {
    err = { kind: kind, vars: vars }; shown = null; setState('error'); say(null); renderAll();
  }

  function loadTable(slug, table) {
    var my = ++job;
    err = null; setState('loading');
    say('hub.csv.status.loading', { name: t('hub.sc.' + slug + '.name') });
    result.setAttribute('aria-busy', 'true'); renderError();
    var def = schemas[slug].tables.filter(function (x) { return x.name === table; })[0];
    return fetchText(BASE + slug + '/' + table + '.csv').then(function (txt) {
      if (my !== job) return;
      var all = parseCsv(txt), header = all[0] || [], rows = all.slice(1);
      var names = def.columns.map(function (c) { return c.name; });
      if (header.join() !== names.join()) throw { data: 'header' };
      var nulls = names.map(function () { return 0; }), cells = 0;
      for (var r = 0; r < rows.length; r++) {
        if (rows[r].length !== names.length) throw { data: 'row ' + (r + 2) };
        for (var c = 0; c < names.length; c++) if (rows[r][c] === '') { nulls[c]++; cells++; }
      }
      shown = { slug: slug, table: table, def: def, header: header, rows: rows, rowCount: rows.length, nulls: nulls, nullCells: cells };
      err = null; setState('ready'); result.setAttribute('aria-busy', 'false');
      say('hub.csv.status.ready', { table: table, scenario: t('hub.sc.' + slug + '.name'), rows: plural('hub.csv.rows', rows.length), cols: plural('hub.csv.cols', names.length) });
      renderAll();
    }).catch(function (e) {
      if (my !== job) return;
      result.setAttribute('aria-busy', 'false');
      if (e && e.data) fail('data', { table: table, detail: e.data }); else fail('load', { detail: String(e && e.message || e) });
    });
  }

  function loadScenario(slug, keepTable) {
    var my = ++job;
    err = null; shown = null; setState('loading'); sel.disabled = true; result.hidden = true;
    say('hub.csv.status.loading', { name: t('hub.sc.' + slug + '.name') }); renderError();
    return getSchema(slug).then(function (s) {
      if (my !== job) return;
      fillTables(slug, keepTable);
      return loadTable(slug, sel.value);
    }).catch(function (e) {
      if (my !== job) return;
      fail('load', { detail: String(e && e.message || e) });
    });
  }

  // ---------- eventos ----------
  picker = SC.mount($('csvPicker'), { name: 'csvScenario', value: SC.defaultSlug, er: true, onChange: function (slug) { loadScenario(slug, sel.value); } });
  sel.addEventListener('change', function () { loadTable(picker.get(), sel.value); });
  Hub.onLang.push(function () {
    if (shown) say('hub.csv.status.ready', { table: shown.table, scenario: t('hub.sc.' + shown.slug + '.name'), rows: plural('hub.csv.rows', shown.rowCount), cols: plural('hub.csv.cols', shown.def.columns.length) });
    renderAll();
  });
  loadScenario(picker.get(), null);
})();
