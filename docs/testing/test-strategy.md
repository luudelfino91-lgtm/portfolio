# Estratégia e plano de testes: Data & AI Community Hub

Fase 1 (Testing plan) · Branch `feat/phase-1-planning` · Data: 2026-11-12 · Autor: QA Engineer
Alinhado a `docs/decisions/phase-1-reconciliation.md` (C1 a C10), que vale sobre qualquer divergência com este plano e com os demais documentos. Fontes lidas: `docs/roadmap/prd.md`, `docs/roadmap/backlog.md`, `docs/architecture/solution-architecture.md`, `docs/design/hub-ux.md`, e (para a linha de base) `index.html`, `certificacoes.html`, `assets/js/*.js`.

## 0. Estado deste documento

**Este é um plano. Nenhum teste do Hub foi executado, porque nenhum código do Hub existe.** Todo caso, checklist e critério abaixo está em estado **Planejado**, exceto a seção 2.1, que registra apenas verificações de ferramental feitas neste ambiente (não são testes do produto).

Estados válidos em qualquer relatório (seção 8): `Planejado`, `Executado: passou`, `Executado: falhou`, `Não executado (motivo)`.

Escopo do MVP (C6): Fases 2 e 3 (casca, CSV, SQL). Itens P2 do produto (página `sobre/`, rascunho de código no `localStorage`, convite de apoio dispensável por 30 dias, progresso de curso, exercícios concluídos) estão **fora do plano do MVP** e sem casos até serem formalizados. O Web Worker de parsing CSV e de execução SQL é MVP (P0), com Parar/Cancelar e timeout por término do Worker (C10.1).

Convenção de IDs: `REG-` (regressão do portfólio), `HUB-` (casca), `CSV-`, `SQL-`, `PRV-` (privacidade), `A11-` (acessibilidade), `RSP-` (responsividade). Prioridade: P0 bloqueia a saída da fase; P1 deve passar ou ter exceção registrada; P2 informativo.

---

## 1. Linha de base de regressão do portfólio atual

Objetivo: provar que `index.html`, `certificacoes.html` e `assets/` continuam como estão (PRD seção 4: "zero diff" e "teste de regressão manual aprovado"; T-208).

### 1.1 Observações do código que condicionam os testes (lidas nesta sessão)

- Idioma: chave `ld-lang` em `localStorage`; `?lang=pt` força PT; padrão EN; `<html lang>` vira `pt-BR` em PT (`i18n.js` linhas 90-108).
- Tema: chave `ld-theme`, atributo `data-theme` em `<html>`, botão `#themeBtn` (`app.js` 152-155; `certificacoes.html` linha 642 tem lógica própria).
- Rota de case: `#/case/<slug>` (regex `^#\/case\/([\w-]+)` em `app.js` linha 131); `#home` e `#case` alternam por `hidden`; filtro de ferramenta em `#toolFilter`.
- Slugs existentes em `data.js`: `panorama-consorcios`, `agent-performance-report`, `lets-cola`, `seguradora-xperiun`, `pharmavantage`, `vela-people-analytics`, `olist-store`, `xperiun-metalurgica`, `automacao-python`.
- Fontes vêm do Google Fonts (`index.html` linhas 26-28). O portfólio, portanto, faz requisições externas por design; **o teste de privacidade do Hub (seção 5) não se aplica ao portfólio**, e a linha de base deve registrar isso para ninguém reportá-lo como regressão.

### 1.2 Verificação de integridade (rápida, automatizável)

| ID | Verificação | Como | Esperado | Estado |
|---|---|---|---|---|
| REG-01 | Nenhum arquivo do portfólio alterado | `git diff --stat origin/main...HEAD -- index.html certificacoes.html assets/` | saída vazia (exceto com aprovação explícita do Lucas, registrada) | Planejado |
| REG-02 | Hashes de referência | Antes da Fase 2, gerar `sha256sum index.html certificacoes.html assets/css/* assets/js/* > docs/testing/baseline.sha256` e conferir com `sha256sum -c` a cada PR | `OK` em todos | Planejado |
| REG-03 | Sem erros de console no carregamento | Playwright: abrir cada página, coletar `console` tipo `error` e `pageerror` | zero (ver nota de fontes: falha de rede do Google Fonts offline conta como erro de rede, não de script) | Planejado |

REG-02 depende de gerar a linha de base **antes** de qualquer alteração permitida; é uma ação da Fase 2 (arquivo de teste, dentro de `docs/testing/`).

### 1.3 Matriz de execução manual/automatizada

Executar cada linha da matriz nas **duas páginas** (`index.html`, `certificacoes.html`) quando o item se aplica. Combinações: idioma {EN, PT} x tema {claro, escuro} = 4 combinações por página, 8 no total. Viewports: 360, 768, 1280 px.

Como forçar cada combinação sem depender de ação manual (para Playwright):
- PT: abrir `?lang=pt` ou `localStorage["ld-lang"]="pt"`; EN: `localStorage["ld-lang"]="en"`.
- Escuro: `localStorage["ld-theme"]="dark"`; claro: `"light"`. Também testar sem chave, com `colorScheme: "dark"` e `"light"` no contexto do navegador (preferência do sistema).

### 1.4 Checklist verificável

Marcar cada item com um dos 4 estados. Tudo abaixo está **Planejado**.

**Carregamento e estrutura**
- [ ] REG-10 `index.html` abre via servidor estático (`http://127.0.0.1:<porta>/index.html`) e via `file://` (o README promete "basta abrir o index.html"); ambos sem `pageerror`.
- [ ] REG-11 `certificacoes.html` idem.
- [ ] REG-12 `document.title` e `<meta name="description">` presentes; `<html lang>` = `en` (EN) ou `pt-BR` (PT) após troca.
- [ ] REG-13 Todas as imagens carregam (`naturalWidth > 0`), incluindo selos de certificação e capas; nenhuma resposta 404 para arquivos locais.
- [ ] REG-14 Links internos de nav (`#projetos` etc.) rolam até uma seção existente; link para `certificacoes.html` e de volta funcionam.
- [ ] REG-15 Links externos (LinkedIn, GitHub, relatórios) têm `rel="noopener"` quando `target="_blank"` (inspeção por script).

**Idioma**
- [ ] REG-20 Padrão sem preferência salva: EN, `aria-pressed="true"` no botão EN.
- [ ] REG-21 Clicar PT: textos com `data-i`/`data-ia` trocam, `<html lang="pt-BR">`, `aria-pressed` atualizado, `localStorage["ld-lang"]="pt"`.
- [ ] REG-22 Recarregar: PT persiste. `?lang=pt` força PT mesmo com `ld-lang=en`.
- [ ] REG-23 Contagem de elementos `[data-i]` em `index.html` igual à linha de base (53 neste momento, medido por `grep -c "data-i="`; reconferir com `querySelectorAll` no DOM).
- [ ] REG-24 Nenhuma chave visível crua (padrões como `n.proj`, `b.small`, `hub.`) no texto renderizado em PT e EN.

**Tema**
- [ ] REG-30 Sem preferência salva, segue `prefers-color-scheme` (testar os dois valores no contexto do navegador).
- [ ] REG-31 `#themeBtn` alterna `data-theme` entre `light` e `dark`, e a escolha persiste após recarregar (`ld-theme`).
- [ ] REG-32 Captura de tela em tema claro e escuro, PT e EN, 3 viewports, comparada com as capturas de linha de base (comparação visual manual; diferença deve ser explicada). As capturas de referência são geradas **antes** de qualquer mudança na Fase 2 e guardadas fora do repositório principal ou em `docs/testing/baseline/` (decisão do Lucas por causa do peso).
- [ ] REG-33 Chave de tema e idioma compartilhadas: escolher escuro/PT no portfólio e confirmar que `localStorage` mantém as chaves após visitar `/hub/` (teste de coexistência de armazenamento, relevante porque Hub e portfólio compartilham origem; arquitetura 4.3).

**Casos e rotas `#/case/<slug>` (somente `index.html`)**
- [ ] REG-40 Para cada um dos 9 slugs: abrir `index.html#/case/<slug>` diretamente; `#case` visível, `#home` com `hidden`, título do case presente, sem `pageerror`. Em EN e em PT.
- [ ] REG-41 Slug inexistente (`#/case/nao-existe`): comportamento atual registrado como linha de base (não definido pelo código lido; anotar o que acontece e tratar como referência, não como bug).
- [ ] REG-42 Botão "próximo case" (`#/case/<next>`) navega e o botão voltar do navegador retorna à home com a posição de rolagem sensata.
- [ ] REG-43 Recarregar a página em `#/case/<slug>` mantém o case aberto.
- [ ] REG-44 Âncoras (`#projetos` etc.) após fechar um case voltam à home e rolam à seção.
- [ ] REG-45 Hash com caractere fora de `[\w-]` (`#/case/a%20b`): linha de base registrada.

