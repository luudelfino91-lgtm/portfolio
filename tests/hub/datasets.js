// Bases de exemplo do SQL playground (5 cenarios: vendas/loja, marketing-digital, logistica, rh, atendimento).
// Rapido e sem servidor/navegador: usa python3 (sqlite3 do Python) como oraculo, o mesmo metodo de sample.js.
// Confere: gerador deterministico (2 execucoes = arquivo commitado = README), tamanho, bytes/SHA-256 do README, ausencia de PII (so
// e-mails example.com), integridade, foreign_key_check vazio, contagens por tabela e 3 consultas-chave (SQL x Python puro).
// D11: confere tambem os CSV exportados por export_scenarios_csv.py (hub/assets/data/csv/): determinismo, bytes/SHA-256 no README,
// ida e volta celula a celula contra o sqlite3, schema.json = PRAGMA, tabelas = scenarios.js = CREATE TABLE, ER do README = scenarios.js.
// Uso: node tests/hub/datasets.js   (nao usa portas; PORT_ROOT/PORT_SUB/PORT_GZ sao ignoradas)
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process'), crypto = require('crypto');
const REPO = path.resolve(__dirname, '../..'), DATA = path.join(REPO, 'hub/assets/data'), FX = path.join(REPO, 'docs/testing/fixtures');
const results = [];
const rec = (id, ok, ev) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' :: ' + ev); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const py = (script, args) => cp.execFileSync('python3', ['-I', path.join(FX, script), ...args], { maxBuffer: 64 << 20 }).toString();
// o oraculo sai com codigo 1 quando SQL e Python divergem; capturamos a saida mesmo assim
const oracle = (script, sql) => { try { return JSON.parse(py(script, [sql])); } catch (e) { if (e.stdout && e.stdout.length) return Object.assign(JSON.parse(e.stdout.toString()), { exit: e.status }); throw e; } };

// n = linhas esperadas por tabela (valores medidos no gerador atual); q = {consulta: linhas esperadas}
const SCEN = [
  { id: 'vendas', file: 'loja-exemplo.sql', gen: 'gen_loja.py', ora: ['compute_loja_expected.py', 'compute_loja_keyq_expected.py'], limit: 100 * 1024,
    n: { clientes: 40, categorias: 6, produtos: 30, pedidos: 200, itens_pedido: 500 },
    q: { faturamento_por_categoria: 6, pedidos_por_status: 4, top5_clientes: 5 } },
  { id: 'marketing-digital', file: 'marketing-digital.sql', gen: 'gen_marketing-digital.py', ora: ['compute_marketing-digital_expected.py'],
    n: { canais: 6, campanhas: 24, anuncios: 80, metricas_diarias: 480, leads: 300 },
    q: { ctr_por_canal: 6, roas_por_canal_mes: 62, leads_sem_conversao: 10 } },
  { id: 'logistica', file: 'logistica.sql', gen: 'gen_logistica.py', ora: ['compute_logistica_expected.py'],
    n: { centros_distribuicao: 6, transportadoras: 8, veiculos: 40, rotas: 30, entregas: 500, ocorrencias: 160 },
    q: { sla_por_transportadora: 8, custo_por_km_transportadora: 8, atraso_por_centro: 6 } },
  { id: 'rh', file: 'rh.sql', gen: 'gen_rh.py', ora: ['compute_rh_expected.py'],
    n: { departamentos: 8, cargos: 22, funcionarios: 200, salarios_historico: 407, avaliacoes: 337, ausencias: 220 },
    q: { headcount_turnover_por_departamento: 8, media_salarial_atual_por_cargo: 22, subordinados_diretos_por_gestor: 10 } },
  { id: 'atendimento', file: 'atendimento.sql', gen: 'gen_atendimento.py', ora: ['compute_atendimento_expected.py'],
    n: { clientes: 120, agentes: 20, tickets: 320, interacoes: 566, pesquisas_satisfacao: 184 },
    q: { tma_por_agente: 20, backlog_por_prioridade: 4, csat_por_agente: 20 } },
];

