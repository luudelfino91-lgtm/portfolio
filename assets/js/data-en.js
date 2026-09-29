/* =====================================================================
   ENGLISH VERSION OF THE CONTENT (default language of the site)
   data.js keeps the Portuguese originals. Each entry here overrides the
   Portuguese text of the same project (matched by slug), in the same order.
   Missing fields fall back to Portuguese.
   ===================================================================== */
const EN = {
  lanes: {
    autoral:   {name:"Independent study",     desc:"My own research using public data on the market I work in."},
    negocio:   {name:"Business reports",      desc:"Projects built around real business problems: sales, finance, insurance, pharma, people, retail and industry."},
    automacao: {name:"Operations automation", desc:"The work that never becomes a public dashboard but gives hours back to the team every month."}
  },
  projects: {
    "panorama-consorcios": {
      domain:"Consortium market · Financial markets", file:"Independent study · 4 pages",
      lede:"An independent study of the Brazilian consortium market (a group-based savings and credit scheme used to buy cars, property and more), built on public ABAC and BACEN data from Jan 2019 to May 2026 and told in acts, like a news feature.",
      side:"The active portfolio grew from 7.55 to 13.25 million quotas (+75.4%) while delinquency fell from 11.75% to 10.49%, with the caveat that BCB Resolution 285 changed how it is measured. Motorcycles are still half the market but lost 9.2 p.p. of share, and Real Estate gained 10.4 p.p.",
      kpi:{v:"13.25 M", l:"active quotas in May 2026"}, tags:["Public data","ABAC · BACEN","Storytelling"],
      gallery:["Act 01: market size, with active portfolio, quotas sold in 2025, delinquency and active administrators","Act 02: the change of leadership, with portfolio mix by segment and share gained and lost since 2019"],
      case:{
        pergunta:"How has the consortium market grown since 2019, and who gained and lost ground along the way?",
        dados:["Public ABAC and BACEN datasets, Jan 2019 to May 2026.","Active portfolio, quotas sold, delinquency and active administrators (124 with a portfolio in the latest month, 160 registered).","Segments: Motorcycles, Vehicles, Real Estate, Heavy vehicles, Services and Electronics."],
        tecnicas:["A page written in acts, each with a headline that is already the conclusion and a paragraph of context before the charts.","KPI cards showing change against Dec 2019 and against the previous year.","Area chart for the portfolio, with delinquency as a line on the right axis and the 2020 shock shaded.","100% stacked composition by segment and share-change bars in percentage points.","A methodological note on BCB Resolution 285, which removes participants more than three months overdue from the indicator."],
        resultado:"Seven years, almost double the quotas and less delinquency, taking care to show that part of the drop comes from a change in definition rather than a change in behaviour."}
    },
    "lets-cola": {
      domain:"Beverages · Retail", file:"Management dashboard · 4 pages",
      lede:"Management dashboard for a beverage manufacturer, with three views (Sales, Products and Finance) covering 2019 to 2022.",
      side:"The report marks the new marketing strategy in the middle of the period and shows what changed in sales and margin: R$ 202 M in revenue, 99.82% of target and a 52.6% margin.",
      kpi:{v:"R$ 202 M", l:"revenue 2019–2022"}, tags:["KPIs","What-if","Hierarchical analysis","Map"],
      gallery:["Navigation cover: Sales, Products and Finance","Sales: 201k orders, 9,274 customers, seller ranking and the new marketing strategy milestone","Products: 46 products in 6 categories, with Beverages at 74.81% of sales, and hierarchical analysis","Finance: revenue, cost, profit and freight, a what-if cost simulator, a map by state and results by business unit"],
      case:{
        pergunta:"Did the change in marketing strategy improve the company's commercial and financial results?",
        dados:["Sales, products, customers and costs between 2019 and 2022.","Calendar with the New Marketing Strategy milestone in Jul 2021.","Customer locations for the revenue-by-state map."],
        tecnicas:["Three pages, one per area (Sales, Products and Finance), with their own navigation bar at the top.","Indicators against target and against the previous year (99.82% of target, +36% year over year).","Hierarchical analysis by category and product, switching between sales, freight and cost.","What-if simulator: how much the company would save with a percentage cut in costs.","Revenue map by location and a waterfall by business unit."],
        resultado:"A direct reading of the operation: R$ 202 M in revenue, R$ 106 M in profit and a 52.6% margin over the period, with the effect of the new strategy visible on the sales timeline."}
    },
    "seguradora-xperiun": {
      domain:"Insurance", file:"Performance and retention · 5 sections",
      lede:"Analysis of an insurer's main KPIs: growth, churn and the financial impact on revenue, across three dashboards: Performance, Risk and acquisition, and Products.",
      side:"The Performance dashboard brings together 19,561 active policies, R$ 309.3 M in revenue and an 18.42% global churn rate against a 12% limit target. In Products, 2025 records 1,768 cancelled policies, with high price as the main reason (426).",
      kpi:{v:"18.42%", l:"global churn"}, tags:["Churn","Retention","Sales channels","Section navigation"],
      gallery:["Navigation cover of Seguradora Xperiun","Sales performance: active policies, revenue, 18.42% global churn against the 12% limit, premium and policy targets, and policies by region","Risk and acquisition: cancellation by instalments paid, churn by sales channel and an age-band matrix","Products: 2025 cancellations by reason, channel and coverage, with churn by coverage type"],
      case:{
        pergunta:"How fast does the portfolio grow, how much is lost to churn and what does that cost in revenue?",
        dados:["Policy, premium and target data for the fictional insurer from the Xperiun challenge.","Cuts by year, month, line of business, channel, age band and customer type.","Sales channels: individual broker, partner brokerage, digital (app and website), telesales and bancassurance."],
        tecnicas:["Side menu with Performance, Risk and acquisition and Products, and filters that stay fixed on every page.","Indicators for active policies (19,561), revenue (R$ 309.3 M), revenue lost to churn (R$ 36.3 M) and revenue impact (19.65%).","Churn gauge against the 12% limit target and revenue by line: Auto 79.06%, Life 13.06% and Home 7.88%.","Premium target (95.92% delivered) and policy target (97.45%) tables by year, with policies by region.","Colour-scaled churn matrix by age band and channel, where digital sales reach 28.35% for ages 18 to 25.","Products page with a year filter, cancellation reasons by channel and churn by coverage (Basic 14.19%, Complete 10.86%, Premium 7.80%)."],
        resultado:"A picture that ties retention to money: the 18.42% global churn sits well above the 12% target and appears next to the revenue lost, with cuts by channel, age and coverage showing where cancellations concentrate."}
    },
    "pharmavantage": {
      domain:"Pharmaceutical", file:"Descriptive view · 6 pages",
      lede:"Commercial analysis of a pharmaceutical company. The first page is the descriptive view: what happened, as a snapshot of the business.",
      side:"R$ 2.31 M in net revenue, R$ 671.86 k in profit and a 29.0% margin between 2014 and 2019, with a volume × margin quadrant that separates profit-anchor products from those that just take up shelf space.",
      kpi:{v:"29.0%", l:"profit margin"}, tags:["Descriptive analysis","Volume × margin quadrant","Payment method"],
      case:{
        pergunta:"What happened in the business: how much was sold, at what margin, in which shift, through which payment method and with which products?",
        dados:["Sales from 2014 to 2019 by product, therapeutic group, shift and payment method.","85,407 transactions and an average ticket of R$ 27.09."],
        tecnicas:["Five KPIs at the top: net revenue, profit, average ticket, margin and items sold.","Month-by-month comparison with the same period last year (L.Y.).","Revenue by therapeutic group and by shift (morning, afternoon and evening).","Payment method table: PIX (Brazil's instant payment system) leads with R$ 707 k.","Top products classified into quadrants: Profit Anchor (e.g. Novalgina and Paracetamol + Caffeine, with 34% and 37% margin) and Shelf Filler."],
        resultado:"A page that answers the manager's question in seconds and points to the products that sustain the margin."}
    },
    "vela-people-analytics": {
      title:"VELA · Retention Diagnostic", domain:"People · People Analytics", file:"Retention intelligence · 3 pages",
      lede:"Strategic diagnosis of talent retention: how much the company loses to turnover and where the risk sits.",
      side:"Across 14,999 employees, the real turnover rate is 23.8%, with 3,539 people at risk of leaving and R$ 259 M in projected replacement losses. The retention what-if shows an ROI of 1.52x.",
      kpi:{v:"23.8%", l:"real turnover"}, tags:["People Analytics","What-if","Attrition risk"],
      case:{
        pergunta:"Where does the company lose the most people, how much does replacement cost and is it worth investing in retention?",
        dados:["A current snapshot of 14,999 employees, with department and tenure.","Probability of leaving per employee, with a 50% cut-off for the risk list."],
        tecnicas:["KPIs for turnover, employees at risk (3,539), projected loss, critical risk among high performers (1,890) and retention ROI.","Turnover and replacement cost by department.","Employees by risk band and by risk quadrant.","Department and tenure filters, and what-if assumptions for the ROI."],
        resultado:"A prioritised intervention list: whose departure weighs most, where, and at what cost."}
    },
    "olist-store": {
      domain:"E-commerce", file:"E-commerce Analytics · Summary",
      lede:"E-commerce dashboard for Olist Store, with a summary of leads, sales and orders, analysis over time, a regional map and a city ranking.",
      side:"In the 2018 view, the summary shows 54,011 orders, 8,000 leads and an average ticket of 164.93, with orders +19.76% above the previous year. São Paulo leads the city ranking with 9.1k orders.",
      kpi:{v:"54,011", l:"orders in 2018"}, tags:["E-commerce","Average ticket","Map","Ranking"],
      gallery:["2018 summary: leads, recurrence, sales, average ticket, orders and cancellations, with a regional map and a city ranking"],
      case:{
        pergunta:"How are an e-commerce store's sales and orders evolving over time, and where do the orders come from?",
        dados:["Public Olist dataset (a Brazilian marketplace), with a year selector (2016, 2017 and 2018).","Orders, sales, average ticket, cancellations, leads and recurrence.","Order locations by city and state, for the map and the ranking."],
        tecnicas:["Summary cards in three bands: leads and recurrence, sales and average ticket, orders and cancellations.","Daily orders line against the same period of the previous year (Y-1), with the change highlighted (+19.76%).","Map with tabs by region: Central-West, Northeast, North, Southeast and South.","Order ranking that switches between city, ID, state and product.","Icon side menu that leads to the other pages of the report."],
        resultado:"A quick read of the year: 54,011 orders, 334 cancelled, an average ticket of 164.93 and orders concentrated in São Paulo, Rio de Janeiro and Belo Horizonte."}
    },
    "xperiun-metalurgica": {
      domain:"Industry · Metallurgy", file:"Data Partners · Cover, KPI and Summary",
      lede:"Industrial operations report for Xperiun Metalúrgica, from the Data Partners programme: time per sector, blocked and late orders and profit, from 2024 to 2025.",
      side:"In the Summary, 10k orders go through 11 sectors, with 6.54% late, a lead time of 24.71 and profit of 1.31 bn. Preparation has the most blocked orders (682) of all sectors.",
      kpi:{v:"6.54%", l:"late orders"}, tags:["Industry","Lead time","SLA","Data Partners"],
      gallery:["Cover of the Xperiun Metalúrgica report","Summary: standard vs actual time per sector, order KPIs, profit over time, order table and blocked orders by sector","Order detail: order sheet, flow through the sectors and each step with days, standard time, hourly cost and occurrence"],
      case:{
        pergunta:"Where do orders get stuck on the factory floor, how much longer than standard does each sector take and what does that cost in profit?",
        dados:["Orders from 01/01/2024 to 31/12/2025, with type, status, sector, deadline, SLA and profit.","Each order's passage through the sectors: entry, exit, days, standard time, employee, hourly cost and occurrence.","Eleven sectors in the flow: Sales, Product Engineering, Purchasing, Production Planning (PCP), Technical Drawing, Preparation, Cutting, Welding, Machining, Final Quality and Shipping."],
        tecnicas:["Period filter and navigation across Cover, KPI and Summary at the top.","Bars of standard vs actual time per sector, with an average-deviation line.","Cards for profit (1.31 bn), total, completed, blocked and late orders (328), % late (6.54%) and lead time (24.71).","Order table with icon alerts, status, SLA and profit, and a blocked-orders-by-sector chart that toggles to availability.","Order detail page: sheet with segment, priority, SLA and financial status, a process flowchart and a table of days per step, with colour highlighting on delays."],
        resultado:"A read of the factory on one screen: the deviation shows up sector by sector, blocked orders concentrate in Preparation, and any order can be opened to see exactly where it lost days."}
    },
    "automacao-python": {
      title:"13 manual routines turned into Python", domain:"Credit & Collections · Funchal Negócios", file:"automacoes/",
      lede:"I mapped and automated 13 manual processes in the credit and collections operation using Python.",
      side:"The result was about 24 hours a week returned to the team, now spent on analysis instead of copy and paste. Today I apply the same logic with Databricks and Pentaho.",
      kpi:{v:"96 h", l:"returned per month"}, tags:["Automation","ETL","Efficiency"],
      case:{
        pergunta:"How much of the team's time is tied up in repetitive tasks, and which of them can be taken off their hands?",
        dados:["Spreadsheets and daily extractions from collections systems.","Consolidation of multiple sources with Databricks and Pentaho."],
        tecnicas:["Measured the time spent on each routine before automating it.","Python scripts to extract, transform and distribute datasets.","Prioritised by hours saved per week."],
        resultado:"13 processes automated and around 96 hours a month freed up for higher-value analysis. The data is internal, so the case describes the method without exposing the dataset."}
    }
  },
  journey: [
    {when:"Nov 2023 — present", role:"Business Intelligence Analyst", org:"Funchal Negócios",
     desc:"Power BI reports and KPIs for credit and collections decisions. Automated 13 processes in Python and consolidate sources with Databricks and Pentaho."},
    {when:"Apr 2021 — Nov 2023", role:"Control Desk",
     desc:"Monitoring of productivity, queues, contact volumes and daily SLAs for the collections teams."},
    {when:"Feb 2019 — Apr 2021", role:"Collections Supervisor",
     desc:"Team leadership, credit recovery strategies, training and quality of customer approaches."},
    {when:"Nov 2017 — Feb 2019", role:"Back Office",
     desc:"Operations support, document and payment flow, and validation of agreements."},
    {when:"Nov 2016 — Nov 2017", role:"Collections Agent",
     desc:"Direct negotiation with customers and tracking of the agreements made."},
    {when:"Jul 2014 — May 2015", role:"Negotiator",
     desc:"Credit recovery with tailored payment proposals."},
    {when:"Nov 2011 — Jul 2014", role:"Collections Agent → Supervisor",
     desc:"Started on the front line and, a year later, coordinated the team and performance reports."}
  ]
};