**Filtros e conteúdo dinâmico**
- [ ] REG-50 `#toolFilter` gera botões; cada clique define `aria-pressed` e reduz/mostra cartões; "todos" restaura a lista completa.
- [ ] REG-51 Trocar idioma com filtro ativo: filtro e cartões re-renderizam sem perder o estado e sem duplicar itens.
- [ ] REG-52 `SHOW_DRAFT_NOTES`: registrar se os avisos de rascunho estão visíveis hoje (T-805 depende disso); é linha de base, não critério.

**Teclado e acessibilidade (linha de base, não meta nova)**
- [ ] REG-60 Tab percorre nav, botões de idioma e tema, cartões, com `:focus-visible` visível.
- [ ] REG-61 Lighthouse (acessibilidade, melhores práticas) rodado em `index.html` e `certificacoes.html` **antes** da Fase 2 para registrar nota de referência; mudanças futuras no portfólio não devem piorar a nota.

**Coexistência com o Hub (após Fase 2)**
- [ ] REG-70 Com o Hub no repositório, `index.html` e `certificacoes.html` carregam sem requisições novas para `/hub/` (o portfólio não aponta para o Hub, a menos que o Lucas autorize T-204).
- [ ] REG-71 Se T-204 for autorizado: apenas as linhas aprovadas mudaram no diff, e a matriz 1.3 é reexecutada integralmente.

---

## 2. Ferramentas gratuitas propostas (sem build)

### 2.1 O que foi checado neste ambiente

Comandos executados nesta sessão (ferramental, não testes do produto):

| Verificação | Comando | Resultado |
|---|---|---|
| python3 | `python3 --version` | Python 3.13.18 (`/usr/local/bin/python3`) |
| node, npx, npm | `node --version; npx --version` | v22.23.4; npx 10.9.9; npm 10.9.9 |
| Playwright (CLI) | `playwright --version` | 1.63.0 (`/home/claude/.npm-global/bin/playwright`); módulo em `/opt/npm-tools/node_modules/playwright` |
| Navegadores baixados pelo Playwright | `ls ~/.cache/ms-playwright` | **não existe**: nenhum Chromium/Firefox/WebKit do Playwright instalado |
| `chromium`, `chromium-browser`, `firefox` | `command -v` | ausentes |
| Google Chrome | `google-chrome --version` | Google Chrome for Testing 153.0.8010.12 (`/usr/bin/google-chrome`) |
| Playwright dirigindo o Chrome instalado | script que chama `chromium.launch({executablePath:"/usr/bin/google-chrome", args:["--no-sandbox"]})` e `setContent` | `launch ok x 153.0.8010.12` (funciona) |
| Lighthouse | `command -v lighthouse`; `npm view lighthouse version`; `npm view lighthouse dist-tags` | **não instalado** globalmente. Registro npm respondeu em 2026-11-12: `version` = 13.6.0; `dist-tags` = `latest: 13.6.0`, `next: 13.6.0-dev.20261111`. Isso prova só que a versão existe no registro; **versão a fixar após verificação** (primeira execução real, registrar `lighthouse --version`) |
| axe-core | `npm view @axe-core/cli version`; `npm view @axe-core/playwright version` | ambos 4.14.0 no registro (2026-11-12); **não instalados**; versão a fixar após verificação |
| Playwright no registro | `npm view playwright version` | 1.65.0 no registro; instalado aqui é 1.63.0 (linha acima). Versão a usar na Fase 2 a fixar após verificação |
| Validador de HTML (`tidy`, `vnu`, `html5lib`) | `command -v tidy`; `python3 -c "import html5lib"` | **ausentes** (`java` existe em `/usr/bin/java`, o que permitiria o jar do validador W3C Nu se baixado; não testado) |
| Verificador de links | `ls /opt/npm-tools/node_modules` | nenhum instalado |
| markdownlint, remark | `npm ls -g` | instalados (úteis só para docs) |
| Servidor estático | `python3 -m http.server` | python3 presente; **não foi iniciado** nesta sessão |
| Safari / WebKit | n/d | **indisponível**: não há WebKit no ambiente; Safari real exige macOS/iOS |
| Edge | n/d | não instalado (ver 2.3) |

Nada disso foi usado para testar o Hub. Lighthouse, axe e validador de HTML **não foram executados** e a instalação por `npx` **não foi tentada**. Versões citadas neste documento que não aparecem acima, ou que vieram só do registro, não têm evidência de execução e devem ser lidas como "versão a fixar após verificação" (C8).

### 2.2 Ferramentas propostas

Todas são gratuitas, rodam por linha de comando ou no navegador, e **não entram no deploy** (RNF-01 e D1: nenhum `package.json` obrigatório no site publicado). Scripts de teste ficam em `docs/testing/` ou em uma pasta `tests/` fora de `hub/`, com `package.json` próprio **apenas se o Lucas aprovar** (arquitetura 9: CI é opcional). Sem aprovação, usar `npx` sob demanda, sem arquivo.

| Necessidade | Ferramenta | Uso | Disponibilidade aqui |
|---|---|---|---|
| Servidor estático local | `python3 -m http.server 8080 --bind 127.0.0.1` na raiz do repositório (a raiz importa porque o Hub referencia o `assets/css/styles.css` do portfólio, C1) | Hub não funciona em `file://` (arquitetura 1.1 e 7) | Pronto |
| Simular subpasta do Pages (RNF-12) | Servir a pasta pai de uma cópia chamada `portfolio/`: `mkdir /tmp/site && ln -s <repo> /tmp/site/portfolio && python3 -m http.server -d /tmp/site` e abrir `/portfolio/hub/` | Pega links absolutos (`/assets/...`) que quebram em subcaminho | Pronto (a ser executado) |
| Testes de navegador, rede, teclado, capturas, offline | Playwright (Node) com `executablePath: "/usr/bin/google-chrome"` | Script único cobre i18n, tema, Network, viewport, `context.setOffline(true)`, arquivos de upload (`setInputFiles`), downloads | Chrome funciona (verificado). Firefox exige `npx playwright install firefox`; WebKit (best effort, C6) exige `npx playwright install webkit`. Downloads não tentados. Edge: ver 2.3 |
| Acessibilidade automática | `@axe-core/playwright` ou `npx @axe-core/cli` | Violações WCAG A/AA em cada página, 2 temas, 2 idiomas | Instalável via npx (não executado) |
| Lighthouse | `npx lighthouse <url> --only-categories=accessibility,best-practices,performance,seo --chrome-flags="--headless --no-sandbox" --output=json` com `CHROME_PATH=/usr/bin/google-chrome` | T-208, T-701, RNF-06. Versão: **a fixar após verificação** (registro mostra 13.6.0, ver 2.1). Perfil: mobile padrão, 3 execuções por página, mediana. Indicador complementar, não prova de AA (C7) | Instalável via npx (não executado) |
| Validação de HTML | Validador W3C Nu (`vnu.jar`, usa `java`) ou `html-validate` via npx | Estrutura, `id` duplicado, atributos ARIA inválidos | Não instalado; npx/jar a validar |
| Links | Script Playwright/Node próprio de ~30 linhas que lê `href`/`src` de cada página do Hub e confere: relativos existem em disco; externos respondem 2xx/3xx (apenas Fase 5) | T-502, T-503 | A escrever |
| Chaves i18n | Script Node que carrega `pt.hub.js` (`window.PT_EXTRA`) e extrai `data-i` do HTML, comparando os dois conjuntos | T-205: "nenhuma chave presente em PT e ausente em EN" | A escrever (hoje não existe) |
| Tamanho/peso | Playwright `page.on("response")` somando bytes transferidos (`content-length`/`encodedDataLength` via CDP), cache vazio, excluindo fontes e imagens (regra de contagem de C3); fontes somadas à parte | RNF-04, RNF-11 | Pronto |
| Cores fixas (RNF-08) | `grep -nE '#[0-9a-fA-F]{3,8}\b\|rgb\(' hub/**/*.css hub/**/*.html` comparado à paleta de `IDENTIDADE-VISUAL.md` + exceções documentadas (editor, QR) | T-202 | Pronto |
| Geração de CSV de teste | `python3 -I gen_csv.py` (script a escrever em `docs/testing/fixtures/`) | Seção 3.2 | Pronto |
| Lint de Markdown dos documentos | `markdownlint` global | Qualidade de docs | Pronto |

