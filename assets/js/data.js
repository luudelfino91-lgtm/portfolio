/* =====================================================================
   CONTEÚDO — edite aqui. Tudo na página é gerado a partir destes dados.
   - cover:   imagem real do relatório (ex.: "assets/img/projetos/lets-cola-capa.webp").
              Vazio = mostra uma prévia ilustrativa gerada automaticamente.
   - gallery: lista de {src, cap} com outras páginas do relatório (aparece no case).
   - report:  link público do Power BI.   repo: link do GitHub (opcional).
   - draft:   true mostra um aviso no case técnico lembrando de revisar o texto.
   ===================================================================== */
const SHOW_DRAFT_NOTES = false;
const XPERIUN = "https://app.xperiun.com/in/lucasdelfino";
const GITHUB  = "https://github.com/luudelfino91-lgtm";
const IMG = "assets/img/projetos/";
const PBI = "https://app.powerbi.com/view?r=";

const LANES = [
  {id:"autoral",   name:"Estudo autoral",        desc:"Pesquisa própria com dados públicos sobre o mercado em que eu atuo."},
  {id:"negocio",   name:"Relatórios de negócio", desc:"Projetos com problemas de negócio reais: comercial, financeiro, seguros, farmacêutico, pessoas, varejo e indústria."},
  {id:"automacao", name:"Automação na operação", desc:"O trabalho que não vira dashboard público, mas devolve horas ao time todo mês."}
];

