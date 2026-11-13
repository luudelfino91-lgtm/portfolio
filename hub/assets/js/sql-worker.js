/* =====================================================================
   Worker do SQL playground (T-304/T-305/T-306 SQL). Fora da thread principal.
   - sql.js 1.16.0 vendorizado (hub/assets/vendor/sqljs/); o .wasm e buscado
     por caminho relativo a este arquivo (funciona em /hub/ e /portfolio/hub/).
   - Leitura de CSV: reutiliza decode(), detectDelimiter(), kindOf() e typeOf()
     de csv-worker.js (importado abaixo; o onmessage dele e substituido aqui).
   - Nada sai do navegador: este arquivo não usa fetch (alem do .wasm local
     feito pelo proprio sql.js), XHR nem WebSocket.
   - Cancelar/Parar/tempo limite = o sql.js (pagina) chama worker.terminate();
     o banco em memória e perdido e recriado.
   Entradas: {type:'run', id, sql, limit, cellBudget} | {type:'load', id, file, delimiter, encoding}
             | {type:'drop', id, name}
   Saidas:   {type:'ready', version} | {type:'initerror', detail}
             | {type:'result', id, ...} | {type:'loaded', id, ...} | {type:'error', id, ...}
   ===================================================================== */
'use strict';
importScripts('csv-worker.js');                  // define decode, detectDelimiter, kindOf, typeOf, Papa (relativo a este arquivo)
importScripts('../vendor/sqljs/sql-wasm.js');    // define initSqlJs

// Erros nao tratados dentro do Worker (ex.: abort do WebAssembly) já são reportados por mensagem
// ('initerror'/'crash'); não deixar que também virem erro não tratado da página.
self.onerror = function () { return true; };
self.addEventListener('unhandledrejection', function (e) { e.preventDefault(); });

var sqDb = null, sqVersion = '';
var SQ_MAX_COUNT = 1000000;      // conta linhas ate aqui; acima, informa "mais de"
var SQ_MAX_CELL = 2000;          // texto maior que isto e cortado na exibição

// Palavras que NÃO funcionam como nome sem aspas no SQLite 3.54 (lista medida: CREATE TABLE/SELECT/JOIN/GROUP BY
// com cada palavra como nome de tabela e de coluna) mais os nomes especiais rowid/oid/_rowid_.
// Nomes saneados nunca coincidem com elas, então podem ser digitados sem aspas.
var SQ_RESERVED = {};
('add all alter and as autoincrement between case cast check collate commit constraint create current_date current_time current_timestamp default deferrable delete distinct drop else escape except exists foreign from group having if in index insert intersect into is isnull join limit not nothing notnull null on or order primary raise references returning select set table then to transaction union unique update using values when where rowid oid _rowid_')
  .split(' ').forEach(function (w) { SQ_RESERVED[w] = 1; });