### 2.3 Lacunas de ambiente (viram "Não executado (motivo)" até resolvidas)

- **Navegadores do critério (C6)**: Chrome, Edge e Firefox, duas últimas versões, via Playwright. Chrome: disponível (versão instalada registrada no relatório; "duas últimas" exige também a versão anterior, via `npx playwright install chromium` ou canal, a tentar na Fase 2). Edge: não instalado; Playwright usa `channel: "msedge"`, que exige instalação (`npx playwright install msedge`, não tentado); sem ele o item fica "Não executado (motivo)". Firefox: `npx playwright install firefox` (download via proxy, a tentar na Fase 2).
- **Safari/WebKit (best effort, fora dos critérios de aceite, C6)**: sem WebKit aqui. O WebKit do Playwright (`npx playwright install webkit`) é aproximação e não vale como Safari real; Safari real fica a cargo do Lucas. Resultado, quando existir, é informativo e não bloqueia aceite.
- **Dispositivo móvel real, leitor de tela real (NVDA/VoiceOver), app bancário (T-602)**: fora do ambiente; dependem do Lucas.
- **GitHub Pages real (RNF-12, MIME de `.wasm`, compressão)**: exige deploy; só o servidor local pode ser simulado.

---

## 3. Casos de teste por funcionalidade do MVP

Pré-requisito comum: servidor estático na raiz; Chrome via Playwright (versão registrada no relatório); limpar `localStorage` entre casos, salvo indicação. Estado inicial de todos: **Planejado**.

### 3.1 Casca do Hub (Fase 2: T-201 a T-213; RF-01 a RF-04, RF-17)

Observação (C1): as URLs são canônicas: `hub/` (`/hub/`), `hub/ferramentas/`, `hub/ferramentas/csv/`, `hub/ferramentas/sql/`, `hub/privacidade/` (P1, Fase 2) e assets em `hub/assets/{css,js,vendor,fonts}/`. O Hub é multipágina e **sem roteador** (C4). Os casos usam esses caminhos; `/hub/sobre/`, `/hub/cursos/...`, `/hub/apoie/` são fases futuras e não têm casos aqui. Depende de D2 (hospedagem) e D3 (fontes locais, sql.js, Papa Parse) aprovados (C2); onde a decisão pende, o caso vale "se D-n aprovado".

| ID | Tipo | Pré-condição / Passos | Resultado esperado | Prio | Rastreio |
|---|---|---|---|---|---|
| HUB-01 | Positivo | Abrir `/hub/` por servidor estático | Página carrega, status 200, zero `pageerror`, zero `console.error` | P0 | T-203 |
| HUB-02 | Positivo | Contar cartões | Exatamente 2 cartões ativos (CSV, SQL), ambos navegam para `hub/ferramentas/csv/` e `hub/ferramentas/sql/`. Cartões "Em breve" ficam fora do critério (só existem se o Lucas aprovar no G1) e não há cartão nem link de Apoie/PIX na Fase 2 (C10.2): busca por `pix`, `apoie`, `support` no HTML do Hub retorna zero | P0 | T-203, C10.2 |
| HUB-03 | Negativo | Se o Lucas aprovar cartões "Em breve" no G1: clicar/Enter/Tab em cartão desabilitado (fora do critério de aceite, C10.2) | Nada navega; foco ainda alcançável (ou fora da ordem de tab, conforme decisão), sem erro | P1 | T-203 |
| HUB-04 | Positivo | Do Hub, clicar "Portfólio" | Chega à raiz do portfólio; nenhuma URL absoluta iniciada em `/` (usa relativa) | P0 | T-204, RF-02 |
| HUB-05 | Positivo | Do portfólio, abrir o Hub por URL direta | Funciona sem link no portfólio (REG-70) | P0 | T-204 |
| HUB-06 | Positivo | Se T-204 autorizado: link no portfólio leva ao Hub e volta | Ida e volta funcionam em subpasta (`/portfolio/`) | P1 | T-204 |
| HUB-10 | Positivo | Clicar PT no Hub | 100% dos textos visíveis em PT (script: nenhum nó de texto com chave crua nem texto EN remanescente fora de lista de exceções, ex.: nomes próprios, "SQL", "CSV"); `<html lang="pt-BR">` | P0 | T-205, RF-03 |
| HUB-11 | Positivo | Escolher PT, recarregar | PT persiste (`ld-lang`) | P0 | T-205 |
| HUB-12 | Positivo | Escolher PT no portfólio, abrir Hub | Hub abre em PT (mesma chave `ld-lang`) e vice-versa | P0 | RF-03 |
| HUB-13 | Borda | `?lang=pt` com `ld-lang=en` salvo | PT (mesma regra do portfólio) | P1 | RF-03 |
| HUB-14 | Negativo | `localStorage` indisponível/bloqueado (contexto com storage negado) | Página funciona com idioma padrão, sem exceção não tratada | P1 | RF-03 |
| HUB-15 | Negativo | Script de chaves i18n com uma chave PT removida de propósito (fixture) | Script falha com código de saída != 0 e lista a chave (prova que o verificador detecta) | P0 | T-205 |
| HUB-16 | Borda | Troca de idioma com mensagem dinâmica já exibida (erro, progresso) | Mensagem é redesenhada no novo idioma (`onLang`), sem recarregar | P1 | arq. 4.2 |
| HUB-20 | Positivo | Sem preferência salva, `colorScheme: dark` / `light` | Tema segue o sistema; sem flash de tema errado (capturar primeiro frame: `data-theme` já definido antes do primeiro paint) | P0 | T-206, RF-04 |
| HUB-21 | Positivo | Alternar tema, recarregar | Escolha persiste (`ld-theme`) e vale também no portfólio | P0 | T-206 |
| HUB-22 | Positivo | Contraste nos dois temas | AA verificado por **cálculo** (fórmula WCAG) com os pares da tabela 10.2 do `hub-ux.md` (texto 4,5:1, componentes 3:1), 2 temas; axe `color-contrast` e Lighthouse como indicadores complementares, não como prova (C7) | P0 | T-206 |
| HUB-23 | Positivo | Busca de cor fixa nos CSS/HTML do Hub | Nenhum hex fora da paleta de `IDENTIDADE-VISUAL.md`, exceto editor/código e QR (documentados) | P1 | T-202, RNF-08 |
| HUB-24 | Regressão | `git diff` em `assets/` | Vazio (REG-01) | P0 | T-202 |
| HUB-30 | Negativo | Em página do Hub com estado por hash/parâmetro (ex.: `/hub/ferramentas/sql/?ex=inexistente`, `#ex=xyz`), usar valor inválido | Estado inválido tratado **dentro da página** (C4): mensagem PT/EN com link para o início da página/Hub, sem exceção, sem tela em branco. Não há "404 interna" nem roteador; `404.html` na raiz requer aprovação e está fora do MVP (nenhum caso) | P1 | T-207, RF-17, C4 |
| HUB-31 | Negativo | Hash/parâmetro malformado (`#%E0%A4%A`, `#ex=`, valor com 5 KB) | Mesma regra de HUB-30; valor nunca inserido via `innerHTML` | P1 | T-207, C4 |
| HUB-40 | Positivo | Carregar `/hub/` com cache vazio e medir bytes transferidos pela regra de C3 (HTML + CSS + JS próprios + `styles.css` do portfólio; **sem** fontes e sem imagens) | Sem WASM e sem Pyodide; total <= 150 KB (meta provisória de C3, a confirmar no primeiro protótipo). Fontes woff2 somadas à parte, <= 120 KB. Bibliotecas pesadas fora do shell, com orçamento próprio. O valor de 300 KB do PRD está revogado e não é medido | P0 | RNF-04, C3 |
| HUB-41 | Positivo | Servir de `/portfolio/hub/` (subpasta) | Todos os recursos carregam (zero 404); nenhum caminho absoluto | P0 | RNF-12 |
| HUB-42 | Negativo | Abrir o Hub por `file://` | Registrar o comportamento; deve exibir aviso claro ou degradar sem tela em branco (a arquitetura declara que não funciona; o aviso é desejável) | P2 | arq. 1.1 |
| HUB-43 | Positivo | Fontes | Fontes carregam de `hub/assets/fonts/`, nenhuma requisição a `fonts.googleapis.com`/`fonts.gstatic.com` nas páginas do Hub (C9; o portfólio mantém Google Fonts). Se D3 (fontes locais) não for aprovado, reescrever | P0 | T-209 |
| HUB-44 | Positivo | Validar HTML de todas as páginas do Hub | Zero erros de estrutura (ids duplicados, ARIA inválido) | P1 | qualidade |
| HUB-45 | Positivo | Cabeçalho duplicado | Os itens de navegação e rótulos são iguais em todas as páginas (script compara o `<nav>` de cada página) | P1 | arq. 5 |
| HUB-50 | Negativo | XSS na casca: `?lang=<script>`/hash com `<img onerror>` | Nenhum script executa; o valor não é inserido com `innerHTML` | P0 | R7 |

