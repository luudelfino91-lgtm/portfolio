# Relatório de execução: Fase 2 (casca do Hub)

Data: 2026-11-12 · Autor: QA Engineer (execução independente do desenvolvedor) · Branch `feat/phase-2-hub-shell`, commit `efc26c4` · Nenhum arquivo de produto (`hub/`, `index.html`, `certificacoes.html`, `assets/`) foi alterado pelo QA. Arquivos criados: `tests/hub/*` e `docs/testing/baseline.sha256`.

Estados: Executado: passou · Executado: falhou · Não executado (motivo).

## 1. Ambiente e método (executado)

| Item | Valor |
|---|---|
| Navegador | Google Chrome for Testing 153 (`/usr/bin/google-chrome`) via Playwright 1.63 (Node, `/opt/npm-tools/node_modules/playwright`), `--no-sandbox` |
| Servidores | `python3 -m http.server 8081 -d <repo>` (raiz) e `python3 -m http.server 8082 -d /tmp/site` com `/tmp/site/portfolio -> <repo>` (subpasta `/portfolio/`); proxy local com gzip na 8083 só para o orçamento de peso |
| axe-core | 4.14.0 (`cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz`), injetado com `page.evaluate(axeSrc)` (a CSP do Hub bloqueia `<script>` inline, então não se usa `add_script_tag`) |
| Comando geral | `tests/hub/run-all.sh` (saídas em `/tmp/hub-<script>.log`) |

Resultado do `run-all.sh` (saída colada):

```
=== reg ===                  PASS: 15  FAIL: 0
=== shell ===                PASS: 6   FAIL: 0
=== i18n_theme_privacy ===   PASS: 26  FAIL: 0
=== a11y ===                 PASS: 14  FAIL: 1   (A11-02 axe: 40 de 40 combinações com violação serious)
=== budget_file ===          PASS: 5   FAIL: 0
```

Totais: 66 verificações passaram, 1 falhou (BUG-01). Os scripts são `reg.js`, `shell.js`, `i18n_theme_privacy.js`, `a11y.js`, `budget_file.js`, `lib.js`, `csp-probe.js`, `ux-pairs.json` (48 linhas da tabela 10.2 extraídas de `hub-ux.md`), todos em `/home/claude/portfolio/tests/hub/`.

## 2. Bugs

| ID | Severidade | Caso | Descrição e evidência | Dono |
|---|---|---|---|---|
| BUG-01 | Média (bloqueia A11-02, que é P0; WCAG 2.5.3 Label in Name) | A11-02 | Em todas as 5 páginas do Hub, o link da marca tem `aria-label="Data & AI Hub, home"` (PT: "Hub de dados e IA, início"), mas o texto visível é "Lucas Delfino data & ai hub". O texto visível não faz parte do nome acessível; usuários de controle por voz dizendo "Lucas Delfino" não ativam o link. axe 4.14.0: `label-content-name-mismatch [serious] x1 [".brand"]` em 40/40 combinações (5 páginas x EN/PT x claro/escuro x 360/1280). Mensagem do axe: "Text inside the element is not included in the accessible name". Correção sugerida (para o dono): o nome acessível deve conter "Lucas Delfino" (ex.: "Lucas Delfino, Data & AI Hub, home"). Observação: o `index.html` usa o padrão `aria-label="Lucas Delfino, home"`, que contém o texto visível. | frontend-developer |
| BUG-02 | Baixa | A11-06 / RSP-02 | Menu móvel (360 px): o painel `#links` está antes dos botões no DOM. Depois de abrir o menu pelo `#menuBtn`, `Tab` não entra no painel; vai para o conteúdo (`A href=ferramentas/ dentroDoMenu=false`). Os itens do menu só são alcançados com `Shift+Tab`. Funciona (abrir, Esc fecha e devolve o foco ao botão, clique fora fecha), mas a ordem de foco é contraintuitiva. Os mesmos links existem no rodapé, então nada fica inacessível. | frontend-developer |

