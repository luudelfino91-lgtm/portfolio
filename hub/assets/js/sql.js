/* =====================================================================
   SQL playground do Hub (T-304, T-305, T-306 SQL, T-309).
   - Tudo local: o SQL e o CSV são processados por um Web Worker
     (sql-worker.js) com sql.js vendorizado. Único fetch deste arquivo: o
     banco de exemplo (../data/loja-exemplo.sql, mesma origem, caminho relativo).
   - Conteúdo do usuário (SQL, nomes, células, mensagens do motor) entra
     SEMPRE por textContent.
   - Parar / Cancelar / tempo limite = worker.terminate(). O banco em memória
     é recriado; as tabelas de CSV são recarregadas dos objetos File que a
     página guarda (referência, nada é copiado nem persistido). Tabelas criadas
     por SQL são perdidas e a mensagem avisa.
   - Banco de exemplo (T-307): carregado no Worker (mensagem 'sample'); também é
     recarregado depois de Parar/tempo limite, antes dos CSV. As consultas de
     exemplo só colocam o SQL no editor (o texto SQL é igual em PT e EN).
   - Exercícios guiados (T-307): 5 exercícios com verificação automática no MESMO Worker (mensagem 'verify'), com o mesmo
     limite de tempo e o mesmo Parar. A regra de comparação está em hub/assets/data/exercicios.md e em sql-worker.js (sqVerify).
     A verificação roda num banco novo e descartável (o banco do playground nunca é tocado). O progresso (quais foram
     resolvidos) fica só em memória desta página: nada vai para localStorage/cookies.
   - Textos: chaves hub.sql.* (e hub.csv.* reaproveitadas) em i18n.js (PT/EN).
   ===================================================================== */