### 3.2 Visualizador de CSV (Fase 3: T-302, T-303, T-306, T-311; RF-05, RF-06, RF-19)

#### Fixtures a criar (Planejado, em `docs/testing/fixtures/`, geradas por script determinístico e com a resposta esperada registrada em um `expected.json`)

| Arquivo | Conteúdo | Para quê |
|---|---|---|
| `basic.csv` | 10 colunas, 10.000 linhas, vírgula, UTF-8, com acentos (`ação`, `São Paulo`, `ç`, `ñ`) | T-302 |
| `semicolon.csv` | mesma estrutura com `;` e decimal com vírgula (formato BR) | delimitador |
| `tab.tsv` / `pipe.csv` | `\t` e `\|` | delimitador |
| `bom.csv` | UTF-8 com BOM (EF BB BF) | BOM |
| `latin1.csv` | ISO-8859-1/Windows-1252 com acentos | codificação |
| `empty.csv` | 0 bytes | vazio |
| `header-only.csv` | só o cabeçalho | vazio parcial |
| `one-col.csv` | 1 coluna, sem delimitador | borda |
| `quoted.csv` | campos entre aspas com vírgula, aspas duplicadas `""` e quebra de linha dentro do campo | parsing |
| `ragged.csv` | linhas com mais e com menos campos que o cabeçalho | inconsistência |
| `nulls.csv` | células vazias, `NULL`, `NA`, espaços | T-303, valores nulos |
| `dup-headers.csv` | cabeçalhos repetidos e cabeçalho vazio | nomes de colunas |
| `crlf.csv` / `cr.csv` | fins de linha `\r\n` e `\r` | quebra de linha |
| `wide.csv` | 500 colunas x 100 linhas | largura |
| `limit-10mb.csv` | ~10 MB (limite do MVP, C6), cerca de 100 mil linhas x 10 colunas | critério de tamanho (RNF-05 reescrito) |
| `over-limit.csv` | 1 byte acima do limite de 10 MB (bytes exatos do limite a registrar pelo desenvolvedor: 10.000.000 ou 10.485.760) | erro de tamanho |
| `big-50mb.csv` | ~50 MB (cerca de 500 mil linhas x 10 colunas) | **medição exploratória** (C6), não critério |
| `fake.csv` | binário (PNG renomeado) | arquivo inválido |
| `xss.csv` | cabeçalhos/células com `<img src=x onerror=...>`, `<script>`, `=cmd\|...` (injeção de fórmula) | segurança |
| `types.csv` | inteiros, decimais, datas ISO e BR, booleanos, texto misto | inferência de tipos |

Os arquivos grandes (`limit-10mb`, `over-limit`, `big-50mb`) são **gerados em tempo de teste** e não commitados (limite do repositório, RNF-11). Nome canônico do arquivo de 10 MB: `limit-10mb.csv` (C10.4); `big-10mb.csv` não existe. Esta lista é a "Fixtures a criar" a que T-311 deve apontar.

#### Casos

| ID | Tipo | Passos | Esperado | Prio | Rastreio |
|---|---|---|---|---|---|
| CSV-01 | Positivo | Selecionar `basic.csv` (input de arquivo) | Mostra as primeiras 100 linhas, "10.000 linhas" e "10 colunas" (valores conferem com `expected.json`) | P0 | T-302, RF-05 |
| CSV-02 | Positivo | Arrastar e soltar `basic.csv` na zona | Mesmo resultado de CSV-01; estado "arrastando" visível e some ao soltar | P0 | RF-05 |
| CSV-03 | Positivo | Acentos | `ação`, `São Paulo`, `ç`, `ñ` aparecem idênticos aos do arquivo (comparação de texto exata na célula) | P0 | T-302 |
| CSV-04 | Positivo | Tipos inferidos em `types.csv` | Cada coluna recebe o tipo esperado do `expected.json` | P0 | RF-05 |
| CSV-05 | Positivo | Operar só pelo teclado: Tab até o botão "Escolher arquivo", Enter, selecionar | Carrega sem mouse | P0 | T-309 |
| CSV-10 | Borda | `empty.csv` (0 bytes) | Mensagem legível PT/EN ("arquivo vazio"), sem exceção; página continua funcional | P0 | T-302 |
| CSV-11 | Borda | `header-only.csv` | "0 linhas, N colunas" com aviso; sem quebrar tabela | P0 | T-302 |
| CSV-12 | Borda | `semicolon.csv`, `tab.tsv`, `pipe.csv` | Delimitador detectado automaticamente e exibido no resumo; contagem de colunas correta; opção manual de trocar delimitador reprocessa | P0 | T-302 |
| CSV-13 | Borda | CSV de 1 coluna | 1 coluna, N linhas; não confunde com delimitador não detectado | P1 | T-302 |
| CSV-14 | Borda | `bom.csv` | BOM removido: o primeiro nome de coluna não começa com `﻿` (conferir `columns[0]` no DOM e no SQL, CSV-40) | P0 | T-302 |
| CSV-15 | Borda | `latin1.csv` | Detecta ou permite escolher codificação; sem `�` após ajuste; sem ajuste, mostra aviso claro | P1 | T-302, UX 5.2 |
| CSV-16 | Borda | `quoted.csv` | Vírgulas, aspas e quebras de linha dentro de campos preservadas; contagem de linhas = registros, não linhas físicas | P0 | T-302 |
| CSV-17 | Borda | `ragged.csv` | Linhas irregulares sinalizadas (contagem de erros) sem abortar a leitura | P1 | T-302 |
| CSV-18 | Borda | `dup-headers.csv` | Nomes duplicados/vazios tratados de forma determinística (ex.: sufixo `_2`, `coluna_3`); sem sobrescrever dados | P1 | T-302 |
| CSV-19 | Borda | `crlf.csv`, `cr.csv` | Mesma contagem que o arquivo equivalente com `\n` | P1 | T-302 |
| CSV-20 | Borda | `wide.csv` (500 colunas) | Renderiza; rolagem horizontal fica no contêiner da tabela, não na página (RSP-10) | P1 | UX 7.2 |
| CSV-21 | Borda | Células muito longas (100 KB em uma célula) | Truncadas com reticências; abrir completo sob demanda; sem travar | P1 | UX 8.6 |
| CSV-22 | Borda | Nome de arquivo com acento/espaço/`<>` | Exibido escapado; sem HTML injetado | P1 | R7 |
| CSV-30 | Negativo | `fake.csv` (binário) | Erro legível ("não foi possível ler o arquivo"), com ação; arquivo anterior (se houver) mantido | P0 | T-302 |
| CSV-31 | Negativo | Selecionar arquivo não CSV de extensão diferente (`.pdf`, `.xlsx`) | Aviso sobre o formato; sem exceção | P0 | T-302 |
| CSV-32 | Negativo | Soltar vários arquivos de uma vez | Comportamento definido (carrega o primeiro com aviso, ou recusa com mensagem); sem estado inconsistente | P1 | UX 5.2 |
| CSV-33 | Negativo | Soltar uma pasta ou texto selecionado | Ignorado com mensagem; sem erro | P2 | UX 5.2 |
| CSV-34 | Negativo | Cancelar o seletor de arquivo | Nenhuma mudança de estado, sem erro | P2 | UX 5.2 |
| CSV-35 | Negativo | Carregar `a.csv`, depois `fake.csv` | O erro não apaga a tabela anterior | P1 | UX 5.2 |
| CSV-36 | Negativo | Carregar o mesmo arquivo duas vezes seguidas | Segundo carregamento também funciona (o `input` deve ser resetado, senão `change` não dispara) | P1 | regressão comum |
| CSV-40 | Segurança | `xss.csv` | Nenhum script/handler executa; o texto aparece literal; o DOM não contém `<img onerror>` criado a partir do arquivo | P0 | R7 |
| CSV-41 | Segurança | Exportação (se existir, T-308) de células com `=`, `+`, `-`, `@` | Documentar o risco de injeção de fórmula; decisão sobre prefixo `'` registrada | P1 | T-308 |
| CSV-50 | Desempenho | `basic.csv` (10 mil linhas) | Tempo até exibir a tabela **registrado** (sem limite de aprovação, pois não há máquina de referência, C7); critério: não bloqueia a interface, medido por teste automatizado (PerformanceObserver, sem long task > 200 ms) | P1 | T-302 |
| CSV-51 | Desempenho | `limit-10mb.csv` (critério, C6) | Carrega; a interface não é bloqueada: nenhuma long task > 1 s durante a leitura (teste automatizado, Performance API, sem exigir máquina de referência, C7); botão "Cancelar" funciona; memória registrada. Parsing roda em Web Worker (MVP, C10.1) | P0 | RNF-05, T-306, T-302, T-310, C6, C10.1 |
| CSV-51b | Exploratório | `big-50mb.csv` (meta a validar, não critério, C6) | Registrar: aceita ou recusa com mensagem, maior long task, memória de pico, navegador e versão. Resultado alimenta a decisão de elevar o limite; nunca reprova a fase. **Estado (Fase 3): ainda NÃO tem teste automatizado nem execução manual registrada; o pico de memória segue sem medição** | P2 | RNF-05, T-306, C6 |
| CSV-52 | Desempenho | `over-limit.csv` (10 MB + 1 byte) | Mensagem antes de ler, citando o limite de 10 MB e a opção de carregar as primeiras N linhas (UX 5.2); `limit-10mb.csv` ainda é aceito (borda do limite) | P0 | T-306, T-302, T-310, C6 |
| CSV-53 | Desempenho | Cancelar a leitura de `limit-10mb.csv` a 40% | Para, libera memória, interface volta ao estado vazio/anterior; o Worker é encerrado (C10.1) | P0 | T-306, UX 5.2, C10.1 |
| CSV-54 | Desempenho | Carregar 3 arquivos em sequência | Sem vazamento crescente de memória (heap após GC não cresce acima de limite a definir) | P2 | qualidade |
| (nota) | Prioridades | Conferido na Fase 3: CSV-51, CSV-52, CSV-53, SQL-18, SQL-32 e SQL-33 já são **P0** nesta tabela (nenhum ajuste necessário). CSV-51b e SQL-18b são P2 exploratórios e **ainda não têm teste** | | |
| CSV-60 | Positivo | Perfil por coluna (RF-06, T-303, P1) em `nulls.csv` | Nulos, distintos, mín/máx batem com `expected.json` (calculado por script Python independente, não pelo código do Hub) | P1 | T-303 |
| CSV-61 | Borda | Perfil de coluna 100% nula; coluna de 1 valor; coluna de texto (mín/máx lexicográfico) | Sem `NaN`/`undefined` na tela | P1 | T-303 |
| CSV-62 | Borda | Definição de "nulo": vazio vs `NULL` vs `NA` vs espaços | Regra documentada na interface e aplicada igual em CSV e SQL | P1 | seção 7 |

