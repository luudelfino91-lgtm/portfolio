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
 "hub.brand.aria": "Lucas Delfino data & ai hub",
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
 "hub.tool.csv.desc": "Open a CSV file and see its columns, types and first rows. Everything runs in your browser.",
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
 "hub.home.tools.p": "The CSV viewer is ready to use. The SQL playground is on the way.",
 "hub.home.notice": "Pages in this Hub set no tracking cookies and make no requests to third parties.",
 "hub.home.notice.link": "Read the privacy page",
 "hub.title.tools": "Tools · Data & AI Community Hub",
 "hub.desc.tools": "The tools of the Data & AI Community Hub: CSV viewer and SQL playground.",
 "hub.tools.h1": "Tools",
 "hub.tools.lede": "The CSV viewer is ready and runs entirely in your browser. The SQL playground is under construction.",
 "hub.title.csv": "CSV viewer · Data & AI Community Hub",
 "hub.desc.csv": "Open a CSV file in your browser and see its columns, inferred types and first rows. Nothing is uploaded.",
 "hub.title.sql": "SQL playground · Data & AI Community Hub",
 "hub.desc.sql": "The SQL playground of the Data & AI Community Hub is under construction.",
 "hub.wip.title": "This tool is not available yet",
 "hub.wip.sql": "The SQL playground builds on the CSV viewer, so it comes after it. Nothing is loaded or sent anywhere on this page.",
 "hub.wip.back": "Back to tools",
 "hub.csv.lede": "Open a CSV file to see its size, columns, inferred types and first rows. The file is read in this browser and is never sent anywhere.",
 "hub.csv.drop.title": "Drop a CSV file here",
 "hub.csv.drop.or": "or",
 "hub.csv.drop.btn": "Choose a file",
 "hub.csv.drop.over": "Release to load the file",
 "hub.csv.drop.hint": "Limit: 10 MB per file. Comma, semicolon, tab or pipe delimiters. The file stays in this browser.",
 "hub.csv.opt.delim": "Delimiter",
 "hub.csv.opt.enc": "Encoding",
 "hub.csv.opt.auto": "Automatic",
 "hub.csv.opt.comma": "Comma (,)",
 "hub.csv.opt.semicolon": "Semicolon (;)",
 "hub.csv.opt.tab": "Tab",
 "hub.csv.opt.pipe": "Pipe (|)",
 "hub.csv.opt.utf8": "UTF-8",
 "hub.csv.opt.w1252": "Windows-1252 / ISO-8859-1 (Latin-1)",
 "hub.csv.opt.note": "Changing an option reads the current file again.",
 "hub.csv.cancel": "Cancel reading",
 "hub.csv.progress": "Reading progress",
 "hub.csv.status.loading": "Reading {name}...",
 "hub.csv.status.ready": "File loaded: {rows}, {cols}.",
 "hub.csv.status.canceled.prev": "Reading canceled. The previous file was kept.",
 "hub.csv.status.canceled.none": "Reading canceled. No file is loaded.",
 "hub.csv.rows.one": "1 row",
 "hub.csv.rows.other": "{n} rows",
 "hub.csv.cols.one": "1 column",
 "hub.csv.cols.other": "{n} columns",
 "hub.csv.res.h": "File summary",
 "hub.csv.stat.file": "File: {v}",
 "hub.csv.stat.size": "Size: {v}",
 "hub.csv.stat.delim": "Delimiter: {v}",
 "hub.csv.stat.enc": "Encoding: {v}",
 "hub.csv.delim.comma": "comma",
 "hub.csv.delim.semicolon": "semicolon",
 "hub.csv.delim.tab": "tab",
 "hub.csv.delim.pipe": "pipe",
 "hub.csv.delim.none": "none (single column)",
 "hub.csv.enc.utf8": "UTF-8",
 "hub.csv.enc.utf8bom": "UTF-8 with BOM (BOM removed)",
 "hub.csv.enc.w1252": "Windows-1252 / ISO-8859-1",
 "hub.csv.cols.h": "Columns and inferred types",
 "hub.csv.cols.cap": "Columns of the file with their inferred type",
 "hub.csv.cols.th.n": "#",
 "hub.csv.cols.th.name": "Name",
 "hub.csv.cols.th.type": "Type",
 "hub.csv.type.integer": "integer",
 "hub.csv.type.decimal": "decimal",
 "hub.csv.type.decimal_br": "decimal (comma)",
 "hub.csv.type.boolean": "boolean",
 "hub.csv.type.date": "date (YYYY-MM-DD)",
 "hub.csv.type.date_br": "date (DD/MM/YYYY)",
 "hub.csv.type.text": "text",
 "hub.csv.type.empty": "empty",
 "hub.csv.type.note": "Types are inferred from every row. Empty cells (or only spaces) are ignored; codes with leading zeros stay text.",
 "hub.csv.noname": "(no name)",
 "hub.csv.data.h": "Data preview",
 "hub.csv.data.cap.some": "First {n} of {total} rows",
 "hub.csv.data.cap.all": "All {n} rows",
 "hub.csv.data.empty": "The file has a header row but no data rows.",
 "hub.csv.warn.fallback": "This file is not valid UTF-8, so it was read as Windows-1252 (ISO-8859-1). If accents still look wrong, choose the encoding in the options above.",
 "hub.csv.warn.replacement": "Some characters could not be decoded and appear as a replacement symbol. Try the Windows-1252 / ISO-8859-1 encoding in the options above.",
 "hub.csv.warn.ragged": "{n} rows have a different number of cells than the header. Missing cells are shown empty and extra cells are ignored in the column types.",
 "hub.csv.warn.quotes": "The file has a quotation mark that is not closed or is misplaced, so some rows may be merged or split. Check the file or try another delimiter.",
 "hub.csv.err.empty.t": "The file is empty",
 "hub.csv.err.empty.m": "The file has no content, so there is nothing to show. Choose a file that has at least a header row.",
 "hub.csv.err.binary.t": "This does not look like a text file",
 "hub.csv.err.binary.m": "The file contains binary data, so it cannot be read as CSV. Choose a CSV or TSV file exported from a spreadsheet or database; a renamed image or document will not work.",
 "hub.csv.err.size.t": "The file is too large",
 "hub.csv.err.size.m": "This file has {size} ({bytes} bytes). The limit is 10 MB (10,485,760 bytes). Choose a smaller file or a sample with the first rows.",
 "hub.csv.err.parse.t": "Could not read the file",
 "hub.csv.err.parse.m": "Something went wrong while reading it ({detail}). Try another delimiter or encoding in the options above, or choose another file.",
 "hub.csv.err.worker.t": "The reader stopped unexpectedly",
 "hub.csv.err.worker.m": "The file could not be processed. Choose the file again; if it keeps happening, try a smaller file or another browser.",
 "hub.csv.err.noworker.t": "This browser cannot run the reader",
 "hub.csv.err.noworker.m": "The tool needs Web Workers to read files without freezing the page. Use a current version of Chrome, Edge or Firefox.",
 "hub.csv.err.keep": "The previous file is still shown below.",
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
 "hub.brand.aria": "Lucas Delfino hub de dados & ia",
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
 "hub.tool.csv.desc": "Abra um arquivo CSV e veja colunas, tipos e as primeiras linhas. Tudo roda no seu navegador.",
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
 "hub.home.tools.p": "O visualizador de CSV já está pronto para usar. O playground de SQL está a caminho.",
 "hub.home.notice": "As páginas deste Hub não usam cookies de rastreamento e não fazem requisições a terceiros.",
 "hub.home.notice.link": "Leia a página de privacidade",
 "hub.title.tools": "Ferramentas · Data & AI Community Hub",
 "hub.desc.tools": "As ferramentas do Data & AI Community Hub: visualizador de CSV e playground de SQL.",
 "hub.tools.h1": "Ferramentas",
 "hub.tools.lede": "O visualizador de CSV está pronto e roda inteiramente no seu navegador. O playground de SQL está em construção.",
 "hub.title.csv": "Visualizador de CSV · Data & AI Community Hub",
 "hub.desc.csv": "Abra um arquivo CSV no navegador e veja colunas, tipos inferidos e as primeiras linhas. Nada é enviado.",
 "hub.title.sql": "Playground de SQL · Data & AI Community Hub",
 "hub.desc.sql": "O playground de SQL do Data & AI Community Hub está em construção.",
 "hub.wip.title": "Esta ferramenta ainda não está disponível",
 "hub.wip.sql": "O playground de SQL usa o visualizador de CSV como base, por isso vem depois dele. Nada é carregado nem enviado para lugar nenhum nesta página.",
 "hub.wip.back": "Voltar às ferramentas",
 "hub.csv.lede": "Abra um arquivo CSV para ver tamanho, colunas, tipos inferidos e as primeiras linhas. O arquivo é lido neste navegador e nunca é enviado para lugar nenhum.",
 "hub.csv.drop.title": "Solte um arquivo CSV aqui",
 "hub.csv.drop.or": "ou",
 "hub.csv.drop.btn": "Escolher um arquivo",
 "hub.csv.drop.over": "Solte para carregar o arquivo",
 "hub.csv.drop.hint": "Limite: 10 MB por arquivo. Delimitadores vírgula, ponto e vírgula, tab ou barra vertical. O arquivo fica neste navegador.",
 "hub.csv.opt.delim": "Delimitador",
 "hub.csv.opt.enc": "Codificação",
 "hub.csv.opt.auto": "Automática",
 "hub.csv.opt.comma": "Vírgula (,)",
 "hub.csv.opt.semicolon": "Ponto e vírgula (;)",
 "hub.csv.opt.tab": "Tab",
 "hub.csv.opt.pipe": "Barra vertical (|)",
 "hub.csv.opt.utf8": "UTF-8",
 "hub.csv.opt.w1252": "Windows-1252 / ISO-8859-1 (Latin-1)",
 "hub.csv.opt.note": "Ao mudar uma opção, o arquivo atual é lido de novo.",
 "hub.csv.cancel": "Cancelar leitura",
 "hub.csv.progress": "Progresso da leitura",
 "hub.csv.status.loading": "Lendo {name}...",
 "hub.csv.status.ready": "Arquivo carregado: {rows}, {cols}.",
 "hub.csv.status.canceled.prev": "Leitura cancelada. O arquivo anterior foi mantido.",
 "hub.csv.status.canceled.none": "Leitura cancelada. Nenhum arquivo carregado.",
 "hub.csv.rows.one": "1 linha",
 "hub.csv.rows.other": "{n} linhas",
 "hub.csv.cols.one": "1 coluna",
 "hub.csv.cols.other": "{n} colunas",
 "hub.csv.res.h": "Resumo do arquivo",
 "hub.csv.stat.file": "Arquivo: {v}",
 "hub.csv.stat.size": "Tamanho: {v}",
 "hub.csv.stat.delim": "Delimitador: {v}",
 "hub.csv.stat.enc": "Codificação: {v}",
 "hub.csv.delim.comma": "vírgula",
 "hub.csv.delim.semicolon": "ponto e vírgula",
 "hub.csv.delim.tab": "tab",
 "hub.csv.delim.pipe": "barra vertical",
 "hub.csv.delim.none": "nenhum (coluna única)",
 "hub.csv.enc.utf8": "UTF-8",
 "hub.csv.enc.utf8bom": "UTF-8 com BOM (BOM removido)",
 "hub.csv.enc.w1252": "Windows-1252 / ISO-8859-1",
 "hub.csv.cols.h": "Colunas e tipos inferidos",
 "hub.csv.cols.cap": "Colunas do arquivo com o tipo inferido de cada uma",
 "hub.csv.cols.th.n": "Nº",
 "hub.csv.cols.th.name": "Nome",
 "hub.csv.cols.th.type": "Tipo",
 "hub.csv.type.integer": "inteiro",
 "hub.csv.type.decimal": "decimal",
 "hub.csv.type.decimal_br": "decimal (vírgula)",
 "hub.csv.type.boolean": "booleano",
 "hub.csv.type.date": "data (AAAA-MM-DD)",
 "hub.csv.type.date_br": "data (DD/MM/AAAA)",
 "hub.csv.type.text": "texto",
 "hub.csv.type.empty": "vazio",
 "hub.csv.type.note": "Os tipos são inferidos de todas as linhas. Células vazias (ou só com espaços) são ignoradas; códigos com zeros à esquerda continuam texto.",
 "hub.csv.noname": "(sem nome)",
 "hub.csv.data.h": "Prévia dos dados",
 "hub.csv.data.cap.some": "Primeiras {n} de {total} linhas",
 "hub.csv.data.cap.all": "Todas as {n} linhas",
 "hub.csv.data.empty": "O arquivo tem a linha de cabeçalho, mas nenhuma linha de dados.",
 "hub.csv.warn.fallback": "Este arquivo não é UTF-8 válido, então foi lido como Windows-1252 (ISO-8859-1). Se os acentos ainda estiverem errados, escolha a codificação nas opções acima.",
 "hub.csv.warn.replacement": "Alguns caracteres não puderam ser decodificados e aparecem como um símbolo de substituição. Tente a codificação Windows-1252 / ISO-8859-1 nas opções acima.",
 "hub.csv.warn.ragged": "{n} linhas têm um número de células diferente do cabeçalho. Células faltantes aparecem vazias e as células extras são ignoradas nos tipos das colunas.",
 "hub.csv.warn.quotes": "O arquivo tem uma aspa não fechada ou fora do lugar, então algumas linhas podem ter sido juntadas ou divididas. Confira o arquivo ou tente outro delimitador.",
 "hub.csv.err.empty.t": "O arquivo está vazio",
 "hub.csv.err.empty.m": "O arquivo não tem conteúdo, então não há nada para mostrar. Escolha um arquivo que tenha pelo menos a linha de cabeçalho.",
 "hub.csv.err.binary.t": "Isto não parece um arquivo de texto",
 "hub.csv.err.binary.m": "O arquivo contém dados binários, então não pode ser lido como CSV. Escolha um CSV ou TSV exportado de uma planilha ou banco de dados; uma imagem ou documento renomeado não funciona.",
 "hub.csv.err.size.t": "O arquivo é grande demais",
 "hub.csv.err.size.m": "Este arquivo tem {size} ({bytes} bytes). O limite é 10 MB (10.485.760 bytes). Escolha um arquivo menor ou uma amostra com as primeiras linhas.",
 "hub.csv.err.parse.t": "Não foi possível ler o arquivo",
 "hub.csv.err.parse.m": "Algo deu errado na leitura ({detail}). Tente outro delimitador ou outra codificação nas opções acima, ou escolha outro arquivo.",
 "hub.csv.err.worker.t": "O leitor parou de forma inesperada",
 "hub.csv.err.worker.m": "Não foi possível processar o arquivo. Escolha o arquivo de novo; se continuar, tente um arquivo menor ou outro navegador.",
 "hub.csv.err.noworker.t": "Este navegador não consegue executar o leitor",
 "hub.csv.err.noworker.m": "A ferramenta precisa de Web Workers para ler arquivos sem travar a página. Use uma versão atual do Chrome, Edge ou Firefox.",
 "hub.csv.err.keep": "O arquivo anterior continua sendo mostrado abaixo.",
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
