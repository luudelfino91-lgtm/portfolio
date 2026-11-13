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
             | {type:'drop', id, name} | {type:'sample', id, sql}   (sql = texto de loja-exemplo.sql, buscado pela pagina)
             | {type:'verify', id, sample, ref, user, ordered}      (exercicios guiados, T-307; ver sqVerify)
   Saidas:   {type:'ready', version} | {type:'initerror', detail}
             | {type:'result', id, ...} | {type:'loaded', id, ...} | {type:'sample', id, ...} | {type:'verified', id, ok, code, vars}
             | {type:'error', id, ...}
   ===================================================================== */
'use strict';
importScripts('csv-worker.js');                  // define decode, detectDelimiter, kindOf, typeOf, Papa (relativo a este arquivo)
importScripts('../vendor/sqljs/sql-wasm.js');    // define initSqlJs

// Erros nao tratados dentro do Worker (ex.: abort do WebAssembly) já são reportados por mensagem
// ('initerror'/'crash'); não deixar que também virem erro não tratado da página.
self.onerror = function () { return true; };
self.addEventListener('unhandledrejection', function (e) { e.preventDefault(); });

var sqDb = null, sqSQL = null, sqVersion = '';
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
    var fkl = sqDb.exec('PRAGMA foreign_key_list(' + sqQuote(names[i][0]) + ')');
    var fks = {};
    if (fkl.length) fkl[0].values.forEach(function (f) { fks[String(f[3])] = String(f[2]) + '.' + String(f[4]); });  // coluna -> tabela.coluna
    var cols = info.length ? info[0].values.map(function (v) { return { name: String(v[1]), type: String(v[2]), pk: Number(v[5]) > 0, fk: fks[String(v[1])] || '' }; }) : [];
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

// ---------- banco de exemplo (loja-exemplo.sql) ----------
// Nomes fixos (constantes do projeto, nunca vindos do usuario ou do arquivo). Ordem: pais antes dos filhos.
var SQ_SAMPLE = ['clientes', 'categorias', 'produtos', 'pedidos', 'itens_pedido'];
function sqSample(m) {
  var existing = sqSchema().map(function (t) { return t.name; });
  var replaced = SQ_SAMPLE.filter(function (n) { return existing.indexOf(n) !== -1; });
  sqDb.run('SAVEPOINT sample');
  try {
    for (var i = SQ_SAMPLE.length - 1; i >= 0; i--) sqDb.run('DROP TABLE IF EXISTS ' + sqQuote(SQ_SAMPLE[i]));   // filhos primeiro
    sqDb.run(String(m.sql));
    var fk = sqDb.exec('PRAGMA foreign_key_check');
    if (fk.length && fk[0].values.length) throw new Error('foreign_key_check: ' + fk[0].values.length + ' violations');
    var rows = 0, counts = {};
    SQ_SAMPLE.forEach(function (n) { var c = sqDb.exec('SELECT COUNT(*) FROM ' + sqQuote(n))[0].values[0][0]; counts[n] = c; rows += c; });
    sqDb.run('RELEASE sample');
  } catch (e) {
    try { sqDb.run('ROLLBACK TO sample'); sqDb.run('RELEASE sample'); } catch (e2) {}
    throw e;
  }
  return { type: 'sample', id: m.id, tables: SQ_SAMPLE.slice(), replaced: replaced, counts: counts, rows: rows, schema: sqSafeSchema() };
}

// ---------- exercicios guiados: verificacao automatica (T-307) ----------
/* REGRA DE COMPARACAO (a mesma de hub/assets/data/exercicios.md; escrita ANTES do codigo):
   Compara o resultado da consulta DO USUARIO (ultima instrucao que devolve colunas) com o resultado da consulta de referencia.
   1. Colunas: mesmo numero; comparadas por POSICAO e por NOME (nome sem diferenciar maiusculas de minusculas).
   2. Valores: NULL so e igual a NULL. Numeros: inteiro e real sao iguais se numericamente iguais (3 == 3.0);
      dois inteiros comparam exatamente; se algum e REAL, |a-b| <= 1e-9 * max(1, |a|, |b|). Texto compara exatamente
      (com maiusculas/minusculas); texto nunca e igual a numero ('3' != 3). BLOB compara byte a byte.
   3. Linhas: mesmo numero. Ordem significativa SO quando o exercicio pede ORDER BY (ordered = true); senao as linhas
      sao comparadas como MULTICONJUNTO (ordem ignorada, repeticoes contam).
   Isolamento: a verificacao roda num banco NOVO e descartavel (new SQL.Database()), criado so para esta verificacao a partir do
   texto do banco de exemplo; a referencia roda ali ANTES do SQL do usuario. O banco do usuario (o do playground) nunca e tocado,
   entao INSERT/UPDATE/DROP/COMMIT/ROLLBACK do usuario nao corrompem nada, nem a proxima verificacao. (Escolha documentada:
   banco novo em vez de SAVEPOINT/ROLLBACK, porque o SQL do usuario pode conter COMMIT/ROLLBACK/RELEASE e desfazer o ponto de retorno.)
   A mensagem de falha diz O QUE difere, nunca o valor esperado. */
var VF_MAX_ROWS = 20000;     // linhas lidas por consulta; acima disso o resultado e "grande demais" (conta como diferente)