### 3.3 SQL playground (Fase 3: T-304, T-305, T-306, T-309; RF-07, RF-08, RF-19)

| ID | Tipo | Passos | Esperado | Prio | Rastreio |
|---|---|---|---|---|---|
| SQL-01 | Positivo | Executar `SELECT 1+1` | Resultado com 1 linha e valor 2 | P0 | T-304 |
| SQL-02 | Positivo | Atalho Ctrl+Enter e Cmd+Enter (`metaKey`) no editor | Executa; botão "Executar" também executa | P0 | T-304 |
| SQL-03 | Positivo | Resultado mostra contagem de linhas e tempo ("N linhas · X ms") | Valores presentes e coerentes | P1 | UX 5.3 |
| SQL-04 | Positivo | Estado inicial | Editor com consulta de exemplo; botão desabilitado ("Aguarde") até o motor estar pronto, depois habilitado | P0 | UX 5.3 |
| SQL-05 | Positivo | `SELECT` sem linhas (`WHERE 1=0`) | Mensagem "rodou e não retornou linhas", distinta de erro | P1 | UX 5.3 |
| SQL-06 | Positivo | Várias instruções (`CREATE TABLE ...; INSERT ...; SELECT ...`) | Exibe o resultado da última com `SELECT`, ou define comportamento documentado | P1 | T-304 |
| SQL-10 | Positivo | Carregar `basic.csv` como tabela (T-305), `SELECT COUNT(*) FROM <tabela>` | Retorna 10000 | P0 | T-305, RF-08 |
| SQL-11 | Borda | Nome de tabela derivado do arquivo com espaços, acentos, hífen, número no início, palavra reservada (`order.csv`, `2024 vendas.csv`) | Nome saneado de forma previsível, mostrado na tela; consultas funcionam | P0 | T-305 |
| SQL-12 | Borda | Nomes de colunas duplicados, vazios, com espaço/acento/`"` | Saneados e listados no esquema; consultáveis com aspas | P0 | T-305 |
| SQL-13 | Borda | `bom.csv` | `SELECT <primeira_coluna>` funciona (sem `﻿` no nome) | P0 | CSV-14 |
| SQL-14 | Borda | Tipos: coluna numérica vira número (`SUM` funciona), texto fica texto; datas como texto documentado | `SELECT SUM(x)` confere com o cálculo independente | P0 | T-305 |
| SQL-15 | Borda | Valores nulos do CSV | Entram como `NULL` conforme regra de CSV-62: `COUNT(col)` difere de `COUNT(*)` | P1 | CSV-62 |
| SQL-16 | Borda | Carregar um segundo CSV | Segunda tabela coexiste; carregar o mesmo nome substitui ou avisa (definido) | P1 | T-305 |
| SQL-17 | Borda | Carregar CSV vazio / só cabeçalho | Tabela vazia criada ou mensagem clara; `COUNT(*)` = 0 | P1 | T-305 |
| SQL-18 | Borda | CSV de `limit-10mb.csv` (10 MB, C6) como tabela | Carrega; interface não é bloqueada > 1 s (teste automatizado, Performance API, C7); acima de 10 MB, recusa com mensagem do limite; execução em Web Worker (MVP, C10.1) | P0 | T-306, T-305, T-310, C6 |
| SQL-18b | Exploratório | `big-50mb.csv` como tabela (meta, não critério, C6) | Registrar resultado (carrega ou recusa), memória de pico, maior long task; não reprova. **Estado (Fase 3): ainda NÃO tem teste; sem resultado registrado** | P2 | T-306, C6 |
| SQL-20 | Negativo | `SELEC 1` (SQL inválido) | Mensagem de erro legível; a página continua funcional; editor mantém o texto; resultado anterior esmaecido, não apagado | P0 | T-304 |
| SQL-21 | Negativo | Tabela inexistente (`SELECT * FROM nada`) | Erro com dica ("veja o esquema") quando reconhecível | P1 | UX 5.3 |
| SQL-22 | Negativo | Coluna inexistente | Idem | P1 | UX 5.3 |
| SQL-23 | Negativo | Consulta vazia / só espaços / só comentário (`-- x`) | Mensagem amigável; sem erro de motor cru | P1 | T-304 |
| SQL-24 | Negativo | Erro seguido de consulta válida | Executa normalmente (o erro não corrompe o estado do motor) | P0 | T-304 |
| SQL-25 | Negativo | Instruções destrutivas (`DROP TABLE`, `DELETE`) | Afetam apenas o banco em memória; não persistem entre recarregamentos; botão "Reiniciar" restaura o estado inicial | P1 | arq. contrato `reset` |
| SQL-26 | Negativo | Funções/PRAGMA perigosos (`ATTACH DATABASE '/x'`, `PRAGMA`) | Não acessam sistema de arquivos real (WASM em memória); erro ou comportamento documentado | P1 | segurança |
| SQL-27 | Negativo | Uso offline sem WASM carregado (rede cortada antes do primeiro load) | Mensagem de falha ao preparar o ambiente com botão "Tentar de novo"; sem tela travada | P0 | UX 5.3 |
| SQL-30 | Borda | Consulta longa: 100 KB de texto no editor (por ex., `SELECT 1 UNION ALL ...` x 5.000) | Editor responsivo; executa ou retorna erro de limite legível; sem travar a aba | P1 | T-304 |
| SQL-31 | Borda | Resultado grande: `SELECT * FROM` tabela de `limit-10mb.csv` (~100 mil linhas) | Interface exibe um subconjunto (limite documentado) com aviso "mostrando N de M"; sem travar | P0 | T-306 |
| SQL-32 | Borda | Consulta lenta (CTE recursiva até 10^7) | Worker é MVP (C10.1). Botão "Parar" aparece após 3 s; parar termina e recria o Worker; interface segue utilizável (sem long task > 1 s na aba principal); tabelas carregadas podem ser perdidas e a mensagem avisa | P0 | T-306, UX 5.3, arq. `timeoutMs` |
| SQL-33 | Borda | Consulta com laço infinito (CTE recursiva sem fim) | Timeout por término do Worker (C10.1): mensagem "passou de N segundos" com sugestão de `LIMIT`; o Worker é recriado e a aba segue responsiva | P0 | T-306, UX 5.3 |
| SQL-34 | Borda | Executar duas vezes seguidas rapidamente (duplo Ctrl+Enter) | Uma execução por vez; sem resultados trocados | P1 | T-304 |
| SQL-35 | Borda | Unicode/emoji em literais e identificadores | Ida e volta íntegra | P1 | T-304 |
| SQL-36 | Borda | Colunas com tipos `BLOB`/valores muito grandes | Exibe resumo (ex.: "BLOB 1 KB"), sem renderizar bytes crus | P2 | T-304 |
| SQL-40 | Segurança | Resultado com texto `<img src=x onerror=alert(1)>` | Exibido como texto, sem executar | P0 | R7 |
| SQL-41 | Segurança | Nome de coluna/tabela malicioso vindo de CSV | Exibido como texto no esquema e na tabela | P0 | R7 |
| (SQL-50) | Removido | Rascunho do editor em `localStorage` é P2 (C6): fora do plano do MVP, sem caso até ser formalizado. Dados do CSV nunca persistem (coberto por PRV-07) | | |
| SQL-51 | Positivo | Operação 100% por teclado: Tab até o editor, digitar, Ctrl+Enter, Tab até o resultado; `Esc` depois `Tab` sai do editor sem prender o foco | Passa | P0 | T-309 |
| SQL-52 | Positivo | Troca PT/EN com resultado e erro na tela | Rótulos e dicas mudam; mensagem do motor permanece no idioma original (UX 6) | P0 | T-309 |
| SQL-53 | Positivo | Exportar resultado como CSV (T-308, RF-10, P1) | O arquivo baixado reabre no visualizador com o mesmo número de linhas e colunas; delimitador e BOM documentados | P1 | T-308 |

