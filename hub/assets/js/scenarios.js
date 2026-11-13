/* =====================================================================
   Cenarios do Hub (D11): as 5 bases embutidas sao a UNICA fonte de dados das tres
   ferramentas (explorador de dados, SQL playground, Python playground). Nao existe
   upload de arquivo do usuario em nenhuma delas.
   - Este arquivo e carregado na pagina (<script src>) e no Worker do SQL (importScripts):
     por isso so declara dados e funcoes puras e nao depende de Hub nem de document no topo.
   - slug = nome da pasta em assets/data/csv/<slug>/ e id do cartao; sql = arquivo em assets/data/;
     tables = ordem do CREATE TABLE (pais antes dos filhos); er = diagrama em texto (o mesmo de
     assets/data/README.md; um teste confere). Nomes e descricoes ficam no i18n.js (hub.sc.<slug>.*).
   - Seletor de cenario comum: HubScenarios.mount(container, opts) (so na pagina). Tudo entra por
     textContent; os 5 cartoes sao <input type="radio"> nativos (teclado e leitor de tela de graca).
   ===================================================================== */
(function (root) {
  'use strict';
  var LIST = [
    { slug: "loja-exemplo", sql: "loja-exemplo.sql", tables: ["clientes", "categorias", "produtos", "pedidos", "itens_pedido"],
      er: "categorias 1 ──< produtos 1 ──< itens_pedido >── 1 pedidos >── 1 clientes\n\ncategorias(id PK, nome)\nprodutos(id PK, nome, categoria_id FK -> categorias.id, preco, estoque)\nclientes(id PK, nome, email, cidade, data_cadastro)\npedidos(id PK, cliente_id FK -> clientes.id, data_pedido, data_entrega, status)\nitens_pedido(id PK, pedido_id FK -> pedidos.id, produto_id FK -> produtos.id, quantidade, preco_unitario)" },
    { slug: "marketing-digital", sql: "marketing-digital.sql", tables: ["canais", "campanhas", "anuncios", "metricas_diarias", "leads"],
      er: "canais 1 ──< anuncios >── 1 campanhas\ncanais 1 ──< leads    >── 1 campanhas\nanuncios 1 ──< metricas_diarias\n\ncanais(id PK, nome, tipo)\ncampanhas(id PK, nome, objetivo, data_inicio, data_fim, orcamento)\nanuncios(id PK, campanha_id FK -> campanhas.id, canal_id FK -> canais.id, nome, formato, status)\nmetricas_diarias(id PK, anuncio_id FK -> anuncios.id, data, impressoes, cliques, custo, conversoes, receita)\nleads(id PK, campanha_id FK -> campanhas.id, canal_id FK -> canais.id, nome, email, criado_em, convertido_em, valor_contrato)" },
    { slug: "logistica", sql: "logistica.sql", tables: ["centros_distribuicao", "transportadoras", "veiculos", "rotas", "entregas", "ocorrencias"],
      er: "centros_distribuicao 1 ──< rotas 1 ──< entregas >── 1 veiculos >── 1 transportadoras\n                                          1 ──< ocorrencias\n\ncentros_distribuicao(id PK, nome, cidade, capacidade_diaria)\ntransportadoras(id PK, nome, email_contato, ativa)\nveiculos(id PK, transportadora_id FK -> transportadoras.id, codigo, tipo, capacidade_kg)\nrotas(id PK, centro_id FK -> centros_distribuicao.id, destino, distancia_km)\nentregas(id PK, rota_id FK -> rotas.id, veiculo_id FK -> veiculos.id, data_prevista, data_realizada, status, atraso_dias, peso_kg, custo)\nocorrencias(id PK, entrega_id FK -> entregas.id, tipo, data_ocorrencia, descricao)" },
    { slug: "rh", sql: "rh.sql", tables: ["departamentos", "cargos", "funcionarios", "salarios_historico", "avaliacoes", "ausencias"],
      er: "departamentos 1 ──< cargos 1 ──< funcionarios >── 1 departamentos\nfuncionarios 1 ──< funcionarios (gestor_id)\nfuncionarios 1 ──< salarios_historico | avaliacoes (funcionario_id e avaliador_id) | ausencias\n\ndepartamentos(id PK, nome, centro_custo)\ncargos(id PK, nome, departamento_id FK -> departamentos.id, nivel)\nfuncionarios(id PK, nome, email, cargo_id FK -> cargos.id, departamento_id FK -> departamentos.id, gestor_id FK -> funcionarios.id, data_admissao, data_desligamento)\nsalarios_historico(id PK, funcionario_id FK -> funcionarios.id, data_inicio, salario, motivo)\navaliacoes(id PK, funcionario_id FK -> funcionarios.id, avaliador_id FK -> funcionarios.id, periodo, nota, comentario)\nausencias(id PK, funcionario_id FK -> funcionarios.id, tipo, data_inicio, data_fim, dias)" },
    { slug: "atendimento", sql: "atendimento.sql", tables: ["clientes", "agentes", "tickets", "interacoes", "pesquisas_satisfacao"],
      er: "clientes 1 ──< tickets >── 1 agentes\ntickets 1 ──< interacoes >── (0..1) agentes\ntickets 1 ── (0..1) pesquisas_satisfacao\n\nclientes(id PK, nome, email, plano, data_cadastro)\nagentes(id PK, nome, equipe, data_entrada)\ntickets(id PK, cliente_id FK -> clientes.id, agente_id FK -> agentes.id, assunto, prioridade, canal, status, aberto_em, fechado_em)\ninteracoes(id PK, ticket_id FK -> tickets.id, autor_tipo, agente_id FK -> agentes.id, data_hora, mensagem)\npesquisas_satisfacao(id PK, ticket_id FK -> tickets.id, nota, comentario, respondida_em)" }
  ];
  var BY = {};
  LIST.forEach(function (s) { BY[s.slug] = s; });
  var DEFAULT = 'loja-exemplo';
  var api = { list: LIST, bySlug: BY, defaultSlug: DEFAULT, has: function (slug) { return Object.prototype.hasOwnProperty.call(BY, slug); } };
  // Todas as tabelas de todos os cenarios, em ordem de DROP segura: filhos antes dos pais dentro de cada cenario;
  // um nome repetido (clientes existe em Vendas e em Atendimento) vale na ULTIMA posicao, depois de todos os filhos.
  api.allTablesDropOrder = function () {
    var all = [];
    LIST.forEach(function (s) { s.tables.slice().reverse().forEach(function (n) { all.push(n); }); });
    return all.filter(function (n, i) { return all.lastIndexOf(n) === i; });
  };
  root.HubScenarios = api;
  if (typeof document === 'undefined' || !root.Hub) return;

  // ---------- seletor (so na pagina) ----------
  var uid = 0;
  function mk(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  /* opts: {name: 'sc', value: slug inicial, onChange: fn(slug), er: true (mostra o diagrama do cenario escolhido),
            label: chave i18n da legenda (padrao hub.sc.legend), hint: chave i18n da dica (opcional)}
     devolve {get(), set(slug), setDisabled(bool), render()}. */
  api.mount = function (container, opts) {
    opts = opts || {};
    var id = 'sc' + (++uid), name = opts.name || id, current = BY[opts.value] ? opts.value : DEFAULT, disabled = false;
    var fs = mk('fieldset', 'sc-picker', container);
    var lg = mk('legend', 'sc-legend', fs);
    var hint = opts.hint ? mk('p', 'csv-note sc-hint', fs) : null;
    var cards = mk('div', 'sc-cards', fs), els = {};
    LIST.forEach(function (s) {
      var lab = mk('label', 'sc-card', cards), inp = mk('input', 'sc-input', lab);
      inp.type = 'radio'; inp.name = name; inp.value = s.slug; inp.id = id + '-' + s.slug;
      var body = mk('span', 'sc-body', lab);
      var nm = mk('strong', 'sc-name', body), ds = mk('span', 'sc-desc', body), mt = mk('span', 'sc-meta', body);
      inp.addEventListener('change', function () { if (inp.checked) { current = s.slug; render(); if (opts.onChange) opts.onChange(current); } });
      els[s.slug] = { lab: lab, inp: inp, nm: nm, ds: ds, mt: mt };
    });
    var erBox = null, erPre = null, erSum = null, erCap = null;
    if (opts.er) {
      erBox = mk('details', 'sc-er', container);
      erSum = mk('summary', '', erBox);
      erCap = mk('p', 'csv-note', erBox);
      erPre = mk('pre', 'sc-er-pre', erBox); erPre.tabIndex = 0; erPre.setAttribute('role', 'region');
      erPre.id = id + '-er'; erPre.appendChild(document.createElement('code'));
    }
    function t(k, v) { return root.Hub.t(k, v); }
    function render() {
      lg.textContent = t(opts.label || 'hub.sc.legend');
      if (hint) hint.textContent = t(opts.hint);
      LIST.forEach(function (s) {
        var e = els[s.slug];
        e.nm.textContent = t('hub.sc.' + s.slug + '.name');
        e.ds.textContent = t('hub.sc.' + s.slug + '.desc');
        e.mt.textContent = t(s.tables.length === 1 ? 'hub.sc.tables.one' : 'hub.sc.tables.other', { n: s.tables.length });
        e.inp.checked = s.slug === current; e.inp.disabled = disabled;
        e.lab.classList.toggle('is-on', s.slug === current); e.lab.classList.toggle('is-disabled', disabled);
      });
      if (erBox) {
        erSum.textContent = t('hub.sc.er.sum');
        erCap.textContent = t('hub.sc.er.cap', { name: t('hub.sc.' + current + '.name') });
        erPre.firstChild.textContent = BY[current].er;
        erPre.setAttribute('aria-label', t('hub.sc.er.sum') + ' · ' + t('hub.sc.' + current + '.name'));
      }
    }
    root.Hub.onLang.push(render);
    render();
    return {
      get: function () { return current; },
      set: function (slug) { if (BY[slug] && slug !== current) { current = slug; render(); } },
      setDisabled: function (d) { d = !!d; if (d !== disabled) { disabled = d; render(); } },
      render: render
    };
  };
})(typeof self !== 'undefined' ? self : this);