(function () {
  'use strict';
  var LIMIT = 10485760;        // 10 MiB por CSV (mesmo limite do leitor)
  var ROW_LIMIT = 1000;        // linhas exibidas no máximo
  var CELL_BUDGET = 20000;     // células exibidas no máximo (linhas x colunas)
  var STOP_AFTER_MS = 3000;    // "Parar" aparece depois de 3 s
  var WORKER_URL = new URL('sql-worker.js', document.currentScript.src).href;
  var SAMPLE_URL = new URL('../data/loja-exemplo.sql', document.currentScript.src).href;
  // Consultas de exemplo (T-307). SQL igual nos dois idiomas; título/descrição em hub.sql.sample.q.<id>.t/.d
  var Q_ITEMS = 'SUM(ip.quantidade * ip.preco_unitario)';
  var SAMPLE_QUERIES = [
    { id: 'filtro', sql: 'SELECT nome, preco\nFROM produtos\nWHERE preco > 100\nORDER BY preco DESC;' },
    { id: 'nulos', sql: 'SELECT id, nome, email\nFROM clientes\nWHERE cidade IS NULL\nORDER BY nome;' },
    { id: 'join', sql: 'SELECT p.nome AS produto, c.nome AS categoria, p.preco\nFROM produtos p\nINNER JOIN categorias c ON c.id = p.categoria_id\nORDER BY c.nome, p.nome;' },
    { id: 'join4', sql: 'SELECT ip.pedido_id, cl.nome AS cliente, pr.nome AS produto,\n       ip.quantidade, ip.preco_unitario,\n       ROUND(ip.quantidade * ip.preco_unitario, 2) AS subtotal\nFROM itens_pedido ip\nJOIN pedidos pe ON pe.id = ip.pedido_id\nJOIN clientes cl ON cl.id = pe.cliente_id\nJOIN produtos pr ON pr.id = ip.produto_id\nWHERE ip.pedido_id = 1\nORDER BY ip.id;' },
    { id: 'semped', sql: 'SELECT c.id, c.nome\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nWHERE p.id IS NULL\nORDER BY c.id;' },
    { id: 'nuncav', sql: 'SELECT pr.id, pr.nome\nFROM produtos pr\nLEFT JOIN itens_pedido ip ON ip.produto_id = pr.id\nWHERE ip.id IS NULL\nORDER BY pr.id;' },
    { id: 'grupo', sql: 'SELECT c.nome AS categoria,\n       COUNT(DISTINCT ip.pedido_id) AS pedidos,\n       SUM(ip.quantidade) AS unidades,\n       ROUND(' + Q_ITEMS + ', 2) AS receita\nFROM itens_pedido ip\nJOIN produtos pr ON pr.id = ip.produto_id\nJOIN categorias c ON c.id = pr.categoria_id\nGROUP BY c.id, c.nome\nORDER BY receita DESC;' },
    { id: 'having', sql: 'SELECT cl.nome AS cliente, COUNT(*) AS pedidos\nFROM clientes cl\nJOIN pedidos pe ON pe.cliente_id = cl.id\nGROUP BY cl.id, cl.nome\nHAVING COUNT(*) >= 10\nORDER BY pedidos DESC, cliente;' },
    { id: 'sub', sql: 'SELECT nome, preco\nFROM produtos\nWHERE preco > (SELECT AVG(preco) FROM produtos)\nORDER BY preco DESC;' },
    { id: 'case', sql: "SELECT nome, preco,\n       CASE\n         WHEN preco < 50 THEN 'barato'\n         WHEN preco < 200 THEN 'medio'\n         ELSE 'caro'\n       END AS faixa\nFROM produtos\nORDER BY preco, nome;" },
    { id: 'semana', sql: "SELECT strftime('%w', data_pedido) AS dia_semana, COUNT(*) AS pedidos\nFROM pedidos\nGROUP BY dia_semana\nORDER BY dia_semana;" },
    { id: 'mes', sql: "SELECT strftime('%Y-%m', pe.data_pedido) AS mes,\n       COUNT(DISTINCT pe.id) AS pedidos,\n       ROUND(" + Q_ITEMS + ", 2) AS receita\nFROM pedidos pe\nJOIN itens_pedido ip ON ip.pedido_id = pe.id\nWHERE pe.status <> 'cancelado'\nGROUP BY mes\nORDER BY mes;" }
  ];

  // Exercícios guiados (T-307). A consulta de referência é a DEFINIÇÃO do resultado esperado: executada no Worker, num banco novo,
  // a cada verificação; só é mostrada depois do acerto ou de "Ver solução". Textos em hub.sql.ex.<id>.t/.q/.hint (PT/EN).
  // ordered = o enunciado pede ORDER BY (a ordem das linhas conta); senão compara como multiconjunto.
  var EXERCISES = [
    { id: 'filtro', ordered: true, cols: ['nome', 'preco', 'estoque'], ref: 'SELECT nome, preco, estoque\nFROM produtos\nWHERE estoque < 20\nORDER BY preco DESC, nome;' },
    { id: 'join', ordered: false, cols: ['pedido_id', 'cliente', 'data_pedido'], ref: "SELECT p.id AS pedido_id, c.nome AS cliente, p.data_pedido\nFROM pedidos p\nINNER JOIN clientes c ON c.id = p.cliente_id\nWHERE p.status = 'enviado';" },
    { id: 'leftjoin', ordered: false, cols: ['id', 'nome', 'cidade'], ref: 'SELECT c.id, c.nome, c.cidade\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nWHERE p.id IS NULL;' },
    { id: 'grupo', ordered: false, cols: ['cliente_id', 'pedidos'], ref: "SELECT cliente_id, COUNT(*) AS pedidos\nFROM pedidos\nWHERE status <> 'cancelado'\nGROUP BY cliente_id\nHAVING COUNT(*) >= 8;" },
    { id: 'sub', ordered: false, cols: ['nome', 'preco', 'categoria_id'], ref: 'SELECT nome, preco, categoria_id\nFROM produtos p\nWHERE preco > (SELECT AVG(preco) FROM produtos WHERE categoria_id = p.categoria_id);' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, v) { return Hub.t(k, v); };

  var tool = $('sqlTool'), editor = $('sqlEditor'), runBtn = $('sqlRun'), runT = $('sqlRunT'), stopBtn = $('sqlStop'), resetBtn = $('sqlReset');
  var timeoutSel = $('sqlTimeout'), fileIn = $('sqlFile'), selDelim = $('sqlDelim'), selEnc = $('sqlEnc');
  var loadRun = $('sqlLoadRun'), prog = $('sqlProg'), pct = $('sqlPct'), loadCancel = $('sqlLoadCancel');
  var statusEl = $('sqlStatus'), errBox = $('sqlErr'), errT = $('sqlErrT'), errM = $('sqlErrM'), errH = $('sqlErrH'), retryBtn = $('sqlRetry'), warnBox = $('sqlWarn');
  var resBox = $('sqlResBox'), resMsg = $('sqlResMsg'), resNote = $('sqlResNote'), resTable = $('sqlResTable'), resCap = $('sqlResCap'), resSec = $('sqlResult');
  var sampleBtn = $('sqlSampleBtn'), sampleQ = $('sqlSampleQ');
  var exList = $('sqlExList'), exProg = $('sqlExProg'), exStop = $('sqlExStop');
  var schemaBox = $('sqlSchemaBox'), schemaEl = $('sqlSchema'), schemaEmpty = $('sqlSchemaEmpty'), typeNote = $('sqlTypeNote');

  var worker = null, gen = 0, jobSeq = 0, curId = 0;
  var engine = 'preparing';     // preparing | ready | failed
  var busy = null;              // null | 'run' | 'load' | 'verify'
  var stopShown = false, stopTimer = 0, limitTimer = 0;
  var version = '';
  var loaded = [];              // [{file, name, opts, meta}] tabelas de CSV (para recarregar após reinício)
  var reload = null;            // {queue, total, done, failed:[nomes]} durante a recarga
  var sample = { on: false, text: null, tables: [] };   // banco de exemplo carregado (texto em cache para recarregar sem novo fetch)
  var schema = [];              // do worker
  var res = null, stale = false;
  var err = null, statusKey = null, warns = [];
  var edited = false;
  var pending = null;           // CSV em leitura {file,name,opts}
  var readyMsg = 'hub.sql.status.ready';
  var ex = {};                  // por exercício: {li, ta, fb, ..., solved, fb:{code,vars,seq}, sol:'hidden'|'confirm'|'shown'}; só em memória
  var exSeq = 0, curEx = null, pendingEx = null, refocusEx = null, exBuilt = false;
  var refocus = false;          // devolve o foco ao Executar quando o motor volta (Parar/Cancelar apagam o botão em foco)

  function locale() { return Hub.lang === 'pt' ? 'pt-BR' : 'en-US'; }
  function num(n) { return new Intl.NumberFormat(locale()).format(n); }
  function size(b) {
    var nf = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 });
    if (b < 1024) return num(b) + ' bytes';
    if (b < 1048576) return nf.format(b / 1024) + ' KB';
    return nf.format(b / 1048576) + ' MB';
  }
  function plural(k, n) { return t(k + (n === 1 ? '.one' : '.other'), { n: num(n) }); }
  function timeoutSecs() { return parseInt(timeoutSel.value, 10) || 10; }

  // ---------- renderização ----------
  function say(key, vars) { statusKey = key ? { key: key, vars: vars } : null; renderStatus(); }
  function renderStatus() { statusEl.textContent = statusKey ? t(statusKey.key, statusKey.vars) : ''; }

  function stateName() { return engine !== 'ready' ? engine : (busy === 'run' || busy === 'verify' ? 'running' : busy === 'load' ? 'loading' : 'ready'); }
  function applyState() {
    tool.setAttribute('data-state', stateName());
    runBtn.disabled = engine !== 'ready';
    if (busy) runBtn.setAttribute('aria-disabled', 'true'); else runBtn.removeAttribute('aria-disabled');
    runT.textContent = engine === 'preparing' ? t('hub.sql.run.wait') : busy === 'run' || busy === 'verify' ? t('hub.sql.run.running') : t('hub.sql.run.label');
    stopBtn.hidden = !(busy === 'run' && stopShown);
    exStop.hidden = !(busy === 'verify' && stopShown);
    loadRun.hidden = busy !== 'load';
    fileIn.disabled = engine !== 'ready' || !!busy;
    sampleBtn.disabled = engine !== 'ready';
    if (busy) sampleBtn.setAttribute('aria-disabled', 'true'); else sampleBtn.removeAttribute('aria-disabled');
    document.querySelector('label[for="sqlFile"]').classList.toggle('is-disabled', fileIn.disabled);
    resSec.setAttribute('aria-busy', busy === 'run' ? 'true' : 'false');
    resSec.classList.toggle('is-stale', stale || busy === 'run');
  }

  function hintFor(msg) {
    if (/no such table/i.test(msg)) return t('hub.sql.hint.table');
    if (/no such column/i.test(msg)) return t('hub.sql.hint.column');
    if (/syntax error|incomplete input|unrecognized token/i.test(msg)) return t('hub.sql.hint.syntax');
    return t('hub.sql.hint.generic');
  }
  function renderError() {
    if (!err) { errBox.hidden = true; return; }
    var T, M = '', H = '', retry = false;
    switch (err.kind) {
      case 'sql':
        T = t('hub.sql.err.sql.t');
        M = err.message;                      // do motor, no idioma original, como texto
        H = hintFor(err.message);
        if (err.statement > 1) H += ' ' + t('hub.sql.err.stmt', { n: err.statement });
        if (stale) H += ' ' + t('hub.sql.err.keep');
        break;
      case 'empty': T = t('hub.sql.err.empty.t'); M = t('hub.sql.err.empty.m'); break;
      case 'timeout': T = t('hub.sql.err.timeout.t'); M = t('hub.sql.err.timeout.m', { s: err.s }); H = t('hub.sql.err.timeout.h') + ' ' + t('hub.sql.err.recreated'); break;
      case 'stopped': T = t('hub.sql.err.stopped.t'); M = t('hub.sql.err.stopped.m'); H = t('hub.sql.err.recreated'); break;
      case 'crash': T = t('hub.sql.err.crash.t'); M = t('hub.sql.err.crash.m'); H = t('hub.sql.err.recreated'); break;
      case 'sample': T = t('hub.sql.sample.err.t'); M = t('hub.sql.sample.err.m', { detail: err.detail || '' }); break;
      case 'init': T = t('hub.sql.err.init.t'); M = t('hub.sql.err.init.m', { detail: err.detail || '' }); retry = true; break;
      case 'noworker': T = t('hub.sql.err.noworker.t'); M = t('hub.sql.err.noworker.m'); break;
      case 'load':
        T = t('hub.csv.err.' + err.code + '.t'); M = t('hub.csv.err.' + err.code + '.m', err.vars);
        H = t('hub.sql.err.load.keep');
        break;
    }
    errT.textContent = T; errM.textContent = M; errH.textContent = H;
    errM.hidden = M === ''; errH.hidden = H === '';
    retryBtn.hidden = !retry;
    errBox.hidden = false;
  }

  function renderWarnings() {
    warnBox.textContent = '';
    warns.forEach(function (w) { var p = document.createElement('p'); p.textContent = t(w.key, w.vars); warnBox.appendChild(p); });
    warnBox.hidden = warns.length === 0;
  }

  function renderLimits() {
    $('sqlLimits').textContent = t('hub.sql.limits', { rows: num(ROW_LIMIT), s: timeoutSecs() });
  }

  function cell(td, v) {
    if (v === null) { var n = document.createElement('span'); n.className = 'sql-null'; n.textContent = 'NULL'; td.appendChild(n); return; }
    var d = document.createElement('div'); d.className = 'csv-cell';
    if (typeof v === 'object') { d.classList.add('sql-blob'); d.textContent = t('hub.sql.blob', { n: num(v.blob) }); }
    else d.textContent = String(v);
    td.appendChild(d);
  }

  function renderResult() {
    var thead = resTable.tHead, tbody = resTable.tBodies[0];
    thead.textContent = ''; tbody.textContent = '';
    resNote.hidden = true; resNote.textContent = '';
    if (!res) { resMsg.textContent = t('hub.sql.res.placeholder'); resMsg.hidden = false; resBox.hidden = true; return; }
    var notes = [];
    if (res.statements > 1) notes.push(res.set ? t('hub.sql.res.multi', { n: res.statements, k: res.set.index }) : t('hub.sql.res.multi.none', { n: res.statements }));
    if (res.cut) notes.push(t('hub.sql.res.cut', { n: num(res.cut) }));
    if (!res.set) {
      resMsg.textContent = t('hub.sql.res.cmd', { n: plural('hub.sql.stmt', res.statements), m: num(res.modified), ms: num(res.ms) });
      resMsg.hidden = false; resBox.hidden = true;
    } else if (res.set.total === 0) {
      resMsg.textContent = t('hub.sql.res.norows') + ' ' + num(res.ms) + ' ms';
      resMsg.hidden = false; resBox.hidden = true;
    } else {
      var s = res.set, shown = s.rows.length;
      resMsg.hidden = true;
      var totalTxt = s.capped ? t('hub.sql.res.over', { n: num(s.total) }) : plural('hub.csv.rows', s.total);
      var cap = totalTxt + ' · ' + num(res.ms) + ' ms';
      if (shown < s.total || s.capped) {
        cap += ' · ' + t('hub.sql.res.showing', { n: num(shown), total: s.capped ? t('hub.sql.res.over', { n: num(s.total) }) : num(s.total) });
        notes.push(t('hub.sql.res.limitnote', { n: num(shown) }));
      }
      resCap.textContent = cap;
      var htr = document.createElement('tr');
      s.columns.forEach(function (c) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = c; htr.appendChild(th); });
      thead.appendChild(htr);
      var frag = document.createDocumentFragment();
      s.rows.forEach(function (row) {
        var tr = document.createElement('tr');
        for (var i = 0; i < row.length; i++) { var td = document.createElement('td'); cell(td, row[i]); tr.appendChild(td); }
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
      resBox.hidden = false;
    }
    if (notes.length) { resNote.textContent = notes.join(' '); resNote.hidden = false; }
  }

  function th(tr, text, scope) { var e = document.createElement('th'); e.scope = scope; e.textContent = text; tr.appendChild(e); return e; }
  function td(tr, text, cls) { var e = document.createElement('td'); e.textContent = text; if (cls) e.className = cls; tr.appendChild(e); return e; }

  function renderSchema() {
    schemaEl.textContent = '';
    var has = schema.length > 0;
    schemaBox.hidden = !has; schemaEmpty.hidden = has;
    typeNote.hidden = !loaded.length;
    schema.forEach(function (tb) {
      var item = null;
      for (var i = 0; i < loaded.length; i++) if (loaded[i].meta && loaded[i].meta.table === tb.name) item = loaded[i];
      var meta = item && item.meta;
      var isSample = !meta && sample.on && sample.tables.indexOf(tb.name) !== -1;
      var tbl = document.createElement('table'); tbl.className = 'csv-table sql-schema-table';
      var cap = document.createElement('caption');
      cap.textContent = meta
        ? t('hub.sql.schema.cap.csv', { name: tb.name, rows: plural('hub.csv.rows', meta.rowCount), cols: plural('hub.csv.cols', tb.columns.length) })
        : isSample ? t('hub.sql.schema.cap.sample', { name: tb.name, cols: plural('hub.csv.cols', tb.columns.length) })
        : t('hub.sql.schema.cap', { name: tb.name, cols: plural('hub.csv.cols', tb.columns.length) });
      tbl.appendChild(cap);
      var thead = tbl.createTHead(), htr = thead.insertRow();
      th(htr, t('hub.csv.cols.th.n'), 'col'); th(htr, t('hub.sql.schema.th.name'), 'col'); th(htr, t('hub.sql.schema.th.type'), 'col');
      if (meta) th(htr, t('hub.sql.schema.th.orig'), 'col');
      if (isSample) th(htr, t('hub.sql.schema.th.key'), 'col');
      var body = tbl.createTBody();
      tb.columns.forEach(function (c, i) {
        var tr = body.insertRow();
        th(tr, String(i + 1), 'row'); td(tr, c.name, 'sql-id'); td(tr, c.type || '');
        if (meta) {
          var o = meta.columns[i] ? meta.columns[i].original : '';
          var e = td(tr, o === '' ? t('hub.csv.noname') : o); if (o === '') e.className = 'csv-noname';
        }
        if (isSample) {
          var keys = [];
          if (c.pk) keys.push(t('hub.sql.schema.key.pk'));
          if (c.fk) keys.push(t('hub.sql.schema.key.fk', { ref: c.fk }));
          td(tr, keys.join(', '));
        }
      });
      schemaEl.appendChild(tbl);
    });
  }

  // lista de consultas de exemplo: construída uma vez; textos refeitos a cada troca de idioma (tudo por textContent)
  function renderSamples() {
    if (!sampleQ.children.length) {
      SAMPLE_QUERIES.forEach(function (q) {
        var li = document.createElement('li');
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost'; b.setAttribute('data-q', q.id);
        var d = document.createElement('span'); d.className = 'sql-qd'; d.id = 'sqlQD-' + q.id;
        b.setAttribute('aria-describedby', d.id);
        b.addEventListener('click', function () { useQuery(q); });
        li.appendChild(b); li.appendChild(d); sampleQ.appendChild(li);
      });
    }
    SAMPLE_QUERIES.forEach(function (q, i) {
      var li = sampleQ.children[i];
      li.firstChild.textContent = t('hub.sql.sample.q.' + q.id + '.t');
      li.lastChild.textContent = t('hub.sql.sample.q.' + q.id + '.d');
    });
  }
  function useQuery(q) {
    editor.value = q.sql; edited = true;
    say('hub.sql.status.sampleq', { title: t('hub.sql.sample.q.' + q.id + '.t') });
    editor.focus();
  }


  // ---------- exercícios guiados ----------
  function mk(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function buildExercises() {
    EXERCISES.forEach(function (d, i) {
      var s = ex[d.id] = { def: d, solved: false, fb: null, shown: null, sol: 'hidden' };
      var li = s.li = mk('li', 'sql-ex-item', exList);
      var h = mk('h3', '', li); s.h = mk('span', '', h); s.state = mk('span', 'sql-ex-state', h); s.state.id = 'sqlExState-' + d.id;
      s.q = mk('p', '', li); s.cols = mk('p', 'sql-ex-cols', li); s.order = mk('p', 'sql-ex-cols', li);
      var det = s.det = mk('details', 'sql-ex-hint', li); s.sum = mk('summary', '', det); s.hint = mk('p', '', det);
      s.lbl = mk('label', 'sql-label', li); s.lbl.htmlFor = 'sqlExTa-' + d.id;
      s.ta = mk('textarea', 'sql-editor', li); s.ta.id = 'sqlExTa-' + d.id; s.ta.rows = 4;
      s.ta.setAttribute('spellcheck', 'false'); s.ta.setAttribute('autocomplete', 'off'); s.ta.setAttribute('autocapitalize', 'off'); s.ta.setAttribute('autocorrect', 'off');
      var act = mk('div', 'sql-actions', li);
      s.vbtn = mk('button', 'btn btn-accent', act); s.vbtn.type = 'button'; s.vbtn.id = 'sqlExV-' + d.id; s.vspan = mk('span', '', s.vbtn);
      s.tbtn = mk('button', 'btn btn-ghost', act); s.tbtn.type = 'button'; s.tbtn.id = 'sqlExT-' + d.id; s.tspan = mk('span', '', s.tbtn);
      s.sbtn = mk('button', 'btn btn-ghost', act); s.sbtn.type = 'button'; s.sbtn.id = 'sqlExS-' + d.id; s.sspan = mk('span', '', s.sbtn);
      s.live = mk('div', '', li); s.live.id = 'sqlExFb-' + d.id; s.live.setAttribute('role', 'status'); s.live.setAttribute('aria-live', 'polite');
      s.conf = mk('div', 'sql-ex-confirm', li); s.conf.id = 'sqlExConf-' + d.id; s.conf.hidden = true; s.confQ = mk('p', '', s.conf);
      var ca = mk('div', 'sql-actions', s.conf);
      s.yes = mk('button', 'btn btn-dark', ca); s.yes.type = 'button'; s.yes.id = 'sqlExYes-' + d.id; s.yesT = mk('span', '', s.yes);
      s.no = mk('button', 'btn btn-ghost', ca); s.no.type = 'button'; s.no.id = 'sqlExNo-' + d.id; s.noT = mk('span', '', s.no);
      s.solBox = mk('div', 'sql-ex-sol', li); s.solBox.hidden = true; s.solH = mk('h4', '', s.solBox);
      s.pre = mk('pre', '', s.solBox); s.pre.id = 'sqlExSol-' + d.id; s.pre.tabIndex = 0; s.pre.setAttribute('role', 'region'); s.code = mk('code', '', s.pre);
      s.vbtn.addEventListener('click', function () { verifyEx(d.id); });
      s.tbtn.addEventListener('click', function () { editor.value = s.ta.value; edited = true; say('hub.sql.ex.status.copied'); editor.focus(); });
      s.sbtn.addEventListener('click', function () { s.sol = 'confirm'; renderEx(); s.yes.focus(); });
      s.no.addEventListener('click', function () { s.sol = s.solved ? 'shown' : 'hidden'; renderEx(); s.sbtn.focus(); });
      s.yes.addEventListener('click', function () { s.sol = 'shown'; renderEx(); s.pre.focus(); });
    });
    exBuilt = true;
  }

  function fbText(fb) {
    var v = fb.vars || {};
    switch (fb.code) {
      case 'pass': return t('hub.sql.ex.fb.pass');
      case 'cols': return t('hub.sql.ex.fb.cols', { got: num(v.got), want: num(v.want) });
      case 'names': return t('hub.sql.ex.fb.names', { pos: num(v.pos), got: v.got });
      case 'rows': return t('hub.sql.ex.fb.rows', { got: typeof v.got === 'number' ? num(v.got) : v.got, want: num(v.want) });
      case 'value': return t('hub.sql.ex.fb.value', { row: num(v.row), col: num(v.col), name: v.name });
      case 'order': return t('hub.sql.ex.fb.order', { row: num(v.row) });
      case 'set': return t('hub.sql.ex.fb.set');
      case 'sql': return t('hub.sql.ex.fb.sql', { n: num(v.statement || 1), message: v.message || '' });
      case 'empty': return t('hub.sql.ex.fb.empty');
      case 'noresult': return t('hub.sql.ex.fb.noresult');
      case 'needsample': return t('hub.sql.ex.fb.needsample');
      case 'timeout': return t('hub.sql.ex.fb.timeout', { s: num(v.s) });
      case 'stopped': return t('hub.sql.ex.fb.stopped');
      case 'crash': return t('hub.sql.ex.fb.crash');
      default: return t('hub.sql.ex.fb.internal', { detail: v.message || '' });
    }
  }

  function renderEx() {
    if (!exBuilt) buildExercises();
    var solvedN = 0, can = engine === 'ready';
    EXERCISES.forEach(function (d, i) {
      var s = ex[d.id];
      if (s.solved) solvedN++;
      s.li.classList.toggle('is-solved', s.solved);
      s.h.textContent = t('hub.sql.ex.n', { n: i + 1 }) + ' · ' + t('hub.sql.ex.' + d.id + '.t');
      s.state.textContent = t(s.solved ? 'hub.sql.ex.state.solved' : 'hub.sql.ex.state.todo');
      s.q.textContent = t('hub.sql.ex.' + d.id + '.q');
      s.cols.textContent = t('hub.sql.ex.cols', { cols: d.cols.join(', ') });
      s.order.textContent = t(d.ordered ? 'hub.sql.ex.order.yes' : 'hub.sql.ex.order.no');
      s.sum.textContent = t('hub.sql.ex.hint');
      s.hint.textContent = t('hub.sql.ex.' + d.id + '.hint');
      s.lbl.textContent = t('hub.sql.ex.label', { n: i + 1 });
      s.vspan.textContent = busy === 'verify' && curEx === d.id ? t('hub.sql.ex.verifying') : t('hub.sql.ex.verify');
      s.tspan.textContent = t('hub.sql.ex.try');
      s.sspan.textContent = t('hub.sql.ex.sol.show');
      s.vbtn.disabled = !can;
      if (busy) s.vbtn.setAttribute('aria-disabled', 'true'); else s.vbtn.removeAttribute('aria-disabled');
      s.sbtn.hidden = s.sol !== 'hidden';
      s.conf.hidden = s.sol !== 'confirm';
      s.confQ.textContent = t('hub.sql.ex.sol.confirm');
      s.yesT.textContent = t('hub.sql.ex.sol.yes'); s.noT.textContent = t('hub.sql.ex.sol.no');
      s.solBox.hidden = s.sol !== 'shown';
      s.solH.textContent = t('hub.sql.ex.sol.h');
      s.pre.setAttribute('aria-label', t('hub.sql.ex.sol.h') + ' · ' + t('hub.sql.ex.n', { n: i + 1 }));
      s.code.textContent = s.sol === 'shown' ? d.ref : '';
      // feedback: só reescreve quando há resultado novo (seq) ou o idioma mudou, para a região viva não repetir o anúncio
      var key = s.fb ? s.fb.seq + '|' + Hub.lang : '';
      if (s.shown !== key) {
        s.shown = key; s.live.textContent = '';
        if (s.fb) {
          var box = mk('div', 'notice sql-ex-fb' + (s.fb.code === 'pass' ? ' is-pass' : ''), s.live);
          var p = mk('p', '', box);
          p.textContent = s.fb.code === 'pass' ? fbText(s.fb) : t('hub.sql.ex.fb.no') + ' ' + fbText(s.fb);
          if (s.fb.code === 'needsample') {
            var lb = mk('button', 'btn btn-dark', box); lb.type = 'button'; mk('span', '', lb).textContent = t('hub.sql.ex.fb.needsample.btn');
            lb.addEventListener('click', function () { loadSampleThenVerify(d.id); });
            s.loadBtn = lb;
          }
        }
      }
    });
    var pt = t('hub.sql.ex.prog', { n: num(solvedN), total: num(EXERCISES.length) });
    if (exProg.textContent !== pt) exProg.textContent = pt;
  }
  function setFb(id, code, vars) { var s = ex[id]; if (s) s.fb = { code: code, vars: vars || {}, seq: ++exSeq }; }

  function verifyEx(id) {
    if (engine !== 'ready' || busy) return;
    var s = ex[id], d = s.def;
    if (s.ta.value.trim() === '') { setFb(id, 'empty'); renderEx(); return; }
    if (!sample.on || sample.text === null) { setFb(id, 'needsample'); renderEx(); return; }
    err = null; warns = [];
    busy = 'verify'; stopShown = false; curEx = id;
    curId = ++jobSeq;
    var secs = timeoutSecs();
    clearTimeout(stopTimer); clearTimeout(limitTimer);
    stopTimer = setTimeout(function () { stopShown = true; applyState(); }, STOP_AFTER_MS);
    limitTimer = setTimeout(function () { restart({ kind: 'timeout', s: secs }); }, secs * 1000);
    say('hub.sql.ex.status.verifying');
    renderAll();
    worker.postMessage({ type: 'verify', id: curId, sample: sample.text, ref: d.ref, user: s.ta.value, ordered: d.ordered });
  }
  function loadSampleThenVerify(id) {
    if (engine !== 'ready' || busy) return;
    pendingEx = id; loadSample();
  }
  function onVerified(m) {
    clearTimers(); busy = null;
    var id = curEx; curEx = null;
    if (m.ok) { ex[id].solved = true; ex[id].sol = 'shown'; }
    setFb(id, m.code, m.vars);
    say(null); renderAll();
  }

  function renderAll() { applyState(); renderStatus(); renderError(); renderWarnings(); renderLimits(); renderSamples(); renderEx(); renderResult(); renderSchema(); }

  // ---------- motor (Worker) ----------
  function stopWorker() {
    if (!worker) return;
    worker.onmessage = null;
    // eventos de erro já enfileirados (ex.: abort do WebAssembly) chegam depois do terminate: absorver, senão viram erro não tratado da página
    worker.onerror = function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); };
    worker.terminate(); worker = null;
  }
  function clearTimers() { clearTimeout(stopTimer); clearTimeout(limitTimer); stopShown = false; }

  function engineFail(kind, detail) {
    stopWorker(); clearTimers(); busy = null; engine = 'failed';
    err = { kind: kind, detail: detail || '' };
    say(null); renderAll();
  }

  function boot() {
    stopWorker(); gen++;
    var g = gen;
    engine = 'preparing'; busy = null;
    say('hub.sql.status.preparing'); applyState();
    if (typeof Worker === 'undefined') return engineFail('noworker');
    try { worker = new Worker(WORKER_URL); } catch (e) { return engineFail('init', String(e && e.message || e)); }
    worker.onerror = function (ev) {
      if (g !== gen) return;
      if (ev && ev.preventDefault) ev.preventDefault();
      if (engine === 'preparing') engineFail('init', ev && ev.message ? ev.message : '');
      else restart({ kind: 'crash' });
    };
    worker.onmessage = function (ev) { if (g === gen) onMessage(ev.data); };
  }

  function onMessage(m) {
    if (m.type === 'ready') {
      engine = 'ready'; version = m.version;
      applyState();
      if (refocus && (!document.activeElement || document.activeElement === document.body)) runBtn.focus();
      refocus = false;
      if (refocusEx) { var rb = ex[refocusEx] && ex[refocusEx].vbtn; refocusEx = null; if (rb && (!document.activeElement || document.activeElement === document.body)) { rb.disabled = false; rb.focus(); } }
      if (err && err.kind === 'init') err = null;
      if (reload && reload.queue.length) { nextReload(); return; }
      if (reload) { finishReload(); return; }
      say(readyMsg, { v: version }); readyMsg = 'hub.sql.status.ready'; renderAll();
    } else if (m.type === 'initerror') engineFail('init', m.detail);
    else if (m.id !== curId) return;
    else if (m.type === 'progress') { if (busy === 'load') { prog.value = m.pct; pct.textContent = m.pct + '%'; } }
    else if (m.type === 'result') onResult(m);
    else if (m.type === 'loaded') onLoaded(m);
    else if (m.type === 'sample') onSample(m);
    else if (m.type === 'verified') onVerified(m);
    else if (m.type === 'error') onError(m);
  }

  // ---------- executar ----------
  function execute() {
    if (engine !== 'ready' || busy) return;
    busy = 'run'; stopShown = false; err = null; warns = [];
    curId = ++jobSeq;
    var secs = timeoutSecs();
    say('hub.sql.status.running');
    clearTimeout(stopTimer); clearTimeout(limitTimer);
    stopTimer = setTimeout(function () { stopShown = true; say('hub.sql.status.slow'); applyState(); }, STOP_AFTER_MS);
    limitTimer = setTimeout(function () { restart({ kind: 'timeout', s: secs }); }, secs * 1000);
    renderAll();
    worker.postMessage({ type: 'run', id: curId, sql: editor.value, limit: ROW_LIMIT, cellBudget: CELL_BUDGET });
  }

  function onResult(m) {
    clearTimers(); busy = null; schema = m.schema || schema;
    if (m.empty) { err = { kind: 'empty' }; say(null); renderAll(); return; }
    err = null; stale = false;
    res = { statements: m.statements, set: m.set, modified: m.modified, cut: m.cut, ms: m.ms };
    if (m.set && m.set.total > 0) say('hub.sql.status.done', { rows: m.set.capped ? t('hub.sql.res.over', { n: num(m.set.total) }) : plural('hub.csv.rows', m.set.total), ms: num(m.ms) });
    else if (m.set) say('hub.sql.status.norows');
    else say('hub.sql.status.cmd', { n: plural('hub.sql.stmt', m.statements) });
    renderAll();
  }

  function onError(m) {
    var wasVerify = busy === 'verify', vid = curEx;
    clearTimers(); busy = null;
    if (m.schema) schema = m.schema;
    if (wasVerify) curEx = null;
    if (wasVerify && m.code !== 'crash') { setFb(vid, 'internal', { message: m.message }); say(null); renderAll(); return; }
    if (wasVerify) setFb(vid, 'crash');
    if (m.code === 'crash') {
      // arquivo que derruba o motor na recarga sai da lista (evita laço de reinícios)
      if (reload && reload.current) { if (reload.current.sample) sample.on = false; else loaded = loaded.filter(function (x) { return x !== reload.current; }); }
      pending = null; restart({ kind: 'crash' }); return;
    }
    if (m.code === 'sql' || m.code === 'worker') { stale = !!res; err = { kind: 'sql', message: m.message, statement: m.statement || 1 }; }
    else if (m.code === 'sample') { pendingEx = null; err = { kind: 'sample', detail: m.message }; if (reload && reload.current && reload.current.sample) sample.on = false; }
    else if (m.code === 'load') err = { kind: 'load', code: 'parse', vars: { detail: m.message } };
    else if (m.code === 'cols') err = { kind: 'load', code: 'cols', vars: { n: num(+m.detail), max: num(2000) } };
    else err = { kind: 'load', code: m.code, vars: {} };
    say(null);
    if (reload) { reload.failed.push(reload.current && reload.current.name); err = null; renderAll(); nextReload(); return; }
    renderAll();
  }

  // ---------- reiniciar o motor (terminate) ----------
  function restart(why) {
    if (busy === 'verify' && curEx) { setFb(curEx, why.kind, { s: why.s }); if (document.activeElement === exStop) refocusEx = curEx; curEx = null; }
    clearTimers();
    var hadFocus = document.activeElement === stopBtn || document.activeElement === loadCancel;
    stale = !!res; schema = []; warns = [];
    err = why;
    reload = newReload();
    boot();
    renderAll();
    refocus = hadFocus;
  }

  // fila de recarga: banco de exemplo primeiro (como na ordem original de carga), depois os CSV
  function newReload() {
    var queue = (sample.on ? [{ sample: true, name: t('hub.sql.sample.name') }] : []).concat(loaded);
    return queue.length ? { queue: queue.slice(), total: queue.length, done: 0, failed: [], current: null } : null;
  }

  function nextReload() {
    var item = reload.queue.shift();
    if (!item) { finishReload(); return; }
    reload.current = item;
    busy = 'load'; curId = ++jobSeq;
    prog.value = 0; pct.textContent = '0%';
    say('hub.sql.status.reloading', { k: reload.total - reload.queue.length, n: reload.total, name: item.name });
    applyState();
    if (item.sample) { worker.postMessage({ type: 'sample', id: curId, sql: sample.text }); return; }
    worker.postMessage({ type: 'load', id: curId, file: item.file, fileName: item.name, delimiter: item.opts.delim, encoding: item.opts.enc });
  }

  function finishReload() {
    var r = reload; reload = null; busy = null;
    var failed = r.failed.filter(Boolean);
    if (failed.length) {
      loaded = loaded.filter(function (x) { return failed.indexOf(x.name) === -1; });
      warns.push({ key: 'hub.sql.warn.reloadfail', vars: { names: failed.join(', ') } });
    }
    say(sample.on ? 'hub.sql.status.restored.sample' : 'hub.sql.status.restored', { n: plural('hub.sql.tables', r.done) });
    renderAll();
  }

  // ---------- carregar CSV como tabela ----------
  function loadFile(f) {
    if (engine !== 'ready' || busy) return;
    err = null; warns = [];
    if (f.size > LIMIT) { err = { kind: 'load', code: 'size', vars: { size: size(f.size), bytes: num(f.size) } }; say(null); renderAll(); return; }
    if (f.size === 0) { err = { kind: 'load', code: 'empty', vars: {} }; say(null); renderAll(); return; }
    var opts = { delim: selDelim.value, enc: selEnc.value };
    pending = { file: f, name: f.name, opts: opts };
    busy = 'load'; curId = ++jobSeq;
    prog.value = 0; pct.textContent = '0%';
    say('hub.sql.status.loading', { name: f.name });
    renderAll();
    worker.postMessage({ type: 'load', id: curId, file: f, fileName: f.name, delimiter: opts.delim, encoding: opts.enc });
  }

  function onLoaded(m) {
    schema = m.schema || schema;
    var src = reload ? reload.current : pending;
    var entry = { file: src.file, name: src.name, opts: src.opts, meta: m };
    var at = -1;
    for (var i = 0; i < loaded.length; i++) if (loaded[i].name === src.name || (loaded[i].meta && loaded[i].meta.table === m.table)) at = i;
    if (reload) {
      // recarga: a entrada ja existe; só atualiza o meta
      for (var j = 0; j < loaded.length; j++) if (loaded[j] === src) loaded[j].meta = m;
      reload.done++; busy = null;
      renderAll(); nextReload(); return;
    }
    if (at >= 0) loaded.splice(at, 1);
    loaded.push(entry);
    pending = null; busy = null; err = null;
    if (m.replaced) warns.push({ key: 'hub.sql.warn.replaced', vars: { table: m.table } });
    if (m.fallback) warns.push({ key: 'hub.csv.warn.fallback' });
    else if (m.replacement) warns.push({ key: 'hub.csv.warn.replacement' });
    if (m.ragged) warns.push({ key: 'hub.csv.warn.ragged', vars: { n: num(m.ragged) } });
    if (m.quoteErrors) warns.push({ key: 'hub.csv.warn.quotes' });
    if (m.renamed) warns.push({ key: 'hub.sql.warn.renamed', vars: { n: num(m.renamed) } });
    if (!edited) editor.value = 'SELECT * FROM ' + m.table + ' LIMIT 10;';
    say('hub.sql.status.loaded', { table: m.table, name: src.name, rows: plural('hub.csv.rows', m.rowCount), cols: plural('hub.csv.cols', m.colCount) });
    renderAll();
  }

  // ---------- banco de exemplo ----------
  function getSampleText() {
    if (sample.text !== null) return Promise.resolve(sample.text);
    return fetch(SAMPLE_URL, { credentials: 'omit', cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (txt) {
      if (txt.length < 100 || txt.indexOf('CREATE TABLE') === -1) throw new Error('invalid file');
      sample.text = txt; return txt;
    });
  }

  function loadSample() {
    if (engine !== 'ready' || busy) return;
    err = null; warns = [];
    busy = 'load'; var job = curId = ++jobSeq, g = gen;
    prog.value = 0; pct.textContent = '0%';
    say('hub.sql.status.loading.sample');
    renderAll();
    getSampleText().then(function (txt) {
      if (g !== gen || curId !== job || !worker) return;
      worker.postMessage({ type: 'sample', id: job, sql: txt });
    }, function (e) {
      if (g !== gen || curId !== job) return;
      busy = null; pendingEx = null; err = { kind: 'sample', detail: String(e && e.message || e) };
      say(null); renderAll();
    });
  }

  function onSample(m) {
    schema = m.schema || schema;
    if (reload) { sample.tables = m.tables; busy = null; renderAll(); nextReload(); return; }
    sample.on = true; sample.tables = m.tables;
    // CSV que ocupavam o nome de uma tabela de exemplo foram substituídas: saem da lista de recarga
    loaded = loaded.filter(function (x) { return !(x.meta && m.tables.indexOf(x.meta.table) !== -1); });
    busy = null; err = null;
    if (m.replaced.length) warns.push({ key: 'hub.sql.warn.sample.replaced' });
    if (!edited) editor.value = 'SELECT * FROM clientes LIMIT 10;';
    say('hub.sql.status.sample', { n: num(m.tables.length), rows: num(m.rows) });
    renderAll();
    if (pendingEx) { var pid = pendingEx; pendingEx = null; verifyEx(pid); }
  }

  function cancelLoad() {
    if (busy !== 'load') return;
    pendingEx = null;
    if (reload) { loaded = []; sample.on = false; reload = null; }
    pending = null; stale = !!res; schema = []; warns = []; err = null;
    // terminate: o banco é recriado; as tabelas de CSV anteriores são recarregadas
    clearTimers();
    reload = newReload();
    warns = [{ key: 'hub.sql.warn.canceled' }];
    boot();
    refocus = true;
    renderAll();
  }

  function resetDb() {
    pendingEx = null; curEx = null;
    clearTimers(); loaded = []; sample.on = false; sample.tables = []; reload = null; pending = null; res = null; stale = false; schema = []; warns = []; err = null;
    readyMsg = 'hub.sql.status.reset';
    boot();
    renderAll();
    if (document.activeElement === resetBtn) resetBtn.focus();
  }

  // ---------- eventos ----------
  runBtn.addEventListener('click', execute);
  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.keyCode === 13)) { e.preventDefault(); execute(); }
  });
  editor.addEventListener('input', function () { edited = true; });
  stopBtn.addEventListener('click', function () { if (busy === 'run') restart({ kind: 'stopped' }); });
  exStop.addEventListener('click', function () { if (busy === 'verify') restart({ kind: 'stopped' }); });
  loadCancel.addEventListener('click', cancelLoad);
  resetBtn.addEventListener('click', resetDb);
  sampleBtn.addEventListener('click', loadSample);
  retryBtn.addEventListener('click', function () { err = null; boot(); renderAll(); });
  timeoutSel.addEventListener('change', renderLimits);
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0];
    fileIn.value = '';
    if (f) loadFile(f);
  });

  Hub.onLang.push(function () { renderAll(); });
  renderAll();
  boot();
})();