### 3.4 Funcionalidades pós-MVP (apenas esboço, sem casos detalhados nesta fase)

Fase 3 pós-MVP (T-303, T-307, T-308), Fase 4 (Python), 5 (cursos/recursos), 6 (PIX) e 7: casos serão detalhados antes de cada fase (portão de entrada, seção 6). Itens já previsíveis: sem links quebrados (T-502), cada download abre (T-503), `print(1+1)` e interrupção de loop (T-402), copiar PIX e QR (T-602), Pyodide não baixado na página inicial (T-405).

---

## 4. Responsividade e acessibilidade

### 4.1 Responsividade (RNF-07)

Viewports: 360 (menor viewport suportado, L3), 768, 1280 px. Também 200% de zoom e 400% de reflow (WCAG 1.4.10).

| ID | Verificação | Esperado | Prio |
|---|---|---|---|
| RSP-01 | Em cada página do Hub, `document.documentElement.scrollWidth <= innerWidth` em 360/768/1280 (menor = 360 px) | Sem rolagem horizontal da página | P0 |
| RSP-02 | Menu: abaixo de 860/900 px vira painel suspenso; Esc e clique fora fecham; abrir não cobre o conteúdo permanentemente | Passa | P0 |
| RSP-03 | Alvos de toque novos >= 44x44 px (script mede `getBoundingClientRect` dos botões/links/inputs em 360 px) | Todos >= 44, espaçamento >= 8 px | P1 |
| RSP-04 | Campos e editor com `font-size >= 16px` (computed) | Passa | P1 |
| RSP-05 | Visualizador de CSV em 360 px: tabela rola dentro do contêiner (`overflow-x`), contêiner com `tabindex="0"`, `role="region"`, `aria-label` | Passa | P0 |
| RSP-06 | SQL playground: abas Editor/Resultado/Esquema em compacto; botão Executar acessível sem rolar; teclado virtual não esconde o editor (emulação limitada; confirmar em dispositivo real) | Passa; item de dispositivo real fica "Não executado (motivo)" | P1 |
| RSP-07 | Zoom 200% e texto 400%: sem perda de conteúdo/funções, sem altura fixa cortando texto | Passa | P1 |
| RSP-08 | Imagens e QR: `max-width:100%`, QR >= 160 px (Fase 6) | Passa | P1 |
| RSP-09 | Orientação paisagem em 360x640 girado: layout utilizável | Passa | P2 |
| RSP-10 | Tabela de 500 colunas não alarga a página (CSV-20) | Passa | P1 |
| RSP-11 | Capturas em 360/768/1280, claro/escuro, PT/EN para cada página (revisão visual de sobreposição, corte, contraste) | Sem defeitos visuais; defeitos viram bugs | P0 |

### 4.2 Acessibilidade (RNF-06)

| ID | Verificação | Como | Esperado | Prio |
|---|---|---|---|---|
| A11-01 | Lighthouse acessibilidade em cada página do Hub (mobile, mediana de 3 execuções), claro e escuro. **Indicador complementar, não prova de AA** (C7) | `npx lighthouse@<versão a fixar após verificação>` | >= 90 como indicador (T-208, T-701); queda abaixo de 90 abre bug a analisar, a aprovação de AA vem de A11-10 | P1 |
| A11-02 | axe-core sem violações `serious`/`critical` em cada página, estado inicial **e** estados dinâmicos (tabela carregada, erro exibido, resultado SQL) | `@axe-core/playwright` | Zero | P0 |
| A11-03 | Lighthouse e axe **não** cobrem tudo: revisão manual de foco, ordem e nomes acessíveis | Checklist abaixo | Passa | P0 |
| A11-04 | `lang` correto: `en` ou `pt-BR` e atualizado na troca | Playwright | Passa | P0 |
| A11-05 | Primeiro Tab = "Pular para o conteúdo", leva a `#main` | Teclado | Passa | P0 |
| A11-06 | Todos os controles alcançáveis e operáveis só por teclado, incluindo abas (setas, Home/End), menu mobile, zona de arquivo, botões de copiar | Teclado | Passa | P0 |
| A11-07 | Anel de foco visível, inclusive sobre fundo escuro (editor, console) | Captura | Contraste do foco >= 3:1 | P0 |
| A11-08 | Sem armadilha de foco no editor (`Esc` depois `Tab`) | Teclado | Passa | P0 |
| A11-09 | Região `aria-live="polite"` única para status; erro bloqueante com `role="alert"`; progresso anunciado em marcos | Inspeção DOM + leitor de tela | Passa | P1 |
| A11-10 | Contraste AA **verificado por cálculo** (fórmula WCAG) nos 2 temas para todos os pares da tabela 10.2 do `hub-ux.md` (tabela única, C10.3); os valores do UX foram "calculados à mão" e devem ser reconferidos | Script de cálculo; axe e Lighthouse apenas complementares (C7) | Texto >= 4,5:1; componentes >= 3:1; confere com a tabela 10.2 (tolerância 0,05) | P0 |
| A11-11 | Informação nunca só por cor (erro tem ícone e texto) | Revisão visual | Passa | P1 |
| A11-12 | `prefers-reduced-motion: reduce` desativa pulso de esqueleto e animações | Playwright `reducedMotion: "reduce"` | Sem animação em execução (`getAnimations()` vazio ou estático) | P1 |
| A11-13 | Tabelas de dados: `caption`, `aria-sort` nos cabeçalhos ordenáveis, `aria-rowcount` se virtualizada | Inspeção | Passa | P1 |
| A11-14 | Leitor de tela real (NVDA/VoiceOver) | Manual | **Não executável no ambiente**; depende do Lucas ou de voluntário | P2 |
| A11-15 | Links em texto corrido sublinhados; links externos com `rel="noopener"` e aviso "abre em nova aba" | Script | Passa | P1 |

---

## 5. Testes de privacidade (RNF-02, RNF-03, T-209, T-310)

Objetivo: **nenhum dado do usuário (conteúdo de CSV, consultas SQL, nomes de arquivo, resultado) sai do navegador.** Escopo: apenas páginas do Hub. O portfólio carrega Google Fonts (ver 1.1) e fica fora.

### 5.1 Método de inspeção de rede (manual, no navegador)

