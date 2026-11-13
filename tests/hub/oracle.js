// Oraculo comum dos testes dos 5 cenarios (D11). Tudo vem do sqlite3 do Python sobre os MESMOS .sql (nada e calculado pelo codigo do Hub):
//   data():   {slug: {tables: [{name, count, columns:[{name,type,pk,fk}], nulls:[por coluna], rows:[ate 100 linhas, valores brutos]}]}}
//   queries(): {slug: {chave: {sql, columns, n, rows}}}  (3 consultas-chave por cenario, dos compute_*_expected.py; Vendas: compute_loja_keyq)
const cp = require('child_process'), fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../..'), DATA = path.join(REPO, 'hub/assets/data'), FX = path.join(REPO, 'docs/testing/fixtures');
const SLUGS = ['loja-exemplo', 'marketing-digital', 'logistica', 'rh', 'atendimento'];
const SCRIPTS = { 'loja-exemplo': 'compute_loja_keyq_expected.py', 'marketing-digital': 'compute_marketing-digital_expected.py', logistica: 'compute_logistica_expected.py', rh: 'compute_rh_expected.py', atendimento: 'compute_atendimento_expected.py' };
const DUMP = `
import json, os, sqlite3, sys
out = {}
for slug in json.loads(sys.argv[2]):
    c = sqlite3.connect(':memory:'); c.executescript(open(os.path.join(sys.argv[1], slug + '.sql'), encoding='utf-8').read())
    names = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid")]; tables = []
    for n in names:
        info = c.execute('PRAGMA table_info("%s")' % n).fetchall(); fks = {r[3]: '%s.%s' % (r[2], r[4]) for r in c.execute('PRAGMA foreign_key_list("%s")' % n)}
        cols = [{'name': r[1], 'type': r[2], 'pk': r[5] > 0, 'fk': fks.get(r[1], '')} for r in info]
        nulls = [c.execute('SELECT COUNT(*) - COUNT("%s") FROM "%s"' % (x['name'], n)).fetchone()[0] for x in cols]
        tables.append({'name': n, 'count': c.execute('SELECT COUNT(*) FROM "%s"' % n).fetchone()[0], 'columns': cols, 'nulls': nulls,
                       'rows': [list(r) for r in c.execute('SELECT * FROM "%s" ORDER BY rowid LIMIT 100' % n)]})
    out[slug] = {'tables': tables}
json.dump(out, sys.stdout)`;
let cacheData = null, cacheQ = null;
function data() {
  if (!cacheData) cacheData = JSON.parse(cp.execFileSync('python3', ['-I', '-c', DUMP, DATA, JSON.stringify(SLUGS)], { maxBuffer: 64 << 20 }).toString());
  return cacheData;
}
function queries() {
  if (cacheQ) return cacheQ;
  cacheQ = {};
  for (const slug of SLUGS) {
    let out;
    try { out = cp.execFileSync('python3', ['-I', path.join(FX, SCRIPTS[slug]), path.join(DATA, slug + '.sql')], { maxBuffer: 64 << 20 }).toString(); }
    catch (e) { if (e.stdout && e.stdout.length) out = e.stdout.toString(); else throw e; }   // sai com 1 quando SQL e Python divergem: o dataset test cobre; aqui so lemos o resultado
    const j = JSON.parse(out); cacheQ[slug] = Object.fromEntries(Object.entries(j.queries).map(([k, q]) => [k, { sql: q.sql, columns: q.columns, n: q.n, rows: q.rows, match: q.match }]));
  }
  return cacheQ;
}
// valor bruto do sqlite -> texto esperado na tela (NULL = "NULL"; inteiro; real comparado como numero)
const same = (ui, v) => v === null ? ui === 'NULL' : typeof v === 'number' ? (ui.trim() !== '' && Number(ui.replace(/,/g, '')) === v) || Math.abs(Number(ui) - v) <= 1e-6 * Math.max(1, Math.abs(v)) : ui === v;
const sameRow = (ui, row) => ui.length === row.length && ui.every((u, i) => same(u, row[i]));
module.exports = { SLUGS, data, queries, same, sameRow };
