// Bases de exemplo do SQL playground (5 cenarios: vendas/loja, marketing-digital, logistica, rh, atendimento).
// Rapido e sem servidor/navegador: usa python3 (sqlite3 do Python) como oraculo, o mesmo metodo de sample.js.
// Confere: gerador deterministico (2 execucoes = arquivo commitado = README), tamanho, bytes/SHA-256 do README, ausencia de PII (so
// e-mails example.com), integridade, foreign_key_check vazio, contagens por tabela e 3 consultas-chave (SQL x Python puro).
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
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
const bad = results.filter(r => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} verificacoes OK`);
process.exit(bad ? 1 : 0);