1. Chrome, janela anônima, DevTools, aba **Network**, marcar "Preserve log" e "Disable cache", limpar a lista.
2. Abrir a página da ferramenta. Registrar todas as requisições do carregamento inicial em uma tabela (URL, tipo, tamanho). Esta é a **lista de recursos externos** pedida em T-209.
3. Filtrar por domínio: `-domain:127.0.0.1 -domain:localhost` (ou o domínio do Pages). Todo resultado é um achado.
4. Só então executar a ação do usuário (carregar CSV, rodar SQL, exportar). **Limpar a lista antes da ação** e registrar toda requisição nova.
5. Verificar métodos: nenhuma requisição `POST`/`PUT`/`PATCH`, nenhum `navigator.sendBeacon`, nenhum `WebSocket`, nenhum `EventSource`, nenhum `fetch` com corpo.
6. Verificar que nenhuma URL carrega o conteúdo na query string (`?q=`, nome de arquivo, trecho SQL).
7. Aba Application: conferir `localStorage`, `sessionStorage`, IndexedDB, Cache Storage e cookies; listar chaves (`ld-*`, `hub-*`); confirmar que **o conteúdo do CSV não foi gravado** e que **não há cookies**.

### 5.2 Método automatizado (Playwright, repetível)

Script único que, para cada página e cada ação:
- `context.route("**/*", ...)` registra toda requisição (URL, método, `postData`) e aborta qualquer origem diferente de `127.0.0.1`/origem de teste (falha explícita se algo externo for pedido);
- injeta um **canário**: um CSV cujo conteúdo e nome contêm uma string única (`CANARIO-9f3a7c`) e uma consulta SQL com outra (`CANARIO-SQL-51b2`); após as ações, afirma que **nenhuma** URL, cabeçalho ou `postData` registrado contém essas strings (busca também em `request.headers()`);
- afirma `context.cookies()` vazio;
- repete o roteiro com `context.setOffline(true)` depois do primeiro carregamento, para verificar que as funções continuam e que nada tenta a rede.

### 5.3 Casos

| ID | Verificação | Esperado | Prio |
|---|---|---|---|
| PRV-01 | Carregamento inicial de cada página do Hub: lista de domínios | Somente a origem do Hub; zero Google Fonts, zero CDN (sob D3 = arquivos próprios). Se D3 não for aprovado ou mudar para CDN, o resultado esperado precisa ser reescrito (decisão pendente, C2). Vale só para páginas do Hub (C9) | P0 |
| PRV-02 | Carregar `basic.csv` (canário no conteúdo e no nome) | Nenhuma requisição de saída durante e depois | P0 |
| PRV-03 | Executar SQL com canário | Nenhuma requisição nova | P0 |
| PRV-04 | Exportar CSV (T-308) | Download local via `Blob`/`a[download]`, sem requisição | P0 |
| PRV-05 | Carregamento sob demanda do WASM: única requisição nova é para `hub/assets/vendor/...wasm` da própria origem, sem parâmetros do usuário | Passa | P0 |
| PRV-06 | Cookies | Nenhum cookie definido em nenhuma página (RNF-03) | P0 |
| PRV-07 | Armazenamento | Apenas chaves documentadas (`ld-theme`, `ld-lang`; `hub-*` somente se formalizadas); conteúdo de CSV e SQL ausente do storage | P0 |
| PRV-08 | Scripts/ativos de analytics, pixels, fontes remotas, iframes de terceiros | Nenhum (busca em HTML: `<iframe`, `googletagmanager`, `analytics`, `gtag`, `fbq`) | P0 |
| PRV-09 | Cabeçalho `Referer` nas navegações para links externos | Links externos com `rel="noopener noreferrer"` ou política `Referrer-Policy` via `<meta>` (a avaliar) | P1 |
| PRV-10 | Afirmação na UI ("Seu arquivo não sai do seu computador") | Só presente se PRV-02 a PRV-05 passaram (UX 1: confirmar que é verdade) | P0 |
| PRV-11 | Uso offline: carregar a página com rede, `setOffline(true)`, recarregar | Ver item 2 da seção 7: sem Service Worker o recarregamento offline depende do cache HTTP e pode falhar. Resultado esperado a definir | P1 |
| PRV-12 | `manifest.json` de `hub/assets/vendor/`: `sha256sum` de cada arquivo confere; licença registrada (T-301, RNF-10) | Hashes iguais | P1 |
| PRV-13 | CSP via `<meta>` (se adotado, conforme a arquitetura): nenhuma violação no console nas ferramentas; teste negativo: tentar `eval`/script inline deve ser bloqueado | Passa | P1 |
| PRV-14 | Fase 4: Pyodide não é baixado ao abrir a página inicial do Hub nem a do Python antes do clique (T-405) | Zero requisição `pyodide*` | P0 (na Fase 4) |
| PRV-15 | Fase 5, IA: nenhuma chamada a APIs de IA (T-504) | Zero | P0 (na Fase 5) |
| PRV-16 | Fase 6, PIX: nenhum dado do visitante coletado (T-603); chave exibida = a aprovada | Passa | P0 (na Fase 6) |

---

## 6. Critérios de entrada e saída por fase

Regras gerais: o QA só marca "Executado: passou" com evidência anexada (comando e saída, ou captura). Defeito P0 aberto bloqueia saída. Nenhum item de produto é corrigido pelo QA: abre-se o bug e devolve-se ao dono da tarefa. Saída de fase também exige o portão humano do Lucas (PRD, riscos).

### Fase 1 (Planejamento, esta)
- Entrada: documentos de PRD, backlog, arquitetura, UX existem.
- Saída: este plano revisado; itens "aberto" da seção 7 (1 na contagem atual, pendente de resposta do Lucas) corrigidos nos documentos donos (backlog, PRD, hub-ux) ou aceitos como ressalva escrita do Lucas; decisões D2/D3/D5/D8 registradas ou premissas confirmadas, conforme o que cada uma bloqueia em C2 (D2 e D3-fontes: Fase 2; D3 sql.js/Papa Parse: Fase 3; D5: Fase 6; D8: Fase 7).

### Fase 2 (Casca do Hub)
- Entrada: Fase 0 (G1) e Fase 1 aprovadas; URLs de C1; D2 e D3 (fontes locais) decididas; ADR de T-201 que registra a aprovação de `solution-architecture.md` (C9); linha de base de regressão gerada (REG-02, REG-32, REG-61) **antes de qualquer mudança**; servidor local disponível; lista fechada de HUB-02 = 2 cartões ativos, CSV e SQL (C10.2).
- Execução: HUB-*, REG-* completo, RSP-*, A11-* em cada página, PRV-01/06/07/08.
- Saída: todos os P0 "Executado: passou"; REG-01 vazio (ou aprovação explícita registrada); Lighthouse acessibilidade >= 90; HUB-41 em subpasta passou; revisão de privacidade (T-209) com a lista de recursos externos; nenhum bug P0/P1 aberto (P1 só com exceção escrita).

### Fase 3 (CSV + SQL)
- Entrada: Fase 2 aprovada; D3 (sql.js, Papa Parse) decidida; `hub/assets/vendor/` com versão e licença (T-301); fixtures e `expected.json` criados e revisados; Chrome, Edge e Firefox (duas últimas versões, Playwright) instalados ou limitação registrada. WebKit opcional (best effort).
- Saída: CSV-* e SQL-* P0 (inclui Worker, CSV-53, SQL-32 e SQL-33, C10.1) passam em Chrome, Edge e Firefox (cada um com estado explícito; "Não executado (motivo)" se o navegador não puder ser instalado); PRV-01 a PRV-10 passam; CSV-51/SQL-18 (limite de 10 MB) medidos com Performance API; CSV-51b/SQL-18b (50 MB) registrados como exploratórios, sem reprovar; WebKit/Safari informativo, fora dos critérios; regressão da Fase 2 reexecutada; A11-* nas páginas novas; regressão do portfólio REG-01.

### Fases 4 a 7
- Entrada de cada fase: fase anterior aprovada, critérios de aceite do backlog corrigidos pelo PM quando apontados na seção 7, casos detalhados criados (seção 3.4). Fases 4 a 7 estão fora do MVP (C6); a numeração é a de C2.
- Saída: casos P0 passam, PRV-14/15/16 conforme a fase, T-701 (Lighthouse >= 90 em acessibilidade e melhores práticas como indicador complementar, C7, em todas as páginas; AA por cálculo), links verificados (T-502), teste em URL real do Pages antes do release (T-704), portfólio intacto, nenhum push direto em `main`.

---

## 7. Critérios de aceite do backlog: situação após a reconciliação (C1 a C10)

Esta seção não edita o backlog. Conferida em 2026-11-12 lendo `docs/roadmap/backlog.md` (que outros agentes ainda editam; reconferir antes do G1). Estado de cada um dos 29 itens: **corrigido em T-xxx** (o critério do backlog agora é verificável como escrito) ou **aberto** (ainda ambíguo ou incoerente com C10). Item aberto: o QA registra "Não executado (motivo: critério ambíguo)".