const PROJECTS = [
  {slug:"panorama-consorcios", lane:"autoral", domain:"Consórcios · Mercado financeiro",
   title:"Panorama Consórcios", file:"Estudo autoral · 4 páginas", mock:"area",
   lede:"Estudo autoral sobre o mercado brasileiro de consórcios, com dados públicos da ABAC e do BACEN de jan/2019 a mai/2026, contado em atos, como uma reportagem.",
   side:"A carteira ativa passou de 7,55 para 13,25 milhões de cotas (+75,4%) e a inadimplência caiu de 11,75% para 10,49%, com a ressalva de que a Resolução BCB nº 285 mudou a forma de medir. Motocicletas segue como metade do mercado, mas perdeu 9,2 p.p. de share, e Imóveis ganhou 10,4 p.p.",
   kpi:{v:"13,25 mi", l:"cotas ativas em mai/2026"}, tools:["Power BI","Power Query","DAX"], tags:["Dados públicos","ABAC · BACEN","Storytelling"],
   report:PBI+"eyJrIjoiZGE2MDNhNDEtZWU0My00NjY2LTliNTQtNzNiNDQ0YjlmNzI3IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"panorama-capa.webp", draft:true,
   gallery:[
     {src:IMG+"panorama-capa.webp", cap:"Ato 01: tamanho do mercado, com carteira ativa, cotas vendidas em 2025, inadimplência e administradoras ativas"},
     {src:IMG+"panorama-ato2.webp", cap:"Ato 02: a troca de liderança, com a composição da carteira por segmento e o ganho e a perda de share desde 2019"}],
   case:{
     pergunta:"Como o mercado de consórcios cresceu desde 2019, e quem ganhou e perdeu espaço nesse caminho?",
     dados:["Bases públicas da ABAC e do BACEN, de jan/2019 a mai/2026.","Carteira ativa, cotas vendidas, inadimplência e administradoras ativas (124 com carteira no último mês, 160 registradas).","Segmentos: Motocicletas, Automóveis, Imóveis, Pesados, Serviços e Eletroeletrônicos."],
     tecnicas:["Página escrita em atos, cada um com um título que já é a conclusão e um parágrafo que dá contexto antes dos gráficos.","Indicadores em cartões, com variação sobre dez/2019 e sobre o ano anterior.","Gráfico de área para a carteira com a inadimplência em linha no eixo da direita e o choque de 2020 sombreado.","Composição em 100% por segmento e barras de variação de share em pontos percentuais.","Nota metodológica sobre a Resolução BCB nº 285, que exclui do indicador quem passa de três meses em atraso."],
     dax:"",
     resultado:"Sete anos, quase o dobro de cotas e menos atraso, com o cuidado de mostrar que parte da queda da inadimplência vem da mudança de definição, e não de comportamento."}},

  {slug:"lets-cola", lane:"negocio", domain:"Bebidas · Varejo",
   title:"Lets Cola", file:"Dashboard Gerencial · 4 páginas", mock:"bars",
   lede:"Dashboard gerencial de uma fabricante de bebidas, com três visões: Comercial, Produtos e Financeiro, cobrindo 2019 a 2022.",
   side:"O relatório marca a Nova Estratégia de Marketing no meio do período e mostra o que mudou em vendas e margem: R$ 202 Mi de faturamento, 99,82% da meta e margem de 52,6%.",
   kpi:{v:"R$ 202 Mi", l:"faturamento 2019–2022"}, tools:["Power BI","DAX"], tags:["KPIs","What-if","Análise hierárquica","Mapa"],
   report:PBI+"eyJrIjoiZGY4NzJhMGMtZjY0OS00YTMzLThkYmYtMTY5YmE5ODEzNjllIiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"lets-cola-comercial.webp", draft:true,
   gallery:[
     {src:IMG+"lets-cola-capa.webp", cap:"Capa de navegação: Comercial, Produtos e Financeiro"},
     {src:IMG+"lets-cola-comercial.webp", cap:"Comercial: 201 mil pedidos, 9.274 clientes, ranking de vendedores e marco da nova estratégia de marketing"},
     {src:IMG+"lets-cola-produtos.webp", cap:"Produtos: 46 produtos em 6 categorias, com Bebidas em 74,81% das vendas e análise hierárquica"},
     {src:IMG+"lets-cola-financeiro.webp", cap:"Financeiro: receita, custo, lucro e frete, simulador what-if de custos, mapa por estado e resultado por unidade de negócio"}],
   case:{
     pergunta:"A mudança na estratégia de marketing melhorou o resultado comercial e financeiro da empresa?",
     dados:["Vendas, produtos, clientes e custos entre 2019 e 2022.","Calendário com o marco da Nova Estratégia MKT em jul/2021.","Localização dos clientes para o mapa de receita por estado."],
     tecnicas:["Três páginas, uma por área: Comercial, Produtos e Financeiro, com navegação própria no topo.","Indicadores contra meta e contra o ano anterior (99,82% da meta, +36% sobre o ano anterior).","Análise hierárquica por categoria e produto, com alternância entre vendas, frete e custo.","Simulador what-if: quanto a empresa economizaria com uma redução percentual nos custos.","Mapa de receita por localidade e cascata por unidade de negócio."],
     dax:"",
     resultado:"Uma leitura direta da operação: R$ 202 Mi de faturamento, R$ 106 Mi de lucro e margem de 52,6% no período, com o efeito da nova estratégia visível na linha do tempo de vendas."}},

  {slug:"seguradora-xperiun", lane:"negocio", domain:"Seguros",
   title:"Seguradora Xperiun", file:"Performance e retenção · 5 seções", mock:"donut",
   lede:"Análise das principais KPIs de uma seguradora: crescimento, churn e impacto financeiro na receita, com três painéis: Performance, Risco e aquisições e Produtos.",
   side:"O painel de Performance junta 19.561 apólices ativas, receita de R$ 309,3 M e churn global de 18,42%, contra uma meta-limite de 12%. Em Produtos, 2025 registra 1.768 apólices canceladas, com preço alto como o principal motivo (426).",
   kpi:{v:"18,42%", l:"churn global"}, tools:["Power BI","DAX"], tags:["Churn","Retenção","Canais de venda","Navegação por seções"],
   report:PBI+"eyJrIjoiMWI1YzVkOTctYzJkYi00N2U4LWE4ZjItNTE4ZTJiOTk2NzY2IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"seguradora-performance.webp", draft:true,
   gallery:[
     {src:IMG+"seguradora-capa.webp", cap:"Capa de navegação da Seguradora Xperiun"},
     {src:IMG+"seguradora-performance.webp", cap:"Performance de vendas: apólices ativas, receita, churn global de 18,42% contra a meta-limite de 12%, metas de prêmios e apólices por região"},
     {src:IMG+"seguradora-risco.webp", cap:"Risco e aquisições: cancelamento por parcelas pagas, churn por canal de venda e matriz por faixa etária"},
     {src:IMG+"seguradora-produtos.webp", cap:"Produtos: cancelamentos de 2025 por motivo, canal e cobertura, com churn por tipo de cobertura"}],
   case:{
     pergunta:"Quanto a carteira cresce, quanto se perde em churn e o que isso custa em receita?",
     dados:["Base de apólices, prêmios e metas da seguradora fictícia do desafio Xperiun.","Recortes por ano, mês, ramo, canal, faixa etária e tipo de cliente.","Canais de venda: corretor pessoa física, corretora parceira, venda digital (app e site), televendas e bancassurance."],
     tecnicas:["Menu lateral com Performance, Risco e aquisições e Produtos, e filtros fixos em todas as páginas.","Indicadores de apólices ativas (19.561), receita (R$ 309,3 M), receita perdida por churn (R$ 36,3 M) e impacto na receita (19,65%).","Medidor de churn contra a meta-limite de 12% e receita por ramo: Automóvel 79,06%, Vida 13,06% e Residencial 7,88%.","Tabela de meta de prêmios (95,92% entregue) e de apólices (97,45%) por ano, com apólices por região.","Matriz de churn por faixa etária e canal com escala de cor, onde a venda digital chega a 28,35% entre 18 e 25 anos.","Página de Produtos com filtro por ano, motivos de cancelamento por canal e churn por cobertura (Básica 14,19%, Completa 10,86%, Premium 7,80%)."],
     dax:"",
     resultado:"Um retrato que liga retenção a dinheiro: o churn global de 18,42% fica bem acima da meta de 12% e aparece ao lado da receita perdida, com o recorte por canal, idade e cobertura mostrando onde o cancelamento se concentra."}},

  {slug:"pharmavantage", lane:"negocio", domain:"Farmacêutico",
   title:"PharmaVantage Analytics", file:"Visão Descritiva · 6 páginas", mock:"bars",
   lede:"Análise comercial de uma empresa farmacêutica. A primeira página é a visão descritiva: o que aconteceu, em um retrato do negócio.",
   side:"São R$ 2,31 Mi de receita líquida, R$ 671,86 mil de lucro e margem de 29,0% entre 2014 e 2019, com quadrante volume × margem que separa produtos âncora de lucro dos que só ocupam prateleira.",
   kpi:{v:"29,0%", l:"margem de lucro"}, tools:["Power BI","DAX"], tags:["Análise descritiva","Quadrante volume × margem","Forma de pagamento"],
   report:PBI+"eyJrIjoiYjA3ZTdlNDctMTZlZi00OTJiLWJjOTQtY2Y1Yzg2OTYwNDE2IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"pharmavantage-descritiva.webp", draft:true,
   case:{
     pergunta:"O que aconteceu no negócio: quanto vendeu, com que margem, em que turno, por qual forma de pagamento e com quais produtos?",
     dados:["Vendas de 2014 a 2019 por produto, grupo terapêutico, turno e forma de pagamento.","85.407 transações e ticket médio de R$ 27,09."],
     tecnicas:["Cinco KPIs no topo: receita líquida, lucro, ticket médio, margem e itens vendidos.","Comparativo mês a mês com o mesmo período do ano anterior (L.Y.).","Receita por grupo terapêutico e por turno (manhã, tarde e noite).","Tabela de forma de pagamento: o PIX lidera com R$ 707 mil.","Top produtos com classificação em quadrantes: Âncora de Lucro (ex.: Novalgina e Paracetamol + Cafeína, com 34% e 37% de margem) e Ocupa Prateleira."],
     dax:"",
     resultado:"Uma página que responde à pergunta do gestor em segundos e aponta quais produtos sustentam a margem."}},

  {slug:"vela-people-analytics", lane:"negocio", domain:"Pessoas · People Analytics",
   title:"VELA · Diagnóstico de Retenção", file:"Inteligência de Retenção · 3 páginas", mock:"bars",
   lede:"Diagnóstico estratégico de retenção de talentos: quanto a empresa perde com a rotatividade e onde está o risco.",
   side:"Sobre 14.999 colaboradores, a taxa real de rotatividade é de 23,8%, com 3.539 pessoas em risco de saída e R$ 259 Mi de perda projetada em reposição. O what-if de retenção indica ROI de 1,52x.",
   kpi:{v:"23,8%", l:"rotatividade real"}, tools:["Power BI","DAX"], tags:["People Analytics","What-if","Risco de saída"],
   report:PBI+"eyJrIjoiYmNmMTQxZmYtZTNhMS00NThmLTg2ODgtZmFkZDY2ODQwMDE4IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"vela-diagnostico.webp", draft:true,
   case:{
     pergunta:"Onde a empresa perde mais gente, quanto custa repor e vale a pena investir em retenção?",
     dados:["Base de 14.999 colaboradores em retrato atual, com departamento e tempo de casa.","Probabilidade de saída por colaborador, com corte em 50% para a lista de risco."],
     tecnicas:["KPIs de rotatividade, colaboradores em risco (3.539), perda projetada, risco crítico em alto desempenho (1.890) e ROI de retenção.","Rotatividade e custo de reposição por departamento.","Colaboradores por faixa de risco e por quadrante de risco.","Filtros de departamento e tempo de casa, e premissas do what-if para o ROI."],
     dax:"",
     resultado:"Uma fila priorizada de intervenção: quem sair pesa mais, onde e quanto custa."}},

  {slug:"olist-store", lane:"negocio", domain:"E-commerce",
   title:"Olist Store", file:"E-commerce Analytics · Resumo", mock:"line",
   lede:"Painel de e-commerce da Olist Store, com resumo de leads, vendas e pedidos, análise ao longo do tempo, mapa por região e ranking de cidades.",
   side:"Na visão de 2018, o resumo mostra 54.011 pedidos, 8.000 leads e ticket médio de 164,93, com pedidos +19,76% acima do ano anterior. São Paulo lidera o ranking de cidades com 9,1 mil pedidos.",
   kpi:{v:"54.011", l:"pedidos em 2018"}, tools:["Power BI","DAX"], tags:["E-commerce","Ticket médio","Mapa","Ranking"],
   report:PBI+"eyJrIjoiYWRjMzcwZmEtZTcyZC00YTk1LWIzOWMtYmQ2ZmU5MTk3MGQ1IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"olist-resumo.webp", draft:true,
   gallery:[
     {src:IMG+"olist-resumo.webp", cap:"Resumo de 2018: leads, recorrência, vendas, ticket médio, pedidos e cancelamentos, com mapa por região e ranking de cidades"}],
   case:{
     pergunta:"Como estão as vendas e os pedidos de um e-commerce ao longo do tempo, e de onde vêm os pedidos?",
     dados:["Base pública da Olist, marketplace brasileiro, com seletor de ano (2016, 2017 e 2018).","Pedidos, vendas, ticket médio, cancelamentos, leads e recorrência.","Localização dos pedidos por cidade e estado, para o mapa e o ranking."],
     tecnicas:["Cartões de resumo em três faixas: leads e recorrência, vendas e ticket médio, pedidos e cancelamentos.","Linha diária de pedidos contra o mesmo período do ano anterior (Y-1), com a variação destacada (+19,76%).","Mapa com abas por região: Centro-Oeste, Nordeste, Norte, Sudeste e Sul.","Ranking de pedidos com alternância entre cidade, ID, estado e produto.","Menu lateral com ícones que leva às outras páginas do relatório."],
     dax:"",
     resultado:"Uma leitura rápida do ano: 54.011 pedidos, 334 cancelados, ticket médio de 164,93 e concentração em São Paulo, Rio de Janeiro e Belo Horizonte."}},

  {slug:"xperiun-metalurgica", lane:"negocio", domain:"Indústria · Metalurgia",
   title:"Xperiun Metalúrgica", file:"Data Partners · Capa, KPI e Summary", mock:"pipeline",
   lede:"Relatório de operação industrial para a Xperiun Metalúrgica, do programa Data Partners: tempo por setor, pedidos travados e atrasados e lucro, de 2024 a 2025.",
   side:"No Summary, 10 mil pedidos passam por 11 setores, com 6,54% atrasados, lead time de 24,71 e lucro de 1,31 bi. Preparação concentra mais pedidos travados (682) entre os setores.",
   kpi:{v:"6,54%", l:"pedidos atrasados"}, tools:["Power BI","DAX"], tags:["Indústria","Lead time","SLA","Data Partners"],
   report:PBI+"eyJrIjoiYzcwMTUwNTMtNTJmZC00OTgyLTgyMDUtOTM2YjBjNzg2MGE4IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"metalurgica-summary.webp", draft:true,
   gallery:[
     {src:IMG+"metalurgica-capa.webp", cap:"Capa do relatório da Xperiun Metalúrgica"},
     {src:IMG+"metalurgica-summary.webp", cap:"Summary: tempo padrão contra tempo real por setor, KPIs de pedidos, lucro ao longo do tempo, tabela de pedidos e pedidos travados por setor"},
     {src:IMG+"metalurgica-pedido.webp", cap:"Detalhe do pedido: ficha, fluxo pelos setores e passagem por cada etapa com dias, tempo padrão, custo por hora e ocorrência"}],
   case:{
     pergunta:"Onde os pedidos ficam parados na fábrica, quanto tempo cada setor leva além do padrão e o que isso custa em lucro?",
     dados:["Pedidos de 01/01/2024 a 31/12/2025, com tipo, status, setor, prazo, SLA e lucro.","Passagem de cada pedido pelos setores: entrada, saída, dias, tempo padrão, funcionário, custo por hora e ocorrência.","Onze setores no fluxo: Comercial, Engenharia de Produto, Compras, PCP, Desenho Técnico, Preparação, Corte, Solda, Usinagem, Qualidade Final e Expedição."],
     tecnicas:["Filtro de período e navegação por Capa, KPI e Summary no topo.","Barras de tempo padrão contra tempo real por setor, com linha de desvio médio.","Cartões de lucro (1,31 bi), pedidos totais, concluídos, travados e atrasados (328), % de atrasados (6,54%) e lead time (24,71).","Tabela de pedidos com alerta por ícone, status, SLA e lucro, e gráfico de pedidos travados por setor com alternância para disponibilidade.","Página de detalhe do pedido: ficha com segmento, prioridade, SLA e status financeiro, fluxograma do processo e tabela de dias por etapa, com destaque de cor nos atrasos."],
     dax:"",
     resultado:"Uma leitura da fábrica em uma tela: o desvio aparece setor a setor, os pedidos travados ficam concentrados em Preparação, e qualquer pedido pode ser aberto para ver exatamente onde perdeu dias."}},

  {slug:"agent-performance-report", lane:"negocio", domain:"Cobrança · Operação de crédito",
   title:"Agent Performance Report", file:"Operacional · 3 páginas", mock:"bars",
   lede:"Acompanhamento de produtividade de operadores de cobrança: o ritmo de cada agente em relação à meta do mês, em uma operação de recuperação de crédito.",
   side:"A pergunta do gestor é quem está no ritmo para bater a meta e quem precisa de apoio. O ranking projeta o resultado de cada operador, e o gráfico de concentração cruza o quanto cada um depende de um mesmo tipo de desfecho com a sua taxa de RPC (contato com a pessoa certa).",
   kpi:{v:"3 páginas", l:"visão geral, ritmo e guia de métricas"}, tools:["Power BI","DAX"], tags:["Produtividade","Meta e projeção","Concentração de desfechos"],
   report:PBI+"eyJrIjoiOWIwMTFiYmQtOTgyNC00MGU5LWJlNjctYjkyZWNmMjVhNmVmIiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:"", draft:true,
   case:{
     pergunta:"Quais operadores estão no ritmo da meta do mês, quem precisa de apoio e o que diferencia o resultado de cada um?",
     dados:["Registros de contatos de cobrança por operador, com data, hora, carteira e desfecho.","Tabela de desfechos classificada em PTP (promessa de pagamento), RPC (contato com a pessoa certa) e Alô (atendimento sem contato efetivo).","Meta mensal por operador e calendário de dias úteis para a projeção do mês."],
     tecnicas:["Página Visão Geral com os principais indicadores do mês e a meta da equipe.","Página Agent Pace: ranking de operadores com projeção contra a meta, ritmo (Excellent, Great, Near Target e Below Target), média diária e desvio em relação à equipe.","Índice de concentração de desfechos (HHI) por operador, para medir se o resultado depende de um único tipo de desfecho.","Gráfico de dispersão concentração × RPC, com o desfecho dominante no tooltip e cruzamento de filtros para ver os operadores de cada faixa.","Quartil por projeção, com cores na mesma escala do ritmo.","Seleção de indicador (registros, contratos ou clientes) por parâmetro dinâmico."],
     dax:"",
     resultado:"Uma leitura de ritmo que vai além da média: o gestor identifica quem está abaixo da meta, se o desempenho depende de um tipo de desfecho e onde concentrar o apoio."}},

  {slug:"automacao-python", lane:"automacao", domain:"Crédito & Cobrança · Funchal Negócios",
   title:"13 rotinas manuais que viraram Python", file:"automacoes/", mock:"pipeline",
   lede:"Mapeei e automatizei 13 processos manuais da operação de crédito e cobrança em Python.",
   side:"O resultado foram cerca de 24 horas por semana devolvidas ao time, que passaram a ir para análise em vez de copiar e colar. Hoje aplico a mesma lógica com Databricks e Pentaho.",
   kpi:{v:"96 h", l:"por mês devolvidas"}, tools:["Python","SQL","Databricks"], tags:["Automação","ETL","Eficiência"],
   report:"", repo:GITHUB, cover:"", draft:false, internal:true,
   case:{
     pergunta:"Quanto tempo do time está preso em tarefas repetitivas, e quais delas dá para tirar da mão?",
     dados:["Planilhas e extrações diárias de sistemas de cobrança.","Consolidação de múltiplas fontes com Databricks e Pentaho."],
     tecnicas:["Levantamento do tempo gasto por rotina antes de automatizar.","Scripts em Python para extração, tratamento e distribuição de bases.","Priorização pelo ganho de horas por semana."],
     dax:"",
     resultado:"13 processos automatizados e cerca de 96 horas por mês liberadas para análises de maior valor. Os dados são internos, então o case descreve o método sem expor a base."}}
];

