// Exercicios guiados do SQL playground (T-307): verificacao automatica pass/fail.
// Oraculo: docs/testing/fixtures/compute_exercises_expected.py (sqlite3 do Python em Python puro, sobre o MESMO .sql).
// Regra de comparacao: hub/assets/data/exercicios.md. As solucoes e os erros abaixo sao escritos AQUI, nao copiados do Hub.
const L = require('./lib'); const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const PAGE = 'hub/ferramentas/sql/'; const SQLF = path.join(L.REPO, 'hub/assets/data/loja-exemplo.sql');
const ORA = path.join(L.REPO, 'docs/testing/fixtures/compute_exercises_expected.py');
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
if (!AXE) L.rec('EX-A11 axe-core presente em ' + L.AXE_PATH, false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
const T0 = 60000, IDS = ['filtro', 'join', 'leftjoin', 'grupo', 'sub'];
const E = JSON.parse(cp.execFileSync('python3', ['-I', ORA, SQLF], { maxBuffer: 64 << 20 }).toString());
// numero de linhas que uma consulta (sqlite3 do Python) devolve: para saber qual mensagem de falha esperar
const pyN = sql => Number(cp.execFileSync('python3', ['-I', '-c', 'import sqlite3,sys\nc=sqlite3.connect(":memory:");c.executescript(open(sys.argv[1],encoding="utf-8").read());print(len(c.execute(sys.argv[2]).fetchall()))', SQLF, sql]).toString().trim());

const ready = (pg, ms = T0) => pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state === 'ready', null, { timeout: ms });
async function open(br, base, lang, theme, vp = 1280) {
  const c = await L.ctx(br, { lang, theme, vp }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  const dialogs = { n: 0 }; pg.on('dialog', d => { dialogs.n++; d.dismiss(); });
  await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' }); await ready(pg);
  return { c, pg, log, dialogs };
}
async function loadSample(pg) { await pg.click('#sqlSampleBtn'); await pg.waitForFunction(() => /^(Sample database loaded|Banco de exemplo carregado)/.test(document.getElementById('sqlStatus').textContent) || !document.getElementById('sqlErr').hidden, null, { timeout: T0 }); await ready(pg); }
async function run(pg, sql) { await pg.fill('#sqlEditor', sql); await pg.click('#sqlRun'); await ready(pg); }
const grabMain = pg => pg.evaluate(() => ({ header: [...document.querySelectorAll('#sqlResTable thead th')].map(e => e.textContent), body: [...document.querySelectorAll('#sqlResTable tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)), box: !document.getElementById('sqlResBox').hidden }));
// verifica um exercicio: escreve no textarea do exercicio, clica Verificar, espera o motor voltar
async function verify(pg, id, sql) {
  await pg.fill('#sqlExTa-' + id, sql); await pg.click('#sqlExV-' + id); await ready(pg);
  return fb(pg, id);
}
const fb = (pg, id) => pg.evaluate(i => { const g = x => document.getElementById(x); return { text: g('sqlExFb-' + i).textContent, pass: !!g('sqlExFb-' + i).querySelector('.is-pass'), state: g('sqlExState-' + i).textContent, solved: g('sqlExState-' + i).closest('li').classList.contains('is-solved'), sol: g('sqlExSol-' + i).textContent, solVisible: !g('sqlExSol-' + i).closest('.sql-ex-sol').hidden, prog: g('sqlExProg').textContent, status: g('sqlStatus').textContent }; }, id);
const norm = v => (v === null ? 'NULL' : String(v));
const num = (a, b) => a.trim() !== '' && b.trim() !== '' && !isNaN(Number(a)) && !isNaN(Number(b));
const same = (a, b) => num(a, b) ? Math.abs(Number(a) - Number(b)) <= 1e-9 * Math.max(1, Math.abs(Number(b))) : a === b;
const rowsEq = (got, exp, ordered) => { const e = exp.map(r => r.map(norm)); const g = got.map(r => r.slice()); if (g.length !== e.length) return false;
  if (!ordered) { const k = r => JSON.stringify(r.map(v => num(v, v) ? String(Number(v)) : v)); g.sort((a, b) => k(a) < k(b) ? -1 : 1); e.sort((a, b) => k(a) < k(b) ? -1 : 1); }
  return g.every((r, i) => r.length === e[i].length && r.every((v, j) => same(v, e[i][j]))); };
const counts = async pg => { await run(pg, "SELECT 'c' AS t, COUNT(*) AS n FROM clientes UNION ALL SELECT 'k', COUNT(*) FROM categorias UNION ALL SELECT 'p', COUNT(*) FROM produtos UNION ALL SELECT 'e', COUNT(*) FROM pedidos UNION ALL SELECT 'i', COUNT(*) FROM itens_pedido"); return (await grabMain(pg)).body.map(r => r.join('=')).join(','); };

// Solucoes corretas (escritas aqui, uma por exercicio) e variantes
const OK = {
  filtro: 'SELECT nome, preco, estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome',
  join: "SELECT p.id AS pedido_id, c.nome AS cliente, p.data_pedido FROM pedidos p INNER JOIN clientes c ON c.id = p.cliente_id WHERE p.status = 'enviado'",
  leftjoin: 'SELECT c.id, c.nome, c.cidade FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL',
  grupo: "SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos WHERE status <> 'cancelado' GROUP BY cliente_id HAVING COUNT(*) >= 8",
  sub: 'SELECT nome, preco, categoria_id FROM produtos p WHERE preco > (SELECT AVG(preco) FROM produtos WHERE categoria_id = p.categoria_id)'
};
const rx = { cols: /returns (\d+) columns, but the exercise asks for (\d+)/, names: /name of column (\d+) is "([^"]*)"/, rows: /returns (\S+) rows, but (\d+) are expected/, value: /Different value in row (\d+), column (\d+) \((\w+)\)/, order: /not in the order the exercise asks for\. The order first differs at row (\d+)/, set: /the set of rows differs/ };

(async () => {
  // ===== A. Oraculo: forma e contagens =====
  L.rec('EX-01 oraculo Python independente: 5 exercicios, linhas 4/9/5/9/10, so o exercicio 1 e ordenado, colunas conforme o exercicio.md',
    JSON.stringify(IDS.map(i => E[i].rows.length)) === '[4,9,5,9,10]' && IDS.every(i => E[i].ordered === (i === 'filtro')) && JSON.stringify(E.filtro.columns) === '["nome","preco","estoque"]' && JSON.stringify(E.leftjoin.columns) === '["id","nome","cidade"]' && E.leftjoin.rows.some(r => r[2] === null),
    JSON.stringify(IDS.map(i => [i, E[i].rows.length, E[i].ordered])));
  const doc = fs.readFileSync(path.join(L.REPO, 'hub/assets/data/exercicios.md'), 'utf8'), wk = fs.readFileSync(path.join(L.REPO, 'hub/assets/js/sql-worker.js'), 'utf8');
  L.rec('EX-02 regra de comparacao documentada em exercicios.md E no codigo (sqVerify), antes dos exercicios; tolerancia 1e-9 em ambos', /## 1\. Regra de comparação/.test(doc) && /1e-9/.test(doc) && /REGRA DE COMPARACAO/.test(wk) && /1e-9/.test(wk) && doc.indexOf('## 1. Regra') < doc.indexOf('## 6. Os cinco exercícios') && /multiconjunto/i.test(doc), 'conferido por regex');

  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();

  // ===== B. Estrutura PT/EN, banco exigido, corretas passam, resultado = oraculo =====
  for (const [base, label] of [[L.BASE, 'raiz'], [L.SUB, 'subpasta']]) for (const lang of ['en', 'pt']) {
    const { c, pg, log, dialogs } = await open(br, base, lang, 'light'); const tag = `(${label}, ${lang})`;
    const info = await pg.evaluate(() => [...document.querySelectorAll('#sqlExList > li')].map(li => ({ h: li.querySelector('h3').textContent, q: li.querySelector('p').textContent, hint: li.querySelector('details p').textContent, sum: li.querySelector('summary').textContent, btn: li.querySelector('.btn-accent').textContent, ta: !!li.querySelector('textarea'), lbl: li.querySelector('label').textContent })));
    L.rec(`EX-10 ${tag} secao Exercicios com 5 itens: titulo, enunciado, dica, caixa rotulada e botao Verificar no idioma`, info.length === 5 && info.every(i => i.h.length > 10 && i.q.length > 30 && i.hint.length > 20 && i.ta && i.lbl.length > 5) && info.every(i => i.btn === (lang === 'pt' ? 'Verificar' : 'Check')) && info.every(i => i.sum === (lang === 'pt' ? 'Dica' : 'Hint')) && (await pg.textContent('#sqlExH')) === (lang === 'pt' ? 'Exercícios' : 'Exercises'), JSON.stringify(info[0]));
    // sem banco: pedido para carregar; com o texto pronto, o botao carrega e verifica
    let r = await verify(pg, 'leftjoin', OK.leftjoin);
    const hasLoad = await pg.locator('#sqlExFb-leftjoin button').count();
    L.rec(`EX-11 ${tag} banco de exemplo nao carregado: Verificar nao executa, avisa e oferece carregar (botao dentro do aviso)`, !r.pass && (lang === 'pt' ? /não está carregado/ : /not loaded/).test(r.text) && hasLoad === 1 && (await pg.locator('#sqlSchema table').count()) === 0, `fb="${r.text}"`);
    await pg.click('#sqlExFb-leftjoin button'); await pg.waitForFunction(() => /^(Correct|Correto)/.test(document.getElementById('sqlExFb-leftjoin').textContent), null, { timeout: T0 }); await ready(pg);
    r = await fb(pg, 'leftjoin');
    L.rec(`EX-12 ${tag} "Carregar e verificar": carrega o exemplo (5 tabelas) e ja verifica; resposta correta passa`, r.pass && r.solved && (await pg.locator('#sqlSchema table').count()) === 5, `fb="${r.text}" prog="${r.prog}"`);
    if (lang === 'en' && base === L.BASE) {
      const rest = IDS.filter(i => i !== 'leftjoin'); const out = [];
      for (const id of rest) { r = await verify(pg, id, OK[id]); out.push(`${id}: pass=${r.pass} solved=${r.solved}`); if (!r.pass || !r.solved) out.push('  ' + r.text); }
      r = await fb(pg, 'filtro');
      L.rec('EX-13 cada exercicio: uma solucao correta (escrita no teste) passa, marca Resolvido e mostra a solucao de referencia', out.every(l => /pass=true solved=true|^ /.test(l)) && out.filter(l => /pass=true/.test(l)).length === 4 && (await fb(pg, 'leftjoin')).solVisible, out.join('\n'));
      L.rec('EX-14 progresso "5 de 5" em memoria; estado textual "Solved" (nao so cor)', /^5 of 5 exercises solved/.test(r.prog) && (await Promise.all(IDS.map(i => fb(pg, i)))).every(x => x.state === 'Solved'), r.prog);
      // solucao de referencia do Hub (revelada) executada no playground = oraculo; solucao do teste tambem
      const res = []; let allRef = true, allMine = true;
      for (const id of IDS) {
        const ref = await pg.textContent('#sqlExSol-' + id);
        await run(pg, ref); const g1 = await grabMain(pg);
        await run(pg, OK[id]); const g2 = await grabMain(pg);
        const okRef = g1.header.map(h => h.toLowerCase()).join() === E[id].columns.join() && rowsEq(g1.body, E[id].rows, E[id].ordered);
        const okMine = g2.header.map(h => h.toLowerCase()).join() === E[id].columns.join() && rowsEq(g2.body, E[id].rows, E[id].ordered);
        allRef = allRef && okRef; allMine = allMine && okMine; res.push(`${id}: ref=${okRef} teste=${okMine} linhas=${g1.body.length}/${g2.body.length}`);
      }
      L.rec('EX-15 resultado esperado: a consulta de referencia do Hub (revelada), executada no playground, e a solucao do teste igualam o oraculo Python (colunas, linhas, ordem no ex. 1)', allRef && allMine, res.join('\n'));
    }
    // PT/EN: textos de cada exercicio diferem entre idiomas
    L.rec(`EX-16 ${tag} sem pageerror, sem dialogo nativo, sem erro de console`, log.pageerrors.length === 0 && dialogs.n === 0 && log.consoleErrors.length === 0, JSON.stringify({ pe: log.pageerrors, ce: log.consoleErrors }));
    await c.close();
  }
  { const t = {}; for (const lang of ['en', 'pt']) { const { c, pg } = await open(br, L.BASE, lang, 'light'); t[lang] = await pg.evaluate(() => [...document.querySelectorAll('#sqlExList > li')].map(li => li.querySelector('h3').textContent + '|' + li.querySelector('p').textContent + '|' + li.querySelector('details p').textContent)); await c.close(); }
    L.rec('EX-17 titulo, enunciado e dica de cada um dos 5 exercicios diferem entre PT e EN (traduzidos)', t.en.length === 5 && t.pt.length === 5 && t.en.every((x, i) => x !== t.pt[i]), `ex.: ${t.en[0].slice(0, 50)} / ${t.pt[0].slice(0, 50)}`); }
  { const r = cp.spawnSync('node', [path.join(L.REPO, 'docs/testing/check-i18n-keys.js')]); const o = r.stdout.toString();
    const m = /EN=(\d+) PT=(\d+)/.exec(o); const keys = fs.readFileSync(path.join(L.REPO, 'hub/assets/js/i18n.js'), 'utf8').match(/"hub\.sql\.ex\.[\w.]+"/g) || [];
    L.rec('EX-18 check-i18n-keys.js sai 0 e as chaves hub.sql.ex.* existem igualmente nos dois idiomas (cada chave 2 vezes)', r.status === 0 && m && m[1] === m[2] && keys.length > 0 && keys.length % 2 === 0 && new Set(keys).size * 2 === keys.length, `exit=${r.status} EN=${m && m[1]} PT=${m && m[2]} chaves hub.sql.ex.*=${new Set(keys).size}`); }

  // ===== C. Falhas: mensagens uteis, sem revelar a resposta =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg); const res = []; let allOk = true;
    const T = async (id, sql, kind, extra) => { const r = await verify(pg, id, sql); let ok = !r.pass && !r.solved && rx[kind].test(r.text) && r.text.startsWith('Not yet.'); const mm = rx[kind].exec(r.text); if (ok && extra) ok = extra(mm); res.push(`${ok ? 'ok ' : 'FALHOU '}${id}/${kind}: "${r.text}"`); allOk = allOk && ok; return r; };
    // exercicio 1 (ordenado)
    await T('filtro', 'SELECT nome, preco FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome', 'cols', m => m[1] === '2' && m[2] === '3');
    await T('filtro', 'SELECT nome AS produto, preco, estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome', 'names', m => m[1] === '1' && m[2] === 'produto');
    const nMore = pyN('SELECT 1 FROM produtos WHERE estoque < 40');
    await T('filtro', 'SELECT nome, preco, estoque FROM produtos WHERE estoque < 40 ORDER BY preco DESC, nome', 'rows', m => Number(m[1]) === nMore && m[2] === '4' && nMore !== 4);
    await T('filtro', 'SELECT nome, preco, estoque FROM produtos WHERE estoque < 20 ORDER BY preco ASC, nome', 'order', m => m[1] === '1');
    await T('filtro', 'SELECT nome, preco + 0.5 AS preco, estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome', 'value', m => m[1] === '1' && m[2] === '2' && m[3] === 'preco');
    await T('filtro', 'SELECT nome, preco, estoque + 1 AS estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome', 'value', m => m[2] === '3');
    // exercicio 2 (conjunto)
    await T('join', "SELECT p.id AS pedido_id, c.nome AS cliente FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.status = 'enviado'", 'cols', m => m[1] === '2' && m[2] === '3');
    const nAll = pyN('SELECT 1 FROM pedidos');
    await T('join', 'SELECT p.id AS pedido_id, c.nome AS cliente, p.data_pedido FROM pedidos p JOIN clientes c ON c.id = p.cliente_id', 'rows', m => Number(m[1]) === nAll && m[2] === '9');
    await T('join', "SELECT p.id AS pedido_id, c.cidade AS cliente, p.data_pedido FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.status = 'enviado'", 'set');
    await T('join', "SELECT p.id AS pedido_id, UPPER(c.nome) AS cliente, p.data_pedido FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.status = 'enviado'", 'set');   // texto diferencia maiusculas
    // exercicio 3: NULL, INNER em vez de LEFT
    await T('leftjoin', 'SELECT c.id, c.nome, c.cidade FROM clientes c JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL', 'rows', m => m[1] === '0' && m[2] === '5');
    await T('leftjoin', "SELECT c.id, c.nome, COALESCE(c.cidade, '') AS cidade FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL", 'set');   // NULL so e igual a NULL
    await T('leftjoin', "SELECT c.id, c.nome, COALESCE(c.cidade, 'NULL') AS cidade FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL", 'set');   // texto 'NULL' nao e NULL
    await T('leftjoin', 'SELECT c.id, c.nome, c.cidade FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id', 'rows', m => Number(m[1]) === pyN('SELECT 1 FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id'));
    // exercicio 4
    const nG = pyN("SELECT 1 FROM pedidos GROUP BY cliente_id HAVING COUNT(*) >= 8");
    await T('grupo', 'SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id HAVING COUNT(*) >= 8', nG === 9 ? 'set' : 'rows');   // esquece de ignorar cancelados
    await T('grupo', "SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos WHERE status <> 'cancelado' GROUP BY cliente_id HAVING COUNT(*) > 8", 'rows', m => m[1] === String(pyN("SELECT 1 FROM pedidos WHERE status <> 'cancelado' GROUP BY cliente_id HAVING COUNT(*) > 8")));
    await T('grupo', "SELECT cliente_id, COUNT(*) AS total FROM pedidos WHERE status <> 'cancelado' GROUP BY cliente_id HAVING COUNT(*) >= 8", 'names', m => m[1] === '2' && m[2] === 'total');
    // exercicio 5
    await T('sub', 'SELECT nome, preco, categoria_id FROM produtos WHERE preco > (SELECT AVG(preco) FROM produtos)', pyN('SELECT 1 FROM produtos WHERE preco > (SELECT AVG(preco) FROM produtos)') === 10 ? 'set' : 'rows');
    await T('sub', 'SELECT nome, preco FROM produtos p WHERE preco > (SELECT AVG(preco) FROM produtos WHERE categoria_id = p.categoria_id)', 'cols', m => m[1] === '2' && m[2] === '3');
    L.rec('EX-20 falhas por exercicio com mensagem esperada: colunas (numero), nomes (posicao e nome), linhas (n obtido/esperado), ordem (linha), valor (linha, coluna, nome), conjunto, NULL vs texto, maiusculas no texto', allOk && res.length === 19, res.join('\n'));
    // nao revela a resposta: nenhuma mensagem contem valores esperados nem a SQL de referencia; exercicio nao ordenado nao fala de linha/coluna
    const msgs = res.join('\n'); const nonOrdered = res.filter(l => !/^(ok |FALHOU )filtro/.test(l));
    L.rec('EX-21 mensagens de falha NAO revelam a resposta: sem valores esperados (nomes/precos/ids do oraculo) nem SQL de referencia; exercicios sem ORDER BY nunca citam linha/coluna', !E.filtro.rows.some(r => msgs.includes(String(r[0]))) && !/SELECT|WHERE|HAVING|JOIN/.test(msgs.replace(/"[^"]*"/g, '')) && nonOrdered.every(l => !/row \d+, column|first differs/.test(l)) && !(await pg.evaluate(() => document.body.textContent.includes('WHERE p.id IS NULL\nHAVING') || document.getElementById('sqlExSol-leftjoin').textContent !== '')), 'verificado nos textos das 19 falhas');
    // erros de SQL, vazio, sem resultado
    let r = await verify(pg, 'filtro', 'SELEC nome FROM produtos'); const e1 = r.text;
    r = await verify(pg, 'filtro', 'INSERT INTO categorias (nome) VALUES (\'zz\')'); const e2 = r.text;
    await pg.fill('#sqlExTa-filtro', '   '); await pg.click('#sqlExV-filtro'); r = await fb(pg, 'filtro'); const e3 = r.text;
    r = await verify(pg, 'filtro', 'SELECT nome FROM produtos_inexistente'); const e4 = r.text;
    L.rec('EX-22 erro de SQL (mensagem do motor + instrucao), so INSERT (sem linhas), caixa vazia: mensagens claras; motor segue utilizavel', /^Not yet\. SQL error in statement 1: .*syntax error/i.test(e1) && /no statement returned rows/.test(e2) && /Write a query first/.test(e3) && /no such table/.test(e4) && (await pg.isEnabled('#sqlRun')), JSON.stringify([e1, e2, e3, e4]));
    await c.close(); }

  // ===== D. Equivalentes, tipos, tolerancia, case-insensitive, ordem ignorada =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg); const res = []; let allOk = true;
    const P = async (id, sql, why) => { const r = await verify(pg, id, sql); const ok = r.pass && r.solved; res.push(`${ok ? 'ok ' : 'FALHOU '}${id}: ${why}${ok ? '' : ' -> ' + r.text}`); allOk = allOk && ok; };
    await P('filtro', 'SELECT NOME, Preco, ESTOQUE FROM produtos WHERE NOT estoque >= 20 ORDER BY 2 DESC, 1', 'nomes de coluna sem diferenciar maiusculas, ORDER BY por posicao');
    await P('filtro', 'SELECT nome, preco * 1.0 AS preco, CAST(estoque AS REAL) AS estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome', 'REAL no lugar de INTEGER (estoque 12 = 12.0)');
    await P('filtro', 'SELECT nome, preco + 1e-12 AS preco, estoque FROM produtos WHERE estoque < 20 ORDER BY preco DESC, nome', 'REAL dentro da tolerancia 1e-9');
    await P('join', "SELECT p.id AS pedido_id, (SELECT nome FROM clientes WHERE id = p.cliente_id) AS cliente, p.data_pedido FROM pedidos p WHERE p.status = 'enviado' ORDER BY cliente DESC", 'subconsulta no lugar de JOIN, outra ordem de linhas (sem ORDER BY exigido)');
    await P('join', "SELECT pedidos.id AS pedido_id, clientes.nome AS cliente, pedidos.data_pedido FROM pedidos, clientes WHERE clientes.id = pedidos.cliente_id AND pedidos.status = 'enviado'", 'JOIN implicito (virgula)');
    await P('leftjoin', 'SELECT id, nome, cidade FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id) ORDER BY id DESC', 'NOT EXISTS, ordem invertida');
    await P('leftjoin', 'SELECT id, nome, cidade FROM clientes WHERE id NOT IN (SELECT cliente_id FROM pedidos)', 'NOT IN');
    await P('grupo', "SELECT cliente_id, CAST(COUNT(*) AS REAL) AS pedidos FROM pedidos WHERE status <> 'cancelado' GROUP BY cliente_id HAVING COUNT(*) >= 8", 'contagem REAL (11.0) = INTEGER (11)');
    await P('grupo', "SELECT cliente_id AS CLIENTE_ID, SUM(1) AS Pedidos FROM (SELECT * FROM pedidos WHERE status != 'cancelado') GROUP BY cliente_id HAVING SUM(1) >= 8", 'subconsulta na origem + SUM(1), nomes em outra caixa');
    await P('sub', 'SELECT p.nome, p.preco, p.categoria_id FROM produtos p JOIN (SELECT categoria_id, AVG(preco) AS m FROM produtos GROUP BY categoria_id) x ON x.categoria_id = p.categoria_id WHERE p.preco > x.m', 'JOIN com tabela de medias no lugar da subconsulta correlacionada');
    await P('sub', 'SELECT nome, preco, categoria_id FROM produtos p WHERE preco > (SELECT AVG(preco) FROM produtos WHERE categoria_id = p.categoria_id) ORDER BY nome DESC', 'ordem diferente aceita fora de exercicio ordenado');
    L.rec('EX-30 solucoes equivalentes de outra forma passam (JOIN x subconsulta x NOT EXISTS x NOT IN, REAL x INTEGER, tolerancia, caixa dos nomes, ordem livre em exercicio sem ORDER BY)', allOk && res.length === 11, res.join('\n'));
    // ordem so conta em exercicio ordenado: mesma resposta do ex. 1 com ordem diferente falha, nos demais passa (provado acima)
    const r = await verify(pg, 'filtro', 'SELECT nome, preco, estoque FROM produtos WHERE estoque < 20 ORDER BY nome');
    L.rec('EX-31 exercicio ordenado: mesmas linhas em ordem diferente falham (mensagem de ordem, nao de valor)', !r.pass && rx.order.test(r.text), r.text);
    await c.close(); }

  // ===== E. Consulta destrutiva nao corrompe o banco nem a proxima verificacao =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg); const before = await counts(pg);
    const D = [
      "DELETE FROM pedidos; DELETE FROM itens_pedido; DROP TABLE clientes; INSERT INTO produtos (nome, preco) VALUES ('x', 1); UPDATE produtos SET preco = 0; SELECT 1 AS a",
      'COMMIT; ROLLBACK; BEGIN; DROP TABLE produtos; COMMIT; SELECT 1 AS a',
      'DROP TABLE produtos; DROP TABLE categorias; DROP TABLE itens_pedido; DROP TABLE pedidos; DROP TABLE clientes',
      'PRAGMA writable_schema = ON; DELETE FROM sqlite_master; SELECT 1 AS a'];
    const outs = [];
    for (const [i, d] of D.entries()) { const r1 = await verify(pg, 'join', d); const r2 = await verify(pg, 'grupo', OK.grupo); const r3 = await verify(pg, 'sub', OK.sub); const mid = await counts(pg); outs.push(`#${i + 1}: destrutiva="${r1.text.slice(0, 70)}" depois grupo=${r2.pass} sub=${r3.pass} banco=${mid === before}`); }
    const solvedFlags = (await Promise.all(IDS.map(i => fb(pg, i)))).map(x => x.solved);
    L.rec('EX-40 consulta destrutiva do usuario (DELETE/DROP/INSERT/UPDATE/COMMIT/ROLLBACK/writable_schema) falha com mensagem normal, nao corrompe o banco do playground (contagens iguais) e a verificacao seguinte passa', outs.every(o => /grupo=true sub=true banco=true/.test(o)) && outs.every(o => /^#\d+: destrutiva="Not yet\./.test(o)) && solvedFlags.join() === 'false,false,false,true,true', outs.join('\n'));
    // banco do playground alterado pelo usuario: a verificacao julga contra os dados originais
    await run(pg, 'DELETE FROM produtos'); await run(pg, 'DELETE FROM clientes');
    const r = await verify(pg, 'filtro', OK.filtro); const r2 = await verify(pg, 'leftjoin', OK.leftjoin);
    await run(pg, 'SELECT COUNT(*) FROM produtos'); const n0 = (await grabMain(pg)).body[0][0];
    L.rec('EX-41 mesmo com tabelas do playground esvaziadas pelo usuario, a verificacao (banco novo e privado) passa e nao altera o banco do usuario (produtos continua com 0)', r.pass && r2.pass && n0 === '0', `${r.text} / ${r2.text} produtos=${n0}`);
    await c.close(); }

  // ===== F. Solucao oculta ate acertar ou confirmar =====
  { const { c, pg } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg);
    const hidden = async id => pg.evaluate(i => ({ solHidden: document.getElementById('sqlExSol-' + i).closest('.sql-ex-sol').hidden, code: document.getElementById('sqlExSol-' + i).textContent, confHidden: document.getElementById('sqlExConf-' + i).hidden, showVisible: !document.getElementById('sqlExS-' + i).hidden }), id);
    let h = await hidden('leftjoin'); const body0 = await pg.evaluate(() => document.body.textContent);
    L.rec('EX-50 antes de acertar: sem SQL de referencia no DOM (nem oculta); botao "Show solution" visivel', h.solHidden && h.code === '' && h.confHidden && h.showVisible && !/LEFT JOIN pedidos p ON p\.cliente_id = c\.id\s*WHERE p\.id IS NULL/.test(body0) && !/AVG\(preco\) FROM produtos WHERE categoria_id = p\.categoria_id/.test(body0), JSON.stringify(h));
    await pg.focus('#sqlExS-leftjoin'); await pg.keyboard.press('Enter'); h = await hidden('leftjoin'); const f1 = await pg.evaluate(() => document.activeElement.id);
    L.rec('EX-51 "Show solution" pede confirmacao (painel, nao dialogo nativo): foco vai para o "Sim", solucao ainda oculta', !h.confHidden && h.solHidden && h.code === '' && f1 === 'sqlExYes-leftjoin', `foco=${f1}`);
    await pg.keyboard.press('Tab'); const f2 = await pg.evaluate(() => document.activeElement.id); await pg.keyboard.press('Enter'); h = await hidden('leftjoin'); const f3 = await pg.evaluate(() => document.activeElement.id);
    L.rec('EX-52 "Keep trying" cancela: solucao segue oculta, painel fecha e o foco volta ao botao "Show solution" (so teclado)', f2 === 'sqlExNo-leftjoin' && h.solHidden && h.confHidden && h.showVisible && f3 === 'sqlExS-leftjoin' && h.code === '', `tab->${f2} foco final=${f3}`);
    await pg.keyboard.press('Enter'); await pg.keyboard.press('Enter'); h = await hidden('leftjoin'); const f4 = await pg.evaluate(() => document.activeElement.id); const st = await fb(pg, 'leftjoin');
    L.rec('EX-53 confirmando: a solucao aparece (texto, foco na solucao); NAO conta como resolvido', !h.solHidden && /LEFT JOIN pedidos/.test(h.code) && f4 === 'sqlExSol-leftjoin' && !st.solved && /^0 of 5/.test(st.prog), `foco=${f4} state=${st.state} prog=${st.prog}`);
    // dica por teclado
    await pg.focus('#sqlExList li:nth-child(2) summary'); await pg.keyboard.press('Enter'); const open1 = await pg.evaluate(() => document.querySelector('#sqlExList li:nth-child(2) details').open);
    L.rec('EX-54 dica abre e fecha por teclado (details/summary)', open1 === true, `open=${open1}`);
    // "Testar no editor" copia o texto para o editor principal sem executar
    await pg.fill('#sqlExTa-join', OK.join); await pg.click('#sqlExT-join'); const ed = await pg.inputValue('#sqlEditor'); const f5 = await pg.evaluate(() => document.activeElement.id);
    L.rec('EX-55 "Try in the editor" coloca o texto no editor principal, foco no editor, sem executar', ed === OK.join && f5 === 'sqlEditor', `foco=${f5}`);
    await c.close(); }

  // ===== G. Estado so em memoria; privacidade; sem armazenamento alem de idioma e tema =====
  { const { c, pg, log } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg);
    for (const id of IDS) await verify(pg, id, OK[id]);
    await verify(pg, 'filtro', 'SELECT 1');
    await pg.click('[data-lang="pt"]'); const pt = await fb(pg, 'join');
    const st = await pg.evaluate(async () => ({ ls: Object.keys(localStorage).sort(), ss: Object.keys(sessionStorage), ck: document.cookie, idb: indexedDB.databases ? (await indexedDB.databases()).length : 0, caches: (await caches.keys()).length, sw: (await navigator.serviceWorker.getRegistrations()).length }));
    const cks = await c.cookies();
    L.rec('EX-60 RNF-03: localStorage so com ld-lang/ld-theme, sessionStorage/cookies/IndexedDB/Cache/Service Worker vazios, depois de resolver 5 exercicios e falhar um', st.ls.every(k => ['ld-lang', 'ld-theme'].includes(k)) && st.ss.length === 0 && st.ck === '' && cks.length === 0 && st.idb === 0 && st.caches === 0 && st.sw === 0, JSON.stringify(st));
    L.rec('EX-61 troca de idioma EN->PT com exercicios resolvidos: estado "Resolvido", progresso e mensagem de falha traduzidos, resolvidos preservados', pt.state === 'Resolvido' && /^5 de 5 exercícios resolvidos/.test(pt.prog) && /Correto!/.test(pt.text), `${pt.state} / ${pt.prog}`);
    const prt = await pg.textContent('#sqlExFb-filtro');
    L.rec('EX-62 falha tambem traduzida ao trocar o idioma (re-renderizada, nao reenviada)', /^Ainda não\. Sua consulta devolve 1 colunas, mas o exercício pede 3\./.test(prt), prt);
    await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); const after = await pg.evaluate(() => document.getElementById('sqlExProg').textContent);
    L.rec('EX-63 progresso so em memoria: recarregar a pagina volta a 0 resolvidos', /^0 (of|de) 5/.test(after), after);
    const ext = log.requests.filter(u => !u.startsWith(L.BASE) && !u.startsWith('data:') && !u.startsWith('blob:'));
    L.rec('EX-64 privacidade: zero requisicao a outra origem durante exercicios (o .sql do exemplo e a unica busca de dados)', ext.length === 0 && log.requests.filter(u => /loja-exemplo/.test(u)).length >= 1, `externas=${JSON.stringify(ext)} total=${log.requests.length}`);
    const js = fs.readFileSync(path.join(L.REPO, 'hub/assets/js/sql.js'), 'utf8'), html = fs.readFileSync(path.join(L.REPO, PAGE, 'index.html'), 'utf8'), ex = js.slice(js.indexOf('// ---------- exercícios guiados'), js.indexOf('function renderAll'));
    L.rec('EX-65 codigo dos exercicios: sem innerHTML/insertAdjacentHTML/outerHTML/document.write, sem localStorage/sessionStorage/cookie/indexedDB; CSP da pagina com connect-src \'self\' inalterada', !/innerHTML|insertAdjacentHTML|outerHTML|document\.write|localStorage|sessionStorage|document\.cookie|indexedDB/.test(ex) && /connect-src 'self';/.test(html) && !/unsafe-inline|connect-src[^;"]*https?:/.test(html), 'regex no fonte');
    await c.close(); }
  // XSS: nome de coluna/mensagem do usuario so entra como texto
  { const { c, pg, log, dialogs } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg);
    const r = await verify(pg, 'join', "SELECT 1 AS \"<img src=x onerror=alert(1)>\", 2 AS b, 3 AS c"); const r2 = await verify(pg, 'filtro', 'SELECT nome AS "<img src=x onerror=alert(1)>", preco, estoque FROM produtos');
    const imgs = await pg.locator('#sqlExList img').count();
    L.rec('EX-66 HTML no nome da coluna do usuario aparece como texto na mensagem (zero <img>, sem dialogo, sem pageerror)', imgs === 0 && dialogs.n === 0 && log.pageerrors.length === 0 && r2.text.includes('<img src=x onerror=alert(1)>') && /name of column 1/.test(r2.text), r2.text);
    await c.close(); }

  // ===== H. Tempo limite e Parar na verificacao =====
  { const { c, pg, log } = await open(br, L.BASE, 'en', 'light'); await loadSample(pg);
    const slow = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x < 1000000000) SELECT count(*) AS nome FROM c';
    await verify(pg, 'grupo', OK.grupo);
    await pg.selectOption('#sqlTimeout', '5'); await pg.fill('#sqlExTa-filtro', slow); await pg.click('#sqlExV-filtro');
    const shownStop = await pg.waitForSelector('#sqlExStop:not([hidden])', { timeout: 8000 }).then(() => true).catch(() => false);
    await pg.waitForFunction(() => document.getElementById('sqlTool').dataset.state !== 'running', null, { timeout: 30000 }); await ready(pg); await pg.waitForFunction(() => /(recreated|Reloaded)/.test(document.getElementById('sqlStatus').textContent), null, { timeout: 30000 });
    let r = await fb(pg, 'filtro'); const schemaN = await pg.locator('#sqlSchema table').count(); const keep = await pg.inputValue('#sqlExTa-filtro');
    L.rec('EX-70 tempo limite (5 s) na verificacao: botao Parar do exercicio aparece (a partir de 3 s), mensagem de tempo limite no exercicio, texto mantido, banco de exemplo recarregado', shownStop && /took more than 5 seconds/.test(r.text) && keep === slow && schemaN === 5, `stop=${shownStop} fb="${r.text}" tabelas=${schemaN}`);
    r = await verify(pg, 'join', OK.join); const g = await fb(pg, 'grupo');
    L.rec('EX-71 depois do tempo limite: nova verificacao passa e o progresso em memoria foi mantido (grupo continua resolvido)', r.pass && g.solved && /^2 of 5/.test(r.prog), `${r.text} / grupo=${g.state} prog=${r.prog}`);
    await pg.selectOption('#sqlTimeout', '30'); await pg.fill('#sqlExTa-filtro', slow); await pg.click('#sqlExV-filtro'); await pg.waitForSelector('#sqlExStop:not([hidden])', { timeout: 8000 });
    const lab = await pg.textContent('#sqlExV-filtro'); await pg.click('#sqlExStop'); await ready(pg); r = await fb(pg, 'filtro');
    await pg.waitForFunction(() => document.getElementById('sqlSchema').querySelectorAll('table').length === 5, null, { timeout: 30000 });
    const foc = await pg.evaluate(() => document.activeElement.id);
    L.rec('EX-72 Parar durante a verificacao: mensagem "voce interrompeu", rotulo "Checking..." durante, foco volta ao Verificar, motor utilizavel', /You stopped the check/.test(r.text) && lab === 'Checking...' && foc === 'sqlExV-filtro' && !log.pageerrors.length, `fb="${r.text}" rotulo="${lab}" foco=${foc}`);
    r = await verify(pg, 'leftjoin', OK.leftjoin);
    L.rec('EX-73 depois de Parar: verificacao seguinte passa', r.pass, r.text);
    await c.close(); }

  // ===== I. 360px, temas, axe, aria-live =====
  for (const theme of ['light', 'dark']) for (const lang of ['en', 'pt']) {
    const { c, pg } = await open(br, L.BASE, lang, theme, 360);
    const m = () => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const sizes = [['inicial', await m()]];
    await loadSample(pg); await verify(pg, 'filtro', 'SELECT nome, preco FROM produtos'); sizes.push(['falha', await m()]);
    await verify(pg, 'join', "SELECT 1 AS \"uma_coluna_com_nome_muito_longo_para_testar_a_quebra_de_linha_no_celular\", 2 AS b, 3 AS c"); sizes.push(['nome longo', await m()]);
    await verify(pg, 'leftjoin', OK.leftjoin); await verify(pg, 'grupo', OK.grupo); sizes.push(['resolvido + solucao', await m()]);
    await pg.click('#sqlExS-filtro'); sizes.push(['confirmacao', await m()]);
    const live = await pg.evaluate(() => [...document.querySelectorAll('#sqlExList [id^=sqlExFb-]')].map(e => e.getAttribute('aria-live') + '/' + e.getAttribute('role')).concat(document.getElementById('sqlExProg').getAttribute('aria-live') + '/' + document.getElementById('sqlExProg').getAttribute('role')));
    L.rec(`EX-80 360px (${lang}/${theme}): sem rolagem horizontal da pagina em todos os estados dos exercicios`, sizes.every(([, x]) => x.sw <= x.cw), JSON.stringify(sizes));
    L.rec(`EX-81 (${lang}/${theme}) resultado da verificacao e progresso em regioes aria-live=polite role=status presentes desde o carregamento`, live.length === 6 && live.every(x => x === 'polite/status'), live.join(' '));
    if (AXE) { const out = [];
      const probe = async st => { await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE); const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) }))); out.push(`${st}: ${r.length ? JSON.stringify(r) : 'sem violacoes'}`); };
      await probe('falha + longo + resolvido + confirmacao aberta');
      await pg.click('#sqlExYes-filtro'); await pg.click('#sqlExList li:nth-child(3) summary'); await probe('solucao mostrada (nao resolvido) + dica aberta');
      await pg.reload({ waitUntil: 'networkidle' }); await ready(pg); await pg.fill('#sqlExTa-sub', OK.sub); await pg.click('#sqlExV-sub'); await probe('aviso "carregar banco" no exercicio');
      await pg.click('#sqlExFb-sub button'); await pg.waitForFunction(() => /^(Correct|Correto)/.test(document.getElementById('sqlExFb-sub').textContent), null, { timeout: T0 }); await ready(pg); await probe('apos carregar e verificar (aprovado)');
      L.rec(`EX-82 axe (${lang}/${theme}/360) em 4 estados dos exercicios: zero violacoes`, out.every(s => /sem violacoes/.test(s)), out.join('\n')); }
    await c.close(); }
  { const { c, pg } = await open(br, L.BASE, 'pt', 'dark', 1280); await loadSample(pg); await verify(pg, 'sub', OK.sub); await verify(pg, 'join', 'SELECT 1');
    if (AXE) { await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE); const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => v.id + ' ' + v.impact)); L.rec('EX-83 axe (pt/dark/1280) exercicios com aprovado e falha: zero violacoes', r.length === 0, JSON.stringify(r)); }
    // so teclado: Tab chega a caixa, ao Verificar; Enter verifica
    await pg.focus('#sqlExTa-grupo'); await pg.keyboard.type(OK.grupo); await pg.keyboard.press('Tab'); const f = await pg.evaluate(() => document.activeElement.id); await pg.keyboard.press('Enter'); await ready(pg);
    const f2 = await pg.evaluate(() => document.activeElement.id); const r = await fb(pg, 'grupo');
    L.rec('EX-84 so teclado: Tab da caixa ao Verificar, Enter verifica; foco permanece no botao; resultado anunciado na regiao viva', f === 'sqlExV-grupo' && r.pass && f2 === 'sqlExV-grupo', `tab->${f} foco depois=${f2} fb="${r.text}"`);
    const rm = await c.newPage(); await rm.emulateMedia({ reducedMotion: 'reduce' }); await rm.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' });
    const tr = await rm.evaluate(() => getComputedStyle(document.querySelector('#sqlExList li') || document.body).transitionDuration);
    L.rec('EX-85 prefers-reduced-motion: sem transicao nos itens dos exercicios', /^0s$/.test(tr), `transitionDuration=${tr}`);
    await c.close(); }

  { const { c, pg } = await open(br, L.BASE, 'pt', 'light');
    const o = await pg.evaluate(() => { const a = document.querySelector('a[href="#sqlExH"]'), h = document.getElementById('sqlExH'), ed = document.getElementById('sqlEditor'); return { txt: a && a.textContent, target: !!h, after: !!(ed.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
    await pg.click('a[href="#sqlExH"]'); const inView = await pg.waitForFunction(() => { const r = document.getElementById('sqlExH').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; }, null, { timeout: 10000 }).then(() => true).catch(() => false);
    L.rec('EX-86 secao Exercicios depois do editor/resultado (caminho de teclado do playground inalterado) e o link no topo da pagina leva a ela (PT)', o.target && o.after && /exercícios guiados/.test(o.txt) && inView, JSON.stringify(o) + ' visivel=' + inView);
    await c.close(); }

  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
