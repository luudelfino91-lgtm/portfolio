/* =====================================================================
   SQL playground do Hub (T-304, T-305, T-307, T-309; D11: sem upload de arquivo).
   - Tudo local: o SQL e processado por um Web Worker (sql-worker.js) com sql.js vendorizado. Os UNICOS dados
     sao os 5 cenarios embutidos (scenarios.js). Unico fetch deste arquivo: o .sql do cenario escolhido
     (../data/<cenario>.sql, mesma origem, caminho relativo). Nao existe leitura de arquivo do usuario.
   - Conteudo do usuario (SQL, mensagens do motor) e dados entram SEMPRE por textContent.
   - Parar / tempo limite = worker.terminate(). O banco em memoria e recriado e o cenario carregado e recarregado
     (texto em cache, sem novo fetch). Tabelas criadas por SQL sao perdidas e a mensagem avisa.
   - Cenarios (D11): seletor comum (HubScenarios.mount). Carregar um cenario substitui as tabelas de todos os cenarios
     que estiverem no banco (varios usam o nome "clientes"). As consultas de exemplo so colocam o SQL no editor
     (o texto SQL e igual em PT e EN): 12 para Vendas (loja-exemplo) e 3 para cada um dos outros 4 cenarios (as
     consultas-chave dos oraculos docs/testing/fixtures/compute_<slug>_expected.py, com o mesmo SQL).
   - Exercicios guiados (T-307): 5 exercicios com verificacao automatica no MESMO Worker (mensagem 'verify'), com o mesmo
     limite de tempo e o mesmo Parar. SO para o cenario Vendas (exercicios dos outros cenarios = trabalho futuro T-404-b).
     A regra de comparacao esta em hub/assets/data/exercicios.md e em sql-worker.js (sqVerify).
     A verificacao roda num banco novo e descartavel (o banco do playground nunca e tocado). O progresso (quais foram
     resolvidos) fica so em memoria desta pagina: nada vai para localStorage/cookies.
   - Textos: chaves hub.sql.* e hub.sc.* em i18n.js (PT/EN).
   ===================================================================== */
