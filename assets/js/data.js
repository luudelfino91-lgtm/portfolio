/* =====================================================================
   CONTEÚDO — edite aqui. Tudo na página é gerado a partir destes dados.
   - cover: caminho de uma imagem real do relatório (ex.: "assets/img/projetos/lets-cola.webp").
            Vazio = mostra uma prévia ilustrativa gerada automaticamente.
   - report: link público do Power BI.  repo: link do GitHub (opcional).
   - draft: true mostra um aviso no case técnico lembrando de revisar o texto.
   ===================================================================== */
const SHOW_DRAFT_NOTES = true;
const XPERIUN = "https://app.xperiun.com/in/lucasdelfino";
const GITHUB  = "https://github.com/luudelfino91-lgtm";

const LANES = [
  {id:"autoral",   name:"Estudo autoral",        desc:"Pesquisa própria com dados públicos sobre o mercado em que eu atuo."},
  {id:"negocio",   name:"Relatórios de negócio", desc:"Projetos e desafios com problemas de negócio reais: comercial, financeiro, seguros, logística e varejo."},
  {id:"automacao", name:"Automação na operação", desc:"O trabalho que não vira dashboard público, mas devolve horas ao time todo mês."}
];

const PROJECTS = [
  {slug:"panorama-consorcios", lane:"autoral", domain:"Consórcios · Mercado financeiro",
   title:"Panorama Consórcios", file:"panorama-consorcios.pbix", mock:"area",
   lede:"Estudo autoral sobre o mercado brasileiro de consórcios, construído só com dados públicos da ABAC e do BACEN, de 2019 a março de 2026.",
   side:"A ideia é ler o setor como uma série contínua: como adesões, cotas ativas e segmentos se comportaram ao longo de sete anos de juros altos e baixos.",
   kpi:{v:"2019–26", l:"série histórica"}, tools:["Power BI","Power Query","DAX"], tags:["Dados públicos","ABAC · BACEN","Storytelling"],
   report:XPERIUN, repo:"", cover:"", draft:true,
   case:{
     pergunta:"Como o mercado de consórcios evoluiu desde 2019, e quais segmentos puxam o crescimento?",
     dados:["Relatórios públicos da ABAC (associação do setor) e bases do BACEN.","Janela de 2019 até março de 2026, tratada no Power Query para formar uma série mensal única.","Modelo em estrela com calendário, segmento e administradora como dimensões."],
     tecnicas:["Medidas de variação YoY e acumulado no ano em DAX.","Padronização de bases com layouts diferentes ao longo dos anos.","Narrativa guiada: cada página responde a uma pergunta."],
     dax:"Adesões YoY % =\nVAR _atual = [Adesões]\nVAR _ano_ant = CALCULATE ( [Adesões], SAMEPERIODLASTYEAR ( dCalendario[Data] ) )\nRETURN DIVIDE ( _atual - _ano_ant, _ano_ant )",
     resultado:"Um panorama que qualquer pessoa do mercado consegue ler em poucos minutos, com o link publicado nos destaques do LinkedIn."}},

  {slug:"lets-cola", lane:"negocio", domain:"Bebidas · Varejo",
   title:"Lets Cola", file:"lets-cola.pbix", mock:"bars",
   lede:"Relatório com os principais KPIs das áreas Comercial, Produtos e Financeiro de uma fabricante de bebidas.",
   side:"O foco é o antes e o depois: a empresa mudou a estratégia de marketing no meio do período, e o relatório mostra o que isso fez com vendas e margem.",
   kpi:{v:"3", l:"áreas analisadas"}, tools:["Power BI","DAX"], tags:["KPIs","Antes × depois","Financeiro"],
   report:XPERIUN, repo:"", cover:"", draft:true,
   case:{
     pergunta:"A mudança na estratégia de marketing melhorou o resultado comercial e financeiro?",
     dados:["Base de vendas, produtos e custos do desafio.","Calendário marcando o ponto de virada da estratégia."],
     tecnicas:["Comparativo de períodos antes e depois da mudança.","Páginas separadas por área: Comercial, Produtos e Financeiro.","Tooltips com o detalhe mensal."],
     dax:"",
     resultado:"Uma leitura direta de qual área respondeu à nova estratégia e onde a margem ficou pelo caminho."}},

  {slug:"seguradora-xperiun", lane:"negocio", domain:"Seguros",
   title:"Seguradora Xperiun", file:"seguradora.pbix", mock:"donut",
   lede:"Painel de acompanhamento da carteira de uma seguradora, com a visão dos indicadores centrais do negócio.",
   side:"Descreva aqui o recorte principal: por exemplo, prêmios, sinistros e a relação entre eles por produto e região.",
   kpi:{v:"—", l:"indicador-chave"}, tools:["Power BI","DAX"], tags:["Seguros","Carteira","KPIs"],
   report:"https://app.powerbi.com/links/G5hsgvfVRP", repo:"", cover:"", draft:true,
   case:{pergunta:"Qual a saúde da carteira e onde estão os riscos?",dados:["Base do desafio Xperiun."],tecnicas:["Modelo dimensional","Medidas de razão e participação"],dax:"",resultado:"Descreva o principal achado."}},

  {slug:"analise-logistica", lane:"negocio", domain:"Logística",
   title:"Análise Logística", file:"logistica.pbix", mock:"line",
   lede:"Indicadores de operação logística: volumes, prazos e desempenho de entrega.",
   side:"Descreva aqui a pergunta de negócio: onde a operação atrasa e o que isso custa.",
   kpi:{v:"—", l:"no prazo"}, tools:["Power BI","DAX"], tags:["SLA","Prazos","Operação"],
   report:"https://app.powerbi.com/links/Cp5Tuc_XtO", repo:"", cover:"", draft:true,
   case:{pergunta:"Onde a operação perde prazo?",dados:["Base do desafio Xperiun."],tecnicas:["Indicadores de SLA","Análise por período e região"],dax:"",resultado:"Descreva o principal achado."}},

  {slug:"pharmavantage", lane:"negocio", domain:"Farmacêutico",
   title:"PharmaVantage Analytics", file:"pharmavantage.pbix", mock:"bars",
   lede:"Análise comercial para uma empresa do setor farmacêutico.",
   side:"Descreva aqui o recorte: canais, produtos, regiões ou representantes.",
   kpi:{v:"—", l:"indicador-chave"}, tools:["Power BI","DAX"], tags:["Comercial","Produtos"],
   report:XPERIUN, repo:"", cover:"", draft:true,
   case:{pergunta:"Descreva a pergunta central.",dados:["Base do desafio."],tecnicas:["Modelo dimensional"],dax:"",resultado:"Descreva o principal achado."}},

  {slug:"olist-store", lane:"negocio", domain:"E-commerce",
   title:"Olist Store", file:"olist.pbix", mock:"line",
   lede:"Análise da base pública da Olist, marketplace brasileiro: vendas, clientes e entregas.",
   side:"Descreva aqui o foco: por exemplo, recorrência de clientes ou impacto do atraso na avaliação.",
   kpi:{v:"—", l:"indicador-chave"}, tools:["Power BI","SQL","DAX"], tags:["E-commerce","Clientes","Entregas"],
   report:XPERIUN, repo:"", cover:"", draft:true,
   case:{pergunta:"Descreva a pergunta central.",dados:["Dataset público Olist (Kaggle)."],tecnicas:["Modelo dimensional"],dax:"",resultado:"Descreva o principal achado."}},

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
