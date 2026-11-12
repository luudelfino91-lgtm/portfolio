# Relatório de execução: Fase 2 (casca do Hub), versão final

Data: 2026-11-12 · Autor: QA Engineer · Branch `feat/phase-2-hub-shell`.

## 0. Estado em que a suíte rodou

- `HEAD` = `e63e958` ("fix(hub): nome acessivel da marca e ordem de foco do menu; testes e revisoes da Fase 2"). A saída de `git rev-parse --short HEAD` foi `e63e958`.
- Working tree NÃO estava limpo. Alterações não commitadas (`git status --porcelain`):
  - `hub/` (8 arquivos, feitas pelo desenvolvedor, não pelo QA: `hub/index.html` e as outras 4 páginas passaram `i18n.js` e `nav.js` para `<script ... defer>` no `<head>`; `hub.css` (-1 linha); `hub/README.md` e `hub/assets/fonts/README.md` com texto novo). Os resultados abaixo valem para este `HEAD` + estas alterações; elas precisam ser commitadas para o resultado valer para um commit.
  - Arquivos do QA: `tests/hub/{a11y,budget_file,i18n_theme_privacy,lib,reg}.js`, `tests/hub/run-all.sh`, `tests/hub/scope.js` (novo), `docs/testing/check-i18n-keys.js` (novo), `docs/testing/fixtures-i18n/` (novo), este relatório.
- Prova de que o portfólio não mudou: `git diff --stat origin/main...HEAD -- index.html certificacoes.html assets/ README.md CHANGELOG.md | wc -l` = 0; `git status --porcelain -- index.html certificacoes.html assets README.md CHANGELOG.md | wc -l` = 0.
- `docs/testing/baseline.sha256` (7 hashes, `sha256sum -c` = todos OK) foi gerada DEPOIS do commit da Fase 2. Ela não é um instantâneo "antes de qualquer mudança"; a prova de que o portfólio não mudou é o `git diff` acima, contra `origin/main`.
- Ambiente: Google Chrome 153 via Playwright 1.63, axe-core 4.14.0, `python3 -m http.server`. Caminhos configuráveis por `CHROME_PATH`, `AXE_PATH`, `PORT_ROOT` (8081), `PORT_SUB` (8082), `PORT_GZ` (8083), `SITE_DIR`; o `run-all.sh` cria e remove sozinho o diretório temporário com o symlink `portfolio/` (verificado: nenhum `hub-site-*` restou em `/tmp`).

## 1. Resultado da suíte (`bash tests/hub/run-all.sh`, saída real)

```
=== reg ===                 exit=0  PASS: 16  FAIL: 0  N/A: 0
=== shell ===               exit=0  PASS: 6   FAIL: 0  N/A: 0
=== i18n_theme_privacy ===  exit=0  PASS: 26  FAIL: 0  N/A: 1
=== a11y ===                exit=0  PASS: 15  FAIL: 0  N/A: 0
=== budget_file ===         exit=0  PASS: 5   FAIL: 0  N/A: 0
=== check-i18n-keys (Hub real) ===  exit=0
RUNALL_EXIT=0
```

Totais: 68 PASS, 0 FAIL, 1 Não aplicável. Código de saída do `run-all.sh`: 0.

## 2. Verificador de chaves i18n (A4 / T-205)

`docs/testing/check-i18n-keys.js` (CLI; dono qa-engineer). Carrega o dicionário com o módulo `vm` num contexto vazio, sem `eval` e sem regex sobre o formato: um leitor de chaves que respeita strings e comentários delimita o literal. Limitação: `DICT` é variável privada da IIFE de `hub/assets/js/i18n.js`, então a âncora textual `var DICT =` é necessária. Proposta ao desenvolvedor (não editei `hub/`): expor o dicionário como dado (`hub/assets/js/i18n-dict.json` ou `Hub.dict`), o que dispensa a âncora.

Fixtures em arquivo: `docs/testing/fixtures-i18n/{page.html, i18n-ok.js, i18n-missing-pt.js}` (a segunda sem `hub.nav.tools` em PT; a string EN do controle contém `}` para provar o leitor).

