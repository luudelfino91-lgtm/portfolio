/* =====================================================================
   i18n do Hub (PT/EN)
   - Mesma chave de armazenamento do portfólio: "ld-lang" ('pt' | 'en').
   - ?lang=pt|en força o idioma na visita (sem gravar), como no portfólio.
   - Padrão: inglês. <html lang> = "en" | "pt-BR".
   - Textos estáticos: data-i="chave" (o inglês também está no HTML, para
     funcionar sem JS). Atributos: data-ia="atributo:chave,atributo2:chave2".
   - Todo texto entra por textContent/setAttribute, nunca como HTML.
   - Elementos com data-i são "folhas": não podem conter conteúdo do usuário
     nem outros elementos com texto.
   - API: Hub.lang, Hub.t(chave, {x:'valor'}), Hub.setLang(l), Hub.onLang (lista).
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'ld-lang';
  var DICT = {
    en: {
 "hub.skip": "Skip to content",
 "hub.brand.small": "data & ai hub",
 "hub.brand.aria": "Data & AI Hub, home",
 "hub.nav.main": "Main",
 "hub.nav.tools": "Tools",
 "hub.nav.privacy": "Privacy",
 "hub.nav.portfolio": "Portfolio",
 "hub.lang.group": "Language",
 "hub.theme.dark": "Dark theme",
 "hub.menu.label": "Menu",
 "hub.foot.nav": "Footer",
 "hub.foot.top": "Back to top",
 "hub.foot.note": "Data & AI Community Hub · by Lucas Delfino",
 "hub.crumb.label": "You are here",
 "hub.crumb.home": "Home",
 "hub.tool.csv.name": "CSV viewer",
 "hub.tool.csv.desc": "Open a CSV file and see its columns, types and first rows. Everything is meant to run in your browser.",
 "hub.tool.sql.name": "SQL playground",
 "hub.tool.sql.desc": "Practise SQL queries on tables built from your own CSV files, right in the page.",
 "hub.state.wip": "Under construction",
 "hub.title.home": "Data & AI Community Hub · Lucas Delfino",
 "hub.desc.home": "Free, browser-based tools for people who work with data and AI: a CSV viewer and an SQL playground, with no tracking.",
 "hub.home.eyebrow": "Data & AI hub",
 "hub.home.h1a": "Practise data skills",
 "hub.home.h1b": "right in your browser",
 "hub.home.lede": "Free tools for people who work with data and AI. They are being built so that your files never leave your browser, with no sign-up and no tracking.",
 "hub.home.cta1": "See tools",
 "hub.home.cta2": "How your data is handled",
 "hub.home.tools.h2": "Tools",
 "hub.home.tools.p": "Two tools are on the way. Open one to see where it stands.",
 "hub.home.notice": "Pages in this Hub set no tracking cookies and make no requests to third parties.",
 "hub.home.notice.link": "Read the privacy page",
 "hub.title.tools": "Tools · Data & AI Community Hub",
 "hub.desc.tools": "The tools of the Data & AI Community Hub: CSV viewer and SQL playground.",
 "hub.tools.h1": "Tools",
 "hub.tools.lede": "Both tools are under construction. They are designed to open files and run queries entirely in your browser.",
 "hub.title.csv": "CSV viewer · Data & AI Community Hub",
 "hub.desc.csv": "The CSV viewer of the Data & AI Community Hub is under construction.",
 "hub.title.sql": "SQL playground · Data & AI Community Hub",
 "hub.desc.sql": "The SQL playground of the Data & AI Community Hub is under construction.",
 "hub.wip.title": "This tool is not available yet",
 "hub.wip.csv": "The CSV viewer is the next step of the Hub. Nothing is loaded or sent anywhere on this page.",
 "hub.wip.sql": "The SQL playground builds on the CSV viewer, so it comes after it. Nothing is loaded or sent anywhere on this page.",
 "hub.wip.back": "Back to tools",
 "hub.title.priv": "Privacy · Data & AI Community Hub",
 "hub.desc.priv": "What the Data & AI Community Hub does and does not do with your data.",
 "hub.priv.h1": "Privacy",
 "hub.priv.lede": "Short and honest: what this Hub does with your data.",
 "hub.priv.s1.h": "Your data stays in your browser",
 "hub.priv.s1.p": "The Hub is a set of static pages. It has no server that receives files or queries, and it asks for no account. The tools are not available yet; this is a design commitment that will be checked by tests before they launch.",
 "hub.priv.s2.h": "Cookies and tracking",
 "hub.priv.s2.p": "Hub pages set no cookies and include no analytics, advertising or tracking scripts.",
 "hub.priv.s3.h": "What is stored on your device",
 "hub.priv.s3.p": "Only two small preferences, kept in your browser’s localStorage and never sent anywhere:",
 "hub.priv.s3.lang": "your language choice (en or pt), shared with the portfolio.",
 "hub.priv.s3.theme": "your theme choice (light or dark), shared with the portfolio.",
 "hub.priv.s3.clear": "You can remove both at any time in your browser settings.",
 "hub.priv.s4.h": "Fonts and third parties",
 "hub.priv.s4.p1": "Hub pages serve their fonts from this site and make no requests to other domains.",
 "hub.priv.s4.p2": "The portfolio is a separate part of the site and still loads its fonts from Google Fonts.",
 "hub.priv.s4.link": "Go to the portfolio"
 },
    pt: {
 "hub.skip": "Pular para o conteúdo",
 "hub.brand.small": "hub de dados & ia",
 "hub.brand.aria": "Hub de dados e IA, início",
 "hub.nav.main": "Principal",
 "hub.nav.tools": "Ferramentas",
 "hub.nav.privacy": "Privacidade",
 "hub.nav.portfolio": "Portfólio",
 "hub.lang.group": "Idioma",
 "hub.theme.dark": "Tema escuro",
 "hub.menu.label": "Menu",
 "hub.foot.nav": "Rodapé",
 "hub.foot.top": "Voltar ao topo",
 "hub.foot.note": "Data & AI Community Hub · por Lucas Delfino",
 "hub.crumb.label": "Você está aqui",
 "hub.crumb.home": "Início",
 "hub.tool.csv.name": "Visualizador de CSV",
 "hub.tool.csv.desc": "Abra um arquivo CSV e veja colunas, tipos e as primeiras linhas. A ideia é que tudo rode no seu navegador.",
 "hub.tool.sql.name": "Playground de SQL",
 "hub.tool.sql.desc": "Pratique consultas SQL em tabelas criadas a partir dos seus próprios CSVs, na própria página.",
 "hub.state.wip": "Em construção",
 "hub.title.home": "Data & AI Community Hub · Lucas Delfino",
 "hub.desc.home": "Ferramentas gratuitas, no navegador, para quem trabalha com dados e IA: visualizador de CSV e playground de SQL, sem rastreamento.",
 "hub.home.eyebrow": "Hub de dados e IA",
 "hub.home.h1a": "Pratique dados",
 "hub.home.h1b": "direto no seu navegador",
 "hub.home.lede": "Ferramentas gratuitas para quem trabalha com dados e IA. Estão sendo construídas para que seus arquivos nunca saiam do navegador, sem cadastro e sem rastreamento.",
 "hub.home.cta1": "Ver ferramentas",
 "hub.home.cta2": "Como seus dados são tratados",
 "hub.home.tools.h2": "Ferramentas",
 "hub.home.tools.p": "Duas ferramentas estão a caminho. Abra uma para ver o andamento.",
 "hub.home.notice": "As páginas deste Hub não usam cookies de rastreamento e não fazem requisições a terceiros.",
 "hub.home.notice.link": "Leia a página de privacidade",
 "hub.title.tools": "Ferramentas · Data & AI Community Hub",
 "hub.desc.tools": "As ferramentas do Data & AI Community Hub: visualizador de CSV e playground de SQL.",
 "hub.tools.h1": "Ferramentas",
 "hub.tools.lede": "As duas ferramentas estão em construção. Foram pensadas para abrir arquivos e rodar consultas inteiramente no seu navegador.",
 "hub.title.csv": "Visualizador de CSV · Data & AI Community Hub",
 "hub.desc.csv": "O visualizador de CSV do Data & AI Community Hub está em construção.",
 "hub.title.sql": "Playground de SQL · Data & AI Community Hub",
 "hub.desc.sql": "O playground de SQL do Data & AI Community Hub está em construção.",
 "hub.wip.title": "Esta ferramenta ainda não está disponível",
 "hub.wip.csv": "O visualizador de CSV é a próxima etapa do Hub. Nada é carregado nem enviado para lugar nenhum nesta página.",
 "hub.wip.sql": "O playground de SQL usa o visualizador de CSV como base, por isso vem depois dele. Nada é carregado nem enviado para lugar nenhum nesta página.",
 "hub.wip.back": "Voltar às ferramentas",
 "hub.title.priv": "Privacidade · Data & AI Community Hub",
 "hub.desc.priv": "O que o Data & AI Community Hub faz e não faz com os seus dados.",
 "hub.priv.h1": "Privacidade",
 "hub.priv.lede": "Curto e honesto: o que este Hub faz com os seus dados.",
 "hub.priv.s1.h": "Seus dados ficam no seu navegador",
 "hub.priv.s1.p": "O Hub é um conjunto de páginas estáticas. Não existe servidor que receba arquivos ou consultas, e não é pedido cadastro. As ferramentas ainda não estão disponíveis; este é um compromisso de projeto, que será conferido por testes antes do lançamento.",
 "hub.priv.s2.h": "Cookies e rastreamento",
 "hub.priv.s2.p": "As páginas do Hub não criam cookies e não incluem análise de audiência, anúncios nem scripts de rastreamento.",
 "hub.priv.s3.h": "O que fica guardado no seu dispositivo",
 "hub.priv.s3.p": "Apenas duas preferências pequenas, guardadas no localStorage do seu navegador e nunca enviadas a lugar nenhum:",
 "hub.priv.s3.lang": "a sua escolha de idioma (en ou pt), compartilhada com o portfólio.",
 "hub.priv.s3.theme": "a sua escolha de tema (claro ou escuro), compartilhada com o portfólio.",
 "hub.priv.s3.clear": "Você pode apagar as duas a qualquer momento nas configurações do navegador.",
 "hub.priv.s4.h": "Fontes e terceiros",
 "hub.priv.s4.p1": "As páginas do Hub servem as próprias fontes a partir deste site e não fazem requisições a outros domínios.",
 "hub.priv.s4.p2": "O portfólio é uma parte separada do site e ainda carrega as fontes pelo Google Fonts.",
 "hub.priv.s4.link": "Ir para o portfólio"
 }
  };

  function valid(v) { return v === 'pt' || v === 'en'; }

  function initial() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (valid(q)) return q;
    } catch (e) {}
    try {
      var s = localStorage.getItem(KEY);
      if (valid(s)) return s;
    } catch (e) {}
    return 'en';
  }

  var Hub = window.Hub = window.Hub || {};
  Hub.lang = initial();
  Hub.onLang = [];

  Hub.t = function (key, vars) {
    var s = DICT[Hub.lang][key];
    if (s === undefined) s = DICT.en[key];
    if (s === undefined) return '';
    if (vars) for (var x in vars) s = s.split('{' + x + '}').join(String(vars[x]));
    return s;
  };

  function apply() {
    var L = Hub.lang;
    document.documentElement.lang = L === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i]').forEach(function (el) {
      var k = el.getAttribute('data-i');
      var s = DICT[L][k];
      if (s === undefined) s = DICT.en[k];
      if (s !== undefined) el.textContent = s;
    });
    document.querySelectorAll('[data-ia]').forEach(function (el) {
      el.getAttribute('data-ia').split(',').forEach(function (pair) {
        var i = pair.indexOf(':');
        var attr = pair.slice(0, i), k = pair.slice(i + 1);
        var s = DICT[L][k];
        if (s === undefined) s = DICT.en[k];
        if (s !== undefined) el.setAttribute(attr, s);
      });
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === L));
    });
  }

  Hub.setLang = function (l) {
    if (!valid(l)) return;
    Hub.lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    Hub.onLang.forEach(function (f) { try { f(l); } catch (e) { console.error(e); } });
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang]');
    if (b) Hub.setLang(b.getAttribute('data-lang'));
  });

  apply();
})();