const readme = fs.readFileSync(path.join(DATA, 'README.md'), 'utf8');
const section = f => { const i = readme.indexOf('## ' + f + '\n'); if (i < 0) return ''; const j = readme.indexOf('\n## ', i + 4); return readme.slice(i, j < 0 ? undefined : j); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'datasets-'));

try {
  for (const S of SCEN) {
    const sqlf = path.join(DATA, S.file), buf = fs.readFileSync(sqlf), text = buf.toString('utf8'), h = sha(buf), tag = `[${S.id}]`;
    // determinismo
    const a = path.join(tmp, S.id + '-a.sql'), b = path.join(tmp, S.id + '-b.sql');
    py(S.gen, ['--out', a]); py(S.gen, ['--out', b]);
    const ha = sha(fs.readFileSync(a)), hb = sha(fs.readFileSync(b));
    rec(`DATA-01 ${tag} gerador deterministico: 2 execucoes e o arquivo commitado tem o mesmo sha256`, ha === hb && ha === h, `a=${ha.slice(0, 12)} b=${hb.slice(0, 12)} commitado=${h.slice(0, 12)}`);
    // tamanho e README
    const sec = section(S.file);
    rec(`DATA-02 ${tag} tamanho <= ${Math.round((S.limit || 120 * 1024) / 1024)} KB e bytes/SHA-256 corretos na secao do README`, buf.length <= (S.limit || 120 * 1024) && sec.includes('| ' + buf.length + ' |') && sec.includes('`' + h + '`'), `bytes=${buf.length}`);
    rec(`DATA-03 ${tag} README lista cada tabela com o numero de linhas, traz diagrama ER (PK/FK) e o comando para regerar`, Object.entries(S.n).every(([t, n]) => new RegExp('\\| ' + t + ' \\| ' + n + ' \\|').test(sec)) && /PK/.test(sec) && sec.includes('python3 -I docs/testing/fixtures/' + S.gen), `secao=${sec.length} chars`);
    // formato do script
    const emails = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g) || [];
    rec(`DATA-04 ${tag} comeca com comentario + CREATE TABLE; todo e-mail e @example.com; sem URL; ASCII`, /^-- /.test(text) && /^CREATE TABLE /m.test(text) && emails.every(e => e.endsWith('@example.com')) && !/https?:/i.test(text) && !/[^\x00-\x7f]/.test(text), `emails=${emails.length}`);
    // oraculo(s)
    let merged = { counts: {}, queries: {}, fk_check: [], integrity_check: 'ok', exit: 0 };
    for (const o of S.ora) { const r = oracle(o, sqlf); Object.assign(merged.counts, r.counts); Object.assign(merged.queries, r.queries); merged.fk_check = merged.fk_check.concat(r.fk_check); if (r.integrity_check) merged.integrity_check = r.integrity_check; merged.exit = merged.exit || r.exit || 0; }
    rec(`DATA-10 ${tag} PRAGMA integrity_check = ok e PRAGMA foreign_key_check vazio`, merged.integrity_check === 'ok' && merged.fk_check.length === 0, `integrity=${merged.integrity_check} fk_violacoes=${merged.fk_check.length}`);
    rec(`DATA-11 ${tag} contagens por tabela = esperado (${Object.values(S.n).join('/')}); 20 a 600 linhas nas tabelas de fatos`, JSON.stringify(merged.counts) === JSON.stringify(S.n) && Object.entries(S.n).every(([t, n]) => n <= 600 && (n >= 20 || n <= 8)), JSON.stringify(merged.counts));
    const qk = Object.keys(S.q);
    rec(`DATA-12 ${tag} 3 consultas-chave: SQL (sqlite3) = Python puro, numero de linhas esperado e nenhuma vazia`,
      merged.exit === 0 && qk.length === 3 && qk.every(k => { const r = merged.queries[k]; return r && r.match === true && r.n === S.q[k] && r.n > 0 && JSON.stringify(r.rows.length) === JSON.stringify(r.py_rows.length); }),
      qk.map(k => `${k}: n=${merged.queries[k] && merged.queries[k].n} match=${merged.queries[k] && merged.queries[k].match}`).join('; '));
  }

  // ===== D11: CSV exportados =====
  const CSVD = path.join(DATA, 'csv');
  global.self = global; require(path.join(REPO, 'hub/assets/js/scenarios.js')); const HS = global.HubScenarios;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)).map(f => path.join(e.name, f)) : [e.name]);
  const listing = d => walk(d).filter(f => f !== 'SHA256SUMS').sort();
  const ca = path.join(tmp, 'csv-a'), cb = path.join(tmp, 'csv-b');
  py('export_scenarios_csv.py', ['--out', ca]); py('export_scenarios_csv.py', ['--out', cb]);
  const fa = listing(ca), fb = listing(cb), fc = listing(CSVD);
  const same2 = fa.length === fb.length && fa.every((f, i) => f === fb[i] && sha(fs.readFileSync(path.join(ca, f))) === sha(fs.readFileSync(path.join(cb, f))));
  const sameC = fa.join() === fc.join() && fa.every(f => sha(fs.readFileSync(path.join(ca, f))) === sha(fs.readFileSync(path.join(CSVD, f))));
  rec('DATA-20 CSV: gerador deterministico (2 execucoes identicas) e igual ao commitado em hub/assets/data/csv/ (' + fc.length + ' arquivos)', same2 && sameC && fc.length === 32 && fs.readFileSync(path.join(ca, 'SHA256SUMS'), 'utf8') === fs.readFileSync(path.join(CSVD, 'SHA256SUMS'), 'utf8'), `a=b:${same2} commitado=gerado:${sameC} arquivos=${fc.length}`);
  const csec = section('csv/ (D11): as tabelas de cada cenário em CSV e schema.json');
  let total = 0, missing = [];
  for (const f of fc) { const b = fs.readFileSync(path.join(CSVD, f)); total += b.length; const rel = f.split(path.sep).join('/'); if (!csec.includes('| `' + rel + '` | ' + b.length + ' | `' + sha(b) + '` |')) missing.push(rel); }
  rec('DATA-21 CSV: README lista bytes e SHA-256 de CADA arquivo e o total; total <= 300 KB e cada arquivo <= 100 KB', missing.length === 0 && csec.includes('Total: 32 arquivos, ' + total + ' bytes') && total <= 300 * 1024 && fc.every(f => fs.statSync(path.join(CSVD, f)).size <= 100 * 1024), `faltando no README=${JSON.stringify(missing)} total=${total} B`);
  // tabelas: scenarios.js = ordem do CREATE TABLE = schema.json = arquivos .csv
  const bad = [];
  for (const S of SCEN) {
    const slug = S.file.replace(/\.sql$/, ''), sc = HS.bySlug[slug], text = fs.readFileSync(path.join(DATA, S.file), 'utf8');
    const created = [...text.matchAll(/^CREATE TABLE (\w+)/gm)].map(m => m[1]);
    const schema = JSON.parse(fs.readFileSync(path.join(CSVD, slug, 'schema.json'), 'utf8'));
    const files = fc.filter(f => f.startsWith(slug + path.sep) && f.endsWith('.csv')).map(f => path.basename(f, '.csv')).sort();
    if (!sc || sc.sql !== S.file || sc.tables.join() !== created.join() || schema.slug !== slug || schema.tables.map(t => t.name).join() !== created.join() || files.join() !== created.slice().sort().join() || Object.keys(S.n).slice().sort().join() !== created.slice().sort().join()) bad.push(slug);
  }
  rec('DATA-22 CSV: tabelas de scenarios.js = ordem dos CREATE TABLE do .sql = schema.json = arquivos .csv, nos 5 cenarios; HubScenarios.list tem 5 cenarios', bad.length === 0 && HS.list.length === 5, `divergentes=${JSON.stringify(bad)}`);
  // ida e volta: cada celula do CSV = valor do sqlite3 (modulo csv do Python); cabecalho/colunas/tipos/PK/FK do schema.json = PRAGMA
  const RT = `
import csv, json, sqlite3, sys, os
data, out = sys.argv[1], {}
for slug, f in json.loads(sys.argv[2]).items():
    c = sqlite3.connect(':memory:'); c.executescript(open(os.path.join(data, f), encoding='utf-8').read())
    schema = json.load(open(os.path.join(data, 'csv', slug, 'schema.json'), encoding='utf-8')); res = {}
    for tb in schema['tables']:
        n = tb['name']; info = c.execute('PRAGMA table_info("%s")' % n).fetchall(); fks = {r[3]: '%s.%s' % (r[2], r[4]) for r in c.execute('PRAGMA foreign_key_list("%s")' % n)}
        want_cols = [{'name': r[1], 'type': r[2], 'pk': r[5] > 0, 'fk': fks.get(r[1], '')} for r in info]
        raw = open(os.path.join(data, 'csv', slug, n + '.csv'), 'rb').read()
        rows = list(csv.reader(open(os.path.join(data, 'csv', slug, n + '.csv'), encoding='utf-8', newline='')))
        db = c.execute('SELECT * FROM "%s" ORDER BY rowid' % n).fetchall(); bad = 0; nulls = [0] * len(info)
        for got, exp in zip(rows[1:], db):
            for i, (g, e) in enumerate(zip(got, exp)):
                if e is None: ok = g == ''; nulls[i] += 1
                elif isinstance(e, int): ok = g == str(e)
                elif isinstance(e, float): ok = g != '' and float(g) == e
                else: ok = g == e
                bad += 0 if ok else 1
        res[n] = {'header_ok': rows[0] == [r[1] for r in info], 'schema_ok': tb['columns'] == want_cols, 'rows': len(rows) - 1, 'db_rows': len(db), 'bad_cells': bad, 'ragged': sum(1 for r in rows if len(r) != len(info)),
                  'bom': raw[:3] == b'\\xef\\xbb\\xbf', 'cr': b'\\r' in raw, 'nulls_total': sum(nulls), 'emails_bad': [e for e in __import__('re').findall(r'[\\w.+-]+@[\\w.-]+', raw.decode('utf-8')) if not e.endswith('@example.com')]}
    out[slug] = res
json.dump(out, sys.stdout)`;
  const rt = JSON.parse(cp.execFileSync('python3', ['-I', '-c', RT, DATA, JSON.stringify(Object.fromEntries(SCEN.map(S => [S.file.replace(/\.sql$/, ''), S.file])))], { maxBuffer: 64 << 20 }).toString());
  const flat = Object.entries(rt).flatMap(([sl, t]) => Object.entries(t).map(([n, r]) => ({ id: sl + '.' + n, ...r })));
  const prob = flat.filter(r => !r.header_ok || !r.schema_ok || r.rows !== r.db_rows || r.bad_cells || r.ragged || r.bom || r.cr || r.emails_bad.length);
  rec(`DATA-23 CSV: ${flat.length} tabelas; cabecalho e schema.json (tipo, PK, FK) = PRAGMA; todas as celulas = sqlite3 (NULL = vazio, REAL por valor); sem BOM/CR; linhas regulares; e-mails so example.com`, prob.length === 0 && flat.length === 27, prob.length ? JSON.stringify(prob) : `${flat.reduce((a, r) => a + r.rows, 0)} linhas, ${flat.reduce((a, r) => a + r.nulls_total, 0)} NULLs conferidos`);
  const cnt = SCEN.every(S => Object.entries(S.n).every(([t, n]) => rt[S.file.replace(/\.sql$/, '')][t].rows === n));
  rec('DATA-24 CSV: numero de linhas de cada tabela = contagem do oraculo (40/6/30/200/500, 6/24/80/480/300, ...), 27 tabelas', cnt, JSON.stringify(Object.fromEntries(flat.map(r => [r.id, r.rows]))));
  // ER do README = scenarios.js (o seletor mostra o mesmo diagrama)
  const blocks = [...readme.matchAll(/```\n([\s\S]*?)\n```/g)].map(m => m[1]).slice(0, 5);
  rec('DATA-25 diagrama ER em texto: o de scenarios.js (mostrado no seletor) e IDENTICO ao do README, para os 5 cenarios', HS.list.every((sc, i) => sc.er === blocks[i]), HS.list.map((sc, i) => sc.slug + ':' + (sc.er === blocks[i])).join(' '));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
const bad = results.filter(r => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} verificacoes OK`);
process.exit(bad ? 1 : 0);