```
$ node docs/testing/check-i18n-keys.js --i18n docs/testing/fixtures-i18n/i18n-missing-pt.js --html docs/testing/fixtures-i18n/page.html
usadas sem PT: ["hub.nav.tools"] | EN sem PT: ["hub.nav.tools"]
FAIL
exit=1
$ node docs/testing/check-i18n-keys.js --i18n .../i18n-ok.js --html .../page.html      -> PASS, exit=0
$ node docs/testing/check-i18n-keys.js        (Hub real)
chaves usadas=61 EN=61 PT=61 ... PASS
exit=0
```

`i18n_theme_privacy.js` agora chama esse CLI (e não mais um `eval` embutido) e afirma exit 1 na fixture e 0 no controle e no Hub real.

## 3. Bugs

| ID | Estado | Descrição, correção e reteste |
|---|---|---|
| BUG-01 (a11y, WCAG 2.5.3, A11-02, P0) | Corrigido e retestado | Antes: `aria-label="Data & AI Hub, home"` não continha o texto visível "Lucas Delfino data & ai hub" (axe `label-content-name-mismatch [serious]` em 40/40). Correção do desenvolvedor: `aria-label` atual `Lucas Delfino data & ai hub` (PT: `Lucas Delfino hub de dados & ia`), em `hub/index.html` linha 21 e no dicionário. Reteste: `PASS A11-02 axe-core 4.14.0: zero serious/critical (40 combinacoes ...)`, "todas as violacoes (qualquer impacto)=nenhuma". |
| BUG-02 (foco, baixa, A11-06/RSP-02) | Corrigido e retestado | Antes: depois de abrir o menu móvel, `Tab` ia para o conteúdo, não para o painel. Reteste: `PASS RSP-02/A11-06 menu 360px ... Tab apos abrir leva a: dentro do menu` (abre, Esc fecha e devolve foco, clique fora fecha). |

Observações de design, sem mudança (informativas): O1 bordas de controles/cartões abaixo de 3:1 (texto e ícones têm contraste alto; WCAG 1.4.11 não exige a borda); O2 gradiente `.grad` no tema claro com mínimo 3,35 (passa só como texto grande); O3 axe lista `color-contrast` como "incomplete" em `.grad` e em setas `aria-hidden` (cobertos pelo cálculo próprio).

## 4. Casos executados

REG (`reg.js`, 16 PASS)
- `index.html` e `certificacoes.html`, EN/PT x claro/escuro (8): status 200, zero `pageerror`/`console.error`, `lang` e `data-theme` corretos, nenhuma chave crua. Único host externo: `fonts.googleapis.com` (esperado no portfólio).
- Rota `#/case/<slug>` x 9 slugs, com reload, EN/PT x claro/escuro (4) e 360 px sem rolagem horizontal (1).
- REG-01/T-210 (NOVO, reescrito): o escopo permitido agora é `docs/`, `hub/`, `tests/`, `.claude/`. A verificação (`tests/hub/scope.js`) une `git diff --name-only origin/main...HEAD` (commitado), `git diff --name-only HEAD` e `git status --porcelain --untracked-files=all` (working tree e não rastreados). Resultado: fora do escopo = `[]`, 56 arquivos alterados.
- REG-01 teste negativo (NOVO), em clone temporário (`git clone --no-hardlinks`, removido ao fim; o repositório real não é tocado): controle limpo e arquivo novo em `docs/` não acusam; alterar `index.html`, `certificacoes.html`, `assets/css/styles.css`, `README.md`, `CHANGELOG.md` no working tree acusa; arquivo não rastreado em `assets/` acusa; alteração de `index.html` COMMITADA acusa pelo diff `origin/main...HEAD`. 9 de 9 verdadeiros.
- REG-70: portfólio sem requisição nem link para `/hub/`. REG-10/11 (`file://`) em `budget_file.js`.

Casca (`shell.js`, 6 PASS): matriz 5 páginas x EN/PT x claro/escuro x 360/768/1280 em `/` e em `/portfolio/` (60 + 60 combinações: 200, zero erro de console/CSP, zero requisição externa, sem overflow horizontal, `lang`/`data-theme`, 1 `h1`); links e recursos relativos sem 404 em `/` e em `/portfolio/`; link "Portfólio" resolve para a raiz (`../` ... `../../../`; em subpasta, `/portfolio/`); fontes locais (zero `googleapis`/`gstatic`).