| # | Tarefa / requisito | Problema original | Estado |
|---|---|---|---|
| 1 | T-310, RNF-09 | Safari/WebKit não é testável aqui | **Corrigido em T-310** (Chrome, Edge, Firefox via Playwright; Safari best effort). RNF-09 do PRD não relido |
| 2 | T-310, PRD "offline" | Sem Service Worker, recarregar offline não é garantido | **Corrigido em T-310** (rede cortada com a aba aberta; sem Service Worker). PRV-11 deve seguir isso |
| 3 | T-306 | "Não congela > 1 s": método e arquivo; agora Worker é MVP (C10.1) | **Corrigido em T-306** [MVP]: (a) 10 MB como critério com `limit-10mb.csv`, (b) 50 MB só registro; Cancelar e SQL-32/33 P0 (conferido no backlog em 2026-11-12) |
| 4 | RNF-05 | "Notebook comum" subjetivo | **Corrigido no PRD** (RNF-05: 10 MB, `PerformanceObserver`, Chrome headless sem throttling); regra de teste em CSV-51/SQL-18 |
| 5 | RNF-04 vs arquitetura 3.2 | 300 KB vs 150 KB | **Corrigido em T-209**: cita 150 KB (shell) e 120 KB (fontes), verificável por HUB-40 (C3) |
| 6 | T-205 | Exceções e dono do script | **Corrigido em T-205** |
| 7 | T-203 | Lista fechada de cartões | **Corrigido em T-203**: 2 cartões ativos (CSV, SQL), sem Apoie/PIX (C10.2) |
| 8 | T-201, T-207, RF-17 | Rota inexistente sem roteador | **Corrigido em T-207** (C4) |
| 9 | URLs divergentes | UX, arquitetura e backlog | **Corrigido em T-201** e no bloco "Caminhos (C1)" do backlog |
| 10 | T-208 | "Como antes" sem linha de base | **Corrigido em T-210** (T-208 depende dela) |
| 11 | T-208, T-701, RNF-06 | Lighthouse sem parâmetros | **Corrigido em T-208 e T-701** (indicador, mobile, mediana de 3). A versão `13.6.0` do backlog veio só do registro npm: segue "a fixar após verificação" (2.1) |
| 12 | T-206 | "Contraste AA" sem ferramenta | **Corrigido em T-206** (cálculo, tabela 10.2 do hub-ux.md, que ainda está em criação) |
| 13 | T-302 | Delimitadores, codificações, "legível" | **Corrigido em T-302**: inclui CSV-14/15 com `bom.csv` e `latin1.csv` |
| 14 | T-303 | "Conferidos manualmente" | **Corrigido em T-303** |
| 15 | T-304 | "Sem quebrar a página" | **Corrigido em T-304** |
| 16 | T-305 | Regras de saneamento | **Corrigido em T-305** |
| 17 | T-309 | Roteiro de teclado | **Corrigido em T-309** (CSV-05, SQL-51) |
| 18 | T-209, T-310, RNF-02 | Origem externa vs dado do usuário | **Corrigido em T-209 e T-310** (PRV-01 a PRV-05, canário) |
| 19 | T-201, T-401, T-601 | Aprovação do Lucas não testável | **Corrigido em T-201 e T-401** e na regra de governança do cabeçalho; T-601 ainda mistura registro e aprovação, tratado como governança |
| 20 | T-204 | Duas saídas | **Corrigido em T-204** |
| 21 | T-602 | QR lido por app real | **Corrigido em T-602** |
| 22 | T-502 | "Sem link quebrado" | **Corrigido em T-502** |
| 23 | T-402 | "Ou limite documentado" | **Corrigido em T-402** |
| 24 | T-703 | Pré-visualização | **Corrigido em T-703** |
| 25 | RNF-11, RNF-12 | Pages real exige deploy | **Corrigido em T-213** |
| 26 | RNF-03 | "Confirmar com Lucas" | **Registrado como suposição** no PRD e no backlog (pergunta 14 do roadmap): PRV-06 e PRV-08 só viram P0 definitivos após a confirmação. **Pendente de resposta do Lucas**, não é erro de documento |
| 27 | T-801 a T-807 | Conflito com "zero diff" | **Corrigido em T-211** e no cabeçalho da trilha paralela |
| 28 | T-307 | Regra de comparação | **Corrigido em T-307** |
| 29 | T-310, T-311 | Nome `big-10mb.csv` e lista de fixtures (C10.4) | **Corrigido em T-310/T-311**: nome canônico `limit-10mb.csv`; T-311 aponta para a lista da seção 3.2 |

Contagem atual (conferida no backlog em 2026-11-12): 28 corrigidos e 1 pendente de resposta do Lucas (item 26, RNF-03). T-208 já usa 360 px (L3 fechado).

### 7.1 Pontos de atenção que não são critérios, mas afetam os testes

- A numeração de fases é a de C2 (Fase 3 = CSV e depois SQL; 4 = Python; 5 = cursos e recursos; 6 = PIX; 7 = endurecimento). Documentos que divergirem devem ser alinhados.
- O README ainda promete que "basta abrir o index.html"; o Hub não funciona em `file://`. Registrar como divergência de documentação, não como falha do portfólio (REG-10 mantém o comportamento do portfólio).
- `certificacoes.html` tem lógica de tema própria (linha 642), diferente de `app.js`; a regressão cobre as duas.

---

## 8. Formato do relatório de execução

O relatório de cada rodada fica em `docs/testing/execution-report-<fase>-<AAAA-MM-DD>.md`. Estrutura obrigatória:

```
# Relatório de execução: <fase>, <data>
Commit testado: <sha>   Branch: <branch>   Executor: QA
Ambiente: SO, Chrome <versão>, Playwright <versão>, Node <versão>, servidor (<comando>), URL base
Navegadores (critério, C6): Chrome <v, v-1> / Edge <v, v-1> / Firefox <v, v-1>, cada um com estado. Informativo (fora dos critérios): WebKit(Playwright) <v> / Safari real (Lucas)

## Resumo
Planejado: N | Executado: passou: N | Executado: falhou: N | Não executado: N
Bugs abertos: P0 n, P1 n, P2 n   |   Status de aceite: Aprovado / Aprovado com ressalvas / Reprovado

## Resultados
| ID do caso | Estado | Evidência | Bug |
|---|---|---|---|
| CSV-10 | Executado: passou | ver bloco E-12 | |
| CSV-51 | Executado: falhou | bloco E-13 | BUG-007 |
| SQL-27 | Não executado (Edge não instalado no ambiente) | | |
| A11-14 | Planejado | | |

## Evidências
E-12: comando executado e saída colada (texto), ou caminho de captura.

## Ambiente: o que NÃO pôde ser testado
(lista com motivo)

## Pendências e decisões abertas
```

### 8.1 Estados (definições)

| Estado | Quando usar | Exige |
|---|---|---|
| **Planejado** | Caso definido e ainda não rodado | nada |
| **Executado: passou** | Rodou, o resultado coincide com o esperado | comando/passos e saída colada ou captura; commit testado |
| **Executado: falhou** | Rodou, o resultado difere | evidência + ID de bug aberto |
| **Não executado (motivo)** | Não foi possível ou não faz sentido rodar | motivo explícito (ambiente, dependência, critério ambíguo, decisão pendente) |

Regras: nunca usar "passou" por inferência ou leitura de código; um caso parcialmente executado vira "Executado: falhou" ou "Não executado" no trecho que faltou, com o subcaso separado; nada de "N/A" sem motivo; verificação humana (portões do Lucas) é listada em seção própria, fora da contagem do QA.

### 8.2 Modelo de relatório de bug (`docs/testing/bugs/BUG-<nnn>.md`)

```
# BUG-<nnn>: <título curto>
Severidade: P0/P1/P2   Tarefa de origem: T-xxx   Caso: <ID>   Dono sugerido: <agente>
Commit: <sha>   Ambiente: <navegador, viewport, idioma, tema>
Passos para reproduzir: 1... 2... 3...
Esperado:   Obtido:
Evidência: <comando e saída | captura>
Observações: <frequência, workaround>
Estado: Aberto / Corrigido, aguardando reteste / Fechado (reteste: caso <ID> Executado: passou)
```

### 8.3 Status de aceite

Por tarefa [MVP]: `T-xxx` -> casos vinculados -> estados -> decisão (`Aceita` apenas se todos os P0 vinculados estão "Executado: passou" e não há critério ambíguo pendente). Tarefa com caso "Não executado" nunca é `Aceita`; fica `Aceita com ressalva` somente com aprovação escrita do Lucas.
