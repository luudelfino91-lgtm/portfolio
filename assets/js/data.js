/* =====================================================================
   CONTEÚDO — edite aqui. Tudo na página é gerado a partir destes dados.
   - cover:   imagem real do relatório (ex.: "assets/img/projetos/lets-cola-capa.webp").
              Vazio = mostra uma prévia ilustrativa gerada automaticamente.
   - gallery: lista de {src, cap} com outras páginas do relatório (aparece no case).
   - report:  link público do Power BI.   repo: link do GitHub (opcional).
   - draft:   true mostra um aviso no case técnico lembrando de revisar o texto.
   ===================================================================== */
const SHOW_DRAFT_NOTES = true;
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
   lede:"Análise das principais KPIs de uma seguradora: crescimento, churn e impacto financeiro na receita.",
   side:"O painel de Performance junta 19.561 apólices ativas, receita de R$ 309,3 M e churn global de 18,42%, contra uma meta-limite de 12%, com abertura por ramo e região.",
   kpi:{v:"18,42%", l:"churn global"}, tools:["Power BI","DAX"], tags:["Churn","Retenção","Navegação por seções"],
   report:PBI+"eyJrIjoiMWI1YzVkOTctYzJkYi00N2U4LWE4ZjItNTE4ZTJiOTk2NzY2IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"seguradora-capa.webp", draft:true,
   case:{
     pergunta:"Quanto a carteira cresce, quanto se perde em churn e o que isso custa em receita?",
     dados:["Base de apólices, prêmios e metas da seguradora fictícia do desafio Xperiun.","Recortes por ano, mês, ramo e tipo de cliente."],
     tecnicas:["Cinco seções navegáveis: Início, Performance, Risco e aquisições, Produtos e Documentação, mais um glossário.","Indicadores de apólices ativas, receita, receita perdida por churn (R$ 36,3M) e impacto na receita.","Medidor de churn contra a meta-limite de 12%.","Tabela de meta de prêmios e de apólices por ano, e apólices por região."],
     dax:"",
     resultado:"Um retrato que liga retenção a dinheiro: o churn global de 18,42% aparece ao lado da receita perdida e do impacto na receita."}},

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
   title:"Olist Store", file:"Dashboard + documentação", mock:"line",
   lede:"Relatório da Olist Store, com o lema “entenda seus dados em poucos cliques”: dashboard, documentação, glossário e guia do usuário.",
   side:"Além do painel, o projeto entrega a camada de apoio ao usuário: documentação do modelo, glossário de termos e um guia de uso dentro do próprio relatório.",
   kpi:{v:"4", l:"seções de navegação"}, tools:["Power BI","DAX"], tags:["E-commerce","Documentação","Guia do usuário"],
   report:PBI+"eyJrIjoiYWRjMzcwZmEtZTcyZC00YTk1LWIzOWMtYmQ2ZmU5MTk3MGQ1IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:"", draft:true,
   case:{pergunta:"Descreva a pergunta central do projeto.",dados:["Base pública da Olist (marketplace brasileiro)."],tecnicas:["Dashboard com navegação para Documentação, Glossário e Guia do usuário."],dax:"",resultado:"Descreva o principal achado."}},

  {slug:"xperiun-metalurgica", lane:"negocio", domain:"Indústria · Metalurgia",
   title:"Xperiun Metalúrgica", file:"Data Partners · 2 páginas", mock:"pipeline",
   lede:"Relatório para a Xperiun Metalúrgica, do programa Data Partners, voltado à operação industrial.",
   side:"Descreva aqui o recorte principal: produção, qualidade, custos ou eficiência da planta.",
   kpi:{v:"2", l:"páginas no relatório"}, tools:["Power BI","DAX"], tags:["Indústria","Operação","Data Partners"],
   report:PBI+"eyJrIjoiYzcwMTUwNTMtNTJmZC00OTgyLTgyMDUtOTM2YjBjNzg2MGE4IiwidCI6Ijc4NzA1NDBkLTMzZTEtNDlhZC04OTFjLTY1ZjY5YzA4ZjNjYiJ9",
   repo:"", cover:IMG+"metalurgica-capa.webp", draft:true,
   case:{pergunta:"Descreva a pergunta central do projeto.",dados:["Base do desafio Xperiun Metalúrgica."],tecnicas:["Modelo dimensional","Indicadores de operação"],dax:"",resultado:"Descreva o principal achado."}},

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
