// Explorador de dados (T-302 reescrito para D11: sem upload). Antes era o "leitor de CSV" (CSV-01..53); agora a pagina so abre as
// tabelas dos 5 cenarios embutidos. Removidos em D11 (justificativa em docs/status/no-upload-status.md): CSV-01..04,10,12,14,15,16,17,19,20,22,
// 30,40,41 (30 fixtures de arquivo, delimitador, codificacao, BOM, xss.csv, nome de arquivo malicioso), CSV-51..53 (10 MB, limite, cancelar
// leitura), SEC-P3-01 (2.000 colunas) e CSV-05 (teclado no seletor de arquivo): o recurso que eles exercitavam nao existe mais.
// Cobertura nova (EXP-xx): integridade das 27 tabelas na UI contra o sqlite3 (contagem de linhas visivel = oraculo, colunas, tipos, chaves, nulos,
// previa celula a celula), seletor de cenarios, erros, ausencia de upload (DOM), privacidade/CSP, i18n, 360 px, axe, teclado.
const L = require('./lib'); const fs = require('fs'); const O = require('./oracle');
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
if (!AXE) L.rec('A11-02 (explorador) axe-core presente em ' + L.AXE_PATH + ' (sem ele a cobertura axe nao roda)', false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
const PAGE = 'hub/ferramentas/csv/';
const T0 = 30000;
const ORACLE = O.data();
const nf = (n, lang) => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(n);

const ready = (pg, table) => pg.waitForFunction(t => { const g = id => document.getElementById(id); return g('csvTool').dataset.state === 'ready' && (!t || (document.querySelector('[data-stat=table]') || {}).textContent.endsWith(' ' + t)); }, table, { timeout: T0 });
const grab = pg => pg.evaluate(() => {
  const g = id => document.getElementById(id), q = s => document.querySelector(s);
  return {
    state: g('csvTool').dataset.state, errVisible: !g('csvErr').hidden, errT: g('csvErrT').textContent, errM: g('csvErrM').textContent, status: g('csvStatus').textContent,
    resultVisible: !g('csvResult').hidden, scenario: (q('[data-stat=scenario]') || {}).textContent, table: (q('[data-stat=table]') || {}).textContent,
    rows: (q('[data-stat=rows]') || {}).textContent, cols: (q('[data-stat=cols]') || {}).textContent, nulls: (q('[data-stat=nulls]') || {}).textContent,
    colRows: [...document.querySelectorAll('#csvCols tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)), colTypes: [...document.querySelectorAll('#csvCols tbody td[data-type]')].map(e => e.dataset.type),
    header: [...document.querySelectorAll('#csvData thead th')].map(e => e.textContent), body: [...document.querySelectorAll('#csvData tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)),
    cap: g('csvDataCap').textContent, options: [...g('csvTable').options].map(o => o.value), selected: g('csvTable').value, tableDisabled: g('csvTable').disabled,
    radios: [...document.querySelectorAll('#csvPicker input[type=radio]')].map(r => ({ v: r.value, on: r.checked, name: r.closest('label').querySelector('.sc-name').textContent, desc: r.closest('label').querySelector('.sc-desc').textContent, meta: r.closest('label').querySelector('.sc-meta').textContent })),
    er: (q('#csvPicker + * .sc-er-pre, .sc-er-pre') || {}).textContent, bodyText: document.body.innerText,
  };
});
const pick = async (pg, slug) => { await pg.check(`#csvPicker input[value="${slug}"]`); await ready(pg); };

(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();

  // ===== EXP-01: as 27 tabelas na UI = sqlite3 (raiz PT e EN; subpasta EN) =====
  for (const [base, label, lang] of [[L.BASE, 'raiz /hub/', 'en'], [L.BASE, 'raiz /hub/', 'pt'], [L.SUB, 'subpasta /portfolio/hub/', 'en']]) {
    const c = await L.ctx(br, { lang }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    let dialogs = 0; pg.on('dialog', d => { dialogs++; d.dismiss(); });
    await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    const bad = [], rowsSeen = {}; let tables = 0, cells = 0;
    for (const slug of O.SLUGS) {
      await pick(pg, slug);
      const first = await grab(pg);
      if (first.options.join() !== ORACLE[slug].tables.map(t => t.name).join()) bad.push(`${slug}: lista de tabelas ${first.options}`);
      for (const tb of ORACLE[slug].tables) {
        await pg.selectOption('#csvTable', tb.name); await ready(pg, tb.name);
        const g = await grab(pg); tables++; rowsSeen[slug + '.' + tb.name] = g.rows;
        const noun = n => n === 1 ? (lang === 'pt' ? '1 linha' : '1 row') : `${nf(n, lang)} ${lang === 'pt' ? 'linhas' : 'rows'}`;
        const ncol = tb.columns.length, nullsTotal = tb.nulls.reduce((a, b) => a + b, 0);
        const ok = {
          rows: g.rows === noun(tb.count), cols: g.cols === `${ncol} ${lang === 'pt' ? 'colunas' : 'columns'}`, nulls: g.nulls.endsWith(': ' + nf(nullsTotal, lang)),
          names: JSON.stringify(g.colRows.map(r => r[1])) === JSON.stringify(tb.columns.map(c => c.name)),
          types: JSON.stringify(g.colTypes) === JSON.stringify(tb.columns.map(c => c.type)),
          keys: g.colRows.every((r, i) => r[3] === [tb.columns[i].pk ? 'PK' : '', tb.columns[i].fk ? 'FK → ' + tb.columns[i].fk : ''].filter(Boolean).join(', ')),
          nullCols: g.colRows.every((r, i) => r[4] === nf(tb.nulls[i], lang)),
          header: JSON.stringify(g.header) === JSON.stringify(tb.columns.map(c => c.name)),
          preview: g.body.length === Math.min(100, tb.count) && g.body.every((r, i) => O.sameRow(r, tb.rows[i])),
          cap: g.cap === (tb.count > 100 ? (lang === 'pt' ? `Primeiras 100 de ${nf(tb.count, lang)} linhas` : `First 100 of ${nf(tb.count, lang)} rows`) : (lang === 'pt' ? `Todas as ${nf(tb.count, lang)} linhas` : `All ${nf(tb.count, lang)} rows`)),
          scen: g.scenario.endsWith(': ' + g.radios.find(r => r.on).name) && g.radios.find(r => r.on).v === slug, noerr: !g.errVisible,
        };
        cells += g.body.reduce((a, r) => a + r.length, 0);
        const fails = Object.entries(ok).filter(([, v]) => !v).map(([k]) => k);
        if (fails.length) bad.push(`${slug}.${tb.name}: ${fails.join(',')} rows="${g.rows}" cols="${g.cols}" nulls="${g.nulls}"`);
      }
    }
    L.rec(`EXP-01 (${label}, ${lang}): ${tables} tabelas dos 5 cenarios na UI = sqlite3: contagem de linhas visivel, colunas, tipos declarados, PK/FK, valores ausentes por coluna, cabecalho e previa (${cells} celulas) celula a celula`, bad.length === 0 && tables === 27, bad.length ? bad.slice(0, 8).join('\n') : `27 tabelas conferem; linhas visiveis=${JSON.stringify(rowsSeen)}`);
    L.rec(`EXP-09 (${label}, ${lang}) sem pageerror, dialogo ou console.error durante as 27 cargas`, log.pageerrors.length === 0 && dialogs === 0 && log.consoleErrors.length === 0, `pageerrors=${JSON.stringify(log.pageerrors)} dialogs=${dialogs} console=${JSON.stringify(log.consoleErrors)}`);
    const origin = new URL(base).origin;
    const foreign = log.requests.filter(u => !u.startsWith(origin) && !u.startsWith('data:'));
    const data = log.requests.filter(u => /\/hub\/assets\/data\//.test(u)), bad404 = log.responses.filter(r => r[0] >= 400);
    const okData = data.every(u => /\/hub\/assets\/data\/csv\/[a-z-]+\/([a-z_]+\.csv|schema\.json)$/.test(u));
    L.rec(`EXP-05/PRV (${label}, ${lang}) so a propria origem; unicos dados buscados: csv/<cenario>/(schema.json|<tabela>.csv); nenhum Worker, .wasm ou sql.js; nenhum >= 400 (${log.requests.length} requisicoes)`, foreign.length === 0 && okData && data.length > 0 && !log.requests.some(u => /worker|wasm|sql-wasm|papaparse/i.test(u)) && bad404.length === 0, `externas=${JSON.stringify(foreign)} dados=${data.length} fora do padrao=${JSON.stringify(data.filter(u => !/\/csv\//.test(u)))} >=400=${JSON.stringify(bad404)}`);
    await c.close();
  }

  // ===== EXP-02: seletor de cenarios (cartoes acessiveis, PT/EN) =====
  for (const lang of ['en', 'pt']) {
    const c = await L.ctx(br, { lang }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    const g = await grab(pg);
    const sem = await pg.evaluate(() => { const fs = document.querySelector('#csvPicker fieldset'); const lg = fs && fs.querySelector('legend'); const rs = [...document.querySelectorAll('#csvPicker input[type=radio]')];
      return { fieldset: !!fs, legend: lg && lg.textContent, n: rs.length, sameName: new Set(rs.map(r => r.name)).size === 1, labels: rs.every(r => r.closest('label') && r.closest('label').textContent.trim().length > 10), checked: rs.filter(r => r.checked).length, summary: (document.querySelector('.sc-er summary') || {}).textContent, erVisible: !!document.querySelector('.sc-er-pre') }; });
    const names = g.radios.map(r => r.name).join('|');
    const expNames = lang === 'pt' ? 'Vendas|Marketing digital|Logística|RH|Atendimento' : 'Sales|Digital marketing|Logistics|HR|Customer service';
    L.rec(`EXP-02 (${lang}) seletor: <fieldset> com <legend> "${lang === 'pt' ? 'Escolha um cenario' : 'Choose a scenario'}", 5 radios nativos do mesmo grupo, 1 marcado (Vendas/Sales), nomes e descricoes no idioma, "N tabelas"`,
      sem.fieldset && sem.legend === (lang === 'pt' ? 'Escolha um cenário' : 'Choose a scenario') && sem.n === 5 && sem.sameName && sem.labels && sem.checked === 1 && names === expNames && g.radios[0].on && g.radios.every(r => r.desc.length > 25 && /^\d+ (tabelas|tables)$/.test(r.meta)) && g.radios.map(r => r.meta).join() === (lang === 'pt' ? '5 tabelas,5 tabelas,6 tabelas,6 tabelas,5 tabelas' : '5 tables,5 tables,6 tables,6 tables,5 tables') && /^(Diagrama de entidades|Entity diagram)/.test(sem.summary),
      JSON.stringify({ sem, names, metas: g.radios.map(r => r.meta) }));
    // ER em texto: abrir o <details> e conferir que mostra o diagrama do cenario escolhido (README)
    await pg.click('#csvPicker .sc-er summary');
    const er1 = await pg.textContent('.sc-er-pre'); await pick(pg, 'rh'); const er2 = await pg.textContent('.sc-er-pre'); const cap = await pg.textContent('.sc-er > p');
    L.rec(`EXP-02 (${lang}) diagrama ER em texto acompanha o cenario escolhido (mesmo texto do README) e fica rolavel por teclado`, /itens_pedido >── 1 pedidos/.test(er1) && /funcionarios\(id PK, nome, email, cargo_id FK -> cargos\.id/.test(er2) && !/itens_pedido/.test(er2) && new RegExp(lang === 'pt' ? 'RH' : 'HR').test(cap) && await pg.getAttribute('.sc-er-pre', 'tabindex') === '0', `er1="${er1.split('\n')[0]}" er2="${er2.split('\n')[0]}" cap="${cap}"`);
    await c.close();
  }
  { // trocar de cenario: lista de tabelas, estado e rotulos mudam; teclado (setas) escolhe cenario
    const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    await pg.selectOption('#csvTable', 'pedidos'); await ready(pg, 'pedidos');
    await pick(pg, 'atendimento'); let g = await grab(pg);
    L.rec('EXP-02 trocar para Atendimento: lista de tabelas do cenario novo, primeira tabela carregada, estado "ready", status fala do cenario', g.options.join() === 'clientes,agentes,tickets,interacoes,pesquisas_satisfacao' && g.table === 'Table: clientes' && g.rows === '120 rows' && /Customer service/.test(g.status) && g.state === 'ready', JSON.stringify({ o: g.options, t: g.table, r: g.rows, s: g.status }));
    await pg.selectOption('#csvTable', 'tickets'); await ready(pg, 'tickets'); await pick(pg, 'logistica'); g = await grab(pg);
    await pg.focus('#csvPicker input:checked'); await pg.keyboard.press('ArrowDown'); await pg.waitForFunction(() => document.querySelector('[data-stat=scenario]').textContent.endsWith('HR'), null, { timeout: T0 }); await ready(pg); const k = await grab(pg);
    L.rec('EXP-02/EXP-08 teclado: seta para baixo no grupo de radios escolhe o proximo cenario (Logistica -> RH) e carrega a primeira tabela; foco permanece no radio', k.scenario === 'Scenario: HR' && k.table === 'Table: departamentos' && k.rows === '8 rows' && await pg.evaluate(() => document.activeElement.value) === 'rh', JSON.stringify({ s: k.scenario, t: k.table, r: k.rows }));
    await c.close(); }

  // ===== EXP-03: erros (arquivo ausente, schema ausente, conteudo inconsistente) =====
  for (const lang of ['en', 'pt']) {
    const c = await L.ctx(br, { lang }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    await pg.route('**/csv/loja-exemplo/pedidos.csv', r => r.fulfill({ status: 404, body: 'nope' }));
    await pg.selectOption('#csvTable', 'pedidos'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'error', null, { timeout: T0 });
    let g = await grab(pg);
    L.rec(`EXP-03 (${lang}) tabela indisponivel (404): erro com causa e acao, role=alert, resultado anterior escondido, sem pageerror`, g.errVisible && g.errT.length > 10 && /HTTP 404/.test(g.errM) && /(Check|Confira)/.test(g.errM) && !g.resultVisible && !/undefined|NaN|\{|\}/.test(g.errT + g.errM) && await pg.getAttribute('#csvErr', 'role') === 'alert' && log.pageerrors.length === 0, `t="${g.errT}" m="${g.errM}"`);
    await pg.unroute('**/csv/loja-exemplo/pedidos.csv'); await pg.selectOption('#csvTable', 'produtos'); await ready(pg, 'produtos'); g = await grab(pg);
    L.rec(`EXP-03 (${lang}) apos o erro, escolher outra tabela recupera (erro some, 30 linhas)`, !g.errVisible && /30/.test(g.rows), `rows=${g.rows} err=${g.errVisible}`);
    await pg.route('**/csv/loja-exemplo/categorias.csv', r => r.fulfill({ status: 200, contentType: 'text/csv', body: 'id,outra\n1,x\n' }));
    await pg.selectOption('#csvTable', 'categorias'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'error', null, { timeout: T0 }); g = await grab(pg);
    L.rec(`EXP-03 (${lang}) CSV com cabecalho diferente do schema.json: "dados inconsistentes", nada exibido como verdade`, g.errVisible && /categorias/.test(g.errM) && /(inconsist)/i.test(g.errT) && !g.resultVisible, `t="${g.errT}" m="${g.errM}"`);
    await pg.route('**/csv/rh/schema.json', r => r.fulfill({ status: 500, body: 'x' }));
    await pg.check('#csvPicker input[value="rh"]'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'error', null, { timeout: T0 }); g = await grab(pg);
    L.rec(`EXP-03 (${lang}) schema.json do cenario indisponivel (500): erro claro, lista de tabelas desabilitada, sem pageerror`, g.errVisible && /HTTP 500/.test(g.errM) && g.tableDisabled && log.pageerrors.length === 0, `m="${g.errM}" disabled=${g.tableDisabled}`);
    await pg.unroute('**/csv/rh/schema.json'); await pg.check('#csvPicker input[value="logistica"]'); await ready(pg); g = await grab(pg);
    L.rec(`EXP-03 (${lang}) apos o erro de cenario, escolher outro cenario recupera`, !g.errVisible && g.rows.startsWith('6'), `rows=${g.rows}`);
    await c.close();
  }

  // ===== EXP-04: sem upload no DOM e sem leitura de arquivo =====
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    const r = await pg.evaluate(() => ({ files: document.querySelectorAll('input[type=file], [type=file]').length, dz: document.querySelectorAll('[class*=drop], [ondrop], [ondragover]').length, accept: document.querySelectorAll('[accept]').length, labelFor: [...document.querySelectorAll('label[for]')].map(l => l.getAttribute('for')),
      text: document.body.innerText }));
    // soltar um arquivo na pagina nao pode ser aceito: o evento drop nao tem tratador (a pagina nao le File)
    const handled = await pg.evaluate(() => { let prevented = false; const dt = new DataTransfer(); dt.items.add(new File(['a,b\n1,2\n'], 'x.csv', { type: 'text/csv' })); const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); prevented = ev.defaultPrevented; return prevented; });
    L.rec('EXP-04 DOM do explorador: nenhum <input type=file>, nenhuma zona de soltar, nenhum atributo accept; texto da pagina nao oferece carregar arquivo; drop de arquivo sem tratador (defaultPrevented=false)', r.files === 0 && r.dz === 0 && r.accept === 0 && r.labelFor.every(f => f === 'csvTable') && !/(drop a|choose a file|solte um|escolher um arquivo|carregar csv|load a csv|upload)/i.test(r.text.replace(/nothing is uploaded[^.]*\./i, '').replace(/nada é enviado[^.]*\./i, '')) && handled === false, JSON.stringify({ ...r, text: undefined, handled }));
    await c.close(); }

  // ===== EXP-06: CSP desta pagina inalterada (sem relaxar) =====
  { const html = fs.readFileSync(`${L.REPO}/${PAGE}index.html`, 'utf8'); const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];
    L.rec("EXP-06 CSP do explorador: default-src none, script-src 'self' (sem wasm-unsafe-eval/unsafe-*), connect-src 'self', SEM worker-src (nao ha Worker), sem origem externa; nenhum <script> inline, on*= ou style=", /^default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'$/.test(csp) && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html) && !/\son[a-z]+\s*=|\sstyle\s*=/i.test(html), csp);
    const c = await L.ctx(br, {}); const pg = await c.newPage(); const msgs = []; pg.on('console', m => msgs.push(m.text())); await pg.goto(`${L.BASE}/${PAGE}`); await ready(pg); await pick(pg, 'marketing-digital');
    L.rec('EXP-06 pagina real: nenhuma violacao de CSP no console', !msgs.some(t => /Content Security|Refused/.test(t)), JSON.stringify(msgs)); await c.close(); }

  // ===== EXP-07: troca de idioma com tabela carregada =====
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`); await ready(pg);
    await pick(pg, 'atendimento'); await pg.selectOption('#csvTable', 'interacoes'); await ready(pg, 'interacoes'); const en = await grab(pg);
    await pg.click('[data-lang=pt]'); const pt = await grab(pg);
    L.rec('EXP-07 troca EN->PT com tabela carregada: resumo, cabecalhos, tipos, legenda, nomes e descricoes dos cenarios traduzidos; tabela e dados mantidos (sem novo fetch)', en.rows === '566 rows' && pt.rows === '566 linhas' && pt.scenario === 'Cenário: Atendimento' && /Primeiras 100 de 566 linhas/.test(pt.cap) && pt.radios.map(r => r.name).join('|') === 'Vendas|Marketing digital|Logística|RH|Atendimento' && pt.colRows.length === en.colRows.length && pt.colRows[0][2] === 'inteiro (INTEGER)' && en.colRows[0][2] === 'integer (INTEGER)' && /Tabela interacoes/.test(pt.status) && pt.table === 'Tabela: interacoes' && pt.selected === 'interacoes', `${en.rows} -> ${pt.rows} | ${pt.status}`);
    await c.close(); }

  // ===== 360 px, temas, axe =====
  for (const theme of ['light', 'dark']) for (const lang of ['en', 'pt']) {
    const c = await L.ctx(br, { lang, theme, vp: 360 }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    const m = () => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const res = [['inicial', await m()]];
    for (const [slug, tb] of [['logistica', 'entregas'], ['atendimento', 'interacoes'], ['rh', 'funcionarios'], ['marketing-digital', 'metricas_diarias']]) { await pick(pg, slug); await pg.selectOption('#csvTable', tb); await ready(pg, tb); res.push([slug + '.' + tb, await m()]); }
    await pg.click('#csvPicker .sc-er summary'); res.push(['ER aberto', await m()]);
    await pg.route('**/csv/rh/aus*.csv', r => r.fulfill({ status: 404, body: 'x' })); await pick(pg, 'rh'); await pg.selectOption('#csvTable', 'ausencias'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'error'); res.push(['erro', await m()]);
    L.rec(`EXP-10/RSP (${lang}/${theme}/360px) sem rolagem horizontal da pagina em todos os estados (cartoes, tabelas largas, ER aberto, erro)`, res.every(([, x]) => x.sw <= x.cw), JSON.stringify(res));
    if (AXE) {
      const out = [];
      for (const [st, fn] of [['inicial', async () => { await pg.unroute('**/csv/rh/aus*.csv'); await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); }], ['outro cenario, tabela larga', async () => { await pick(pg, 'atendimento'); await pg.selectOption('#csvTable', 'interacoes'); await ready(pg, 'interacoes'); }], ['ER aberto', async () => { await pg.click('#csvPicker .sc-er summary'); }], ['erro', async () => { await pg.route('**/csv/rh/ausencias.csv', r => r.fulfill({ status: 404, body: 'x' })); await pick(pg, 'rh'); await pg.selectOption('#csvTable', 'ausencias'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'error'); }]]) {
        await fn(); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE);
        const r = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })); });
        out.push(`${st}: ${r.length ? JSON.stringify(r) : 'sem violacoes'}`);
      }
      L.rec(`A11-02 axe (${lang}/${theme}/360) no explorador (inicial, outro cenario, ER aberto, erro): zero violacoes`, out.every(s => /sem violacoes/.test(s)), out.join('\n'));
    }
    await c.close();
  }
  { const c = await L.ctx(br, { lang: 'pt', theme: 'dark', vp: 1280 }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`); await ready(pg); await pick(pg, 'logistica');
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE); const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => v.id + ' ' + v.impact));
    L.rec('A11-02 axe (pt/dark/1280) explorador com tabela carregada: zero violacoes', r.length === 0, JSON.stringify(r)); await c.close(); }

  // ===== EXP-08: teclado: Tab chega ao seletor, a lista de tabelas e as regioes rolaveis; foco visivel =====
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
    const seq = []; for (let i = 0; i < 22; i++) { await pg.keyboard.press('Tab'); seq.push(await pg.evaluate(() => { const e = document.activeElement; return (e.id || e.tagName) + (e.type === 'radio' ? ':' + e.value : ''); })); if (seq[seq.length - 1] === 'csvTable') break; }
    const vis = await pg.evaluate(() => getComputedStyle(document.querySelector('.sc-input:focus-visible + .sc-body') || document.body).outlineStyle);
    await pg.focus('#csvTable'); await pg.keyboard.press('ArrowDown'); await ready(pg, 'categorias'); const g = await grab(pg);
    L.rec('EXP-08 so teclado: Tab chega ao grupo de cenarios (1 parada, o radio marcado) e a lista de tabelas; seta na lista carrega a proxima tabela', seq.some(x => x.startsWith('csvScenario') || /^INPUT:loja-exemplo|:loja-exemplo/.test(x)) && seq[seq.length - 1] === 'csvTable' && g.table === 'Table: categorias' && g.rows === '6 rows', `ordem de Tab=${seq.join(' > ')} | tabela=${g.table} ${g.rows}`);
    await c.close(); }

  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
