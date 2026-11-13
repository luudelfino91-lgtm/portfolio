/* =====================================================================
   Worker do SQL playground (T-304/T-305/T-306 SQL; D11: sem upload de arquivo). Fora da thread principal.
   - sql.js 1.16.0 vendorizado (hub/assets/vendor/sqljs/); o .wasm e buscado
     por caminho relativo a este arquivo (funciona em /hub/ e /portfolio/hub/).
   - Dados: SO os 5 cenarios embutidos (scenarios.js, importado abaixo). O texto do .sql chega da pagina
     (mensagem 'sample'); este Worker valida o slug contra a lista fixa e nunca recebe nome de tabela de fora.
   - Nada sai do navegador: este arquivo não usa fetch (alem do .wasm local
     feito pelo proprio sql.js), XHR nem WebSocket.
   - Cancelar/Parar/tempo limite = o sql.js (pagina) chama worker.terminate();
     o banco em memória e perdido e recriado.
   Entradas: {type:'run', id, sql, limit, cellBudget}
             | {type:'sample', id, slug, sql}   (slug = um dos 5 cenarios; sql = texto do .sql do cenario, buscado pela pagina)
             | {type:'verify', id, sample, ref, user, ordered}      (exercicios guiados, T-307; ver sqVerify)
   Saidas:   {type:'ready', version} | {type:'initerror', detail}
             | {type:'result', id, ...} | {type:'sample', id, slug, tables, replaced, counts, rows, schema} | {type:'verified', id, ok, code, vars}
             | {type:'error', id, ...}
   ===================================================================== */
'use strict';
importScripts('scenarios.js');                   // define HubScenarios (lista fixa dos 5 cenarios; relativo a este arquivo)
importScripts('../vendor/sqljs/sql-wasm.js');    // define initSqlJs

// Erros nao tratados dentro do Worker (ex.: abort do WebAssembly) já são reportados por mensagem
// ('initerror'/'crash'); não deixar que também virem erro não tratado da página.
self.onerror = function () { return true; };
self.addEventListener('unhandledrejection', function (e) { e.preventDefault(); });

var sqDb = null, sqSQL = null, sqVersion = '';
var SQ_MAX_COUNT = 1000000;      // conta linhas ate aqui; acima, informa "mais de"
var SQ_MAX_CELL = 2000;          // texto maior que isto e cortado na exibição

function sqQuote(id) { return '"' + String(id).replace(/"/g, '""') + '"'; }

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

// ---------- bancos de exemplo (5 cenarios) ----------
// Nomes de tabela = constantes do projeto (HubScenarios), nunca vindos do usuario ou de arquivo.
// Carregar um cenario SUBSTITUI as tabelas de TODOS os cenarios que estiverem no banco (varios cenarios compartilham o nome
// "clientes"; so um cenario fica carregado por vez). Tabelas criadas pelo usuario com outros nomes sao mantidas.
function sqSample(m) {
  if (typeof m.slug !== 'string' || !HubScenarios.has(m.slug)) throw new Error('unknown scenario');
  var names = HubScenarios.bySlug[m.slug].tables;
  var existing = sqSchema().map(function (t) { return t.name; });
  var all = HubScenarios.allTablesDropOrder();
  var replaced = all.filter(function (n) { return existing.indexOf(n) !== -1; });
  sqDb.run('SAVEPOINT sample');
  try {
    all.forEach(function (n) { sqDb.run('DROP TABLE IF EXISTS ' + sqQuote(n)); });   // filhos antes dos pais
    sqDb.run(String(m.sql));
    var fk = sqDb.exec('PRAGMA foreign_key_check');
    if (fk.length && fk[0].values.length) throw new Error('foreign_key_check: ' + fk[0].values.length + ' violations');
    var rows = 0, counts = {};
    names.forEach(function (n) { var c = sqDb.exec('SELECT COUNT(*) FROM ' + sqQuote(n))[0].values[0][0]; counts[n] = c; rows += c; });
    sqDb.run('RELEASE sample');
  } catch (e) {
    try { sqDb.run('ROLLBACK TO sample'); sqDb.run('RELEASE sample'); } catch (e2) {}
    throw e;
  }
  return { type: 'sample', id: m.id, slug: m.slug, tables: names.slice(), replaced: replaced, counts: counts, rows: rows, schema: sqSafeSchema() };
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

self.onmessage = function (e) {
  var m = e.data;
  if (!m || !sqDb) return;
  try {
    if (m.type === 'run') self.postMessage(sqRun(m));
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