Observações (não são bugs de requisito, a decisão cabe ao design):
- O1: bordas de controles e cartões abaixo de 3:1 (`.icon-btn` 1,24 a 1,29; `.btn-ghost` 1,52 a 1,61; `.hub-card` 1,25 a 1,32; `.chip` 1,23 a 1,30). Esses controles têm texto ou ícone com contraste alto (ícones 15,3 a 18,0), então a WCAG 1.4.11 não exige a borda. A linha 19 da tabela 10.2 já avisa que `--line-strong` não serve de borda de controle. Registrado como informativo.
- O2: o texto em gradiente `.grad` do h1 no tema claro tem razão mínima de 3,35 contra o fundo (passa só como texto grande, limiar 3). Sem margem.
- O3: axe lista `color-contrast` como "incomplete" (revisão manual) em `.mark > span` (LD sobre o selo do portfólio), `.grad` (gradiente) e `.hub-go` (seta `aria-hidden`). Os dois primeiros foram cobertos pelo cálculo próprio (seção 6); `.mark` é componente do portfólio com texto branco sobre `--midnight`.

## 3. REG: portfólio (T-210, REG-01, REG-10, REG-11, REG-40, REG-70)

Comando: `node tests/hub/reg.js` (saída resumida; íntegra reproduzível).

| ID | Resultado | Evidência |
|---|---|---|
| REG-03 / REG-12 / REG-24, `index.html` e `certificacoes.html`, EN/PT x claro/escuro (8 combinações) | Executado: passou | 8 x `PASS`: status 200, zero `pageerror`, zero `console.error`, `lang` = `en`/`pt-BR`, `data-theme` correto, nenhuma chave crua. Único host externo: `fonts.googleapis.com` (esperado; o portfólio mantém Google Fonts, seção 1.1 do plano) |
| REG-40 rota `#/case/<slug>`, 9 slugs, com reload, EN/PT x claro/escuro | Executado: passou | 4 x `PASS REG case x9`: `#case` visível, `#home` com `hidden`, título presente, sem `pageerror` |
| REG case em 360 px sem rolagem horizontal | Executado: passou | `scrollWidth<=innerWidth=true` |
| REG-01 / T-210: diff fora de `docs/`, `hub/`, `.claude/` vazio | Executado: passou | `git diff --name-only origin/main...HEAD` retornou 39 arquivos, todos em `docs/`, `hub/`, `.claude/`; fora do escopo: `[]`. Também `git diff --stat origin/main...HEAD -- index.html certificacoes.html assets/ \| wc -l` = 0 |
| REG-02 baseline de hashes | Executado: passou | Criado `docs/testing/baseline.sha256` (7 arquivos: `index.html`, `certificacoes.html`, `assets/css/*`, `assets/js/*`); `sha256sum -c` = 7 OK; `index.html`, `certificacoes.html`, `styles.css`, `app.js` idênticos aos de `origin/main` por `git show origin/main:<arq> \| sha256sum`. Observação: o baseline foi gerado depois do commit da Fase 2, mas como o diff do portfólio é vazio ele equivale ao estado de `origin/main` |
| REG-10 / REG-11 via `file://` | Executado: passou | `pageerrors=[]` nas duas páginas |
| REG-70 portfólio não pede nem linka `/hub/` | Executado: passou | `hubReq=[] hubLinks=[]` |
| REG-14, 15, 20 a 23, 30 a 33 (exceto os de cima), 41 a 45, 50 a 52, 60, 61 | Não executado (escopo desta rodada: linha de base mínima pedida; REG-32 capturas e REG-61 Lighthouse não feitas) | |

## 4. Casca do Hub: matriz de páginas (HUB-01, HUB-04, HUB-41, HUB-43, RSP-01, A11-04, PRV-01)

Comando: `node tests/hub/shell.js`.

| ID | Resultado | Evidência |
|---|---|---|
| HUB-01, RSP-01, A11-04, PRV-01 em `/` | Executado: passou | 60 combinações (5 páginas x EN/PT x claro/escuro x 360/768/1280): status 200, zero `pageerror`, zero `console.error` (inclui violações de CSP, que o Chrome registra como erro), zero requisição fora da origem, zero resposta >= 400, `scrollWidth - innerWidth <= 0`, `<html lang>` = `en`/`pt-BR`, `data-theme` = tema semeado, 1 `h1` |
| HUB-41 em `/portfolio/` | Executado: passou | Mesmas 60 combinações em `http://127.0.0.1:8082/portfolio/`: zero falha |
| Links e recursos relativos sem 404 | Executado: passou | `12 URLs unicas verificadas; defeitos=[]; caminhos absolutos iniciados em '/'=[]` em `/` e em `/portfolio/` (rastreio de todo `a[href]`, `link[href]`, `script[src]`, `img[src]` das 5 páginas) |
| HUB-04 / T-204 link Portfólio | Executado: passou | Cada página termina na raiz: `hub/ -> href=../ -> http://127.0.0.1:8081/` ... `hub/ferramentas/csv/ -> ../../../ -> .../`; em subpasta: `-> http://127.0.0.1:8082/portfolio/`; título "Lucas Delfino · Business Intelligence Analyst" |
| HUB-43 fontes locais | Executado: passou | 4 woff2 pedidos de `/hub/assets/fonts/`; zero `googleapis`/`gstatic` |
| HUB-05 abrir o Hub por URL direta | Executado: passou | Toda a matriz abre por URL direta |