i18n, tema, privacidade e CSP (`i18n_theme_privacy.js`, 26 PASS, 1 N/A)
- HUB-10 (NOVO, asserção real): em PT, cada `[data-i]` tem exatamente o texto do dicionário PT e cada `data-ia` o atributo PT: `151 elementos/atributos comparados em 5 paginas; divergencias=[]`. Mais: nenhuma chave crua em PT; troca de idioma atualiza `aria-label`, `meta description`, botão de tema e `aria-pressed`.
- HUB-15 / T-205: verificador CLI (seção 2).
- HUB-11 persistência de `ld-lang`; HUB-13 valores inválidos e `?lang=` (incl. XSS) ignorados, sem `dialog`; HUB-14 `localStorage` bloqueado sem erro.
- HUB-20 (NOVO, asserção real): com `prefers-color-scheme` dark e light, um `addInitScript` registra `data-theme` no primeiro `requestAnimationFrame`, no `DOMContentLoaded` e em toda mutação do atributo. Saída: `{"final":"dark","raf":"dark","dcl":"dark","muts":[]}` e o equivalente `light`; nenhuma mutação, logo sem flash de tema oposto. Limite: não é captura de quadro de paint; é o melhor sinal programático.
- HUB-21 persistência de `ld-theme` (recarga, outra página, portfólio) e valores inválidos ignorados.
- HUB-50 hash: Não aplicável na Fase 2 (reclassificado; a casca não lê `location.hash`). Linha `N/A` no log, não conta como PASS. Reavaliar quando houver estado por hash.
- PRV-06 zero cookies; PRV-07 só `ld-lang`/`ld-theme`; PRV-01 zero requisição Google; PRV-08 sem iframe/analytics/pixel/PIX; PRV-13 CSP presente nas 5 páginas e bloqueia script inline, `onerror` inline, `eval`/`Function` e imagem externa (sonda `csp-probe.js`).

Acessibilidade (`a11y.js`, 15 PASS)
- A11-02 axe 4.14.0, 40 combinações: reexecutado, zero violações (BUG-01 corrigido).
- A11-05 link de pular; A11-06/07 teclado e foco visível; RSP-02 menu móvel (BUG-02 corrigido) e desktop; RSP-03 alvos de toque; A11-12 movimento reduzido; A11-10/HUB-22 contraste computado (968 pares, zero falha; tabela 10.2 do `hub-ux.md` reconferida, 48 linhas x 2 temas); HUB-44/45; HUB-02 (2 cartões).

Orçamento e `file://` (`budget_file.js`, 5 PASS): HUB-40 shell <= 150 KB com gzip (maior página 15,6 KB; gzip por proxy local, o Pages real pode diferir); fontes woff2 somam 102,1 KB (<= 120); HUB-42 `file://` (corrigida a precedência `a && b && c && d || e` com parênteses); REG-10/REG-11.

## 5. Não executado ou incompleto (sem simulação)

- T-213 (deploy em URL real do GitHub Pages): NÃO executado. Exige deploy; o Pages real só existe depois do merge e da aprovação do Lucas para produção. Nenhum resultado de Pages foi medido (inclui gzip e cabeçalhos reais).
- T-208 INCOMPLETO. Não executados: Lighthouse (A11-01, REG-61), capturas de tela (REG-32, RSP-11), Firefox (download do Playwright recusado pelo proxy), Edge (não instalado), Chrome da versão anterior (só uma instalada), Safari/WebKit, zoom 200% e 400%, paisagem, leitor de tela real (A11-14), validador HTML completo (HUB-44), HUB-12 (idioma compartilhado portfólio -> Hub, só entre páginas do Hub), REG-14/15/20 a 23/30 a 33/41 a 45/50 a 52/60. HUB-03/06/16/30/31 não se aplicam à casca.
- T-212 (privacidade): verificado só como página da matriz; a conferência literal do texto "chaves `hub-*`" não foi feita.

## 6. Status de aceite

Os critérios executados da casca passam (68 PASS, 0 FAIL, 1 N/A) e BUG-01/BUG-02 estão corrigidos e retestados, mas T-208 não está completo e T-213 não foi executado, então o QA NÃO declara aceite final da fase. Ressalva de rastreabilidade: o resultado vale para `e63e958` mais as 8 alterações não commitadas em `hub/`; recomenda-se commitá-las e rerodar `bash tests/hub/run-all.sh`. A decisão de saída de fase cabe ao tech-lead e ao portão humano.