(function () {
  'use strict';
  var SC = window.HubScenarios;
  var ROW_LIMIT = 1000;        // linhas exibidas no máximo
  var CELL_BUDGET = 20000;     // células exibidas no máximo (linhas x colunas)
  var STOP_AFTER_MS = 3000;    // "Parar" aparece depois de 3 s
  var WORKER_URL = new URL('sql-worker.js', document.currentScript.src).href;
  var DATA_URL = new URL('../data/', document.currentScript.src).href;
  var VENDAS = 'loja-exemplo';  // unico cenario com exercicios guiados
  // Consultas de exemplo (T-307). SQL igual nos dois idiomas; título/descrição em hub.sql.sample.q.<id>.t/.d
  var Q_ITEMS = 'SUM(ip.quantidade * ip.preco_unitario)';
  var VENDAS_QUERIES = [
    { id: 'filtro', sql: 'SELECT nome, preco\nFROM produtos\nWHERE preco > 100\nORDER BY preco DESC;' },
    { id: 'nulos', sql: 'SELECT id, nome, email\nFROM clientes\nWHERE cidade IS NULL\nORDER BY nome;' },
    { id: 'join', sql: 'SELECT p.nome AS produto, c.nome AS categoria, p.preco\nFROM produtos p\nINNER JOIN categorias c ON c.id = p.categoria_id\nORDER BY c.nome, p.nome;' },
    { id: 'join4', sql: 'SELECT ip.pedido_id, cl.nome AS cliente, pr.nome AS produto,\n       ip.quantidade, ip.preco_unitario,\n       ROUND(ip.quantidade * ip.preco_unitario, 2) AS subtotal\nFROM itens_pedido ip\nJOIN pedidos pe ON pe.id = ip.pedido_id\nJOIN clientes cl ON cl.id = pe.cliente_id\nJOIN produtos pr ON pr.id = ip.produto_id\nWHERE ip.pedido_id = 1\nORDER BY ip.id;' },
    { id: 'semped', sql: 'SELECT c.id, c.nome\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nWHERE p.id IS NULL\nORDER BY c.id;' },
    { id: 'nuncav', sql: 'SELECT pr.id, pr.nome\nFROM produtos pr\nLEFT JOIN itens_pedido ip ON ip.produto_id = pr.id\nWHERE ip.id IS NULL\nORDER BY pr.id;' },
    { id: 'grupo', sql: 'SELECT c.nome AS categoria,\n       COUNT(DISTINCT ip.pedido_id) AS pedidos,\n       SUM(ip.quantidade) AS unidades,\n       ROUND(' + Q_ITEMS + ', 2) AS receita\nFROM itens_pedido ip\nJOIN produtos pr ON pr.id = ip.produto_id\nJOIN categorias c ON c.id = pr.categoria_id\nGROUP BY c.id, c.nome\nORDER BY receita DESC;' },
    { id: 'having', sql: 'SELECT cl.nome AS cliente, COUNT(*) AS pedidos\nFROM clientes cl\nJOIN pedidos pe ON pe.cliente_id = cl.id\nGROUP BY cl.id, cl.nome\nHAVING COUNT(*) >= 10\nORDER BY pedidos DESC, cliente;' },
    { id: 'sub', sql: 'SELECT nome, preco\nFROM produtos\nWHERE preco > (SELECT AVG(preco) FROM produtos)\nORDER BY preco DESC;' },
    { id: 'case', sql: "SELECT nome, preco,\n       CASE\n         WHEN preco < 50 THEN 'barato'\n         WHEN preco < 200 THEN 'medio'\n         ELSE 'caro'\n       END AS faixa\nFROM produtos\nORDER BY preco, nome;" },
    { id: 'semana', sql: "SELECT strftime('%w', data_pedido) AS dia_semana, COUNT(*) AS pedidos\nFROM pedidos\nGROUP BY dia_semana\nORDER BY dia_semana;" },
    { id: 'mes', sql: "SELECT strftime('%Y-%m', pe.data_pedido) AS mes,\n       COUNT(DISTINCT pe.id) AS pedidos,\n       ROUND(" + Q_ITEMS + ", 2) AS receita\nFROM pedidos pe\nJOIN itens_pedido ip ON ip.pedido_id = pe.id\nWHERE pe.status <> 'cancelado'\nGROUP BY mes\nORDER BY mes;" }
  ];

  // Consultas dos outros 4 cenarios: o SQL e EXATAMENTE o das consultas-chave dos oraculos (key = nome da consulta no oraculo).
  var OTHER_QUERIES = {
    "marketing-digital": [
      { id: "mkt_ctr", key: "ctr_por_canal", sql: "SELECT c.nome, SUM(m.impressoes) AS impressoes, SUM(m.cliques) AS cliques,\n  ROUND(100.0 * SUM(m.cliques) / SUM(m.impressoes), 4) AS ctr_pct\nFROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id JOIN canais c ON c.id = a.canal_id\nGROUP BY c.id ORDER BY c.id" },
      { id: "mkt_roas", key: "roas_por_canal_mes", sql: "SELECT c.nome, substr(m.data, 1, 7) AS mes, ROUND(SUM(m.custo), 2) AS custo,\n  ROUND(SUM(m.receita), 2) AS receita, ROUND(SUM(m.receita) / SUM(m.custo), 4) AS roas\nFROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id JOIN canais c ON c.id = a.canal_id\nGROUP BY c.id, mes ORDER BY c.id, mes" },
      { id: "mkt_leads", key: "leads_sem_conversao", sql: "SELECT p.id, p.nome, COUNT(l.id) AS leads, SUM(l.convertido_em IS NULL) AS sem_conversao\nFROM campanhas p JOIN leads l ON l.campanha_id = p.id\nGROUP BY p.id ORDER BY sem_conversao DESC, p.id LIMIT 10" }
    ],
    "logistica": [
      { id: "log_sla", key: "sla_por_transportadora", sql: "SELECT t.nome, COUNT(*) AS entregues, SUM(e.atraso_dias = 0) AS no_prazo,\n  ROUND(100.0 * SUM(e.atraso_dias = 0) / COUNT(*), 2) AS sla_pct, ROUND(AVG(e.atraso_dias), 2) AS atraso_medio_dias\nFROM entregas e JOIN veiculos v ON v.id = e.veiculo_id JOIN transportadoras t ON t.id = v.transportadora_id\nWHERE e.status = 'entregue' GROUP BY t.id ORDER BY t.id" },
      { id: "log_custo", key: "custo_por_km_transportadora", sql: "SELECT t.nome, COUNT(*) AS entregas, ROUND(SUM(e.custo), 2) AS custo_total,\n  ROUND(SUM(r.distancia_km), 1) AS km_total, ROUND(SUM(e.custo) / SUM(r.distancia_km), 4) AS custo_por_km\nFROM entregas e JOIN veiculos v ON v.id = e.veiculo_id JOIN transportadoras t ON t.id = v.transportadora_id\nJOIN rotas r ON r.id = e.rota_id WHERE e.status <> 'cancelada' GROUP BY t.id ORDER BY t.id" },
      { id: "log_atraso", key: "atraso_por_centro", sql: "SELECT c.nome, COUNT(*) AS entregues, SUM(e.atraso_dias > 0) AS atrasadas,\n  ROUND(100.0 * SUM(e.atraso_dias > 0) / COUNT(*), 2) AS atrasadas_pct\nFROM entregas e JOIN rotas r ON r.id = e.rota_id JOIN centros_distribuicao c ON c.id = r.centro_id\nWHERE e.status = 'entregue' GROUP BY c.id ORDER BY c.id" }
    ],
    "rh": [
      { id: "rh_headcount", key: "headcount_turnover_por_departamento", sql: "SELECT d.nome, SUM(f.data_desligamento IS NULL) AS ativos,\n  SUM(f.data_desligamento IS NOT NULL) AS desligados,\n  ROUND(100.0 * SUM(f.data_desligamento IS NOT NULL) / COUNT(*), 2) AS turnover_pct\nFROM funcionarios f JOIN departamentos d ON d.id = f.departamento_id GROUP BY d.id ORDER BY d.id" },
      { id: "rh_salario", key: "media_salarial_atual_por_cargo", sql: "SELECT c.nome, COUNT(*) AS ativos, ROUND(AVG(s.salario), 2) AS media_salario\nFROM funcionarios f JOIN cargos c ON c.id = f.cargo_id\nJOIN salarios_historico s ON s.funcionario_id = f.id\n AND s.data_inicio = (SELECT MAX(data_inicio) FROM salarios_historico WHERE funcionario_id = f.id)\nWHERE f.data_desligamento IS NULL GROUP BY c.id ORDER BY c.id" },
      { id: "rh_subordinados", key: "subordinados_diretos_por_gestor", sql: "SELECT g.id, g.nome, COUNT(*) AS subordinados_ativos\nFROM funcionarios f JOIN funcionarios g ON g.id = f.gestor_id\nWHERE f.data_desligamento IS NULL GROUP BY g.id ORDER BY subordinados_ativos DESC, g.id LIMIT 10" }
    ],
    "atendimento": [
      { id: "at_tma", key: "tma_por_agente", sql: "SELECT a.id, a.nome, COUNT(*) AS tickets_fechados,\n  ROUND(AVG(strftime('%s', t.fechado_em) - strftime('%s', t.aberto_em)) / 60.0, 1) AS tma_minutos\nFROM tickets t JOIN agentes a ON a.id = t.agente_id WHERE t.fechado_em IS NOT NULL\nGROUP BY a.id ORDER BY a.id" },
      { id: "at_backlog", key: "backlog_por_prioridade", sql: "SELECT prioridade, COUNT(*) AS em_aberto, SUM(agente_id IS NULL) AS sem_agente,\n  MIN(aberto_em) AS mais_antigo\nFROM tickets WHERE fechado_em IS NULL GROUP BY prioridade\nORDER BY CASE prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END" },
      { id: "at_csat", key: "csat_por_agente", sql: "SELECT a.id, a.nome, COUNT(s.nota) AS respostas, ROUND(AVG(s.nota), 2) AS nota_media,\n  ROUND(100.0 * SUM(s.nota >= 4) / COUNT(s.nota), 1) AS csat_pct\nFROM pesquisas_satisfacao s JOIN tickets t ON t.id = s.ticket_id JOIN agentes a ON a.id = t.agente_id\nWHERE s.nota IS NOT NULL GROUP BY a.id ORDER BY a.id" }
    ]
  };
  var QUERIES = { 'loja-exemplo': VENDAS_QUERIES };
  Object.keys(OTHER_QUERIES).forEach(function (k) { QUERIES[k] = OTHER_QUERIES[k]; });

  // Exercícios guiados (T-307). A consulta de referência é a DEFINIÇÃO do resultado esperado: executada no Worker, num banco novo,
  // a cada verificação; só é mostrada depois do acerto ou de "Ver solução". Textos em hub.sql.ex.<id>.t/.q/.hint (PT/EN).
  // ordered = o enunciado pede ORDER BY (a ordem das linhas conta); senão compara como multiconjunto.
  var EXERCISES = [
    { id: 'filtro', ordered: true, cols: ['nome', 'preco', 'estoque'], ref: 'SELECT nome, preco, estoque\nFROM produtos\nWHERE estoque < 20\nORDER BY preco DESC, nome;' },
    { id: 'join', ordered: false, cols: ['pedido_id', 'cliente', 'data_pedido'], ref: "SELECT p.id AS pedido_id, c.nome AS cliente, p.data_pedido\nFROM pedidos p\nINNER JOIN clientes c ON c.id = p.cliente_id\nWHERE p.status = 'enviado';" },
    { id: 'leftjoin', ordered: false, cols: ['id', 'nome', 'cidade'], ref: 'SELECT c.id, c.nome, c.cidade\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nWHERE p.id IS NULL;' },
    { id: 'grupo', ordered: false, cols: ['cliente_id', 'pedidos'], ref: "SELECT cliente_id, COUNT(*) AS pedidos\nFROM pedidos\nWHERE status <> 'cancelado'\nGROUP BY cliente_id\nHAVING COUNT(*) >= 8;" },
    { id: 'sub', ordered: false, cols: ['nome', 'preco', 'categoria_id'], ref: 'SELECT nome, preco, categoria_id\nFROM produtos p\nWHERE preco > (SELECT AVG(preco) FROM produtos WHERE categoria_id = p.categoria_id);' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, v) { return Hub.t(k, v); };

  var tool = $('sqlTool'), editor = $('sqlEditor'), runBtn = $('sqlRun'), runT = $('sqlRunT'), stopBtn = $('sqlStop'), resetBtn = $('sqlReset');
  var timeoutSel = $('sqlTimeout');
  var statusEl = $('sqlStatus'), errBox = $('sqlErr'), errT = $('sqlErrT'), errM = $('sqlErrM'), errH = $('sqlErrH'), retryBtn = $('sqlRetry'), warnBox = $('sqlWarn');
  var resBox = $('sqlResBox'), resMsg = $('sqlResMsg'), resNote = $('sqlResNote'), resTable = $('sqlResTable'), resCap = $('sqlResCap'), resSec = $('sqlResult');
  var sampleBtn = $('sqlSampleBtn'), sampleQ = $('sqlSampleQ');
  var exList = $('sqlExList'), exProg = $('sqlExProg'), exStop = $('sqlExStop');
  var schemaBox = $('sqlSchemaBox'), schemaEl = $('sqlSchema'), schemaEmpty = $('sqlSchemaEmpty');
  var picker = null;

  var worker = null, gen = 0, jobSeq = 0, curId = 0;
  var engine = 'preparing';     // preparing | ready | failed
  var busy = null;              // null | 'run' | 'load' | 'verify'
  var stopShown = false, stopTimer = 0, limitTimer = 0;
  var version = '';
  var reload = null;            // {queue, total, done, failed:[nomes]} durante a recarga
  var texts = {};               // slug -> texto do .sql (cache: recarregar e verificar sem novo fetch)
  var sample = { on: false, slug: null, tables: [] };   // cenario carregado agora no banco
  var schema = [];              // do worker
  var res = null, stale = false;
  var err = null, statusKey = null, warns = [];
  var edited = false;
  var readyMsg = 'hub.sql.status.ready';
  var ex = {};                  // por exercício: {li, ta, fb, ..., solved, fb:{code,vars,seq}, sol:'hidden'|'confirm'|'shown'}; só em memória
  var exSeq = 0, curEx = null, pendingEx = null, refocusEx = null, exBuilt = false;
  var refocus = false;          // devolve o foco ao Executar quando o motor volta (Parar/Cancelar apagam o botão em foco)

  function locale() { return Hub.lang === 'pt' ? 'pt-BR' : 'en-US'; }
  function num(n) { return new Intl.NumberFormat(locale()).format(n); }
  function scName(slug) { return t('hub.sc.' + slug + '.name'); }
  function plural(k, n) { return t(k + (n === 1 ? '.one' : '.other'), { n: num(n) }); }
  function timeoutSecs() { return parseInt(timeoutSel.value, 10) || 10; }

  // ---------- renderização ----------
  function say(key, vars) { statusKey = key ? { key: key, vars: vars } : null; renderStatus(); }
  function renderStatus() { statusEl.textContent = statusKey ? t(statusKey.key, statusKey.vars) : ''; }

  function stateName() { return engine !== 'ready' ? engine : (busy === 'run' || busy === 'verify' ? 'running' : busy === 'load' ? 'loading' : 'ready'); }
  function applyState() {
    tool.setAttribute('data-state', stateName());
    runBtn.disabled = engine !== 'ready';
    if (busy) runBtn.setAttribute('aria-disabled', 'true'); else runBtn.removeAttribute('aria-disabled');
    runT.textContent = engine === 'preparing' ? t('hub.sql.run.wait') : busy === 'run' || busy === 'verify' ? t('hub.sql.run.running') : t('hub.sql.run.label');
    stopBtn.hidden = !(busy === 'run' && stopShown);
    exStop.hidden = !(busy === 'verify' && stopShown);
    sampleBtn.disabled = engine !== 'ready';
    if (busy) sampleBtn.setAttribute('aria-disabled', 'true'); else sampleBtn.removeAttribute('aria-disabled');
    resSec.setAttribute('aria-busy', busy === 'run' ? 'true' : 'false');
    resSec.classList.toggle('is-stale', stale || busy === 'run');
  }

  function hintFor(msg) {
    if (/no such table/i.test(msg)) return t('hub.sql.hint.table');
    if (/no such column/i.test(msg)) return t('hub.sql.hint.column');
    if (/syntax error|incomplete input|unrecognized token/i.test(msg)) return t('hub.sql.hint.syntax');
    return t('hub.sql.hint.generic');
  }
  function renderError() {
    if (!err) { errBox.hidden = true; return; }
    var T, M = '', H = '', retry = false;
    switch (err.kind) {
      case 'sql':
        T = t('hub.sql.err.sql.t');
        M = err.message;                      // do motor, no idioma original, como texto
        H = hintFor(err.message);
        if (err.statement > 1) H += ' ' + t('hub.sql.err.stmt', { n: err.statement });
        if (stale) H += ' ' + t('hub.sql.err.keep');
        break;
      case 'empty': T = t('hub.sql.err.empty.t'); M = t('hub.sql.err.empty.m'); break;
      case 'timeout': T = t('hub.sql.err.timeout.t'); M = t('hub.sql.err.timeout.m', { s: err.s }); H = t('hub.sql.err.timeout.h') + ' ' + t('hub.sql.err.recreated'); break;
      case 'stopped': T = t('hub.sql.err.stopped.t'); M = t('hub.sql.err.stopped.m'); H = t('hub.sql.err.recreated'); break;
      case 'crash': T = t('hub.sql.err.crash.t'); M = t('hub.sql.err.crash.m'); H = t('hub.sql.err.recreated'); break;
      case 'sample': T = t('hub.sql.sample.err.t'); M = t('hub.sql.sample.err.m', { detail: err.detail || '' }); break;
      case 'init': T = t('hub.sql.err.init.t'); M = t('hub.sql.err.init.m', { detail: err.detail || '' }); retry = true; break;
      case 'noworker': T = t('hub.sql.err.noworker.t'); M = t('hub.sql.err.noworker.m'); break;
    }
    errT.textContent = T; errM.textContent = M; errH.textContent = H;
    errM.hidden = M === ''; errH.hidden = H === '';
    retryBtn.hidden = !retry;
    errBox.hidden = false;
  }

  function renderWarnings() {
    warnBox.textContent = '';
    warns.forEach(function (w) { var p = document.createElement('p'); p.textContent = t(w.key, w.vars); warnBox.appendChild(p); });
    warnBox.hidden = warns.length === 0;
  }

  function renderLimits() {
    $('sqlLimits').textContent = t('hub.sql.limits', { rows: num(ROW_LIMIT), s: timeoutSecs() });
  }

  function cell(td, v) {
    if (v === null) { var n = document.createElement('span'); n.className = 'sql-null'; n.textContent = 'NULL'; td.appendChild(n); return; }
    var d = document.createElement('div'); d.className = 'csv-cell';
    if (typeof v === 'object') { d.classList.add('sql-blob'); d.textContent = t('hub.sql.blob', { n: num(v.blob) }); }
    else d.textContent = String(v);
    td.appendChild(d);
  }

  function renderResult() {
    var thead = resTable.tHead, tbody = resTable.tBodies[0];
    thead.textContent = ''; tbody.textContent = '';
    resNote.hidden = true; resNote.textContent = '';
    if (!res) { resMsg.textContent = t('hub.sql.res.placeholder'); resMsg.hidden = false; resBox.hidden = true; return; }
    var notes = [];
    if (res.statements > 1) notes.push(res.set ? t('hub.sql.res.multi', { n: res.statements, k: res.set.index }) : t('hub.sql.res.multi.none', { n: res.statements }));
    if (res.cut) notes.push(t('hub.sql.res.cut', { n: num(res.cut) }));
    if (!res.set) {
      resMsg.textContent = t('hub.sql.res.cmd', { n: plural('hub.sql.stmt', res.statements), m: num(res.modified), ms: num(res.ms) });
      resMsg.hidden = false; resBox.hidden = true;
    } else if (res.set.total === 0) {
      resMsg.textContent = t('hub.sql.res.norows') + ' ' + num(res.ms) + ' ms';
      resMsg.hidden = false; resBox.hidden = true;
    } else {
      var s = res.set, shown = s.rows.length;
      resMsg.hidden = true;
      var totalTxt = s.capped ? t('hub.sql.res.over', { n: num(s.total) }) : plural('hub.csv.rows', s.total);
      var cap = totalTxt + ' · ' + num(res.ms) + ' ms';
      if (shown < s.total || s.capped) {
        cap += ' · ' + t('hub.sql.res.showing', { n: num(shown), total: s.capped ? t('hub.sql.res.over', { n: num(s.total) }) : num(s.total) });
        notes.push(t('hub.sql.res.limitnote', { n: num(shown) }));
      }
      resCap.textContent = cap;
      var htr = document.createElement('tr');
      s.columns.forEach(function (c) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = c; htr.appendChild(th); });
      thead.appendChild(htr);
      var frag = document.createDocumentFragment();
      s.rows.forEach(function (row) {
        var tr = document.createElement('tr');
        for (var i = 0; i < row.length; i++) { var td = document.createElement('td'); cell(td, row[i]); tr.appendChild(td); }
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
      resBox.hidden = false;
    }
    if (notes.length) { resNote.textContent = notes.join(' '); resNote.hidden = false; }
  }

  function th(tr, text, scope) { var e = document.createElement('th'); e.scope = scope; e.textContent = text; tr.appendChild(e); return e; }
  function td(tr, text, cls) { var e = document.createElement('td'); e.textContent = text; if (cls) e.className = cls; tr.appendChild(e); return e; }

  function renderSchema() {
    schemaEl.textContent = '';
    var has = schema.length > 0;
    schemaBox.hidden = !has; schemaEmpty.hidden = has;
    schema.forEach(function (tb) {
      var isSample = sample.on && sample.tables.indexOf(tb.name) !== -1;
      var tbl = document.createElement('table'); tbl.className = 'csv-table sql-schema-table';
      var cap = document.createElement('caption');
      cap.textContent = isSample ? t('hub.sql.schema.cap.sample', { name: tb.name, cols: plural('hub.csv.cols', tb.columns.length) })
        : t('hub.sql.schema.cap', { name: tb.name, cols: plural('hub.csv.cols', tb.columns.length) });
      tbl.appendChild(cap);
      var thead = tbl.createTHead(), htr = thead.insertRow();
      th(htr, t('hub.csv.cols.th.n'), 'col'); th(htr, t('hub.sql.schema.th.name'), 'col'); th(htr, t('hub.sql.schema.th.type'), 'col');
      if (isSample) th(htr, t('hub.sql.schema.th.key'), 'col');
      var body = tbl.createTBody();
      tb.columns.forEach(function (c, i) {
        var tr = body.insertRow();
        th(tr, String(i + 1), 'row'); td(tr, c.name, 'sql-id'); td(tr, c.type || '');
        if (isSample) {
          var keys = [];
          if (c.pk) keys.push(t('hub.sql.schema.key.pk'));
          if (c.fk) keys.push(t('hub.sql.schema.key.fk', { ref: c.fk }));
          td(tr, keys.join(', '));
        }
      });
      schemaEl.appendChild(tbl);
    });
  }

  // lista de consultas de exemplo do cenario SELECIONADO: refeita quando o cenario muda; textos refeitos a cada troca de idioma (tudo por textContent)
  var builtFor = null;
  function renderSamples() {
    var slug = picker.get(), list = QUERIES[slug];
    if (builtFor !== slug) {
      builtFor = slug; sampleQ.textContent = '';
      list.forEach(function (q) {
        var li = document.createElement('li');
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost'; b.setAttribute('data-q', q.id);
        var d = document.createElement('span'); d.className = 'sql-qd'; d.id = 'sqlQD-' + q.id;
        b.setAttribute('aria-describedby', d.id);
        b.addEventListener('click', function () { useQuery(q); });
        li.appendChild(b); li.appendChild(d); sampleQ.appendChild(li);
      });
    }
    list.forEach(function (q, i) {
      var li = sampleQ.children[i];
      li.firstChild.textContent = t('hub.sql.sample.q.' + q.id + '.t');
      li.lastChild.textContent = t('hub.sql.sample.q.' + q.id + '.d');
    });
  }
  function useQuery(q) {
    editor.value = q.sql; edited = true;
    say('hub.sql.status.sampleq', { title: t('hub.sql.sample.q.' + q.id + '.t') });
    editor.focus();
  }


  // ---------- exercícios guiados ----------
  function mk(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function buildExercises() {
    EXERCISES.forEach(function (d, i) {
      var s = ex[d.id] = { def: d, solved: false, fb: null, shown: null, sol: 'hidden' };
      var li = s.li = mk('li', 'sql-ex-item', exList);
      var h = mk('h3', '', li); s.h = mk('span', '', h); s.state = mk('span', 'sql-ex-state', h); s.state.id = 'sqlExState-' + d.id;
      s.q = mk('p', '', li); s.cols = mk('p', 'sql-ex-cols', li); s.order = mk('p', 'sql-ex-cols', li);
      var det = s.det = mk('details', 'sql-ex-hint', li); s.sum = mk('summary', '', det); s.hint = mk('p', '', det);
      s.lbl = mk('label', 'sql-label', li); s.lbl.htmlFor = 'sqlExTa-' + d.id;
      s.ta = mk('textarea', 'sql-editor', li); s.ta.id = 'sqlExTa-' + d.id; s.ta.rows = 4;
      s.ta.setAttribute('spellcheck', 'false'); s.ta.setAttribute('autocomplete', 'off'); s.ta.setAttribute('autocapitalize', 'off'); s.ta.setAttribute('autocorrect', 'off');
      var act = mk('div', 'sql-actions', li);
      s.vbtn = mk('button', 'btn btn-accent', act); s.vbtn.type = 'button'; s.vbtn.id = 'sqlExV-' + d.id; s.vspan = mk('span', '', s.vbtn);
      s.tbtn = mk('button', 'btn btn-ghost', act); s.tbtn.type = 'button'; s.tbtn.id = 'sqlExT-' + d.id; s.tspan = mk('span', '', s.tbtn);
      s.sbtn = mk('button', 'btn btn-ghost', act); s.sbtn.type = 'button'; s.sbtn.id = 'sqlExS-' + d.id; s.sspan = mk('span', '', s.sbtn);
      s.live = mk('div', '', li); s.live.id = 'sqlExFb-' + d.id; s.live.setAttribute('role', 'status'); s.live.setAttribute('aria-live', 'polite');
      s.conf = mk('div', 'sql-ex-confirm', li); s.conf.id = 'sqlExConf-' + d.id; s.conf.hidden = true; s.confQ = mk('p', '', s.conf);
      var ca = mk('div', 'sql-actions', s.conf);
      s.yes = mk('button', 'btn btn-dark', ca); s.yes.type = 'button'; s.yes.id = 'sqlExYes-' + d.id; s.yesT = mk('span', '', s.yes);
      s.no = mk('button', 'btn btn-ghost', ca); s.no.type = 'button'; s.no.id = 'sqlExNo-' + d.id; s.noT = mk('span', '', s.no);
      s.solBox = mk('div', 'sql-ex-sol', li); s.solBox.hidden = true; s.solH = mk('h4', '', s.solBox);
      s.pre = mk('pre', '', s.solBox); s.pre.id = 'sqlExSol-' + d.id; s.pre.tabIndex = 0; s.pre.setAttribute('role', 'region'); s.code = mk('code', '', s.pre);
      s.vbtn.addEventListener('click', function () { verifyEx(d.id); });
      s.tbtn.addEventListener('click', function () { editor.value = s.ta.value; edited = true; say('hub.sql.ex.status.copied'); editor.focus(); });
      s.sbtn.addEventListener('click', function () { s.sol = 'confirm'; renderEx(); s.yes.focus(); });
      s.no.addEventListener('click', function () { s.sol = s.solved ? 'shown' : 'hidden'; renderEx(); s.sbtn.focus(); });
      s.yes.addEventListener('click', function () { s.sol = 'shown'; renderEx(); s.pre.focus(); });
    });
    exBuilt = true;
  }

  function fbText(fb) {
    var v = fb.vars || {};
    switch (fb.code) {
      case 'pass': return t('hub.sql.ex.fb.pass');
      case 'cols': return t('hub.sql.ex.fb.cols', { got: num(v.got), want: num(v.want) });
      case 'names': return t('hub.sql.ex.fb.names', { pos: num(v.pos), got: v.got });
      case 'rows': return t('hub.sql.ex.fb.rows', { got: typeof v.got === 'number' ? num(v.got) : v.got, want: num(v.want) });
      case 'value': return t('hub.sql.ex.fb.value', { row: num(v.row), col: num(v.col), name: v.name });
      case 'order': return t('hub.sql.ex.fb.order', { row: num(v.row) });
      case 'set': return t('hub.sql.ex.fb.set');
      case 'sql': return t('hub.sql.ex.fb.sql', { n: num(v.statement || 1), message: v.message || '' });
      case 'empty': return t('hub.sql.ex.fb.empty');
      case 'noresult': return t('hub.sql.ex.fb.noresult');
      case 'needsample': return t('hub.sql.ex.fb.needsample');
      case 'timeout': return t('hub.sql.ex.fb.timeout', { s: num(v.s) });
      case 'stopped': return t('hub.sql.ex.fb.stopped');
      case 'crash': return t('hub.sql.ex.fb.crash');
      default: return t('hub.sql.ex.fb.internal', { detail: v.message || '' });
    }
  }

  function renderEx() {
    if (!exBuilt) buildExercises();
    var solvedN = 0, can = engine === 'ready';
    EXERCISES.forEach(function (d, i) {
      var s = ex[d.id];
      if (s.solved) solvedN++;
      s.li.classList.toggle('is-solved', s.solved);
      s.h.textContent = t('hub.sql.ex.n', { n: i + 1 }) + ' · ' + t('hub.sql.ex.' + d.id + '.t');
      s.state.textContent = t(s.solved ? 'hub.sql.ex.state.solved' : 'hub.sql.ex.state.todo');
      s.q.textContent = t('hub.sql.ex.' + d.id + '.q');
      s.cols.textContent = t('hub.sql.ex.cols', { cols: d.cols.join(', ') });
      s.order.textContent = t(d.ordered ? 'hub.sql.ex.order.yes' : 'hub.sql.ex.order.no');
      s.sum.textContent = t('hub.sql.ex.hint');
      s.hint.textContent = t('hub.sql.ex.' + d.id + '.hint');
      s.lbl.textContent = t('hub.sql.ex.label', { n: i + 1 });
      s.vspan.textContent = busy === 'verify' && curEx === d.id ? t('hub.sql.ex.verifying') : t('hub.sql.ex.verify');
      s.tspan.textContent = t('hub.sql.ex.try');
      s.sspan.textContent = t('hub.sql.ex.sol.show');
      s.vbtn.disabled = !can;
      if (busy) s.vbtn.setAttribute('aria-disabled', 'true'); else s.vbtn.removeAttribute('aria-disabled');
      s.sbtn.hidden = s.sol !== 'hidden';
      s.conf.hidden = s.sol !== 'confirm';
      s.confQ.textContent = t('hub.sql.ex.sol.confirm');
      s.yesT.textContent = t('hub.sql.ex.sol.yes'); s.noT.textContent = t('hub.sql.ex.sol.no');
      s.solBox.hidden = s.sol !== 'shown';
      s.solH.textContent = t('hub.sql.ex.sol.h');
      s.pre.setAttribute('aria-label', t('hub.sql.ex.sol.h') + ' · ' + t('hub.sql.ex.n', { n: i + 1 }));
      s.code.textContent = s.sol === 'shown' ? d.ref : '';
      // feedback: só reescreve quando há resultado novo (seq) ou o idioma mudou, para a região viva não repetir o anúncio
      var key = s.fb ? s.fb.seq + '|' + Hub.lang : '';
      if (s.shown !== key) {
        s.shown = key; s.live.textContent = '';
        if (s.fb) {
          var box = mk('div', 'notice sql-ex-fb' + (s.fb.code === 'pass' ? ' is-pass' : ''), s.live);
          var p = mk('p', '', box);
          p.textContent = s.fb.code === 'pass' ? fbText(s.fb) : t('hub.sql.ex.fb.no') + ' ' + fbText(s.fb);
          if (s.fb.code === 'needsample') {
            var lb = mk('button', 'btn btn-dark', box); lb.type = 'button'; mk('span', '', lb).textContent = t('hub.sql.ex.fb.needsample.btn');
            lb.addEventListener('click', function () { loadSampleThenVerify(d.id); });
            s.loadBtn = lb;
          }
        }
      }
    });
    var pt = t('hub.sql.ex.prog', { n: num(solvedN), total: num(EXERCISES.length) });
    if (exProg.textContent !== pt) exProg.textContent = pt;
  }
  function setFb(id, code, vars) { var s = ex[id]; if (s) s.fb = { code: code, vars: vars || {}, seq: ++exSeq }; }

  function verifyEx(id) {
    if (engine !== 'ready' || busy) return;
    var s = ex[id], d = s.def;
    if (s.ta.value.trim() === '') { setFb(id, 'empty'); renderEx(); return; }
    if (!sample.on || sample.slug !== VENDAS || texts[VENDAS] === undefined) { setFb(id, 'needsample'); renderEx(); return; }
    err = null; warns = [];
    busy = 'verify'; stopShown = false; curEx = id;
    curId = ++jobSeq;
    var secs = timeoutSecs();
    clearTimeout(stopTimer); clearTimeout(limitTimer);
    stopTimer = setTimeout(function () { stopShown = true; applyState(); }, STOP_AFTER_MS);
    limitTimer = setTimeout(function () { restart({ kind: 'timeout', s: secs }); }, secs * 1000);
    say('hub.sql.ex.status.verifying');
    renderAll();
    worker.postMessage({ type: 'verify', id: curId, sample: texts[VENDAS], ref: d.ref, user: s.ta.value, ordered: d.ordered });
  }
  function loadSampleThenVerify(id) {
    if (engine !== 'ready' || busy) return;
    pendingEx = id; picker.set(VENDAS); renderSamples(); loadSample(VENDAS);
  }
  function onVerified(m) {
    clearTimers(); busy = null;
    var id = curEx; curEx = null;
    if (m.ok) { ex[id].solved = true; ex[id].sol = 'shown'; }
    setFb(id, m.code, m.vars);
    say(null); renderAll();
  }

  function renderAll() { applyState(); renderStatus(); renderError(); renderWarnings(); renderLimits(); renderSamples(); renderEx(); renderResult(); renderSchema(); }

  // ---------- motor (Worker) ----------
  function stopWorker() {
    if (!worker) return;
    worker.onmessage = null;
    // eventos de erro já enfileirados (ex.: abort do WebAssembly) chegam depois do terminate: absorver, senão viram erro não tratado da página
    worker.onerror = function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); };
    worker.terminate(); worker = null;
  }
  function clearTimers() { clearTimeout(stopTimer); clearTimeout(limitTimer); stopShown = false; }

  function engineFail(kind, detail) {
    stopWorker(); clearTimers(); busy = null; engine = 'failed';
    err = { kind: kind, detail: detail || '' };
    say(null); renderAll();
  }

  function boot() {
    stopWorker(); gen++;
    var g = gen;
    engine = 'preparing'; busy = null;
    say('hub.sql.status.preparing'); applyState();
    if (typeof Worker === 'undefined') return engineFail('noworker');
    try { worker = new Worker(WORKER_URL); } catch (e) { return engineFail('init', String(e && e.message || e)); }
    worker.onerror = function (ev) {
      if (g !== gen) return;
      if (ev && ev.preventDefault) ev.preventDefault();
      if (engine === 'preparing') engineFail('init', ev && ev.message ? ev.message : '');
      else restart({ kind: 'crash' });
    };
    worker.onmessage = function (ev) { if (g === gen) onMessage(ev.data); };
  }

  function onMessage(m) {
    if (m.type === 'ready') {
      engine = 'ready'; version = m.version;
      applyState();
      if (refocus && (!document.activeElement || document.activeElement === document.body)) runBtn.focus();
      refocus = false;
      if (refocusEx) { var rb = ex[refocusEx] && ex[refocusEx].vbtn; refocusEx = null; if (rb && (!document.activeElement || document.activeElement === document.body)) { rb.disabled = false; rb.focus(); } }
      if (err && err.kind === 'init') err = null;
      if (reload && reload.queue.length) { nextReload(); return; }
      if (reload) { finishReload(); return; }
      say(readyMsg, { v: version }); readyMsg = 'hub.sql.status.ready'; renderAll();
    } else if (m.type === 'initerror') engineFail('init', m.detail);
    else if (m.id !== curId) return;
    else if (m.type === 'result') onResult(m);
    else if (m.type === 'sample') onSample(m);
    else if (m.type === 'verified') onVerified(m);
    else if (m.type === 'error') onError(m);
  }

  // ---------- executar ----------
  function execute() {
    if (engine !== 'ready' || busy) return;
    busy = 'run'; stopShown = false; err = null; warns = [];
    curId = ++jobSeq;
    var secs = timeoutSecs();
    say('hub.sql.status.running');
    clearTimeout(stopTimer); clearTimeout(limitTimer);
    stopTimer = setTimeout(function () { stopShown = true; say('hub.sql.status.slow'); applyState(); }, STOP_AFTER_MS);
    limitTimer = setTimeout(function () { restart({ kind: 'timeout', s: secs }); }, secs * 1000);
    renderAll();
    worker.postMessage({ type: 'run', id: curId, sql: editor.value, limit: ROW_LIMIT, cellBudget: CELL_BUDGET });
  }

  function onResult(m) {
    clearTimers(); busy = null; schema = m.schema || schema;
    if (m.empty) { err = { kind: 'empty' }; say(null); renderAll(); return; }
    err = null; stale = false;
    res = { statements: m.statements, set: m.set, modified: m.modified, cut: m.cut, ms: m.ms };
    if (m.set && m.set.total > 0) say('hub.sql.status.done', { rows: m.set.capped ? t('hub.sql.res.over', { n: num(m.set.total) }) : plural('hub.csv.rows', m.set.total), ms: num(m.ms) });
    else if (m.set) say('hub.sql.status.norows');
    else say('hub.sql.status.cmd', { n: plural('hub.sql.stmt', m.statements) });
    renderAll();
  }

  function onError(m) {
    var wasVerify = busy === 'verify', vid = curEx;
    clearTimers(); busy = null;
    if (m.schema) schema = m.schema;
    if (wasVerify) curEx = null;
    if (wasVerify && m.code !== 'crash') { setFb(vid, 'internal', { message: m.message }); say(null); renderAll(); return; }
    if (wasVerify) setFb(vid, 'crash');
    if (m.code === 'crash') {
      // cenario que derruba o motor na recarga sai da recarga (evita laco de reinicios)
      if (reload && reload.current && reload.current.sample) sample.on = false;
      restart({ kind: 'crash' }); return;
    }
    if (m.code === 'sample') { pendingEx = null; err = { kind: 'sample', detail: m.message }; if (reload && reload.current && reload.current.sample) sample.on = false; }
    else { stale = !!res; err = { kind: 'sql', message: m.message, statement: m.statement || 1 }; }
    say(null);
    if (reload) { reload.failed.push(reload.current && reload.current.name); err = null; renderAll(); nextReload(); return; }
    renderAll();
  }

  // ---------- reiniciar o motor (terminate) ----------
  function restart(why) {
    if (busy === 'verify' && curEx) { setFb(curEx, why.kind, { s: why.s }); if (document.activeElement === exStop) refocusEx = curEx; curEx = null; }
    clearTimers();
    var hadFocus = document.activeElement === stopBtn;
    stale = !!res; schema = []; warns = [];
    err = why;
    reload = newReload();
    boot();
    renderAll();
    refocus = hadFocus;
  }

  // fila de recarga: o cenario que estava carregado (texto em cache, sem novo fetch)
  function newReload() {
    if (!sample.on) return null;
    return { queue: [{ sample: true, slug: sample.slug, name: scName(sample.slug) }], total: 1, done: 0, failed: [], current: null };
  }

  function nextReload() {
    var item = reload.queue.shift();
    if (!item) { finishReload(); return; }
    reload.current = item;
    busy = 'load'; curId = ++jobSeq;
    say('hub.sql.status.reloading', { name: item.name });
    applyState();
    worker.postMessage({ type: 'sample', id: curId, slug: item.slug, sql: texts[item.slug] });
  }

  function finishReload() {
    var r = reload; reload = null; busy = null;
    var failed = r.failed.filter(Boolean);
    if (failed.length) warns.push({ key: 'hub.sql.warn.reloadfail' });
    say(sample.on ? 'hub.sql.status.restored.sample' : null, { name: sample.slug ? scName(sample.slug) : '' });
    renderAll();
  }

  // ---------- bancos de exemplo (cenarios) ----------
  function getSampleText(slug) {
    if (texts[slug] !== undefined) return Promise.resolve(texts[slug]);
    return fetch(DATA_URL + SC.bySlug[slug].sql, { credentials: 'omit', cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (txt) {
      if (txt.length < 100 || txt.indexOf('CREATE TABLE') === -1) throw new Error('invalid file');
      texts[slug] = txt; return txt;
    });
  }

  function loadSample(slug) {
    if (engine !== 'ready' || busy) return;
    slug = typeof slug === 'string' && SC.has(slug) ? slug : picker.get();
    err = null; warns = [];
    busy = 'load'; var job = curId = ++jobSeq, g = gen;
    say('hub.sql.status.loading.sample', { name: scName(slug) });
    renderAll();
    getSampleText(slug).then(function (txt) {
      if (g !== gen || curId !== job || !worker) return;
      worker.postMessage({ type: 'sample', id: job, slug: slug, sql: txt });
    }, function (e) {
      if (g !== gen || curId !== job) return;
      busy = null; pendingEx = null; err = { kind: 'sample', detail: String(e && e.message || e) };
      say(null); renderAll();
    });
  }

  function onSample(m) {
    schema = m.schema || schema;
    if (reload) { sample.tables = m.tables; reload.done++; busy = null; renderAll(); nextReload(); return; }
    sample.on = true; sample.slug = m.slug; sample.tables = m.tables;
    busy = null; err = null;
    if (m.replaced.length) warns.push({ key: 'hub.sql.warn.sample.replaced' });
    if (!edited) editor.value = 'SELECT * FROM ' + m.tables[0] + ' LIMIT 10;';
    say('hub.sql.status.sample', { name: scName(m.slug), n: num(m.tables.length), rows: num(m.rows) });
    renderAll();
    if (pendingEx) { var pid = pendingEx; pendingEx = null; verifyEx(pid); }
  }

  function resetDb() {
    pendingEx = null; curEx = null;
    clearTimers(); sample.on = false; sample.slug = null; sample.tables = []; reload = null; res = null; stale = false; schema = []; warns = []; err = null;
    readyMsg = 'hub.sql.status.reset';
    boot();
    renderAll();
    if (document.activeElement === resetBtn) resetBtn.focus();
  }

  // ---------- eventos ----------
  runBtn.addEventListener('click', execute);
  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.keyCode === 13)) { e.preventDefault(); execute(); }
  });
  editor.addEventListener('input', function () { edited = true; });
  stopBtn.addEventListener('click', function () { if (busy === 'run') restart({ kind: 'stopped' }); });
  exStop.addEventListener('click', function () { if (busy === 'verify') restart({ kind: 'stopped' }); });
  resetBtn.addEventListener('click', resetDb);
  sampleBtn.addEventListener('click', function () { loadSample(); });
  retryBtn.addEventListener('click', function () { err = null; boot(); renderAll(); });
  timeoutSel.addEventListener('change', renderLimits);

  picker = SC.mount($('sqlPicker'), { name: 'sqlScenario', value: SC.defaultSlug, er: true, onChange: function () { renderAll(); } });
  Hub.onLang.push(function () { renderAll(); });
  renderAll();
  boot();
})();