Todas as URLs requisitadas (origem de teste = `<ROOT>`, contagem sobre as 120 cargas da matriz; páginas HTML contadas 24 vezes cada):

```
 120 <ROOT>/assets/css/styles.css
 120 <ROOT>/assets/img/favicon.svg
 120 <ROOT>/hub/assets/css/hub.css
 120 <ROOT>/hub/assets/fonts/bricolage-grotesque-latin-wght-normal.woff2
 120 <ROOT>/hub/assets/fonts/figtree-latin-wght-normal.woff2
 120 <ROOT>/hub/assets/fonts/jetbrains-mono-latin-400-normal.woff2
 120 <ROOT>/hub/assets/fonts/jetbrains-mono-latin-500-normal.woff2
 120 <ROOT>/hub/assets/js/i18n.js
 120 <ROOT>/hub/assets/js/nav.js
 120 <ROOT>/hub/assets/js/theme.js
  24 <ROOT>/hub/   ·  24 <ROOT>/hub/ferramentas/  ·  24 <ROOT>/hub/ferramentas/csv/
  24 <ROOT>/hub/ferramentas/sql/  ·  24 <ROOT>/hub/privacidade/
```

Nenhuma URL externa.

## 5. i18n, tema, privacidade e CSP

Comando: `node tests/hub/i18n_theme_privacy.js` (26 PASS).

| ID | Resultado | Evidência |
|---|---|---|
| HUB-10 sem chave crua em PT (texto, `aria-label`, `title`) | Executado: passou | zero `hub.*` visível nas 5 páginas; títulos PT reais ("Ferramentas · ...", "Visualizador de CSV · ...") |
| HUB-15 / T-205 conjuntos de chaves | Executado: passou | `chaves usadas=61, EN=61, PT=61; faltam EN=[] PT=[]; EN sem PT=[]; PT sem EN=[]; nao usadas=[]` |
| HUB-15 verificador detecta chave PT removida | Executado: passou, com ressalva | Remoção em memória de `hub.nav.tools` é detectada. Ressalva: o verificador está embutido em `i18n_theme_privacy.js`, não existe CLI dedicado com código de saída != 0 sobre fixture em arquivo, que o T-205 pede em `docs/testing/`. Entrega do T-205 considerada parcial |
| HUB-11 persistência `ld-lang` | Executado: passou | `ld-lang=pt; apos reload lang=pt-BR` |
| Troca de idioma atualiza `aria-label`, `meta description` e rótulo do botão de tema | Executado: passou | "Data & AI Hub, home" -> "Hub de dados e IA, início"; "Main" -> "Principal"; "Language" -> "Idioma"; "Dark theme" -> "Tema escuro"; `aria-pressed` `false,true`. "Menu" e o título da home são idênticos nos dois idiomas (nome próprio e cognato) |
| HUB-13 valor inválido ignorado, `?lang=` | Executado: passou | `ld-lang=fr` e `ld-lang=<script>...` -> `lang=en`; `?lang=pt` vence `ld-lang=en`; `?lang=<script>` e `?lang=zz` ignorados; nenhum `dialog` |
| HUB-50 hash `<img onerror>` | Executado: passou | `img[src=x] no DOM=0` |
| HUB-14 `localStorage` bloqueado (getter lança `SecurityError`) | Executado: passou | Tema e idioma ainda alternam na sessão; `pageerrors=[]`, `consoleErrors=[]` |
| HUB-20 sem preferência segue `prefers-color-scheme` | Executado: passou | `dark`->`dark`, `light`->`light`. Ressalva: "antes do primeiro paint" não foi provado por captura de quadro; o `theme.js` é síncrono no `<head>` (leitura de código) |
| HUB-21 `ld-theme` persiste | Executado: passou | clique -> `dark,dark,true`; reload=dark; outra página do Hub=dark; portfólio=dark. Valores inválidos `blue`, `""`, `DARK`, `<script>` ignorados (`data-theme=light`) |
| PRV-06 nenhum cookie | Executado: passou | `context.cookies()=[]; document.cookie=""` |
| PRV-07 armazenamento | Executado: passou | `chaves=["ld-lang","ld-theme"]; indexedDB=0; caches=0` (sem `sessionStorage`) |
| PRV-01 zero googleapis/gstatic | Executado: passou | 110 requisições; `externas=[]` |
| PRV-08 / HUB-02 (parcial) | Executado: passou | sem `<iframe`, `googletagmanager`, `gtag(`, `fbq(`, `src` com analytics; sem `pix`, `apoie`, `support` no HTML (a palavra "analytics" aparece só na frase da página de privacidade que nega seu uso) |
| PRV-13 CSP presente | Executado: passou | Em 5/5 páginas: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'` |
| PRV-13 CSP bloqueia | Executado: passou | Página de sonda servida por rota do Playwright com a CSP real lida de `hub/index.html`: `{"inlineScript":"bloqueado","inlineHandler":"bloqueado","eval":"bloqueado","fn":"bloqueado"}` e console "Loading the image 'https://example.com/a.png' violates ... img-src". Nota de método: `eval` chamado de dentro de `page.evaluate` não é bloqueado (contexto de automação), por isso a sonda usa script externo same-origin (`tests/hub/csp-probe.js`) |
| HUB-23 cores fixas | Executado: passou | `grep -noE '#[0-9a-fA-F]{3,8}\b\|rgb\('` em `hub/`: só 7 valores em `hub.css` linhas 16 a 22, todos os tokens `--err`, `--warn`, `--hub-ink-3`, `--focus-dark` da tabela 10.2 |
| HUB-24 | Executado: passou | diff de `assets/` vazio (seção 3) |
| HUB-12 idioma compartilhado portfólio -> Hub | Não executado (só o tema foi testado nos dois sentidos; o idioma foi testado entre páginas do Hub) | |
| HUB-03, HUB-06, HUB-16, HUB-30, HUB-31 | Não executado (não se aplicam à casca: sem cartões "Em breve", sem link no portfólio, sem mensagem dinâmica, sem estado por hash) | |

