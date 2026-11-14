// Banco de exemplo do SQL playground (T-307 enxuto): dataset, consultas de exemplo, recarga, i18n, a11y, 360px, privacidade.
// O oraculo (contagens, FKs, resultado de cada consulta) vem de docs/testing/fixtures/compute_loja_expected.py (sqlite3 do Python
// sobre o MESMO .sql); nada e calculado pelo codigo do Hub.
const L = require('./lib'); const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process'); const crypto = require('crypto');
const PAGE = 'hub/ferramentas/sql/'; const SQLF = path.join(L.REPO, 'hub/assets/data/loja-exemplo.sql');
const GEN = path.join(L.REPO, 'docs/testing/fixtures/gen_loja.py'); const ORA = path.join(L.REPO, 'docs/testing/fixtures/compute_loja_expected.py');
const FX = path.join(L.REPO, 'docs/testing/fixtures');
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
if (!AXE) L.rec('A11-02 (amostra) axe-core presente em ' + L.AXE_PATH, false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
const T0 = 60000, TABLES = ['clientes', 'categorias', 'produtos', 'pedidos', 'itens_pedido'];
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const oracle = qs => { const a = [ORA, SQLF]; let qf = null; if (qs) { qf = path.join(os.tmpdir(), 'loja-q-' + process.pid + '.json'); fs.writeFileSync(qf, JSON.stringify(qs)); a.push(qf); }
  const out = cp.execFileSync('python3', ['-I', ...a], { maxBuffer: 64 << 20 }).toString(); if (qf) fs.rmSync(qf); return JSON.parse(out); };

const state = pg => pg.evaluate(() => document.getElementById('sqlTool').dataset.state);
const ready = (pg, ms = T0) => pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state === 'ready', null, { timeout: ms });
async function open(br, base, lang, theme, vp = 1280, extra = {}) {
  const c = await L.ctx(br, { lang, theme, vp, ...extra }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  const dialogs = { n: 0 }; pg.on('dialog', d => { dialogs.n++; d.dismiss(); });
  await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
  return { c, pg, log, dialogs };
}
async function run(pg, sql) { if (sql !== null) await pg.fill('#sqlEditor', sql); await pg.click('#sqlRun'); await ready(pg); }
async function loadSample(pg) { await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => /^(Sample database loaded|Banco de exemplo carregado)/.test(document.getElementById('sqlStatus').textContent) || !document.getElementById('sqlErr').hidden, null, { timeout: T0 }); await ready(pg); }
const grab = pg => pg.evaluate(() => {
  const g = id => document.getElementById(id);
  return { state: g('sqlTool').dataset.state, errVisible: !g('sqlErr').hidden, errT: g('sqlErrT').textContent, errM: g('sqlErrM').textContent, errH: g('sqlErrH').textContent,
    warn: g('sqlWarn').hidden ? '' : g('sqlWarn').textContent, status: g('sqlStatus').textContent, text: g('sqlEditor').value, cap: g('sqlResCap').textContent,
    header: [...document.querySelectorAll('#sqlResTable thead th')].map(e => e.textContent), body: [...document.querySelectorAll('#sqlResTable tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)),
    msg: g('sqlResMsg').hidden ? '' : g('sqlResMsg').textContent, tableVisible: !g('sqlResBox').hidden,
    schema: [...document.querySelectorAll('#sqlSchema table')].map(t => ({ cap: t.caption.textContent, head: [...t.tHead.rows[0].cells].map(c => c.textContent), rows: [...t.tBodies[0].rows].map(r => [...r.cells].map(c => c.textContent)) })) };
});
const num = (a, b) => { const x = Number(a), y = Number(b); return String(a).trim() !== '' && String(b).trim() !== '' && !isNaN(x) && !isNaN(y); };
const same = (a, b) => num(a, b) ? Math.abs(Number(a) - Number(b)) <= 1e-6 * Math.max(1, Math.abs(Number(a))) : String(a) === String(b);
const keySum = rows => Math.round(rows.reduce((s, r) => s + r.reduce((t, v) => t + (num(v, v) ? Number(v) : 0), 0), 0) * 100) / 100;
const cmp = (got, exp) => got.length === exp.length && got.every((r, i) => r.length === exp[i].length && r.every((v, j) => same(v, exp[i][j])));
const counts = async pg => { await run(pg, TABLES.map(t => `SELECT '${t}' AS t, COUNT(*) AS n FROM ${t}`).join(' UNION ALL ')); return Object.fromEntries((await grab(pg)).body.map(r => [r[0], +r[1]])); };

(async () => {
  // ===== A. Dataset: determinismo, tamanho, README =====
  const t1 = fs.mkdtempSync(path.join(os.tmpdir(), 'loja-a-')), t2 = fs.mkdtempSync(path.join(os.tmpdir(), 'loja-b-'));
  cp.execFileSync('python3', ['-I', GEN, '--out', path.join(t1, 'a.sql')]); cp.execFileSync('python3', ['-I', GEN, '--out', path.join(t2, 'b.sql')]);
  const sa = sha(path.join(t1, 'a.sql')), sb = sha(path.join(t2, 'b.sql')), sc = sha(SQLF), size = fs.statSync(SQLF).size;
  const readme = fs.readFileSync(path.join(L.REPO, 'hub/assets/data/README.md'), 'utf8');
  L.rec('SAMPLE-01 gerador deterministico: duas execucoes e o arquivo commitado tem o mesmo sha256', sa === sb && sa === sc, `a=${sa} b=${sb} commitado=${sc}`);
  L.rec('SAMPLE-02 tamanho < 100 KB e bytes/sha256 registrados em hub/assets/data/README.md', size < 102400 && readme.includes(sc) && readme.includes(String(size)), `bytes=${size}`);
  fs.rmSync(t1, { recursive: true, force: true }); fs.rmSync(t2, { recursive: true, force: true });
  const E = oracle(null);
  L.rec('SAMPLE-03 oraculo (sqlite3 do Python): contagens 40/6/30/200/500, foreign_key_check vazio, NULLs intencionais, 4 status, datas so em 2025, cliente sem pedido e produto nunca vendido',
    JSON.stringify(E.counts) === JSON.stringify({ clientes: 40, categorias: 6, produtos: 30, pedidos: 200, itens_pedido: 500 }) && E.fk_check.length === 0 && E.nulls.clientes_sem_cidade > 0 && E.nulls.pedidos_sem_entrega > 0 && E.status.join() === 'cancelado,entregue,enviado,pago' && E.datas_fora_de_2025 === 0 && E.clientes_sem_pedidos.length >= 1 && E.produtos_nunca_vendidos.length >= 1 && E.fks.itens_pedido.length === 2 && E.fks.pedidos.length === 1 && E.fks.produtos.length === 1,
    JSON.stringify({ c: E.counts, n: E.nulls, s: E.status, semped: E.clientes_sem_pedidos, nuncav: E.produtos_nunca_vendidos, fks: E.fks }));

  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();
  let QUERIES = null;   // {id: sql}, extraido da pagina

  // ===== B. Matriz raiz/subpasta x PT/EN: carregar, esquema, contagens, FKs, consultas =====
  for (const [base, label] of [[L.BASE, 'raiz /hub/'], [L.SUB, 'subpasta /portfolio/hub/']]) for (const lang of ['pt', 'en']) {
    const { c, pg, log, dialogs } = await open(br, base, lang, 'light'); const tag = `(${label}, ${lang})`;
    let g = await grab(pg);
    L.rec(`SAMPLE-10 ${tag} botao do banco de exemplo habilitado e rotulado no idioma`, (await pg.isEnabled('#sqlSampleBtn')) && (await pg.textContent('#sqlSampleBtn')) === (lang === 'pt' ? 'Carregar o banco selecionado' : 'Load the selected database') && g.schema.length === 0, `rotulo="${await pg.textContent('#sqlSampleBtn')}"`);
    const nBtn = await pg.locator('#sqlSampleQ button').count();
    await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state === 'loading' || /(loaded|carregado)/.test(document.getElementById('sqlStatus').textContent), null, { timeout: 5000 }).catch(() => {}); await ready(pg);
    g = await grab(pg);
    const names = g.schema.map(t => t.cap.split(' ')[0]).sort().join();
    L.rec(`SAMPLE-11 ${tag} 5 tabelas listadas em "Suas tabelas" com colunas e legenda do banco de exemplo`, names === [...TABLES].sort().join() && g.schema.every(t => new RegExp(lang === 'pt' ? 'banco de exemplo$' : 'sample database$').test(t.cap)) && !g.errVisible && /5 (tabelas|tables), 776 (linhas|rows)/.test(g.status), `tabelas=${names} status="${g.status}" cap0="${g.schema[0] && g.schema[0].cap}"`);
    const colsOk = TABLES.every(t => { const sc = g.schema.find(x => x.cap.startsWith(t + ' ')); return sc && JSON.stringify(sc.rows.map(r => [r[1], r[2]])) === JSON.stringify(E.columns[t].map(x => [x[0], x[1]])); });
    const itens = g.schema.find(x => x.cap.startsWith('itens_pedido ')); const keys = itens.rows.map(r => r[3]);
    L.rec(`SAMPLE-12 ${tag} colunas/tipos iguais ao PRAGMA table_info do Python; coluna Chave mostra PK e FK -> tabela.coluna`, colsOk && itens.head[3] === (lang === 'pt' ? 'Chave' : 'Key') && keys[0] === 'PK' && keys[1] === 'FK → pedidos.id' && keys[2] === 'FK → produtos.id' && keys[3] === '', `chaves=${JSON.stringify(keys)} cabecalho=${JSON.stringify(itens.head)}`);
    const cn = await counts(pg);
    L.rec(`SAMPLE-13 ${tag} contagens por tabela = oraculo Python (40/6/30/200/500)`, JSON.stringify(cn) === JSON.stringify(E.counts), JSON.stringify(cn));
    await run(pg, 'PRAGMA foreign_key_check'); g = await grab(pg);
    await run(pg, 'PRAGMA foreign_key_list(itens_pedido)'); const fl = await grab(pg);
    L.rec(`SAMPLE-14 ${tag} integridade referencial: PRAGMA foreign_key_check sem linhas; FKs declaradas em itens_pedido (2)`, !g.tableVisible && /(returned no rows|não retornou linhas)/.test(g.msg) && fl.body.length === 2, `fk_check msg="${g.msg}" fk_list=${JSON.stringify(fl.body.map(r => r.slice(2, 5)))}`);
    // consultas de exemplo
    const items = await pg.evaluate(() => [...document.querySelectorAll('#sqlSampleQ li')].map(li => ({ id: li.firstChild.getAttribute('data-q'), t: li.firstChild.textContent, d: li.lastChild.textContent })));
    L.rec(`SAMPLE-20 ${tag} >= 8 consultas de exemplo (12), cada uma com titulo e descricao nao vazios no idioma`, nBtn >= 8 && items.length === nBtn && items.every(i => i.t.length > 3 && i.d.length > 10), `n=${nBtn} primeiro="${items[0].t}" / "${items[0].d}"`);
    await pg.fill('#sqlEditor', 'SELECT 1'); await run(pg, 'SELECT 2'); const before = await grab(pg);
    await pg.click('#sqlSampleQ button[data-q="join"]'); g = await grab(pg);
    const focId = await pg.evaluate(() => document.activeElement.id);
    L.rec(`SAMPLE-21 ${tag} clicar numa consulta so COLOCA o SQL no editor: nao executa (resultado anterior intacto, estado ready, foco no editor, status informa o titulo)`, /INNER JOIN/.test(g.text) && g.state === 'ready' && JSON.stringify(g.body) === JSON.stringify(before.body) && g.cap === before.cap && focId === 'sqlEditor' && g.status.includes(items.find(i => i.id === 'join').t), `editor="${g.text.slice(0, 40)}..." status="${g.status}" foco=${focId}`);
    if (lang === 'en' && base === L.BASE) {
      QUERIES = {}; const res = {};
      for (const it of items) { await pg.click(`#sqlSampleQ button[data-q="${it.id}"]`); QUERIES[it.id] = (await grab(pg)).text; await pg.click('#sqlRun'); await ready(pg); const r = await grab(pg); res[it.id] = r; }
      const X = oracle(QUERIES); const lines = []; let allOk = true, allRows = true, allKey = true, noEmpty = true;
      for (const it of items) { const r = res[it.id], e = X.queries[it.id]; const okRows = !r.errVisible && (e.n === 0 ? !r.tableVisible : r.body.length === e.n && new RegExp('^' + e.n.toLocaleString('en-US').replace(',', ',') + ' rows?').test(r.cap)); const kg = keySum(r.body), ke = keySum(e.rows); const okKey = Math.abs(kg - ke) < 0.01; const okAll = cmp(r.body, e.rows);
        allRows = allRows && okRows; allKey = allKey && okKey; allOk = allOk && okAll; noEmpty = noEmpty && e.n > 0; lines.push(`${it.id}: linhas hub=${r.body.length} py=${e.n} soma-chave hub=${kg} py=${ke} celulas iguais=${okAll}`); }
      L.rec('SAMPLE-22 cada consulta de exemplo executa sem erro; numero de linhas (e a legenda) = sqlite3 do Python', allRows && items.length === 12, lines.join('\n'));
      L.rec('SAMPLE-23 cada consulta: agregacao-chave (soma das celulas numericas) e todas as celulas = sqlite3 do Python; nenhuma consulta com resultado vazio', allKey && allOk && noEmpty, lines.join('\n'));
      const ids = r => r.body.map(x => x[0]).join(); const semped = res.semped, nuncav = res.nuncav;
      L.rec('SAMPLE-24 LEFT JOIN encontra os clientes sem pedidos e os produtos nunca vendidos (ids do oraculo)', ids(semped) === E.clientes_sem_pedidos.join() && semped.body.length >= 1 && ids(nuncav) === E.produtos_nunca_vendidos.join() && ids(nuncav) === '29,30', `clientes sem pedido=${ids(semped)} produtos nunca vendidos=${ids(nuncav)}`);
      const j4 = res.join4; L.rec('SAMPLE-25 consultas tem resultado esperado conhecido (join4 = itens do pedido 1; mes = 12 linhas; semana = 7 linhas; grupo = 6 categorias)', j4.body.every(r => r[0] === '1') && X.queries.join4.n === j4.body.length && res.mes.body.length === 12 && res.semana.body.length === 7 && res.grupo.body.length === 6, `join4=${j4.body.length} mes=${res.mes.body.length} semana=${res.semana.body.length} grupo=${res.grupo.body.length}`);
    }
    L.rec(`SAMPLE-90 ${tag} sem pageerror, sem dialogo, sem erro de console`, log.pageerrors.length === 0 && dialogs.n === 0 && log.consoleErrors.length === 0, JSON.stringify({ pe: log.pageerrors, ce: log.consoleErrors }));
    await c.close();
  }

  // ===== C. SQL das consultas igual em PT e EN; titulos traduzidos =====
  { const sqls = {}, titles = {};
    for (const lang of ['pt', 'en']) { const { c, pg } = await open(br, L.BASE, lang, 'light'); sqls[lang] = {}; titles[lang] = {};
      for (const id of Object.keys(QUERIES)) { await pg.click(`#sqlSampleQ button[data-q="${id}"]`); sqls[lang][id] = await pg.inputValue('#sqlEditor'); titles[lang][id] = await pg.textContent(`#sqlSampleQ button[data-q="${id}"]`); } await c.close(); }
    L.rec('SAMPLE-30 texto SQL de cada consulta identico em PT e EN; titulos diferentes entre os idiomas', Object.keys(QUERIES).every(id => sqls.pt[id] === sqls.en[id] && sqls.en[id] === QUERIES[id] && titles.pt[id] !== titles.en[id]), `ex.: "${titles.pt.semped}" / "${titles.en.semped}"`); }

  // ===== D. Substituir, coexistir com CSV, Parar/tempo limite, Reiniciar, falha =====
  { const { c, pg, log } = await open(br, L.BASE, 'en', 'light');
    await loadSample(pg); let g = await grab(pg);
    L.rec('SAMPLE-40 primeira carga sem aviso de substituicao', !/replaced/.test(g.warn) && g.schema.length === 5, `aviso="${g.warn}"`);
    await run(pg, 'DELETE FROM itens_pedido; DELETE FROM pedidos; INSERT INTO categorias (nome) VALUES (\'extra\')');
    await loadSample(pg); g = await grab(pg); const cn = await counts(pg);
    L.rec('SAMPLE-41 carregar de novo substitui (aviso, 5 tabelas, sem duplicar, alteracoes do usuario descartadas, contagens do oraculo)', /replaced/.test(g.warn) && g.schema.length === 5 && JSON.stringify(cn) === JSON.stringify(E.counts), `aviso="${g.warn}" tabelas=${g.schema.length} contagens=${JSON.stringify(cn)}`);
    // tabela criada por SQL e banco de exemplo coexistem (D11: nao ha mais CSV de usuario)
    await run(pg, 'CREATE TABLE so_sql(a); INSERT INTO so_sql VALUES (1)');
    g = await grab(pg);
    L.rec('SAMPLE-42 tabela criada por SQL e banco de exemplo coexistem (5 + so_sql)', g.schema.length === 6, g.schema.map(t => t.cap.split(' ')[0]).join());
    // Parar (SQL-32 path)
    const slow = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x < 1000000000) SELECT count(*) FROM c';
    const reqs0 = log.requests.filter(u => /loja-exemplo/.test(u)).length;
    await pg.fill('#sqlEditor', slow); await pg.click('#sqlRun'); await pg.waitForSelector('#sqlStop:not([hidden])', { timeout: 8000 }); await pg.click('#sqlStop'); await ready(pg);
    await pg.waitForFunction(() => /(recreated|Reloaded)/.test(document.getElementById('sqlStatus').textContent) || !document.getElementById('sqlErr').hidden, null, { timeout: 30000 });
    g = await grab(pg); const cn2 = await counts(pg);
    await run(pg, 'SELECT * FROM so_sql'); const lost = await grab(pg);
    await run(pg, 'SELECT * FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL'); const lj = await grab(pg);
    L.rec('SAMPLE-50 apos Parar: banco de exemplo recarregado automaticamente (5 tabelas, contagens do oraculo, LEFT JOIN funciona), tabela criada por SQL perdida, sem novo fetch',
      g.schema.filter(t => /sample database$/.test(t.cap)).length === 5 && JSON.stringify(cn2) === JSON.stringify(E.counts) && lost.errVisible && /no such table/.test(lost.errM) && lj.body.length === E.clientes_sem_pedidos.length && log.requests.filter(u => /loja-exemplo/.test(u)).length === reqs0 && log.pageerrors.length === 0,
      `tabelas=${JSON.stringify(g.schema.map(t => t.cap.split(' ')[0]))} contagens=${JSON.stringify(cn2)} so_sql="${lost.errM}" leftjoin=${lj.body.length} fetches=${reqs0}->${log.requests.filter(u => /loja-exemplo/.test(u)).length}`);
    // tempo limite
    await pg.selectOption('#sqlTimeout', '5'); await pg.fill('#sqlEditor', slow); await pg.click('#sqlRun');
    await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state !== 'running', null, { timeout: 20000 }); await ready(pg);
    const cn3 = await counts(pg);
    L.rec('SAMPLE-51 apos o tempo limite: banco de exemplo recarregado e consultavel', JSON.stringify(cn3) === JSON.stringify(E.counts), JSON.stringify(cn3));
    await pg.click('#sqlReset'); await ready(pg); g = await grab(pg);
    L.rec('SAMPLE-60 Reiniciar banco remove tudo, inclusive o exemplo', g.schema.length === 0, `tabelas=${g.schema.length} status="${g.status}"`);
    await pg.fill('#sqlEditor', slow); await pg.click('#sqlRun'); await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state !== 'running', null, { timeout: 20000 }); await ready(pg); g = await grab(pg);
    L.rec('SAMPLE-61 depois de Reiniciar, um novo reinicio do motor NAO traz o exemplo de volta', g.schema.length === 0, `tabelas=${g.schema.length}`);
    await c.close(); }
  { // falha ao buscar o arquivo: erro claro, banco intacto, motor utilizavel
    const { c, pg, log } = await open(br, L.BASE, 'pt', 'light'); await run(pg, 'CREATE TABLE t(a)');
    await pg.route('**/loja-exemplo.sql', r => r.fulfill({ status: 404, body: 'nope' }));
    await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => !document.getElementById('sqlErr').hidden, null, { timeout: 15000 }); await ready(pg); let g = await grab(pg);
    await pg.unroute('**/loja-exemplo.sql'); await run(pg, 'SELECT 1+1'); const g2 = await grab(pg);
    L.rec('SAMPLE-70 arquivo indisponivel (404): mensagem clara em PT, banco nao alterado, motor segue utilizavel, sem pageerror', g.errVisible && /Não foi possível carregar o banco de exemplo/.test(g.errT) && /HTTP 404/.test(g.errM) && g.schema.length === 1 && g2.body[0][0] === '2' && log.pageerrors.length === 0, `t="${g.errT}" m="${g.errM}" tabelas=${g.schema.length}`);
    await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => /carregado/.test(document.getElementById('sqlStatus').textContent), null, { timeout: 15000 }); await ready(pg); g = await grab(pg);
    L.rec('SAMPLE-71 nova tentativa com o arquivo de volta funciona (sem cache da falha)', g.schema.length === 6 && !g.errVisible, `tabelas=${g.schema.length}`);
    await c.close(); }

  // ===== E. Troca de idioma com o exemplo carregado =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg); await pg.click('#sqlSampleQ button[data-q="grupo"]');
    const en = await grab(pg); const enQ = await pg.textContent('#sqlSampleQ button[data-q="grupo"]'); await pg.click('[data-lang="pt"]'); const pt = await grab(pg); const ptQ = await pg.textContent('#sqlSampleQ button[data-q="grupo"]');
    L.rec('SAMPLE-80 troca EN->PT com o exemplo carregado: legendas, chave e consultas traduzidas; SQL do editor e dados mantidos', /sample database$/.test(en.schema[0].cap) && /banco de exemplo$/.test(pt.schema[0].cap) && enQ !== ptQ && pt.text === en.text && pt.schema.length === 5 && pt.schema[0].head[3] === 'Chave', `en="${enQ}" pt="${ptQ}" cap=${pt.schema[0].cap}`); await c.close(); }

  // ===== F. Privacidade: so a propria origem; exatamente 1 busca do .sql =====
  { const { c, pg, log } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg); await pg.click('#sqlSampleBtn').catch(() => {}); await ready(pg);
    await run(pg, 'SELECT COUNT(*) FROM clientes');
    const ext = log.requests.filter(u => !u.startsWith(L.BASE) && !u.startsWith('data:') && !u.startsWith('blob:')); const sq = log.requests.filter(u => /loja-exemplo\.sql/.test(u));
    L.rec('SAMPLE-91 privacidade: zero requisicao a outra origem; o .sql e buscado da mesma origem por caminho relativo (/hub/assets/data/)', ext.length === 0 && sq.length >= 1 && sq.every(u => u === `${L.BASE}/hub/assets/data/loja-exemplo.sql`), `externas=${JSON.stringify(ext)} buscas=${JSON.stringify(sq)} total=${log.requests.length}`);
    const html = fs.readFileSync(path.join(L.REPO, PAGE, 'index.html'), 'utf8'), js = fs.readFileSync(path.join(L.REPO, 'hub/assets/js/sql.js'), 'utf8');
    L.rec('SAMPLE-92 sem innerHTML/insertAdjacentHTML/outerHTML/document.write no sql.js; CSP da pagina com connect-src \'self\' e sem origem externa', !/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(js) && /connect-src 'self';/.test(html) && !/connect-src[^;"]*https?:/.test(html), 'verificado por regex no fonte');
    await c.close(); }

  // ===== G. 360px e axe =====
  for (const theme of ['light', 'dark']) for (const lang of ['en', 'pt']) {
    const { c, pg } = await open(br, L.BASE, lang, theme, 360);
    const m = () => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const res = [['inicial', await m()]];
    await loadSample(pg); res.push(['exemplo carregado', await m()]);
    await pg.click('#sqlSampleQ button[data-q="join4"]'); res.push(['consulta no editor', await m()]); await pg.click('#sqlRun'); await ready(pg); res.push(['resultado largo', await m()]);
    await pg.click('#sqlSampleQ button[data-q="grupo"]'); await pg.click('#sqlRun'); await ready(pg); res.push(['grupo', await m()]);
    L.rec(`SAMPLE-100 360px (${lang}/${theme}): sem rolagem horizontal da pagina nos estados do exemplo`, res.every(([, x]) => x.sw <= x.cw), JSON.stringify(res));
    if (AXE) { const out = [];
      const states = [['inicial', async () => { await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); }], ['exemplo carregado + consulta + resultado', async () => { await loadSample(pg); await pg.click('#sqlSampleQ button[data-q="mes"]'); await pg.click('#sqlRun'); await ready(pg); }], ['exemplo recarregado ja carregado (aviso)', async () => { await loadSample(pg); }], ['arquivo ausente (erro)', async () => { await pg.route('**/loja-exemplo.sql', r => r.fulfill({ status: 500, body: 'x' })); await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => !document.getElementById('sqlErr').hidden); }]];
      for (const [st, fn] of states) { await fn(); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE);
        const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })));
        out.push(`${st}: ${r.length ? JSON.stringify(r) : 'sem violacoes'}`); }
      L.rec(`SAMPLE-101 axe (${lang}/${theme}/360) inicial, exemplo+resultado, aviso, erro: zero violacoes`, out.every(s => /sem violacoes/.test(s)), out.join('\n')); }
    await c.close(); }
  { const { c, pg } = await open(br, L.BASE, 'pt', 'dark', 1280);
    await loadSample(pg); await pg.click('#sqlSampleQ button[data-q="sub"]'); await pg.click('#sqlRun'); await ready(pg);
    if (AXE) { await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE); const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => v.id + ' ' + v.impact)); L.rec('SAMPLE-102 axe (pt/dark/1280) exemplo carregado com resultado: zero violacoes', r.length === 0, JSON.stringify(r)); }
    // so teclado: Tab chega ao botao do exemplo, Enter carrega; Tab chega a uma consulta, Enter coloca no editor
    await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); await pg.focus('#sqlSampleBtn'); await pg.keyboard.press('Enter'); await pg.waitForFunction(() => /carregado/.test(document.getElementById('sqlStatus').textContent), null, { timeout: 15000 }); await ready(pg);
    await pg.focus('#sqlSampleQ button[data-q="filtro"]'); await pg.keyboard.press('Enter'); const g = await grab(pg);
    L.rec('SAMPLE-103 so teclado: Enter no botao carrega o exemplo; Enter numa consulta coloca o SQL no editor', g.schema.length === 5 && /WHERE preco > 100/.test(g.text), `tabelas=${g.schema.length} editor="${g.text.slice(0, 30)}"`);
    await c.close(); }

  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
