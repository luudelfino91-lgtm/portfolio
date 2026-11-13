// SQL playground (T-304, T-305, T-306 SQL, T-309; reescrito para D11 = sem upload): SQL-01..06, 20..27, 30..36, 40, 51, 52, PRV (CSP, rede, canario), 360px, axe.
// Removido em D11 (justificativa em docs/status/no-upload-status.md): SQL-10..18 (CSV como tabela, nomes saneados, tipos, nulos, BOM, 10 MB,
// 2.000 colunas, cancelar leitura), SQL-41 (nomes de arquivo/xss.csv) e T-306a de leitura: o recurso nao existe mais. O que sobrou usa
// tabelas dos cenarios embutidos no lugar de CSV. A integridade dos 5 cenarios na UI esta em tests/hub/scenarios.js.
const L = require('./lib'); const fs = require('fs'); const path = require('path');
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
if (!AXE) L.rec('A11-02 (SQL) axe-core presente em ' + L.AXE_PATH + ' (sem ele a cobertura axe nao roda)', false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
const PAGE = 'hub/ferramentas/sql/';
const T0 = 60000;

const state = pg => pg.evaluate(() => document.getElementById('sqlTool').dataset.state);
const ready = (pg, ms = T0) => pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state === 'ready', null, { timeout: ms });
async function open(br, base, lang, theme, vp = 1280, extra = {}) {
  const c = await L.ctx(br, { lang, theme, vp, ...extra }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  const dialogs = { n: 0 }; pg.on('dialog', d => { dialogs.n++; d.dismiss(); });
  await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
  return { c, pg, log, dialogs };
}
// executa e espera voltar a "ready" (execute() ja marca "running" de forma sincrona no clique)
async function run(pg, sql, via = 'click') {
  if (sql !== null) await pg.fill('#sqlEditor', sql);
  if (via === 'click') await pg.click('#sqlRun'); else await pg.keyboard.press(via);
  await ready(pg);
}
// escolhe o cenario no seletor (radio nativo) e carrega; espera o status de "carregado" e o motor pronto
async function loadSample(pg, slug = 'loja-exemplo') {
  await pg.check(`#sqlPicker input[value="${slug}"]`); await pg.click('#sqlSampleBtn');
  await pg.waitForFunction(() => /^(Sample database loaded|Banco de exemplo carregado)/.test(document.getElementById('sqlStatus').textContent) || !document.getElementById('sqlErr').hidden, null, { timeout: T0 });
  await ready(pg);
}
const grab = pg => pg.evaluate(() => {
  const g = id => document.getElementById(id);
  return {
    state: g('sqlTool').dataset.state, errVisible: !g('sqlErr').hidden, errT: g('sqlErrT').textContent, errM: g('sqlErrM').textContent, errH: g('sqlErrH').textContent,
    warn: g('sqlWarn').hidden ? '' : g('sqlWarn').textContent, status: g('sqlStatus').textContent, text: g('sqlEditor').value,
    cap: g('sqlResCap').textContent, header: [...document.querySelectorAll('#sqlResTable thead th')].map(e => e.textContent),
    body: [...document.querySelectorAll('#sqlResTable tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)),
    msg: g('sqlResMsg').hidden ? '' : g('sqlResMsg').textContent, note: g('sqlResNote').hidden ? '' : g('sqlResNote').textContent,
    tableVisible: !g('sqlResBox').hidden, stale: g('sqlResult').classList.contains('is-stale'),
    runDisabled: g('sqlRun').disabled, runText: g('sqlRunT').textContent,
    schema: [...document.querySelectorAll('#sqlSchema table')].map(t => ({ cap: t.caption.textContent, rows: [...t.tBodies[0].rows].map(r => [...r.cells].map(c => c.textContent)) })),
    bodyText: document.body.innerText,
  };
});
const nf = (n, lang) => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(n);

(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();

  // ===== Matriz funcional: raiz e subpasta x PT/EN =====
  for (const [base, label] of [[L.BASE, 'raiz /hub/'], [L.SUB, 'subpasta /portfolio/hub/']]) {
    for (const lang of ['pt', 'en']) {
      const { c, pg, log, dialogs } = await open(br, base, lang, 'light');
      const tag = `(${label}, ${lang})`;
      let g = await grab(pg);
      L.rec(`SQL-04 ${tag} estado inicial: motor pronto, botao habilitado, consulta de exemplo no editor`, g.state === 'ready' && !g.runDisabled && g.runText === (lang === 'pt' ? 'Executar' : 'Run') && /SELECT/.test(g.text), `estado=${g.state} botao="${g.runText}" desabilitado=${g.runDisabled} editor="${g.text}" status="${g.status}"`);
      await run(pg, 'SELECT 1+1'); g = await grab(pg);
      L.rec(`SQL-01 ${tag} SELECT 1+1 -> 1 linha, valor 2`, g.body.length === 1 && g.body[0].length === 1 && g.body[0][0] === '2' && !g.errVisible, JSON.stringify({ header: g.header, body: g.body }));
      L.rec(`SQL-03 ${tag} legenda com contagem de linhas e tempo ("N linhas · X ms")`, new RegExp(`^1 ${lang === 'pt' ? 'linha' : 'row'} · [0-9.,]+ ms$`).test(g.cap), `cap="${g.cap}" status="${g.status}"`);
      await run(pg, 'SELECT 2+2', 'Control+Enter'); const a = await grab(pg);
      await run(pg, 'SELECT 3+3', 'Meta+Enter'); const b = await grab(pg);
      L.rec(`SQL-02 ${tag} Ctrl+Enter e Cmd+Enter (metaKey) executam; botao Executar tambem`, a.body[0][0] === '4' && b.body[0][0] === '6', `ctrl=${JSON.stringify(a.body)} meta=${JSON.stringify(b.body)}`);
      await run(pg, 'SELECT 1 WHERE 1=0'); g = await grab(pg);
      L.rec(`SQL-05 ${tag} SELECT sem linhas: mensagem "rodou e nao retornou linhas", distinta de erro`, !g.errVisible && /(retornou|returned)/.test(g.msg) && !g.tableVisible, `msg="${g.msg}" erro=${g.errVisible}`);
      await run(pg, 'CREATE TABLE t(a,b); INSERT INTO t VALUES (1,"x"),(2,"y"); SELECT * FROM t ORDER BY a'); g = await grab(pg);
      L.rec(`SQL-06 ${tag} varias instrucoes: exibe o resultado do ultimo SELECT e informa quantas rodaram`, g.body.length === 2 && g.body[1][1] === 'y' && /3/.test(g.note) && g.schema.some(t => t.cap.startsWith('t ')), `body=${JSON.stringify(g.body)} nota="${g.note}"`);
      // erro (SQL-20/21/22/24)
      await run(pg, 'SELEC 1'); g = await grab(pg);
      const runOk = !g.runDisabled;
      L.rec(`SQL-20 ${tag} SELEC 1: erro legivel, sem pageerror, editor mantem o texto, Executar habilitado, resultado anterior esmaecido (nao apagado)`,
        g.errVisible && g.errT === (lang === 'pt' ? 'Erro de SQL' : 'SQL error') && /syntax error/.test(g.errM) && g.errH.length > 20 && g.text === 'SELEC 1' && runOk && g.stale && g.body.length === 2 && log.pageerrors.length === 0,
        `t="${g.errT}" m="${g.errM}" dica="${g.errH}" editor="${g.text}" stale=${g.stale} linhas anteriores=${g.body.length} pageerrors=${log.pageerrors.length}`);
      await run(pg, 'SELECT 5*5'); g = await grab(pg);
      L.rec(`SQL-24 ${tag} consulta valida depois do erro executa normalmente; erro some e resultado deixa de ficar esmaecido`, g.body[0][0] === '25' && !g.errVisible && !g.stale, JSON.stringify(g.body));
      await run(pg, 'SELECT * FROM nada'); const e1 = await grab(pg);
      await run(pg, 'SELECT nada FROM t'); const e2 = await grab(pg);
      L.rec(`SQL-21/22 ${tag} tabela e coluna inexistentes: erro do motor + dica traduzida apontando o esquema`, /no such table/.test(e1.errM) && /(Suas tabelas|Your tables)/.test(e1.errH) && /no such column/.test(e2.errM) && /(Suas tabelas|Your tables)/.test(e2.errH), `1: "${e1.errM}" / "${e1.errH}"; 2: "${e2.errM}" / "${e2.errH}"`);
      await run(pg, ''); const v1 = await grab(pg); await run(pg, '   \n  '); const v2 = await grab(pg); await run(pg, '-- so um comentario'); const v3 = await grab(pg);
      const friendly = x => x.errVisible && x.errT === (lang === 'pt' ? 'Nada para executar' : 'Nothing to run') && !/error|erro de sql/i.test(x.errT + x.errM);
      L.rec(`SQL-23 ${tag} consulta vazia, so espacos e so comentario: mensagem amigavel, sem erro cru do motor`, friendly(v1) && friendly(v2) && friendly(v3), `${v1.errT} | ${v2.errT} | ${v3.errT}: ${v3.errM}`);
      // SQL-25/26
      await run(pg, 'DROP TABLE t'); const d1 = await grab(pg);
      await run(pg, 'SELECT * FROM t'); const d2 = await grab(pg);
      L.rec(`SQL-25 ${tag} DROP TABLE afeta so o banco em memoria; esquema atualizado`, !d1.errVisible && d1.schema.length === 0 && d2.errVisible, `schema apos drop=${d1.schema.length} select depois: "${d2.errM}"`);
      await run(pg, "ATTACH DATABASE '/x' AS x"); const t1 = await grab(pg); await run(pg, 'PRAGMA table_info(sqlite_master)'); const t2 = await grab(pg); await run(pg, 'SELECT 1'); const t3 = await grab(pg);
      L.rec(`SQL-26 ${tag} ATTACH e PRAGMA: sem pageerror, interface segue utilizavel (banco em memoria WASM)`, log.pageerrors.length === 0 && t3.body[0][0] === '1', `attach: err=${t1.errVisible} "${t1.errM}"; pragma: err=${t2.errVisible} linhas=${t2.body.length}`);
      // conteudo estranho: unicode, blob, xss em resultado, 100 KB
      await run(pg, `SELECT 'ação 😀 ñ' AS "ç é"`); g = await grab(pg);
      L.rec(`SQL-35 ${tag} unicode/emoji em literal e identificador: ida e volta integra`, g.header[0] === 'ç é' && g.body[0][0] === 'ação 😀 ñ', JSON.stringify({ h: g.header, b: g.body }));
      await run(pg, "SELECT x'00ff' AS b, zeroblob(10) AS z"); g = await grab(pg);
      L.rec(`SQL-36 ${tag} BLOB exibido como resumo, sem bytes crus`, /BLOB \(2 bytes\)/.test(g.body[0][0]) && /BLOB \(10 bytes\)/.test(g.body[0][1]), JSON.stringify(g.body));
      await run(pg, `SELECT '<img src=x onerror=alert(1)>' AS a, '<script>alert(1)</script>' AS "<b>h</b>"`); g = await grab(pg);
      const inj = await pg.evaluate(() => document.querySelectorAll('#sqlTool img, #sqlTool script, #sqlTool iframe, #sqlTool b, #sqlResTable *:not(table):not(thead):not(tbody):not(tr):not(th):not(td):not(caption):not(div.csv-cell)').length);
      L.rec(`SQL-40 ${tag} resultado com HTML/script e cabecalho "<b>": exibido como texto, nada injetado, sem dialogo`, g.body[0][0] === '<img src=x onerror=alert(1)>' && g.header[1] === '<b>h</b>' && inj === 0 && dialogs.n === 0, `inj=${inj} dialogs=${dialogs.n} ${JSON.stringify(g.body)}`);
      const big = 'SELECT 1 AS n' + ' UNION ALL SELECT 1'.repeat(5000); // ~95 KB, 5.001 termos compostos (SQLite limita a 500)
      const t0 = Date.now(); await run(pg, big); g = await grab(pg);
      L.rec(`SQL-30 ${tag} consulta de ${Math.round(big.length / 1024)} KB (5.000 x UNION ALL): erro de limite legivel do motor, editor intacto com o texto inteiro, pagina responsiva`, big.length > 90000 && g.errVisible && /too many terms/.test(g.errM) && g.text.length === big.length && g.errH.length > 20 && !g.runDisabled, `bytes=${big.length} erro="${g.errM}" tempo=${Date.now() - t0} ms editor=${g.text.length}`);
      const inl = 'SELECT COUNT(*) AS n FROM (SELECT 1 AS v) WHERE v IN (' + '1,'.repeat(48000) + '1)'; // ~96 KB
      const tIn = Date.now(); await run(pg, inl); g = await grab(pg);
      L.rec(`SQL-30 ${tag} consulta de ${Math.round(inl.length / 1024)} KB (lista IN com 48.001 itens): executa, resultado correto, sem travar`, inl.length > 90000 && !g.errVisible && g.body[0][0] === '1', `bytes=${inl.length} resultado=${JSON.stringify(g.body)} erro="${g.errM}" tempo=${Date.now() - tIn} ms`);
      // SQL-31 (reescrito em D11, sem upload): teto de linhas (1.000) e orcamento de celulas (20.000 = linhas x colunas)
      await run(pg, 'WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<5000) SELECT i FROM n'); g = await grab(pg);
      const n1k = lang === 'pt' ? '1.000' : '1,000', n5k = lang === 'pt' ? '5.000' : '5,000';
      L.rec(`SQL-31 ${tag} 5.000 linhas geradas: exibe exatamente 1.000 linhas, legenda "mostrando ${n1k} de ${n5k}" e nota do limite, sem erro`,
        !g.errVisible && g.body.length === 1000 && g.body[0][0] === '1' && g.body[999][0] === '1000' && g.cap.includes(n1k) && g.cap.includes(n5k) && g.note.includes(n1k) && /(Only the first|Só as primeiras)/.test(g.note), JSON.stringify({ rows: g.body.length, cap: g.cap, note: g.note }));
      const cols25 = Array.from({ length: 25 }, (_, k) => `i+${k} AS c${k}`).join(', '); // 25 colunas: 20.000 / 25 = 800 linhas
      await run(pg, `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<5000) SELECT ${cols25} FROM n`); g = await grab(pg);
      L.rec(`SQL-31 ${tag} 25 colunas x 5.000 linhas: o orcamento de celulas limita a 800 linhas (20.000 celulas), com legenda e nota`,
        !g.errVisible && g.body.length === 800 && g.header.length === 25 && g.cap.includes('800') && g.cap.includes(n5k) && /(Only the first|Só as primeiras)/.test(g.note) && g.note.includes('800'), JSON.stringify({ rows: g.body.length, cols: g.header.length, cap: g.cap, note: g.note }));
      // duplo Ctrl+Enter (SQL-34)
      await pg.fill('#sqlEditor', 'SELECT 34'); await pg.keyboard.press('Control+Enter'); await pg.keyboard.press('Control+Enter'); await ready(pg); g = await grab(pg);
      L.rec(`SQL-34 ${tag} duplo Ctrl+Enter: uma execucao por vez, resultado consistente`, g.body.length === 1 && g.body[0][0] === '34' && !g.errVisible, JSON.stringify(g.body));
      L.rec(`SQL-20/40 ${tag} nenhum pageerror, dialogo ou console.error durante toda a sessao`, log.pageerrors.length === 0 && dialogs.n === 0 && log.consoleErrors.length === 0, `pageerrors=${JSON.stringify(log.pageerrors)} dialogs=${dialogs.n} console=${JSON.stringify(log.consoleErrors)}`);
      const origin = new URL(base).origin;
      const foreign = log.requests.filter(u => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'));
      const wasm = log.responses.filter(r => /sql-wasm\.wasm$/.test(r[1]));
      const bad = log.responses.filter(r => r[0] >= 400);
      L.rec(`PRV ${tag} nenhuma requisicao a outra origem; .wasm e worker servidos da propria origem (${log.requests.length} requisicoes)`, foreign.length === 0 && wasm.length === 1 && wasm[0][0] === 200 && bad.length === 0 && log.requests.some(u => /sql-worker\.js$/.test(u)), `externas=${JSON.stringify(foreign)} wasm=${JSON.stringify(wasm)} >=400=${JSON.stringify(bad)}`);
      await c.close();
    }
  }

  // ===== Parar e tempo limite (SQL-32, SQL-33, T-306a) =====
  { const c = await L.ctx(br, { lang: 'en' }); await c.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) { window.__lt = null; } });
    const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); await pg.goto(`${L.BASE}/${PAGE}`); await ready(pg);
    await loadSample(pg); await run(pg, 'CREATE TABLE so_sql(a); INSERT INTO so_sql VALUES (1)');
    const slow = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x < 1000000000) SELECT count(*) FROM c';
    // SQL-32: Parar aparece apos ~3 s; parar termina e recria o Worker; UI segue utilizavel
    await pg.fill('#sqlEditor', slow); const t0 = Date.now(); await pg.click('#sqlRun');
    const midState = await state(pg); const busyAttr = await pg.getAttribute('#sqlResult', 'aria-busy'); const earlyStop = await pg.isVisible('#sqlStop');
    await pg.waitForSelector('#sqlStop:not([hidden])', { timeout: 8000 }); const tStop = Date.now() - t0;
    const slowStatus = await pg.textContent('#sqlStatus');
    await pg.click('#sqlStop'); await ready(pg); await pg.waitForFunction(() => /recreated/.test(document.getElementById('sqlStatus').textContent), null, { timeout: 30000 });
    let g = await grab(pg);
    const foc = await pg.evaluate(() => document.activeElement.id);
    L.rec('SQL-32 consulta lenta: estado "running" e aria-busy durante; "Parar" so aparece apos ~3 s; parar termina o Worker, banco recriado, aviso claro, cenario carregado recarregado automaticamente, foco volta ao Executar',
      midState === 'running' && busyAttr === 'true' && !earlyStop && tStop >= 2900 && tStop < 6000 && /Stop/.test(slowStatus) && g.errVisible && /stopped/.test(g.errT) && /(recreated)/.test(g.errH) && g.schema.length === 5 && g.schema.every(x => /sample database$/.test(x.cap)) && foc === 'sqlRun',
      `estado=${midState} aria-busy=${busyAttr} Parar visivel antes de 3 s=${earlyStop} Parar apareceu em ${tStop} ms status="${slowStatus}" erro="${g.errT}" tabelas=${JSON.stringify(g.schema.map(t => t.cap))} foco=${foc}`);
    await run(pg, 'SELECT COUNT(*) FROM clientes'); g = await grab(pg);
    await run(pg, 'SELECT * FROM so_sql'); const lost = await grab(pg);
    L.rec('SQL-32/33 apos Parar: interface utilizavel (clientes consultavel = 40), tabela criada por SQL perdida como avisado', g.body[0][0] === '40' && lost.errVisible && /no such table/.test(lost.errM), `count=${JSON.stringify(g.body)} so_sql: "${lost.errM}"`);
    // SQL-33: laco infinito; tempo limite de 5 s
    await pg.selectOption('#sqlTimeout', '5');
    const lim = await pg.textContent('#sqlLimits');
    await pg.fill('#sqlEditor', 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT count(*) FROM c;'); const t1 = Date.now(); await pg.click('#sqlRun');
    await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state !== 'running', null, { timeout: 15000 }); const tOut = Date.now() - t1;
    await ready(pg, 30000); g = await grab(pg);
    L.rec('SQL-33 laco infinito: interrompido no tempo limite configurado (5 s), mensagem "passou de 5 segundos" com sugestao de LIMIT/WHERE, banco recriado, nota de limite reflete o valor', tOut >= 4900 && tOut < 8000 && g.errVisible && /more than 5 seconds/.test(g.errM) && /(LIMIT|WHERE)/.test(g.errH) && /recreated/.test(g.errH) && /more than 5 seconds/.test(lim) && g.text.startsWith('WITH RECURSIVE'), `interrompida apos ${tOut} ms; t="${g.errT}" m="${g.errM}" h="${g.errH}" nota="${lim}" editor mantido=${g.text.startsWith('WITH RECURSIVE')}`);
    await run(pg, 'SELECT 1+1'); g = await grab(pg); const cnt = await (async () => { await run(pg, 'SELECT COUNT(*) FROM clientes'); return (await grab(pg)).body[0][0]; })();
    L.rec('SQL-33 apos o tempo limite: nova consulta executa, cenario recarregado, sem pageerror', g.body[0][0] === '2' && cnt === '40' && log.pageerrors.length === 0, `1+1=${g.body[0][0]} count=${cnt} pageerrors=${JSON.stringify(log.pageerrors)}`);
    // memoria: zeroblob/randomblob gigantes nao congelam
    await run(pg, 'SELECT length(zeroblob(2000000000))'); const z1 = await grab(pg);
    await run(pg, 'SELECT length(randomblob(900000000))', 'Control+Enter'); const z2 = await grab(pg);
    await run(pg, 'SELECT 9'); const z3 = await grab(pg);
    L.rec('ST-05 zeroblob(2e9) e randomblob(9e8): cada consulta termina com mensagem de erro nao vazia OU resultado (nunca tela em branco), aba responsiva, consulta seguinte executa', z3.body[0][0] === '9' && log.pageerrors.length === 0 && [z1, z2].every(z => (z.errVisible && String(z.errM || '').trim().length > 0) || (z.body && z.body.length > 0)), `zeroblob: err=${z1.errVisible} "${z1.errM}" ${JSON.stringify(z1.body)}; randomblob: err=${z2.errVisible} "${z2.errM}" ${z2.errT} ${JSON.stringify(z2.body)}; estado final=${z3.state}`);
    const lt = await pg.evaluate(() => window.__lt); const mx = lt && lt.length ? Math.max(...lt) : 0;
    L.rec('SQL-32/33 aba principal sem long task > 1 s durante consulta sem fim, Parar e tempo limite (a consulta roda no Worker)', lt !== null && mx < 1000, `long tasks=${JSON.stringify(lt)} maior=${Math.round(mx)} ms`);
    await c.close(); }

  // ===== Reiniciar banco (SQL-25) =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light');
    await loadSample(pg); await run(pg, 'CREATE TABLE x(a)'); await pg.fill('#sqlEditor', 'SELECT 77'); await pg.click('#sqlReset'); await ready(pg); const g = await grab(pg);
    L.rec('SQL-25 Reiniciar banco: remove todas as tabelas (cenario e SQL), mantem o texto do editor, informa na tela', g.schema.length === 0 && g.text === 'SELECT 77' && /reset/.test(g.status), `tabelas=${g.schema.length} editor="${g.text}" status="${g.status}"`);
    await c.close(); }

  // ===== Falha ao preparar o motor (SQL-27) e estado "aguarde" (SQL-04) =====
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    let block = true; await pg.route('**/sql-wasm.wasm', r => block ? r.abort() : r.continue());
    await pg.goto(`${L.BASE}/${PAGE}`);
    await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state === 'failed', null, { timeout: 15000 });
    let g = await grab(pg); const retryVis = await pg.isVisible('#sqlRetry');
    L.rec('SQL-27 .wasm indisponivel: mensagem de falha ao preparar o ambiente com "Tentar de novo", Executar desabilitado, sem pageerror', g.errVisible && /Could not prepare/.test(g.errT) && retryVis && g.runDisabled && log.pageerrors.length === 0, `t="${g.errT}" m="${g.errM}" retry=${retryVis} runDisabled=${g.runDisabled} pageerrors=${JSON.stringify(log.pageerrors)}`);
    block = false; await pg.click('#sqlRetry'); await ready(pg, 20000); g = await grab(pg); await run(pg, 'SELECT 1+1'); const g2 = await grab(pg);
    L.rec('SQL-27 "Tentar de novo" com a rede de volta: motor pronto, erro some, consulta executa', !g.errVisible && g2.body[0][0] === '2', `err=${g.errVisible} resultado=${JSON.stringify(g2.body)}`);
    await c.close();
    const c2 = await L.ctx(br, { lang: 'pt' }); const p2 = await c2.newPage();
    await p2.route('**/sql-wasm.wasm', async r => { await new Promise(x => setTimeout(x, 1500)); r.continue(); });
    await p2.goto(`${L.BASE}/${PAGE}`);
    const w = await grab(p2); const wt = await state(p2);
    await ready(p2); const rd = await grab(p2);
    L.rec('SQL-04 enquanto o motor prepara: botao desabilitado com "Aguarde" e editor ja editavel; depois habilitado com "Executar"', wt === 'preparing' && w.runDisabled && w.runText === 'Aguarde' && /Preparando/.test(w.status) && !rd.runDisabled && rd.runText === 'Executar', `antes: estado=${wt} botao="${w.runText}" desabilitado=${w.runDisabled} status="${w.status}"; depois: "${rd.runText}" desabilitado=${rd.runDisabled}`);
    await c2.close(); }

  // ===== CSP e privacidade (PRV-13, PRV-01..05) =====
  { const html = fs.readFileSync(`${L.REPO}/${PAGE}index.html`, 'utf8'); const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];
    const others = L.PAGES.filter(p => p !== PAGE).map(p => fs.readFileSync(`${L.REPO}/${p}index.html`, 'utf8').match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);
    L.rec("PRV-13 'wasm-unsafe-eval' e worker-src 'self' so na pagina de SQL; sem unsafe-eval/unsafe-inline/blob:/data: em script; sem dominio externo", /script-src 'self' 'wasm-unsafe-eval';/.test(csp) && /worker-src 'self'/.test(csp) && !/unsafe-eval|unsafe-inline|blob:|https?:|\*/.test(csp.replace("'wasm-unsafe-eval'", '')) && others.every(o => !/wasm-unsafe-eval/.test(o)), 'CSP SQL: ' + csp);
    const c = await L.ctx(br, {}); const pg = await c.newPage(); const msgs = []; pg.on('console', m => msgs.push(m.text()));
    await pg.route('**/__probe__.html', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"></head><body>
<script>window.__inl=1</script><img src="x" onerror="window.__inl2=1"><img src="https://example.com/a.png">
<script src="/tests/hub/csp-probe.js"></script></body></html>` }));
    await pg.goto(L.BASE + '/__probe__.html'); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => ({ inlineScript: window.__inl ? 'EXECUTOU' : 'bloqueado', inlineHandler: window.__inl2 ? 'EXECUTOU' : 'bloqueado', ...window.__probe }));
    L.rec("PRV-13 com a CSP da pagina de SQL (inclui 'wasm-unsafe-eval'): script inline, onerror inline, eval e new Function continuam bloqueados; imagem externa bloqueada", r.inlineScript === 'bloqueado' && r.inlineHandler === 'bloqueado' && r.eval === 'bloqueado' && r.fn === 'bloqueado' && msgs.some(t => /example\.com/.test(t)), JSON.stringify(r) + ' console: ' + msgs.filter(t => /Content Security/.test(t)).map(t => t.slice(0, 110)).join(' | '));
    await c.close();
    // pagina real: sem violacao de CSP no console e sem script inline no HTML
    const c2 = await L.ctx(br, {}); const p2 = await c2.newPage(); const m2 = []; p2.on('console', m => m2.push(m.text())); await p2.goto(`${L.BASE}/${PAGE}`); await ready(p2); await run(p2, 'SELECT 1'); await loadSample(p2);
    L.rec('PRV-13 pagina real de SQL: nenhuma violacao de CSP no console, nenhum <script> inline nem on*= nem style= no HTML', !m2.some(t => /Content Security|Refused/.test(t)) && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html) && !/\son[a-z]+\s*=|\sstyle\s*=/i.test(html), `console=${JSON.stringify(m2)}`);
    await c2.close();
    // canario (metodo 5.2): o texto do SQL digitado nunca sai; nenhuma requisicao carrega o canario; nenhuma outra origem
    const c3 = await L.ctx(br, { lang: 'en' }); const p3 = await c3.newPage(); const reqs = [];
    p3.on('request', q => reqs.push({ url: q.url(), post: q.postData() || '', h: JSON.stringify(q.headers()) }));
    await p3.goto(`${L.BASE}/${PAGE}`); await ready(p3);
    await loadSample(p3, 'rh'); const gc = await grab(p3);
    await run(p3, `SELECT '${'CANARIO-SQL-51b2'}' AS c, * FROM departamentos`); const g3 = await grab(p3);
    const hit = reqs.filter(q => /CANARIO|9f3a7c|51b2|4c8e1b/i.test(decodeURIComponent(q.url) + q.post + q.h));
    L.rec('PRV-01..05 canario no SQL digitado: zero ocorrencia em URL, cabecalho ou corpo de requisicao; zero outra origem', g3.body.length > 0 && hit.length === 0 && reqs.every(q => q.url.startsWith(L.BASE)), `requisicoes=${reqs.length} ocorrencias=${JSON.stringify(hit)} linhas=${g3.body.length} tabelas=${gc.schema.length}`);
    // rede cortada depois do primeiro carregamento: continua funcionando (o texto do .sql do cenario fica em cache na pagina)
    await c3.setOffline(true); await run(p3, "SELECT 'offline' AS x"); const off = await grab(p3);
    await loadSample(p3, 'rh'); const off2 = await grab(p3);
    L.rec('T-310 com a rede cortada depois do primeiro carregamento: consulta e recarga do cenario ja baixado continuam funcionando', off.body[0][0] === 'offline' && off2.schema.length === 6 && !off2.errVisible, `consulta=${JSON.stringify(off.body)} tabelas=${off2.schema.length}`);
    await c3.close(); }

  // ===== Idioma (SQL-52) =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light');
    await loadSample(pg); await run(pg, 'SELECT id, nome FROM clientes LIMIT 3'); await run(pg, 'SELECT * FROM nada');
    const en = await grab(pg); await pg.click('[data-lang=pt]'); const pt = await grab(pg);
    await pg.click('[data-lang=en]'); const en2 = await grab(pg);
    L.rec('SQL-52 troca EN->PT com resultado, erro e esquema na tela: rotulos, dica, legenda e esquema mudam; mensagem do motor permanece no idioma original; dados nao somem', en.errT === 'SQL error' && pt.errT === 'Erro de SQL' && pt.errM === en.errM && /no such table/.test(pt.errM) && pt.errH !== en.errH && en.cap.startsWith('3 rows') && pt.cap.startsWith('3 linhas') && pt.body.length === 3 && /banco de exemplo$/.test(pt.schema[0].cap) && /sample database$/.test(en.schema[0].cap) && en2.errT === 'SQL error' && pt.runText === 'Executar', `en: "${en.errT}" "${en.cap}" "${en.schema[0].cap}" | pt: "${pt.errT}" "${pt.errM}" "${pt.cap}" "${pt.schema[0].cap}" status="${pt.status}"`);
    await c.close(); }

  // ===== Teclado (SQL-51) =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light');
    const seq = []; let n = 0;
    for (; n < 40; n++) { await pg.keyboard.press('Tab'); const id = await pg.evaluate(() => document.activeElement.id || document.activeElement.tagName); seq.push(id); if (id === 'sqlEditor') break; }
    const vis = await pg.evaluate(() => { const e = document.activeElement; return { fv: e.matches(':focus-visible'), o: getComputedStyle(e).outlineStyle + ' ' + getComputedStyle(e).outlineWidth }; });
    await pg.keyboard.press('Control+A'); await pg.keyboard.type('SELECT 6*7 AS answer'); await pg.keyboard.press('Control+Enter'); await ready(pg);
    const seq2 = []; for (let i = 0; i < 12; i++) { await pg.keyboard.press('Tab'); const id = await pg.evaluate(() => document.activeElement.id || document.activeElement.tagName); seq2.push(id); if (id === 'sqlResBox') break; }
    const g = await grab(pg);
    // Esc depois Tab sai do editor sem prender o foco
    await pg.focus('#sqlEditor'); await pg.keyboard.press('Escape'); await pg.keyboard.press('Tab'); const out = await pg.evaluate(() => document.activeElement.id);
    // Shift+Tab volta ao editor; Enter no botao executa
    await pg.keyboard.press('Shift+Tab'); const back = await pg.evaluate(() => document.activeElement.id);
    await pg.focus('#sqlRun'); await pg.keyboard.press('Enter'); await ready(pg);
    L.rec('SQL-51/CSV-05 so teclado: Tab chega ao editor, digitar, Ctrl+Enter executa, Tab chega a regiao do resultado; Esc depois Tab sai do editor (foco nao fica preso); foco visivel; Enter no botao executa', seq[seq.length - 1] === 'sqlEditor' && vis.fv && vis.o !== 'none 0px' && g.body[0][0] === '42' && seq2[seq2.length - 1] === 'sqlResBox' && out === 'sqlRun' && back === 'sqlEditor',
      `Tab ate o editor=${seq.join(' > ')} foco-visivel=${vis.fv} outline=${vis.o}; resultado=${JSON.stringify(g.body)}; Tab ate o resultado=${seq2.join(' > ')}; Esc,Tab -> ${out}; Shift+Tab -> ${back}`);
    await c.close(); }

  // ===== 360px, temas, axe =====
  for (const theme of ['light', 'dark']) for (const lang of ['en', 'pt']) {
    const { c, pg } = await open(br, L.BASE, lang, theme, 360);
    const m = () => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const res = [['inicial', await m()]];
    await loadSample(pg, 'atendimento'); res.push(['atendimento carregado (seletor, ER e esquema)', await m()]);
    await run(pg, 'SELECT * FROM interacoes LIMIT 5'); res.push(['resultado largo', await m()]);
    await run(pg, 'SELECT * FROM interacoes'); res.push(['interacoes 566 linhas', await m()]);
    await pg.click('#sqlPicker .sc-er summary'); res.push(['diagrama ER aberto', await m()]);
    await run(pg, 'SELEC 1'); res.push(['erro', await m()]);
    await loadSample(pg, 'loja-exemplo'); res.push(['aviso de substituicao', await m()]);
    await run(pg, 'SELECT 1 WHERE 0'); res.push(['sem linhas', await m()]);
    L.rec(`RSP/SQL-360px (${lang}/${theme}): sem rolagem horizontal da pagina em todos os estados`, res.every(([, x]) => x.sw <= x.cw), JSON.stringify(res));
    if (AXE) {
      const out = [];
      const states = [['inicial', async () => { await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); }], ['cenario carregado + resultado', async () => { await loadSample(pg, 'logistica'); await run(pg, 'SELECT * FROM entregas LIMIT 20'); }], ['aviso de substituicao', async () => { await loadSample(pg, 'rh'); }], ['erro de SQL', async () => { await run(pg, 'SELEC 1'); }], ['sem linhas', async () => { await run(pg, 'SELECT 1 WHERE 0'); }], ['tempo limite', async () => { await pg.selectOption('#sqlTimeout', '5'); await pg.fill('#sqlEditor', 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT count(*) FROM c'); await pg.click('#sqlRun'); await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state !== 'running', null, { timeout: 15000 }); await ready(pg); }]];
      for (const [st, fn] of states) {
        await fn(); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE);
        const r = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })); });
        out.push(`${st}: ${r.length ? JSON.stringify(r) : 'sem violacoes'}`);
      }
      L.rec(`A11-02 axe (${lang}/${theme}/360) nos estados dinamicos (inicial, cenario+resultado, aviso, erro, sem linhas, tempo limite): zero violacoes`, out.every(s => /sem violacoes/.test(s)), out.join('\n'));
    }
    await c.close();
  }
  { const { c, pg } = await open(br, L.BASE, 'en', 'dark', 1280);
    await loadSample(pg, 'marketing-digital'); await run(pg, 'SELECT * FROM leads LIMIT 20'); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE);
    const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => v.id + ' ' + v.impact));
    L.rec('A11-02 axe (en/dark/1280) cenario carregado com resultado: zero violacoes', r.length === 0, JSON.stringify(r)); await c.close(); }

  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