const JOURNEY = [
  {when:"nov 2023 — atual", role:"Business Intelligence Analyst", org:"Funchal Negócios", ph:"data", now:true,
   desc:"Relatórios e KPIs em Power BI para decisões de crédito e cobrança. Automatizei 13 processos em Python e consolido fontes com Databricks e Pentaho."},
  {when:"abr 2021 — nov 2023", role:"Control Desk", org:"Funchal Negócios", ph:"ops",
   desc:"Monitoramento de produtividade, filas, volumes de contato e SLAs diários das equipes de cobrança."},
  {when:"fev 2019 — abr 2021", role:"Supervisor de cobrança", org:"Funchal Negócios", ph:"ops",
   desc:"Liderança de equipe, estratégias de recuperação de crédito, treinamento e qualidade das abordagens."},
  {when:"nov 2017 — fev 2019", role:"Back Office", org:"Funchal Negócios", ph:"ops",
   desc:"Suporte à operação, fluxo de documentos e pagamentos, validação de acordos."},
  {when:"nov 2016 — nov 2017", role:"Operador de cobranças", org:"Funchal Negócios", ph:"ops",
   desc:"Negociação direta com clientes e controle de acordos firmados."},
  {when:"jul 2014 — mai 2015", role:"Negociador", org:"Grupo Fórum", ph:"ops",
   desc:"Recuperação de crédito com propostas de pagamento personalizadas."},
  {when:"nov 2011 — jul 2014", role:"Operador → Supervisor de cobrança", org:"ML Serviços Financeiros", ph:"ops",
   desc:"Começo na linha de frente e, um ano depois, coordenação da equipe e relatórios de performance."}
];