function vfRunLast(db, sql) {
  var it = db.iterateStatements(sql), stmt = null, idx = 0, last = null;
  try {
    for (stmt of it) {
      idx++;
      var cols = stmt.getColumnNames();
      if (cols.length) {
        var rows = [], total = 0;
        while (stmt.step()) { total++; if (rows.length < VF_MAX_ROWS) rows.push(stmt.get()); else break; }
        last = { columns: cols, rows: rows, capped: total > VF_MAX_ROWS };
      } else { while (stmt.step()) { /* DDL/DML */ } }
      stmt.free(); stmt = null;
    }
  } catch (e) {
    if (stmt) { try { stmt.free(); } catch (e2) {} }
    e.vfStatement = idx; throw e;
  }
  return { set: last, statements: idx };
}

function vfKind(v) { return v === null || v === undefined ? 0 : typeof v === 'number' || typeof v === 'bigint' ? 1 : typeof v === 'string' ? 2 : 3; }
function vfCellCmp(a, b) {      // -1/0/1; numeros com a tolerancia da regra
  var ka = vfKind(a), kb = vfKind(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  if (ka === 0) return 0;
  if (ka === 1) {
    if (typeof a === 'bigint' || typeof b === 'bigint') { a = Number(a); b = Number(b); }
    if (a === b) return 0;
    if (!(Number.isInteger(a) && Number.isInteger(b)) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))) return 0;
    return a < b ? -1 : 1;
  }
  if (ka === 2) return a === b ? 0 : a < b ? -1 : 1;
  var n = Math.min(a.length, b.length);
  for (var i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}
function vfRowCmp(x, y) { for (var i = 0; i < x.length; i++) { var c = vfCellCmp(x[i], y[i]); if (c) return c; } return 0; }

// devolve {ok:true} ou {ok:false, code, vars}; codes: cols, names, rows, value, order, set
function vfCompare(got, want, ordered) {
  if (got.columns.length !== want.columns.length) return { ok: false, code: 'cols', vars: { got: got.columns.length, want: want.columns.length } };
  for (var i = 0; i < want.columns.length; i++) {
    if (String(got.columns[i]).toLowerCase() !== String(want.columns[i]).toLowerCase()) return { ok: false, code: 'names', vars: { pos: i + 1, got: got.columns[i] } };
  }
  if (got.capped || got.rows.length !== want.rows.length) return { ok: false, code: 'rows', vars: { got: got.capped ? VF_MAX_ROWS + '+' : got.rows.length, want: want.rows.length } };
  var n = want.rows.length, k;
  if (ordered) {
    for (k = 0; k < n; k++) {
      var r = vfRowCmp(got.rows[k], want.rows[k]);
      if (r !== 0) {
        // mesmas linhas em outra ordem? (multiconjunto igual) -> mensagem de ordem; senao valor diferente
        var a = got.rows.slice().sort(vfRowCmp), b = want.rows.slice().sort(vfRowCmp), same = true;
        for (var j = 0; j < n; j++) if (vfRowCmp(a[j], b[j]) !== 0) { same = false; break; }
        if (same) return { ok: false, code: 'order', vars: { row: k + 1 } };
        for (var c = 0; c < want.columns.length; c++) if (vfCellCmp(got.rows[k][c], want.rows[k][c]) !== 0) return { ok: false, code: 'value', vars: { row: k + 1, col: c + 1, name: want.columns[c] } };
      }
    }
    return { ok: true };
  }
  var ga = got.rows.slice().sort(vfRowCmp), wa = want.rows.slice().sort(vfRowCmp);
  for (k = 0; k < n; k++) if (vfRowCmp(ga[k], wa[k]) !== 0) return { ok: false, code: 'set', vars: {} };
  return { ok: true };
}

function sqVerify(m) {
  var db = null, want, got;
  try {
    db = new sqSQL.Database();
    db.run(String(m.sample));
    var ref = vfRunLast(db, String(m.ref));
    if (!ref.set) return { type: 'verified', id: m.id, ok: false, code: 'internal', vars: {} };
    want = ref.set;
    var res;
    try { res = vfRunLast(db, String(m.user)); }
    catch (e) {
      if (sqIsFatal(e)) throw e;
      return { type: 'verified', id: m.id, ok: false, code: 'sql', vars: { message: String(e && e.message || e), statement: (e.vfStatement || 0) + 1 } };
    }
    if (res.statements === 0) return { type: 'verified', id: m.id, ok: false, code: 'empty', vars: {} };
    if (!res.set) return { type: 'verified', id: m.id, ok: false, code: 'noresult', vars: {} };
    got = res.set;
    var v = vfCompare(got, want, !!m.ordered);
    return { type: 'verified', id: m.id, ok: v.ok, code: v.ok ? 'pass' : v.code, vars: v.vars || {} };
  } finally {
    if (db) { try { db.close(); } catch (e3) {} }
  }
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
    else if (m.type === 'sample') self.postMessage(sqSample(m));
    else if (m.type === 'verify') self.postMessage(sqVerify(m));
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, code: sqIsFatal(err) ? 'crash' : (m.type === 'sample' ? 'sample' : 'worker'), message: String(err && err.message || err), schema: sqSafeSchema() });
  }
};

initSqlJs({ locateFile: function (f) { return new URL('../vendor/sqljs/' + f, self.location.href).href; } })
  .then(function (SQL) {
    sqSQL = SQL; sqDb = new SQL.Database();
    try { sqVersion = sqDb.exec('select sqlite_version()')[0].values[0][0]; } catch (e) {}
    self.postMessage({ type: 'ready', version: sqVersion });
  })
  .catch(function (e) { self.postMessage({ type: 'initerror', detail: String(e && e.message || e) }); });
