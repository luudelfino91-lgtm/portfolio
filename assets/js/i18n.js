/* =====================================================================
   INTERNATIONALISATION (English by default, Portuguese on demand)
   - Static HTML text carries data-i="key" (English inside the HTML) and
     data-ia="attr:key" for attributes. Portuguese versions live in PT below.
   - Dynamic text (cards, cases) uses UI/t() plus the EN overlay in data-en.js.
   - The choice is kept in localStorage ("ld-lang"); ?lang=pt forces Portuguese.
   ===================================================================== */
(function(){
  var PT = {
 "b.small": "data · crédito · cobrança",
 "a.home": "Lucas Delfino, início",
 "a.main": "Principal",
 "n.proj": "Projetos",
 "n.jour": "Trajetória",
 "n.cert": "Certificações",
 "n.cont": "Contato",
 "a.theme": "Alternar tema claro/escuro",
 "a.menu": "Abrir menu",
 "n.talk": "Vamos conversar",
 "h.status": "Aberto a vagas na Irlanda e remotas · São Paulo, SP",
 "h.h1": "Dez anos cobrando dívidas. Hoje, <span class=\"grad\">cobro respostas dos dados.</span>",
 "h.lede": "Sou Lucas Delfino. Comecei negociando na linha de frente de Crédito &amp; Cobrança e hoje construo dashboards, modelos e automações em Power BI, SQL e Python que respondem às perguntas que a operação realmente faz.",
 "h.permit": "Sou brasileiro. Para a Irlanda eu precisaria de uma permissão de trabalho, e cuido da papelada e da taxa do pedido para facilitar para a empresa.",
 "h.cta1": "Ver projetos ",
 "h.card": "Cartão de apresentação",
 "h.alt": "Retrato de Lucas Delfino",
 "s.aria": "Números",
 "s.1": "anos em operações de crédito e cobrança",
 "s.2": "processos manuais automatizados em Python",
 "s.3": "por mês devolvidas ao time para análise",
 "s.4": "lugar no Data Challenge 4 do MBA (Squad 71)",
 "p.eb": "Portfólio",
 "p.h2": "Relatórios que nasceram de <span class=\"grad\">perguntas de negócio</span>",
 "p.p": "Um resumo visual de cada trabalho, com o problema e a solução em poucas linhas. Quem quiser o detalhe técnico encontra modelagem, DAX e decisões no case de cada projeto.",
 "p.aside": "Seções do portfólio",
 "p.h4": "Trilhas",
 "p.note": "Tudo em uma rolagem só. Pule direto para o tipo de trabalho que te interessa.",
 "p.filter": "Filtrar por ferramenta",
 "j.eb": "Trajetória",
 "j.h2": "Do telefone de cobrança ao modelo de dados",
 "j.p": "Passei por todas as cadeiras da operação antes de chegar ao BI. É por isso que meus indicadores começam pela pergunta de quem está na ponta, e não pelo visual.",
 "j.k1": "Operação",
 "j.k2": "Dados",
 "k.eb": "Stack &amp; credenciais",
 "k.h2": "Ferramentas técnicas, repertório de negócio",
 "k.t1": "Stack do dia a dia",
 "k.s1": "Do dado bruto ao relatório executivo.",
 "k.c1": "Modelagem dimensional",
 "k.s2": "Domínio de negócio",
 "k.d1": "Crédito &amp; Cobrança",
 "k.d2": "Recuperação de crédito",
 "k.d3": "SLA &amp; filas",
 "k.d4": "KPIs de performance",
 "k.d5": "Análise financeira",
 "k.t2": "Certificação Microsoft",
 "k.link": "Ver todas as certificações ",
 "k.t3": "Formação",
 "k.e1": "MBA em BI &amp; Analytics",
 "k.e2": "Análise e Desenvolvimento de Sistemas",
 "k.e3": "Formação em Análise de Dados",
 "k.t4": "Na Xperiun",
 "k.s3": "Prática contínua em desafios com problemas reais.",
 "k.n1": "desafios",
 "k.n2": "certificados",
 "k.x1": "SQL Server Avançado",
 "k.x2": "Engenharia de Dados em Cloud",
 "k.x3": "Macros e VBA",
 "k.x4": "Comunicação Assertiva",
 "c.h2": "Tem uma operação que precisa de respostas mais rápidas?",
 "c.p": "Busco vagas em BI e Analytics na Irlanda ou remotas, principalmente em crédito, cobrança e serviços financeiros. Me manda uma mensagem e vamos conversar. Sou brasileiro e precisaria de uma permissão de trabalho, e cuido da papelada e da taxa do pedido.",
 "r.eb": "Reconhecimento",
 "r.h2": "Aprender construindo, <span class=\"grad\">e também competindo</span>",
 "r.p": "O MBA em BI &amp; Analytics 360 terminou com um desafio de dados. Minha squad trabalhou junta, à distância, por mais de um ano e ficou com o 1º lugar.",
 "r.a1": "Troféu do MBA em Business Intelligence e Analytics 360 da Xperiun, Data Challenge 4: 1º lugar, Squad 71, Lucas Delfino, 2026",
 "r.c1": "Data Challenge 4 · 1º lugar · Squad 71 · 2026",
 "r.a2": "Lucas Delfino sorrindo na formatura do MBA da Xperiun, segurando o tubo do diploma",
 "r.c2": "Formatura do MBA · Xperiun · 2026",
 "r.f1t": "1º lugar",
 "r.f1d": "Data Challenge 4, MBA em Business Intelligence &amp; Analytics 360.",
 "r.f2t": "Trabalho em equipe remoto",
 "r.f2d": "Mais de um ano construindo com pessoas que só conheci pessoalmente na formatura.",
 "r.f3t": "Constância",
 "r.f3d": "26 desafios e 56 certificados na plataforma pelo caminho.",
 "f.1": "Projetos",
 "f.2": "Certificações",
 "f.3": "Voltar ao topo ↑"
};
  if(window.PT_EXTRA) for(var k in window.PT_EXTRA) PT[k]=window.PT_EXTRA[k];
  var UI = { en: {"viewCase": "View technical case", "openReport": "Open report", "published": "PUBLISHED REPORT", "internal": "INTERNAL PROJECT", "preview": "ILLUSTRATIVE PREVIEW", "openInteractive": "Open interactive report ↗", "seeHow": "See how it was built →", "ariaOpen": "Open report", "ariaCase": "View case", "altShot": "Screenshot of the report {t}", "altMock": "Illustrative preview of the report {t}", "project": "project", "projects": "projects", "all": "All", "back": "← Back to portfolio", "domain": "Domain", "tools": "Tools", "topics": "Topics", "github": "View on GitHub ↗", "hQuestion": "The business question", "hData": "Data and modelling", "hBuilt": "How it was built", "hPages": "Report pages", "hResult": "Outcome", "next": "Next case: {t}", "mockSteps": ["extract", "clean", "validate", "send"], "mockNote": "13 routines · scheduled · 0 clicks"}, pt: {"viewCase": "Ver case técnico", "openReport": "Abrir relatório", "published": "RELATÓRIO PUBLICADO", "internal": "PROJETO INTERNO", "preview": "PRÉVIA ILUSTRATIVA", "openInteractive": "Abrir relatório interativo ↗", "seeHow": "Ver como foi feito →", "ariaOpen": "Abrir relatório", "ariaCase": "Ver case", "altShot": "Captura do relatório {t}", "altMock": "Prévia ilustrativa do relatório {t}", "project": "projeto", "projects": "projetos", "all": "Todos", "back": "← Voltar ao portfólio", "domain": "Domínio", "tools": "Ferramentas", "topics": "Temas", "github": "Ver no GitHub ↗", "hQuestion": "A pergunta de negócio", "hData": "Dados e modelagem", "hBuilt": "Como foi construído", "hPages": "Páginas do relatório", "hResult": "Resultado", "next": "Próximo case: {t}", "mockSteps": ["extrair", "tratar", "validar", "enviar"], "mockNote": "13 rotinas · agendadas · 0 cliques"} };
  var KEY = "ld-lang";

  function initial(){
    try{ var q=new URLSearchParams(location.search).get("lang"); if(q==="pt"||q==="en") return q; }catch(e){}
    try{ var s=localStorage.getItem(KEY); if(s==="pt"||s==="en") return s; }catch(e){}
    return "en";
  }
  window.LANG = initial();
  window.onLang = [];

  window.t = function(k, v){
    var s = UI[window.LANG][k]; if(s===undefined) s = UI.en[k];
    if(typeof s==="string" && v){ for(var x in v) s = s.split("{"+x+"}").join(v[x]); }
    return s;
  };

  function apply(){
    var L = window.LANG, root = document.documentElement;
    root.lang = L==="pt" ? "pt-BR" : "en";
    document.querySelectorAll("[data-i]").forEach(function(el){
      if(el.dataset.en===undefined) el.dataset.en = el.innerHTML;
      var k = el.dataset.i;
      el.innerHTML = (L==="pt" && PT[k]!==undefined) ? PT[k] : el.dataset.en;
    });
    document.querySelectorAll("[data-ia]").forEach(function(el){
      el.dataset.ia.split(",").forEach(function(pair){
        var i = pair.indexOf(":"), a = pair.slice(0,i), k = pair.slice(i+1);
        if(el.dataset["en_"+a.replace("-","_")]===undefined) el.dataset["en_"+a.replace("-","_")] = el.getAttribute(a)||"";
        el.setAttribute(a, (L==="pt" && PT[k]!==undefined) ? PT[k] : el.dataset["en_"+a.replace("-","_")]);
      });
    });
    var m = window.PAGE_META;
    if(m){
      if(!m.en){ m.en = { title: document.title, desc: (document.querySelector('meta[name="description"]')||{}).content||"" }; }
      var cur = m[L] || m.en;
      document.title = cur.title;
      var d = document.querySelector('meta[name="description"]'); if(d) d.setAttribute("content", cur.desc);
    }
    document.querySelectorAll("[data-lang]").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.lang===L); });
    document.querySelectorAll("[data-fmt-date]").forEach(function(el){
      var p = el.dataset.fmtDate.split("-"), mo = parseInt(p[1],10)-1;
      var EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], PTM = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
      el.textContent = L==="pt" ? PTM[mo]+"/"+p[0] : EN[mo]+" "+p[0];
    });
  }

  window.setLang = function(l){
    if(l!=="en" && l!=="pt") return;
    window.LANG = l;
    try{ localStorage.setItem(KEY,l); }catch(e){}
    apply();
    window.onLang.forEach(function(f){ try{ f(); }catch(e){ console.error(e); } });
  };

  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-lang]");
    if(b) window.setLang(b.dataset.lang);
  });

  apply();
})();
