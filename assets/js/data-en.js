/* =====================================================================
   ENGLISH VERSION OF THE CONTENT (default language of the site)
   data.js keeps the Portuguese originals. Each entry here overrides the
   Portuguese text of the same project (matched by slug), in the same order.
   Missing fields fall back to Portuguese.
   ===================================================================== */
const EN = {
  lanes: {
    produtos:  {name:"Products I built",      desc:"Public applications built from scratch: people use them, study with them and come back the next day."},
    autoral:   {name:"Independent study",     desc:"My own research using public data on the market I work in."},
    negocio:   {name:"Business reports",      desc:"Projects built around real business problems: sales, finance, insurance, pharma, people, retail and industry."},
    automacao: {name:"Operations automation", desc:"The work that never becomes a public dashboard but gives hours back to the team every month."},
    "dados-ia": {name:"Applied data and AI",desc:"Pipelines and AI assistants built on public data and operations material, with measured cost and stated limits."}
  },
  projects: {
    "pca10-lab": {
      domain:"Consortium · Education", file:"Web app · Beta",
      lede:"A free, gamified platform for consortium professionals in Brazil to prepare for ABAC's PCA-10 certification exam.",
      side:"A 10-question diagnostic, 4 practice tests, an Exam Mode in the real exam format, training by module, a review queue for mistakes and a monthly leaderboard. The bank holds 148 questions, and the order of questions and answers changes every session.",
      kpi:{v:"148", l:"questions across 4 modules"}, tags:["Gamification","Installable app","LGPD (Brazil's GDPR)","Beta"],
      gallery:["Home: the next step up front (diagnostic, practice test or Exam Mode), today's goal and readiness by module","On mobile: the same home screen, with a bottom navigation bar"],
      case:{
        pergunta:"How do you help consortium professionals prepare for the PCA-10 without paying for a course, and without studying blind?",
        dados:["An original bank of 148 questions written from public regulation (Law 11,795/2008, Central Bank rules, the Consumer Code, the AML law and LGPD).","Four modules: Legislation, Operations and processes, Financial calculations and Ethics.","Progress saved in the browser and synced to the cloud (Supabase, with per-user access rules) once the person signs in."],
        tecnicas:["A 10-question diagnostic that shows the weakest module before the practice tests.","Exam Mode with 50 questions in the exam's proportions: 15 Legislation, 20 Operations, 10 Calculations and 5 Ethics.","An 80% target per module, readiness level, daily streak, achievements and a monthly leaderboard.","Email or Google sign-in, captcha-protected sign-up, terms of use and a privacy policy under LGPD.","Installable as an app, with top navigation on desktop and a bottom bar on mobile."],
        resultado:"A Beta app, open to anyone, that turns exam prep into a daily routine with per-module targets. Not affiliated with ABAC; the questions are still being reviewed by a certified professional."}
    },
    "community-hub": {
      domain:"Community · Data education", file:"hub/ · in-browser tools",
      lede:"Free tools to practise data skills right in the browser: a data explorer, a SQL playground and a Python playground.",
      side:"It runs on five built-in sample datasets (sales, marketing, logistics, HR and customer service). Nothing is uploaded, there is no sign-up and no tracking. Python runs in the browser and is only downloaded when you press Run.",
      kpi:{v:"3", l:"tools ready to use"}, tags:["No sign-up","No tracking","5 sample datasets"],
      case:{
        pergunta:"How do you let someone practise SQL and Python without installing anything or sending data anywhere?",
        dados:["Five built-in sample scenarios: sales, marketing, logistics, HR and customer service."],
        tecnicas:["A data explorer with row and column counts, types and a preview of each table.","A SQL playground on the five sample databases, right in the page.","A Python playground in an isolated frame, with the scenario's tables as CSV files.","No tracking cookies and no third-party requests.","Bilingual (Portuguese and English), with light and dark themes, like the portfolio."],
        resultado:"A place for people starting out in data to practise with no barrier: open it, pick a scenario and write the first query."}
    },
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
    "agent-performance-report": {
      domain:"Collections · Credit operations", file:"Operational · 3 pages",
      lede:"Productivity tracking report for collections agents: each agent's pace against the monthly target, in a credit recovery operation.",
      side:"The manager's question is who is on pace to hit the target and who needs support. The ranking projects each agent's result, and the concentration chart crosses how much each agent relies on one outcome type with their RPC rate (right-party contact, meaning the agent reached the right person).",
      kpi:{v:"3 pages", l:"overview, pace and metrics guide"}, tags:["Productivity","Target and projection","Outcome concentration"],
      case:{
        pergunta:"Which agents are on pace for this month's target, who needs support, and what sets each one's result apart?",
        dados:["Collection contact records by agent, with date, time, portfolio and outcome.","Outcome table grouped into PTP (promise to pay), RPC (right-party contact) and Answered (contact without an effective result).","Monthly target per agent and a business-day calendar for the month projection."],
        tecnicas:["Overview page with the main indicators for the month and the team target.","Agent Pace page: agent ranking with projection against target, pace (Excellent, Great, Near Target and Below Target), daily average and deviation from the team.","Outcome concentration index (HHI) per agent, to measure whether results depend on a single outcome type.","Concentration × RPC scatter chart, with the dominant outcome in the tooltip and cross-filtering to see the agents in each band.","Quartile by projection, coloured on the same scale as the pace.","Dynamic parameter to switch the indicator (records, contracts or clients)."],
        resultado:"A pace read that goes beyond the average: the manager sees who is below target, whether performance depends on one outcome type, and where to focus support."}
    },
    "automacao-python": {
      title:"Manual routines turned into Python", domain:"Credit & Collections · Funchal Negócios", file:"orchestrator · local dashboard",
      lede:"I automated the manual routines of the credit and collections operation in Python and built the monitoring that keeps everything running without anyone having to watch it. The first 13 routines measured gave the team back about 24 hours a week. Today there are 22 scheduled tasks, with a daily status, one consolidated alert and an orchestrator that tries to fix failures before calling anyone.",
      side:"",
      kpi:{v:"96 h", l:"returned per month"}, tags:["Automation","ETL","Monitoring"],
      panel:{
        kpis:[["22","scheduled tasks"],["3 days","check window"],["1","consolidated alert"]],
        cols:["task","last run","next run","status"], ok:"success",
        rows:[["extracao_portal_a","today 06:05","tomorrow 06:05",""],["relatorio_discagem","today 07:20","tomorrow 07:20",""],
              ["bases_powerbi_banco","today 07:45","tomorrow 07:45",""],["vendas_diario_email","today 08:10","tomorrow 08:10","retried 1×"],
              ["verifica_pendencias","today 08:30","tomorrow 08:30",""],["horas_extras_diario","today 09:00","tomorrow 09:00",""]]},
      case:{
        video:{cap:"A demo with fictional data: a routine fails on a transient error, the pipeline reruns on its own and recovers, the watchdog restarts a frozen Outlook and the gap checker sends the day's email."},
        pergunta:"How much of the team's time is stuck copying, pasting and checking files every day, and how do you take that off their hands without creating a pile of bots nobody watches?",
        contexto:"Every morning, someone downloaded reports from four dialler platforms, pasted each one into a tracking spreadsheet, refreshed the clients' Power BI datasets and emailed the summaries. When a step failed, nobody knew until the manager asked for the number.",
        nums:[["22","scheduled tasks running on their own"],["6","routine families, from extraction to email"],["4","dialler platforms consolidated into one report"],["3 days","window to catch any run that was missed"]],
        flow:{
          cols:[["Sources",["Partner web portals","Email attachments","Network folders","SQL databases"]],
                ["Python routines",["extrair.py","tratar.py","validar.py","entregar.py"]],
                ["Deliverables",["Power BI datasets","Excel and HTML reports by email","Standardised files on the network"]]],
          monitor:["Monitoring",["Daily status of each routine","Gap checker","Orchestrator with layered recovery"]]},
        families:{note:"The 22 scheduled tasks, grouped by family. Client and vendor names have been replaced.",
          items:[["4","Web portal extraction","Daily login and download of reports from partner diallers and collections bots."],
                 ["2","Copying and organising files","Client portfolios and documents moved to the network with standardised names and dates."],
                 ["3","Power BI dataset refreshes","Sales, collections funnel and the analytical base of a retail bank, from email attachments."],
                 ["10","Scheduled reports","Daily dialling summary, sales by region, vintage loss, average handling time by branch, right-party-contact target and share by agent."],
                 ["2","People and email","Daily overtime control from the time-tracking system and normalisation of incoming emails."],
                 ["1","Studies and pilots","Daily projection for a pilot of a bank's new portfolio."]]},
        example:{title:"Example: the dialling report",
          intro:"It was the most manual routine in the operation: four exports, each with different columns and time formats, pasted into four tabs of the monthly tracker.",
          steps:["Reads the four exports and shapes each one into the tracker's format.",
                 "Pastes each block into the right tab: a new day goes at the bottom and a day already pasted is overwritten in place, so running it twice duplicates nothing.",
                 "Converts the times that arrive as text, refreshes the pivot tables and sets the filters to the reference day.",
                 "Records the day's status and sends an email only if something went wrong."]},
        dados:["Daily exports from four dialler platforms and from collections bots.","Files sent by clients (banks, a credit cooperative and an insurer) by email or network folder.","SQL databases and the operation's tracking spreadsheets."],
        tecnicas:["Measured the time spent on each routine before automating and prioritised by hours returned per week.",
                  "Every routine follows the same skeleton (extract, transform, validate, deliver) and writes a daily success or failure marker, through a shared module used by 24 scripts.",
                  "A daily checker looks at the last 3 days of every routine and sends a single email with whatever did not succeed, including when the machine was switched off over the weekend.",
                  "The orchestrator shows the state of every Windows Task Scheduler task on a local dashboard, lets you run or stop each one and tries to fix failures in layers before alerting.",
                  "On-demand routines sit on a one-click dashboard, with the status, duration and log of each run."],
        decisions:[["Standard library only in the orchestrator","It runs on a corporate machine with nothing to install and no cost."],
                   ["Nothing runs outside the list","The dashboard only triggers registered tasks, listens on the local machine only and starts processes without a shell."],
                   ["Running again is safe","Every routine can be re-run without duplicating data, which allows automatic retries when a failure is transient."],
                   ["At most 3 attempts a day","A transient error is retried on its own; a structural error goes straight to a person to decide."],
                   ["Credentials out of the code","Passwords and paths live in environment files that never go to the repository."],
                   ["One alert, not twenty","Failures from every routine arrive in one consolidated email, not one per automation."]],
        resultado:"About 96 hours a month that stopped going into copy and paste and started going into analysis. More than the hours, the operation gained predictability: when something fails, the system says so before anyone misses the number. Today I apply the same logic with Databricks and Pentaho.",
        falta:["Automated tests on the most sensitive rules, such as business days and report calculations.","Structured logs instead of loose console messages.","Moving the code that is still repeated across routines into the shared module."],
        footnote:"Internal project with client data. Client, vendor and system names have been replaced with generic descriptions, and the code lives in a private repository."}
    },
    "radar-legislativo": {
      domain:"Public data · Legislature",
      file:"Data pipeline · Supabase · n8n · Power BI",
      lede:"An end-to-end pipeline that turns the Brazilian Chamber of Deputies open-data API into alerts and reports: collection, a dimensional database, AI classification and an 8-page Power BI dashboard.",
      side:"The setting is a capstone project: a fictional consultancy, Bússola Pública, that sells a weekly report for R$ 15,000 a month, written by hand by two analysts. The Chamber data is real; the client is not.",
      kpi:{v:"US$ 0.13",l:"per 1,000 proposals classified"},
      tags:["Open data","Generative AI","Idempotency","FinOps"],
      gallery:["Architecture: from the Chamber API to the Supabase database, with AI classifying and n8n alerting","Evolution: proposals per week and per theme, and the HIGH-criticality ones each week","Vote map: who votes like whom, with each party's cohesion and a note that it measures similarity, not ideology"],
      case:{pergunta:"How do you replace reading the Chamber's website by hand with automatic collection, a history in a database and alerts only for what matters, knowing what the AI will cost before running it?",contexto:"In the scenario, two analysts read the Chamber's website every week and built the report by hand. The problems were scattered spreadsheets, lost history, inconsistent theme labelling, manual alerts and no metrics.",nums:[["291","proposals monitored (PL, PLP, PEC and MPV)"],["14.8 k","parliamentary expense records loaded, for 513 deputies"],["455 k","roll-call votes of the legislature"],["23","automated tests, running with no network"]],flow:{cols:[["Sources",["Chamber open-data API","Proposals, votes and roll calls","Parliamentary expense allowance"]],["Python pipeline",["extract.py","transform.py","load.py","ai_enrichment.py"]],["Deliverables",["Telegram alert at 6 am","Email summary on Fridays at 5 pm","8-page Power BI dashboard"]]],monitor:["Control",["Raw JSON layer","Quarantine for rejected records","Idempotent load","Log of every run"]]},dados:["The Chamber's open-data API: proposals (PL, PLP, PEC and MPV), plenary votes, roll calls, party-bloc guidance and parliamentary expenses.","A star-schema PostgreSQL database on Supabase, with 10 official themes and embedding vectors (pgvector) to classify each proposal by similarity.","Three analytical views: executive radar, party ranking by votes and an audit of the expense allowance."],tecnicas:["Every API page is stored as raw JSON before any transformation, so it can be reprocessed without calling the API again.","The load is an upsert: running it three times in a row left the row counts identical.","The AI works in two steps: cheap embeddings pick the theme and filter relevance, and the language model only summarises and grades the criticality of the relevant ones, with validated JSON output.","Before the full batch, a sample run shows tokens, cost and the projection for a thousand items.","n8n only queries the database and notifies: a HIGH-criticality alert on Telegram and a weekly email summary, without repeating what was already sent.","The Power BI dashboard has 8 pages (radar, evolution, parties, allowance, profile, compare, map and about) and reads the database with a read-only user."],decisions:[["Raw data before transforming","It lets me reprocess without calling the API again and leaves an audit trail."],["Fix the sign only on the exact pattern","In about 95% of expense rows the net amount arrives with its sign inverted. Applying the quarantine rule literally would discard almost everything, so I fix the known pattern and quarantine the rest (90 records)."],["A criticality floor outside the AI","Urgency and agenda never fall to LOW, and urgency with a critical theme becomes HIGH. The rule is in code, not in the prompt."],["Cost measured before the batch","The sample run projects the spend. The real total was about US$ 0.04 for 291 proposals."],["Filter by type at the source","Without filtering to PL, PLP, PEC and MPV, the API's first page came back full of committee opinions and requests."],["Similarity, not ideology","The vote map shows who votes alike, and the page itself says the axes do not mean left or right."]],resultado:"An idempotent collection, a database with history and a flow that alerts only on what is critical. Of the 291 items, 6 came out as HIGH criticality and 2 have already triggered a Telegram alert, confirmed by the timestamp written to the database. The total AI cost was about US$ 0.04.",falta:["The classification has not been validated by an analyst yet. In a preliminary review of 25 items, done by an AI and not by a person, 60% of the themes were correct, 20% debatable and 20% wrong, with the errors concentrated in low-similarity items. The next step is a 100-item sample reviewed by an analyst and a low-confidence cut-off.","The model leans towards MEDIUM criticality (200 of the 291 items). Calibrating that needs an analyst.","n8n still runs locally, in Docker: with the computer off, the 6 am and Friday 5 pm triggers do not fire.","If the database fails between sending an alert and recording it, the alert may be repeated, but it is never lost."],footnote:"A fictional capstone scenario, with real public data from the Chamber of Deputies. The repository is private. The dashboard pages that list individual members of parliament are left out of this gallery."}
    },
    "assistente-cobranca": {
      domain:"Credit & Collections · Applied AI",
      file:"Colab notebook · Gradio chat",
      title:"Collections Assistant",
      lede:"An internal chat for collections agents to get answers about products and service situations without asking management every time. It answers in a customer-service tone, only from the registered base, and suggests a line to say to the customer.",
      side:"It is a proof of concept: it runs in a Colab notebook with a temporary link, and the agreement, deadline, instalment and discount rules used in the demo are fictional.",
      kpi:{v:"≈ 700",l:"input tokens per question"},
      tags:["Applied AI","Proof of concept","Privacy law","Low cost"],
      panel:{kpis:[["20","products in the base"],["8","scenarios"],["≈ 700","tokens per question"]],cols:["step","what it does","cost","status"],ok:"ok",rows:[["router","product and scenario","no AI",""],["context","sheet + policy","lean",""],["model","short answer","≈ 700 tokens",""],["script","line for customer","≈ 90 tokens",""]]},
      case:{pergunta:"How do you let a collections agent get an answer about a product or a service situation on the spot, without inventing rules and without overloading management?",contexto:"Agents need to know dozens of products and what they may and may not tell the customer. When a question comes up, the answer usually comes from asking management or from a slide deck.",nums:[["20","products with a sheet in the base"],["8","service scenarios"],["≈ 700","input tokens per question, with about 90 out"],["400","tokens at most in each answer"]],flow:{cols:[["Input",["Agent's question","Short history, 6 messages"]],["Routing and context",["Product router","Scenario router","Sheet, policy and glossary"]],["Answer",["Short answer, in a service tone","Suggested line for the customer","Source consulted"]]],monitor:["Safeguards",["Answers only from the base","No customer data","If not found, escalate to management"]]},dados:["Sheets for 20 products and the rule on what may and may not be disclosed, summarised from the operation's internal material.","Eight service scenarios (agreement deadline, instalments, discount, court costs, broken agreement and others) and an agreement policy. These two blocks are invented examples for the demo.","No customer data: the assistant neither queries nor shows personal data."],tecnicas:["Keyword routers, with no AI, pick the product and the scenario of the question. An AI classifier is only a plan B for the product.","The context sent to the model is lean: the right sheet, the agreement policy, the scenario rule and a glossary.","A small language model answers only from that context and returns the short answer and the suggested line.","Only one function knows the provider, so Claude can be swapped for GPT with one secret variable and cost and quality compared.","The interface is a Gradio page with the fictional-data notice and the source consulted in small print.","A battery of test questions checks the answers for expected and forbidden words."],decisions:[["No vector search, on purpose","The base is small and each product is a complete unit. Chunking could split a product from its rule, and sending only the right sheet costs less and avoids pulling the wrong product."],["An auditable router","Keywords are predictable, and you can see why a sheet was chosen."],["Real and fictional data kept apart","The sheets come from the operation's material. The policy and scenarios are examples: the prompt treats them as examples and the screen says so."],["Low cost by construction","Routing with no AI, lean context, short history, an answer cap and a small model."],["It does not calculate or look up customers","The assistant does not calculate balances or costs and says it has no access to customer data."],["Key only in the secrets manager","No key in the code, in the outputs or in the repository, and the notebook is versioned with clean outputs."]],resultado:"A proof of concept that answers in a service tone, only from what is registered, at a fraction of a cent per question. It is not in use yet: the agreement rules are fictional, and the Colab link is temporary and has no authentication.",falta:["Validate the sheets with the collections team and replace the fictional policy with the real one.","Review the court-costs scenario with legal: the model sometimes says it did not find the information instead of referring to legal.","Fix the suggested line for out-of-base questions and widen the tests with anonymised real cases.","Publish in a proper environment, with access control and usage logging, instead of the temporary link."],footnote:"An internal demo project built on the operation's internal material. Institution names and the literal content of the sheets are left out of this page, and the repository is private."}
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