## 6. Acessibilidade

Comando: `node tests/hub/a11y.js`.

| ID | Resultado | Evidência |
|---|---|---|
| A11-02 axe-core 4.14.0 (tags wcag2a, 2aa, 21a, 21aa, 22aa, best-practice), 40 combinações | Executado: falhou | Única violação: `label-content-name-mismatch [serious]` no `.brand` em 40/40 (BUG-01). Nenhuma outra violação em qualquer impacto; zero `color-contrast`. "incomplete" listado na observação O3 |
| A11-05 link de pular | Executado: passou | 5 páginas: primeiro `Tab` = `a[#main]`, visível ao receber foco, Enter -> `#main` com foco em `main` |
| A11-06 / A11-07 teclado e foco visível | Executado: passou | Tab percorre todos os focáveis (14 a 17 por página, ciclo único 15 a 18 elementos distintos, identificados por marca de elemento); todos com `:focus-visible` e anel (outline ou `::after` nos cartões); ordem registrada por página no log |
| RSP-02 / A11-06 menu móvel 360 px | Executado: passou, com BUG-02 | fechado de início; clique abre (`aria-expanded=true`); `Esc` fecha e devolve foco a `menuBtn`; clique fora fecha. 1280 px: menu inline visível e botão oculto |
| RSP-03 alvos de toque 360 px | Executado: passou | Botões, idioma, tema, menu e botões de CTA >= 44 px (`min-height:var(--tap)`); links de cartão têm 24 px de altura de texto, mas o cartão inteiro é o alvo: clique no canto inferior direito (cartão 320x227) navega (`navega=true`); links em texto corrido isentos (WCAG 2.5.8) |
| A11-12 reduced-motion | Executado: passou | animações infinitas em execução = 0 |
| A11-10 / HUB-22 contraste computado | Executado: passou | Script `contrastProbe` em `a11y.js`: `getComputedStyle` + canvas para normalizar cores (inclui `color-mix`), fundo efetivo subindo na árvore compondo alfa, fórmula WCAG; 968 pares avaliados (todas as páginas, claro/escuro, EN/PT, 360/1280, com menu aberto em 360). Falhas de texto e de ícone: 0. Pior texto: claro `small.brand` `#6E677D` sobre `#FEFEFF` = 5,36; escuro `.lang button` `#8F869B` sobre `#1A1622` = 5,12. Ícones: >= 15,3. Gradiente do h1: mínimo 3,35 (claro, texto grande, limiar 3) e 7,75 (escuro). Bordas: observação O1 |
| A11-10 tabela 10.2 do `hub-ux.md` reconferida | Executado: passou | 48 linhas x 2 temas recalculadas com a fórmula: zero divergência > 0,05 contra os valores do documento. Os pares marcados como falha esperada (#8, #10 claro, #19, #42 claro, #43, #48 claro) falham mesmo, como o documento diz, e a medição real do Hub não usa nenhum deles |
| HUB-44 (parcial) / HUB-45 | Executado: passou | 1 `h1`, 1 `main`, 1 `header`, 1 `footer`, zero `id` duplicado nas 5 páginas; rótulos de navegação iguais em todas ("Tools", "Privacy", "Portfolio ↗") |
| HUB-02 | Executado: passou | exatamente 2 cartões: `["ferramentas/csv/","ferramentas/sql/"]` |
| A11-01 Lighthouse (>= 90) | Não executado (Lighthouse não instalado; não tentado nesta rodada) | |
| A11-14 leitor de tela real | Não executado (indisponível no ambiente) | |
| A11-09, A11-11, A11-13, A11-15 | Não executado (sem estados dinâmicos, tabelas ou links externos na casca) | |
| HUB-44 validador HTML completo | Não executado (nenhum validador instalado, como no plano 2.1) | |
| RSP-11 capturas e revisão visual; zoom 200%/400%; paisagem | Não executado (não feitos; só verificações programáticas) | |

## 7. Orçamento HUB-40 e `file://`

Comando: `node tests/hub/budget_file.js` (gzip nível 9 por proxy local na 8083, cache desligado via CDP, `encodedDataLength`; HTML, CSS e JS próprios e `styles.css` do portfólio contam; woff2 e favicon ficam fora).

| ID | Resultado | Evidência |
|---|---|---|
| HUB-40 shell <= 150 KB | Executado: passou | Maior página (`hub/privacidade/`) = 15,6 KB; `hub/` 15,5; `ferramentas/` 15,3; `csv/` e `sql/` 15,2. Composição de `hub/`: HTML 2082 B, `styles.css` 5851 B, `hub.css` 2471 B, `theme.js` 907 B, `i18n.js` 3980 B, `nav.js` 588 B |
| HUB-40 / RNF-14 fontes <= 120 KB | Executado: passou | 4 woff2 em disco = 104.500 B = 102,1 KB; carregado por página = 102,6 KB (com cabeçalhos) |
| HUB-42 `file://` | Executado: passou | `hub/index.html` abre, h1 presente, 4 fontes carregadas, PT e tema alternam, link relativo vai para `file:///.../hub/privacidade/`; `pageerrors=[]`, `consoleErrors=[]`, `falhas=[]` |
| Servir em `/portfolio/` | Executado: passou | seção 4 |

Observação: o servidor da matriz (`python3 -m http.server`) não comprime; os bytes de gzip vêm do proxy local. O Pages real pode comprimir de forma diferente (T-213 não executado).

## 8. Navegadores e itens não executados

| Item | Estado |
|---|---|
| Chrome 153 | Executado (todas as seções acima) |
| Chrome versão anterior (duas últimas versões, C6) | Não executado (apenas uma versão instalada) |
| Firefox | Não executado (motivo): `npx playwright install firefox` falhou: `Failed to download Firefox 155.0 ... Download failure`; o proxy recusou `cdn.playwright.dev` e `playwright.download.prss.microsoft.com` (`connect_rejected`) |
| Edge | Não executado (motivo): não instalado, mesma restrição de download |
| Safari/WebKit | Não executado (motivo): indisponível, best effort fora dos critérios |
| T-213 (deploy em URL real do GitHub Pages) | Não executado (exige deploy; depende do tech-lead) |
| T-208: Lighthouse (3 execuções, mediana), REG-32 capturas, REG-61 notas | Não executado (motivo: ferramenta não instalada e fora do tempo desta rodada) |
| T-212 | Executado como página (`hub/privacidade/` está na matriz): sem erro, PT/EN sem chave faltante, só chaves `ld-lang`/`ld-theme`, zero cookies. Conferência literal do texto "chaves `hub-*`" não feita |

## 9. Status de aceite (T-208)

Não aceito ainda: o critério A11-02 (P0) falhou por causa de BUG-01. Todos os demais critérios executados da casca passaram. Pendentes de execução antes de fechar T-208: Lighthouse, capturas (REG-32, RSP-11), Firefox e Edge, T-213. Decisão de saída de fase é do tech-lead e do portão humano, não do QA.
