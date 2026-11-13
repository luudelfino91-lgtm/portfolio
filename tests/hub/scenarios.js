// Cenarios no SQL playground (D11): seletor, integridade dos 5 cenarios na UI com o sql.js REAL e oraculo sqlite3 do Python,
// >= 3 consultas por cenario, substituicao entre cenarios, recarga apos Parar, exercicios so em Vendas, ausencia de upload.
// O oraculo (contagens, colunas, tipos, PK/FK, resultado das consultas-chave) vem de tests/hub/oracle.js (sqlite3 do Python sobre os mesmos .sql).
const L = require('./lib'); const fs = require('fs'); const path = require('path'); const O = require('./oracle');
const PAGE = 'hub/ferramentas/sql/'; const T0 = 60000;
const ORA = O.data(), Q = O.queries();
const nf = (n, lang) => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(n);
const NAME = { en: { 'loja-exemplo': 'Sales', 'marketing-digital': 'Digital marketing', logistica: 'Logistics', rh: 'HR', atendimento: 'Customer service' }, pt: { 'loja-exemplo': 'Vendas', 'marketing-digital': 'Marketing digital', logistica: 'Logística', rh: 'RH', atendimento: 'Atendimento' } };
// exemplos por cenario: (id no seletor) -> chave do oraculo
const EX = { 'marketing-digital': { mkt_ctr: 'ctr_por_canal', mkt_roas: 'roas_por_canal_mes', mkt_leads: 'leads_sem_conversao' }, logistica: { log_sla: 'sla_por_transportadora', log_custo: 'custo_por_km_transportadora', log_atraso: 'atraso_por_centro' },
  rh: { rh_headcount: 'headcount_turnover_por_departamento', rh_salario: 'media_salarial_atual_por_cargo', rh_subordinados: 'subordinados_diretos_por_gestor' }, atendimento: { at_tma: 'tma_por_agente', at_backlog: 'backlog_por_prioridade', at_csat: 'csat_por_agente' } };
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
if (!AXE) L.rec('A11-02 (cenarios SQL) axe-core presente em ' + L.AXE_PATH, false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');

const ready = (pg, ms = T0) => pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state === 'ready', null, { timeout: ms });
async function open(br, base, lang, theme, vp = 1280) {
  const c = await L.ctx(br, { lang, theme, vp }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  const dialogs = { n: 0 }; pg.on('dialog', d => { dialogs.n++; d.dismiss(); });
  await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
  return { c, pg, log, dialogs };
}
async function loadSc(pg, slug) {
  await pg.check(`#sqlPicker input[value="${slug}"]`); await pg.click('#sqlSampleBtn');
  await pg.waitForFunction(() => /^(Sample database loaded|Banco de exemplo carregado)/.test(document.getElementById('sqlStatus').textContent) || !document.getElementById('sqlErr').hidden, null, { timeout: T0 });
  await ready(pg);
}
async function run(pg, sql) { if (sql !== null) await pg.fill('#sqlEditor', sql); await pg.click('#sqlRun'); await ready(pg); }
const grab = pg => pg.evaluate(() => {
  const g = id => document.getElementById(id);
  return { errVisible: !g('sqlErr').hidden, errT: g('sqlErrT').textContent, errM: g('sqlErrM').textContent, warn: g('sqlWarn').hidden ? '' : g('sqlWarn').textContent, status: g('sqlStatus').textContent, text: g('sqlEditor').value,
    cap: g('sqlResCap').textContent, header: [...document.querySelectorAll('#sqlResTable thead th')].map(e => e.textContent), body: [...document.querySelectorAll('#sqlResTable tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)),
    msg: g('sqlResMsg').hidden ? '' : g('sqlResMsg').textContent, tableVisible: !g('sqlResBox').hidden,
    schema: [...document.querySelectorAll('#sqlSchema table')].map(t => ({ cap: t.caption.textContent, head: [...t.tHead.rows[0].cells].map(c => c.textContent), rows: [...t.tBodies[0].rows].map(r => [...r.cells].map(c => c.textContent)) })),
    radios: [...document.querySelectorAll('#sqlPicker input[type=radio]')].map(r => ({ v: r.value, on: r.checked, name: r.closest('label').querySelector('.sc-name').textContent })),
    qs: [...document.querySelectorAll('#sqlSampleQ li')].map(li => ({ id: li.firstChild.getAttribute('data-q'), t: li.firstChild.textContent, d: li.lastChild.textContent })), bodyText: document.body.innerText };
});
const tname = t => t.cap.split(' ')[0];
const cmpRows = (ui, exp) => ui.length === exp.length && ui.every((r, i) => O.sameRow(r, exp[i]));

(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();

  // ===== SCN-01/02: os 5 cenarios na UI (raiz PT/EN, subpasta EN) =====
  for (const [base, label, lang] of [[L.BASE, 'raiz /hub/', 'en'], [L.BASE, 'raiz /hub/', 'pt'], [L.SUB, 'subpasta /portfolio/hub/', 'en']]) {
    const { c, pg, log, dialogs } = await open(br, base, lang, 'light'); const tag = `(${label}, ${lang})`;
    const g0 = await grab(pg);
    L.rec(`SCN-03 ${tag} seletor: 5 cenarios com nome no idioma, Vendas/Sales marcado, banco NAO carregado ainda (nenhuma tabela), editor com consulta inicial`, g0.radios.map(r => r.name).join('|') === Object.values(NAME[lang]).join('|') && g0.radios[0].on && g0.schema.length === 0, JSON.stringify({ r: g0.radios, n: g0.schema.length }));
    const badSchema = [], badCount = [], badTbl = [], badEx = [], lines = [];
    for (const slug of O.SLUGS) {
      await loadSc(pg, slug); let g = await grab(pg); const exp = ORA[slug].tables;
      // esquema: tabelas, colunas, tipos, PK/FK = PRAGMA do sqlite3
      const okSchema = g.schema.map(tname).sort().join() === exp.map(t => t.name).sort().join() && exp.every(t => { const s = g.schema.find(x => tname(x) === t.name); return s && JSON.stringify(s.rows.map(r => [r[1], r[2], r[3]])) === JSON.stringify(t.columns.map(c => [c.name, c.type, [c.pk ? 'PK' : '', c.fk ? 'FK → ' + c.fk : ''].filter(Boolean).join(', ')])); });
      if (!okSchema) badSchema.push(slug);
      const total = exp.reduce((a, t) => a + t.count, 0);
      if (!new RegExp(`\\(${NAME[lang][slug]}\\): ${exp.length} (tabelas|tables), ${nf(total, lang).replace('.', '\\.')} (linhas|rows)`).test(g.status)) badSchema.push(slug + ' status=' + g.status);
      // contagem por tabela (UNION ALL) = oraculo
      await run(pg, exp.map(t => `SELECT '${t.name}' AS t, COUNT(*) AS n FROM ${t.name}`).join(' UNION ALL ')); g = await grab(pg);
      if (JSON.stringify(Object.fromEntries(g.body.map(r => [r[0], +r[1]]))) !== JSON.stringify(Object.fromEntries(exp.map(t => [t.name, t.count])))) badCount.push(slug);
      // contagem de linhas VISIVEL (legenda do resultado) de cada tabela = oraculo
      for (const t of exp) { await run(pg, `SELECT * FROM ${t.name}`); const r = await grab(pg); const noun = t.count === 1 ? (lang === 'pt' ? '1 linha' : '1 row') : `${nf(t.count, lang)} ${lang === 'pt' ? 'linhas' : 'rows'}`; if (!r.cap.startsWith(noun + ' ·') || r.body.length !== t.count || !cmpRows(r.body.slice(0, 5), t.rows.slice(0, 5))) badTbl.push(`${slug}.${t.name}: "${r.cap}" linhas=${r.body.length}`); }
      // integridade referencial dentro do navegador
      await run(pg, 'PRAGMA foreign_key_check'); g = await grab(pg); if (g.tableVisible || !/(returned no rows|não retornou linhas)/.test(g.msg)) badSchema.push(slug + ' foreign_key_check');
      // >= 3 consultas: o exemplo do cenario (SQL = oraculo) executa e o resultado confere celula a celula
      const exQ = EX[slug];
      if (exQ) {
        await pg.fill('#sqlEditor', 'SELECT 1');
        const ids = (await grab(pg)).qs.map(q => q.id);
        for (const [id, key] of Object.entries(exQ)) {
          if (!ids.includes(id)) { badEx.push(`${slug}: sem botao ${id}`); continue; }
          await pg.click(`#sqlSampleQ button[data-q="${id}"]`); const e1 = await grab(pg); await pg.click('#sqlRun'); await ready(pg); const r = await grab(pg); const o = Q[slug][key];
          const okSql = e1.text === o.sql, okRows = !r.errVisible && r.body.length === o.n && r.cap.startsWith(`${nf(o.n, lang)} ${o.n === 1 ? (lang === 'pt' ? 'linha' : 'row') : (lang === 'pt' ? 'linhas' : 'rows')} ·`), okCells = cmpRows(r.body, o.rows), okCols = JSON.stringify(r.header) === JSON.stringify(o.columns);
          lines.push(`${slug}/${id}: n=${r.body.length}/${o.n} sql=${okSql} cel=${okCells}`);
          if (!(okSql && okRows && okCells && okCols && o.n > 0 && o.match)) badEx.push(`${slug}/${id}: sql=${okSql} rows=${okRows} cells=${okCells} cols=${okCols} cap="${r.cap}" err="${r.errM}"`);
        }
      } else {  // Vendas: as 3 consultas-chave do oraculo digitadas no editor (os 12 exemplos de Vendas estao em sample.js)
        for (const [key, o] of Object.entries(Q[slug])) { await run(pg, o.sql); const r = await grab(pg); const ok = !r.errVisible && r.body.length === o.n && cmpRows(r.body, o.rows) && JSON.stringify(r.header) === JSON.stringify(o.columns) && o.n > 0; lines.push(`${slug}/${key}: n=${r.body.length}/${o.n} cel=${cmpRows(r.body, o.rows)}`); if (!ok) badEx.push(`${slug}/${key}`); }
      }
    }
    L.rec(`SCN-01 ${tag} 5 cenarios carregados no sql.js real: tabelas, colunas, tipos e PK/FK = PRAGMA do sqlite3; status com nome, tabelas e linhas; PRAGMA foreign_key_check vazio`, badSchema.length === 0, JSON.stringify(badSchema));
    L.rec(`SCN-01 ${tag} contagem por tabela (UNION ALL) e contagem de linhas visivel na legenda de SELECT * de cada uma das 27 tabelas = oraculo; primeiras linhas iguais`, badCount.length === 0 && badTbl.length === 0, JSON.stringify({ badCount, badTbl: badTbl.slice(0, 5) }));
    L.rec(`SCN-02 ${tag} >= 3 consultas por cenario (15) executadas no sql.js real = oraculo (linhas, colunas e todas as celulas); os exemplos dos 4 cenarios novos tem EXATAMENTE o SQL do oraculo`, badEx.length === 0 && lines.length === 15, lines.join('\n') + (badEx.length ? '\nFALHAS: ' + badEx.join(' | ') : ''));
    L.rec(`SCN-90 ${tag} sem pageerror, dialogo ou console.error; so a propria origem; so os .sql dos cenarios sao buscados (1 busca por cenario)`, log.pageerrors.length === 0 && dialogs.n === 0 && log.consoleErrors.length === 0 && log.requests.every(u => u.startsWith(new URL(base).origin) || u.startsWith('data:') || u.startsWith('blob:')) && O.SLUGS.every(s => log.requests.filter(u => u.endsWith('/hub/assets/data/' + s + '.sql')).length === 1) && !log.requests.some(u => /\/data\/csv\//.test(u)), `pageerrors=${JSON.stringify(log.pageerrors)} console=${JSON.stringify(log.consoleErrors)} buscas .sql=${JSON.stringify(O.SLUGS.map(s => log.requests.filter(u => u.endsWith('/' + s + '.sql')).length))}`);
    await c.close();
  }

  // ===== SCN-03: seletor, consultas por cenario, ER, substituicao =====
  for (const lang of ['en', 'pt']) {
    const { c, pg } = await open(br, L.BASE, lang, 'light');
    const sem = await pg.evaluate(() => { const fs = document.querySelector('#sqlPicker fieldset'); const rs = [...document.querySelectorAll('#sqlPicker input[type=radio]')]; return { fieldset: !!fs, legend: fs && fs.querySelector('legend').textContent, n: rs.length, sameName: new Set(rs.map(r => r.name)).size === 1, descs: [...document.querySelectorAll('#sqlPicker .sc-desc')].map(d => d.textContent.length) }; });
    L.rec(`SCN-03 (${lang}) seletor acessivel: <fieldset>/<legend>, 5 radios nativos de um grupo, descricao curta de cada cenario`, sem.fieldset && sem.legend === (lang === 'pt' ? 'Escolha um cenário' : 'Choose a scenario') && sem.n === 5 && sem.sameName && sem.descs.every(n => n > 25 && n < 140), JSON.stringify(sem));
    // consultas seguem o cenario selecionado (sem carregar)
    const counts = {}, titles = {};
    for (const slug of O.SLUGS) { await pg.check(`#sqlPicker input[value="${slug}"]`); const g = await grab(pg); counts[slug] = g.qs.length; titles[slug] = g.qs.map(q => q.t); if (g.schema.length) counts[slug] = -1; }
    L.rec(`SCN-03 (${lang}) escolher o cenario troca a lista de consultas de exemplo SEM carregar o banco (Vendas 12, demais 3; titulos e descricoes nao vazios)`, JSON.stringify(counts) === JSON.stringify({ 'loja-exemplo': 12, 'marketing-digital': 3, logistica: 3, rh: 3, atendimento: 3 }) && Object.values(titles).flat().every(t => t.length > 8), JSON.stringify(counts));
    await pg.click('#sqlPicker .sc-er summary'); await pg.check('#sqlPicker input[value="logistica"]');
    const er = await pg.textContent('#sqlPicker .sc-er-pre');
    L.rec(`SCN-03 (${lang}) diagrama ER em texto do README acompanha o cenario escolhido`, /entregas\(id PK, rota_id FK -> rotas\.id, veiculo_id FK -> veiculos\.id/.test(er) && /centros_distribuicao 1 ──< rotas/.test(er), er.split('\n')[0]);
    await c.close();
  }
  { const { c, pg, log } = await open(br, L.BASE, 'en', 'light');
    // titulos PT != EN e SQL igual
    const sql = {}, tit = {};
    for (const lang of ['en', 'pt']) { await pg.evaluate(l => Hub.setLang(l), lang); sql[lang] = {}; tit[lang] = {}; for (const slug of Object.keys(EX)) { await pg.check(`#sqlPicker input[value="${slug}"]`); for (const id of Object.keys(EX[slug])) { await pg.click(`#sqlSampleQ button[data-q="${id}"]`); sql[lang][id] = await pg.inputValue('#sqlEditor'); tit[lang][id] = await pg.textContent(`#sqlSampleQ button[data-q="${id}"]`); } } }
    L.rec('SCN-03 SQL das 12 consultas novas identico em PT e EN; titulos traduzidos (diferentes entre idiomas)', Object.keys(sql.en).length === 12 && Object.keys(sql.en).every(id => sql.en[id] === sql.pt[id] && tit.en[id] !== tit.pt[id]), `ex.: "${tit.en.at_tma}" / "${tit.pt.at_tma}"`);
    await pg.evaluate(() => Hub.setLang('en'));
    // substituicao entre cenarios: clientes de Vendas (40) -> Atendimento (120); tabela do usuario e mantida
    await loadSc(pg, 'loja-exemplo'); await run(pg, 'CREATE TABLE minha_tabela(a); INSERT INTO minha_tabela VALUES (1)'); await run(pg, 'SELECT COUNT(*) FROM clientes'); const c1 = (await grab(pg)).body[0][0];
    await loadSc(pg, 'atendimento'); let g = await grab(pg); await run(pg, 'SELECT COUNT(*) FROM clientes'); const c2 = (await grab(pg)).body[0][0];
    await run(pg, 'SELECT COUNT(*) FROM produtos'); const gone = await grab(pg);
    await run(pg, 'SELECT COUNT(*) FROM minha_tabela'); const mine = await grab(pg);
    const tabs = (await grab(pg)).schema.map(tname).sort().join();
    L.rec('SCN-04 carregar outro cenario SUBSTITUI as tabelas do anterior (clientes 40 -> 120; produtos de Vendas some), avisa, e mantem a tabela criada pelo usuario com outro nome', c1 === '40' && c2 === '120' && gone.errVisible && /no such table/.test(gone.errM) && mine.body[0][0] === '1' && tabs === 'agentes,clientes,interacoes,minha_tabela,pesquisas_satisfacao,tickets', `clientes ${c1} -> ${c2}; produtos: "${gone.errM}"; minha_tabela=${JSON.stringify(mine.body)} tabelas=${tabs}`);
    L.rec('SCN-04 o aviso de substituicao aparece ao trocar de cenario', /replaced/.test(g.warn), `aviso="${g.warn}"`);
    // Parar: o cenario ATUAL (atendimento) e recarregado sem novo fetch; tabela do usuario perdida
    const fetches0 = log.requests.filter(u => /atendimento\.sql/.test(u)).length;
    const slow = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x < 1000000000) SELECT count(*) FROM c';
    await pg.fill('#sqlEditor', slow); await pg.click('#sqlRun'); await pg.waitForSelector('#sqlStop:not([hidden])', { timeout: 8000 }); await pg.click('#sqlStop'); await ready(pg);
    await pg.waitForFunction(() => /recreated/.test(document.getElementById('sqlStatus').textContent) || !document.getElementById('sqlErr').hidden, null, { timeout: 30000 });
    g = await grab(pg); await run(pg, 'SELECT COUNT(*) FROM tickets'); const tk = (await grab(pg)).body[0][0]; await run(pg, 'SELECT COUNT(*) FROM minha_tabela'); const lost = await grab(pg);
    L.rec('SCN-05 apos Parar: o cenario carregado (Atendimento, nao o primeiro) e recarregado sozinho, sem novo fetch (tickets = 320); tabela criada por SQL perdida', g.schema.filter(t => /sample database$/.test(t.cap)).length === 5 && tk === '320' && lost.errVisible && log.requests.filter(u => /atendimento\.sql/.test(u)).length === fetches0, `tabelas=${JSON.stringify(g.schema.map(tname))} tickets=${tk} fetches=${fetches0}->${log.requests.filter(u => /atendimento\.sql/.test(u)).length} status="${g.status}"`);
    await pg.click('#sqlReset'); await ready(pg); g = await grab(pg);
    L.rec('SCN-05 Reiniciar banco remove o cenario; um novo reinicio do motor nao o traz de volta', g.schema.length === 0 && /reset/.test(g.status), `tabelas=${g.schema.length}`);
    // falha ao buscar um .sql: erro claro, motor utilizavel, outros cenarios carregam
    await pg.route('**/rh.sql', r => r.fulfill({ status: 404, body: 'nope' }));
    await pg.check('#sqlPicker input[value="rh"]'); await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => !document.getElementById('sqlErr').hidden, null, { timeout: 15000 }); await ready(pg); g = await grab(pg);
    await loadSc(pg, 'logistica'); const g2 = await grab(pg);
    L.rec('SCN-06 .sql de um cenario indisponivel (404): erro claro com HTTP 404, motor segue utilizavel; outro cenario carrega normalmente', g.errVisible && /HTTP 404/.test(g.errM) && g.schema.length === 0 && !g2.errVisible && g2.schema.length === 6, `m="${g.errM}" depois=${g2.schema.length} tabelas`);
    await c.close(); }

  // ===== SCN-07: exercicios so em Vendas =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light');
    const txt = await pg.textContent('#sqlExH + p');
    L.rec('SCN-07 secao de exercicios declara que vale so para Vendas e que os outros cenarios virao depois', /Sales/.test(txt) && /(only|just)/.test(txt) && /planned/.test(txt), txt);
    await loadSc(pg, 'atendimento');
    await pg.fill('#sqlExTa-filtro', 'SELECT nome, preco, estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome'); await pg.click('#sqlExV-filtro');
    await pg.waitForFunction(() => document.getElementById('sqlExFb-filtro').textContent.length > 0); let fb = await pg.textContent('#sqlExFb-filtro'); const btn = await pg.locator('#sqlExFb-filtro button').textContent();
    L.rec('SCN-07 com Atendimento carregado, verificar um exercicio pede o banco Vendas (nao verifica no cenario errado) e oferece o botao certo', /Sales sample database is not loaded/.test(fb) && /Load the Sales database and check/.test(btn), `fb="${fb}" botao="${btn}"`);
    await pg.click('#sqlExFb-filtro button'); await pg.waitForFunction(() => document.querySelector('#sqlExFb-filtro .is-pass'), null, { timeout: T0 }); await ready(pg);
    const g = await grab(pg); const sel = await pg.evaluate(() => document.querySelector('#sqlPicker input:checked').value);
    L.rec('SCN-07 o botao seleciona e carrega Vendas e verifica: exercicio correto passa (5 tabelas de Vendas no esquema, seletor em Vendas)', g.schema.length === 5 && g.schema.every(t => /sample database$/.test(t.cap)) && g.schema.map(tname).includes('itens_pedido') && sel === 'loja-exemplo', `tabelas=${g.schema.map(tname)} seletor=${sel}`);
    await c.close(); }

  // ===== SCN-08: ausencia de upload no SQL playground (DOM) =====
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    const r = await pg.evaluate(() => ({ files: document.querySelectorAll('input[type=file], [type=file], [accept]').length, labels: [...document.querySelectorAll('label[for]')].map(l => l.getAttribute('for')), text: document.body.innerText, ids: ['sqlFile', 'sqlDelim', 'sqlEnc', 'sqlLoadRun', 'sqlProg', 'sqlLoadCancel', 'sqlTypeNote'].filter(i => document.getElementById(i)) }));
    const handled = await pg.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File(['a,b\n1,2\n'], 'x.csv', { type: 'text/csv' })); const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return ev.defaultPrevented; });
    L.rec('SCN-08 DOM do SQL playground: nenhum <input type=file>/accept, nenhum controle de CSV (delimitador, codificacao, progresso, cancelar leitura), texto sem "carregar CSV"; drop de arquivo sem tratador', r.files === 0 && r.ids.length === 0 && !/(load a csv|carregar um csv|your own csv|seus proprios csv|seus próprios csv|10 MB per file)/i.test(r.text) && handled === false, JSON.stringify({ files: r.files, ids: r.ids, handled }));
    await c.close(); }

  // ===== 360 px e axe: seletor + cenario + exercicio =====
  for (const theme of ['light', 'dark']) for (const lang of ['en', 'pt']) {
    const { c, pg } = await open(br, L.BASE, lang, theme, 360);
    const m = () => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const res = [['inicial', await m()]];
    for (const slug of ['rh', 'logistica']) { await loadSc(pg, slug); res.push([slug, await m()]); }
    await pg.click('#sqlPicker .sc-er summary'); res.push(['ER', await m()]);
    L.rec(`SCN-09 360px (${lang}/${theme}): seletor, cenario carregado e ER sem rolagem horizontal da pagina`, res.every(([, x]) => x.sw <= x.cw), JSON.stringify(res));
    if (AXE) {
      const out = [];
      for (const [st, fn] of [['inicial', async () => { await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); }], ['cenario novo carregado + consulta de exemplo executada', async () => { await loadSc(pg, 'atendimento'); await pg.click('#sqlSampleQ button[data-q="at_csat"]'); await pg.click('#sqlRun'); await ready(pg); }], ['ER aberto', async () => { await pg.click('#sqlPicker .sc-er summary'); }], ['exercicio sem Vendas carregado (needsample)', async () => { await pg.fill('#sqlExTa-filtro', 'SELECT 1'); await pg.click('#sqlExV-filtro'); }]]) {
        await fn(); await pg.evaluate(AXE);
        const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })));
        out.push(`${st}: ${r.length ? JSON.stringify(r) : 'sem violacoes'}`);
      }
      L.rec(`A11-02 axe (${lang}/${theme}/360) SQL com cenarios: zero violacoes`, out.every(s => /sem violacoes/.test(s)), out.join('\n'));
    }
    await c.close();
  }

  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