function sqQuote(id) { return '"' + String(id).replace(/"/g, '""') + '"'; }

// Nome saneado: sem acentos (NFD), minúsculas, só letras/dígitos/_ ; começa com letra ou _.
function sqClean(raw) {
  var s = String(raw).normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
  s = s.replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^_+|_+$/g, '');
  return s.length > 60 ? s.slice(0, 60).replace(/_+$/, '') : s;
}
function sqUnique(base, used) {
  var n = base, i = 2;
  while (used[n]) { n = base + '_' + i; i++; }
  used[n] = 1;
  return n;
}
function sqTableName(fileName) {
  var base = String(fileName).replace(/^.*[\\\/]/, '').replace(/\.(csv|tsv|txt)$/i, '');
  var s = sqClean(base) || 'tabela';
  if (/^[0-9]/.test(s)) s = 't_' + s;
  if (/^sqlite_/.test(s)) s = 't_' + s;   // prefixo reservado do SQLite
  if (SQ_RESERVED[s]) s = s + '_';
  return s;
}
function sqColumnNames(header) {
  var used = {}, out = [];
  for (var i = 0; i < header.length; i++) {
    var s = sqClean(header[i]) || 'col_' + (i + 1);
    if (/^[0-9]/.test(s)) s = 'c_' + s;
    if (SQ_RESERVED[s]) s = s + '_';
    out.push(sqUnique(s, used));
  }
  return out;
}

function sqSchema() {
  var out = [];
  var r = sqDb.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name");
  var names = r.length ? r[0].values : [];
  for (var i = 0; i < names.length; i++) {
    var info = sqDb.exec('PRAGMA table_info(' + sqQuote(names[i][0]) + ')');
    var cols = info.length ? info[0].values.map(function (v) { return { name: String(v[1]), type: String(v[2]) }; }) : [];
    out.push({ name: String(names[i][0]), kind: String(names[i][1]), columns: cols });
  }
  return out;
}

function sqCell(v, stats) {
  if (v === null) return null;
  var t = typeof v;
  if (t === 'number') return v;
  if (t === 'bigint') return String(v);
  if (t === 'string') {
    if (v.length > SQ_MAX_CELL) { stats.cut++; return v.slice(0, SQ_MAX_CELL); }
    return v;
  }
  if (v && typeof v.length === 'number') return { blob: v.length }; // Uint8Array
  return String(v);
}

function sqRun(m) {
  var t0 = performance.now();
  var it = null, stmt = null, idx = 0, last = null, mod = 0, stats = { cut: 0 };
  try {
    it = sqDb.iterateStatements(m.sql);
    for (stmt of it) {
      idx++;
      var cols = stmt.getColumnNames();
      if (cols.length) {
        var cap = Math.max(1, Math.min(m.limit, Math.floor(m.cellBudget / cols.length)));
        var rows = [], total = 0;
        while (stmt.step()) {
          total++;
          if (rows.length < cap) {
            var raw = stmt.get(), row = new Array(raw.length);
            for (var i = 0; i < raw.length; i++) row[i] = sqCell(raw[i], stats);
            rows.push(row);
          } else if (total > SQ_MAX_COUNT) break;
        }
        last = { index: idx, columns: cols, rows: rows, total: Math.min(total, SQ_MAX_COUNT), capped: total > SQ_MAX_COUNT };
      } else {
        while (stmt.step()) { /* DDL/DML: executa até o fim */ }
        mod = sqDb.getRowsModified();
      }
      stmt.free(); stmt = null;
    }
  } catch (e) {
    if (stmt) { try { stmt.free(); } catch (e2) {} }
    if (sqIsFatal(e)) return { type: 'error', id: m.id, code: 'crash', message: String(e && e.message || e) };
    return { type: 'error', id: m.id, code: 'sql', message: String(e && e.message || e), statement: idx + (stmt === null && idx >= 0 ? 1 : 0), schema: sqSafeSchema() };
  }
  var ms = Math.round((performance.now() - t0) * 10) / 10;
  if (idx === 0) return { type: 'result', id: m.id, empty: true, ms: ms, schema: sqSafeSchema() };
  return { type: 'result', id: m.id, statements: idx, set: last, modified: mod, cut: stats.cut, ms: ms, schema: sqSafeSchema() };
}
// Falha do próprio WebAssembly/memória (não é erro de SQL): o motor fica inutilizável e a página o recria.
function sqIsFatal(e) {
  return (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.RuntimeError) || e instanceof RangeError || /^Aborted|out of memory|memory access out of bounds/i.test(String(e && e.message || e));
}
function sqSafeSchema() { try { return sqSchema(); } catch (e) { return []; } }

// ---------- CSV -> tabela ----------
function sqLoad(m) {
  var file = m.file;
  return file.arrayBuffer().then(function (buf) {
    var bytes = new Uint8Array(buf);
    if (bytes.length === 0) return { type: 'error', id: m.id, code: 'empty' };
    var head = Math.min(bytes.length, 8192);
    for (var i = 0; i < head; i++) if (bytes[i] === 0) return { type: 'error', id: m.id, code: 'binary' };
    var dec = decode(bytes, m.encoding || 'auto');
    bytes = null; buf = null;
    var text = dec.text;
    var delim = m.delimiter && m.delimiter !== 'auto' ? m.delimiter : detectDelimiter(text);
    var header = null, data = [], masks = [], ragged = 0, quoteErrors = 0, step = 0, last = 0, tooWide = 0;
    self.postMessage({ type: 'progress', id: m.id, pct: 0 });
    Papa.parse(text, {
      delimiter: delim || ',', skipEmptyLines: true,
      step: function (r, parser) {
        if (tooWide) return;
        if (r.errors && r.errors.length) for (var e = 0; e < r.errors.length; e++) if (r.errors[e].type === 'Quotes') quoteErrors++;
        var row = r.data;
        if (header === null) { if (row.length > MAX_COLS) { tooWide = row.length; parser.abort(); return; } header = row; for (var c = 0; c < header.length; c++) masks.push(0); return; }
        if (row.length !== header.length) ragged++;
        data.push(row);
        var n = Math.min(row.length, header.length);
        for (var k = 0; k < n; k++) { var v = row[k]; if (v.trim() !== '') masks[k] |= kindOf(v); }
        if ((data.length & 1023) === 0) {
          var now = Date.now();
          if (now - last > 80) { last = now; self.postMessage({ type: 'progress', id: m.id, pct: Math.min(49, Math.floor((r.meta.cursor || 0) / text.length * 50)) }); }
        }
      }
    });
    var replacement = text.indexOf('\uFFFD') !== -1;
    text = null;
    if (tooWide) return { type: 'error', id: m.id, code: 'cols', detail: String(tooWide) };
    if (header === null) return { type: 'error', id: m.id, code: 'empty' };

    // tipos: inteiro seguro -> INTEGER; decimal (ponto ou virgula) -> REAL; o resto -> TEXT (datas e booleanos ficam texto)
    var ncol = header.length, sqlTypes = [];
    for (var c2 = 0; c2 < ncol; c2++) {
      var ty = typeOf(masks[c2]), st = 'TEXT';
      if (ty === 'integer') {
        st = 'INTEGER';
        for (var r2 = 0; r2 < data.length; r2++) { var cv = data[r2][c2]; if (cv !== undefined && cv.trim() !== '' && !Number.isSafeInteger(Number(cv))) { st = 'TEXT'; break; } }
      } else if (ty === 'decimal' || ty === 'decimal_br') st = 'REAL';
      sqlTypes.push(st);
    }
    var sqlDecBr = masks.map(function (mk) { return typeOf(mk) === 'decimal_br'; });
    var existing = sqSchema().map(function (t) { return t.name; });
    var name = sqTableName(m.fileName || file.name);
    var replaced = existing.indexOf(name) !== -1;
    var cols = sqColumnNames(header);
    var renamed = [];
    for (var c3 = 0; c3 < ncol; c3++) if (cols[c3] !== header[c3]) renamed.push(c3);

    // NÃO existe nome de tabela dinâmico sem aspas: tudo passa por sqQuote; valores por parametros.
    sqDb.run('SAVEPOINT csvload');
    try {
      if (replaced) sqDb.run('DROP TABLE ' + sqQuote(name));
      sqDb.run('CREATE TABLE ' + sqQuote(name) + ' (' + cols.map(function (cn, i) { return sqQuote(cn) + ' ' + sqlTypes[i]; }).join(', ') + ')');
      var ins = sqDb.prepare('INSERT INTO ' + sqQuote(name) + ' VALUES (' + cols.map(function () { return '?'; }).join(',') + ')');
      var vals = new Array(ncol), lastP = 0;
      for (var ri = 0; ri < data.length; ri++) {
        var row2 = data[ri];
        for (var ci = 0; ci < ncol; ci++) {
          var x = ci < row2.length ? row2[ci] : null;
          if (x === null || x.trim() === '') vals[ci] = null;
          else if (sqlTypes[ci] === 'TEXT') vals[ci] = x;
          else vals[ci] = Number(sqlDecBr[ci] ? x.replace(',', '.') : x);
        }
        ins.run(vals);
        if ((ri & 2047) === 0) { var nw = Date.now(); if (nw - lastP > 80) { lastP = nw; self.postMessage({ type: 'progress', id: m.id, pct: 50 + Math.min(49, Math.floor(ri / data.length * 50)) }); } }
      }
      ins.free();
      sqDb.run('RELEASE csvload');
    } catch (e) {
      try { sqDb.run('ROLLBACK TO csvload'); sqDb.run('RELEASE csvload'); } catch (e2) {}
      throw e;
    }
    return {
      type: 'loaded', id: m.id, table: name, replaced: replaced, rowCount: data.length, colCount: ncol,
      columns: cols.map(function (cn, i) { return { name: cn, original: header[i], type: sqlTypes[i], csvType: typeOf(masks[i]) }; }),
      delimiter: delim, encoding: dec.encoding, bom: dec.bom, fallback: dec.fallback, ragged: ragged, quoteErrors: quoteErrors, replacement: replacement,
      renamed: renamed.length, schema: sqSafeSchema()
    };
  }).catch(function (e) {
    return { type: 'error', id: m.id, code: sqIsFatal(e) ? 'crash' : 'load', message: String(e && e.message || e) };
  });
}

function sqDrop(m) {
  try { sqDb.run('DROP TABLE IF EXISTS ' + sqQuote(m.name)); return { type: 'dropped', id: m.id, schema: sqSafeSchema() }; }
  catch (e) { return { type: 'error', id: m.id, code: 'sql', message: String(e && e.message || e) }; }
}

self.onmessage = function (e) {
  var m = e.data;
  if (!m || !sqDb) return;
  try {
    if (m.type === 'run') self.postMessage(sqRun(m));
    else if (m.type === 'load') sqLoad(m).then(function (r) { self.postMessage(r); });
    else if (m.type === 'drop') self.postMessage(sqDrop(m));
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, code: sqIsFatal(err) ? 'crash' : 'worker', message: String(err && err.message || err) });
  }
};

initSqlJs({ locateFile: function (f) { return new URL('../vendor/sqljs/' + f, self.location.href).href; } })
  .then(function (SQL) {
    sqDb = new SQL.Database();
    try { sqVersion = sqDb.exec('select sqlite_version()')[0].values[0][0]; } catch (e) {}
    self.postMessage({ type: 'ready', version: sqVersion });
  })
  .catch(function (e) { self.postMessage({ type: 'initerror', detail: String(e && e.message || e) }); });
