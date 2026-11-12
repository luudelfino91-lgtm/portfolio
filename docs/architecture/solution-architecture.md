# Solution Architecture: Data & AI Community Hub

Fase 1 (Architecture) · Branch `feat/phase-1-planning` · Data de referência: 2026-11-12
Autor: Solution Architect · Status: proposta, sujeita à aprovação do Lucas no portão G1 (reconciliada com `docs/decisions/phase-1-reconciliation.md`)

**Este é o documento arquitetural vinculante (M7).** Em divergência com outro documento de arquitetura, vale este; em divergência com `docs/decisions/phase-1-reconciliation.md` (C1 a C9), vale a reconciliação. O ADR de T-201 se resume a registrar a aprovação deste arquivo.

## 0. Como ler este documento

Cada afirmação factual carrega uma etiqueta de confiança:

| Etiqueta | Significado |
|---|---|
| **[C]** | Lido no código do repositório nesta sessão (arquivo e linha citados). |
| **[V]** | Lido nesta sessão em URL **primária** (documentação oficial do GitHub Pages; API do jsDelivr/npm do próprio pacote). Espelhos de terceiros nunca são [V]. |
| **[S]** | Suposição ou conhecimento não verificado em fonte primária nesta sessão. Precisa de teste ou confirmação antes de virar decisão. |

Decisões: **D1** (JS/HTML/CSS puros, sem build) e **D4** (Hub em `/hub/`, mesmo repositório, sem alterar páginas atuais) estão aprovadas. **D2** (GitHub Pages), **D3** (arquivos próprios vs CDN), **D5** (PIX estático) e **D8** (sem backend) estão **pendentes**. **Nenhuma rota, cabeçalho, URL ou custo deste documento trata D2 ou D3 como decidido**: todos assumem GitHub Pages e arquivos próprios como **suposição explícita [S]**. Se D2 mudar, as seções 3, 5 e 6 precisam ser revistas.

Limitação desta sessão: as consultas externas foram parcialmente interrompidas por falta de aprovação de permissão. Itens que não puderam ser relidos em URL primária foram rebaixados para [S] e estão listados em "pendente de verificação" (seção 11).

---

## 1. Auditoria técnica resumida do portfólio atual

### 1.1 O que existe [C]

| Item | Evidência | Implicação para o Hub |
|---|---|---|
| Site estático, sem build, sem testes, sem CI | `README.md` linha 9; nenhum workflow nem teste encontrado | O Hub herda a ausência de rede de segurança. Precisa de verificação mínima própria (seção 9). |
| Páginas: `index.html` e `certificacoes.html` | Ambas duplicam `<head>`, fontes e nav | Há precedente de multipágina duplicando cabeçalho. O Hub pode seguir o mesmo padrão. |
| Roteamento por hash apenas para o case (`#/case/<slug>`) e âncoras | `app.js` linhas 129–141 | Hash serve para estado dentro de uma página. Não deve ser o roteador do Hub inteiro. |
| `app.js` executa tudo ao carregar (`renderHome(); route();`) e toca em `#home`, `#case`, `#toolFilter` | `app.js` linhas 91, 141 | **Não é reutilizável.** O Hub não deve carregar `app.js`. |
| Tokens CSS em `:root`, com tema escuro por `prefers-color-scheme` e por `data-theme` | `styles.css` linhas 4–40 | Reutilizáveis lendo o mesmo arquivo. |
| Tema: chave `ld-theme` em `localStorage`, atributo `data-theme` em `<html>` | `app.js` linhas 152–155 | Lógica está dentro de `app.js`. Hub precisa reimplementar cerca de 6 linhas com a mesma chave para compartilhar a preferência. |
| i18n: globais `window.LANG`, `window.t`, `window.setLang`, `window.onLang`; chave `ld-lang`; `?lang=pt` força PT; padrão EN | `i18n.js` linhas 92–148 | Reutilizável sem edição, com ressalvas (1.2). |
| Gancho `window.PT_EXTRA` mescla chaves PT antes da aplicação | `i18n.js` linha 88 | Permite ao Hub injetar seu dicionário PT sem editar `i18n.js`. |
| Texto EN fica no HTML (`data-i`), PT fica em dicionário JS; o EN é capturado de `innerHTML` na primeira execução | `i18n.js` linhas 109–113 | Páginas do Hub devem escrever o inglês no HTML. |
| Dicionário `UI` (strings dinâmicas) é privado da IIFE | `i18n.js` linha 89 | `t()` não é extensível. Hub precisa de `ht()` próprio. |
| Fontes via Google Fonts (CSS externo) | `index.html` linhas 26–28; `certificacoes.html` linhas 22–24 | Dependência externa e vazamento de IP do visitante ao Google [S]. O portfólio **mantém** Google Fonts (C9). Páginas do Hub usam fontes locais. |
| Dados em `<script src>` (`data.js`), compatível com `file://` | `index.html` linhas 222–225 | O Hub, com Workers, WASM e `fetch`, **não funciona em `file://`**. O README promete "basta abrir o index.html". Hub exige servidor HTTP (README já cita `python -m http.server`). |
| URL canônica `https://luudelfino91-lgtm.github.io/portfolio/` | `index.html` linha 8 | Site de projeto em subcaminho `/portfolio/` (consistente com D2, ainda pendente). Todo link do Hub deve ser relativo. |

### 1.2 Inconsistências encontradas [C]

1. **README recomenda Vercel; produção é GitHub Pages** (README linhas 49–52 contra canonical em `index.html` linha 8). Documentação defasada. Resolver junto com D2.
2. **ROADMAP v1.2 lista "Versão em inglês" como pendente**, mas EN já existe e é o padrão. ROADMAP defasado.
3. **ROADMAP "v2 Backend (futuro)"** conflita com **D8** (sem backend). Registrar como conflito para o Lucas decidir.
4. **Domínio próprio planejado** (ROADMAP v1.2). Mudar o domínio altera a base do caminho. Reforça links relativos.
5. **README lista só `data.js`** na estrutura; `data-en.js` e `i18n.js` existem e são carregados. Pouco relevante, mas confirma que a documentação não acompanha o código.

### 1.3 Pontos fortes a preservar

Identidade visual consistente por tokens, acessibilidade básica (`:focus-visible`, `prefers-reduced-motion`, `aria-*`), zero dependências, `esc()` para escapar HTML, fallback de imagem. O Hub deve manter esse padrão de escape e de acessibilidade.

---

## 2. Princípios e restrições de projeto

Prioridades na ordem recebida: (1) compatibilidade com GitHub Pages, (2) arquitetura estática, (3) processamento no cliente, (4) dependências mínimas, (5) segurança e manutenibilidade, (6) baixa complexidade operacional.

Restrições duras: custo recorrente zero (condicionado à verificação dos termos do Pages, ver `infrastructure-costs.md`), sem backend, sem API paga ou externa, PT/EN, identidade visual preservada, páginas atuais intactas.

Interpretações que adoto (peço confirmação):

- ES Modules nativos (`<script type="module">`) são JavaScript puro e **não são build**. Cabem em D1.
- Qualquer coisa em tempo de execução que chame um domínio de terceiros (CDN, Hugging Face, API) a partir de página do Hub conta como "serviço externo" e passa pela regra de custo, exceto se aprovada em D3. "Zero requisição externa" vale **somente para páginas do Hub**; o portfólio continua com Google Fonts (C9).

---

## 3. Arquitetura-alvo

### 3.1 Visão geral

Suposição D2 (GitHub Pages) e suposição D3 (arquivos próprios) valem para toda a árvore abaixo. Árvore canônica de C1:

```
GitHub Pages (suposição D2)  ──  https://<usuário>.github.io/portfolio/
│
├── index.html, certificacoes.html, assets/…     (portfólio: NÃO ALTERADO)
│
└── hub/                                          (Hub: tudo novo, em /hub/)
    ├── index.html                      # /hub/
    ├── ferramentas/
    │   ├── index.html                  # catálogo
    │   ├── csv/index.html              # visualizador de CSV (Papa Parse)
    │   └── sql/index.html              # SQL playground (sql.js)
    ├── privacidade/index.html          # P1, Fase 2
    ├── (futuro) python/ cursos/ recursos/ apoie/
    │                                   # estrutura definida na fase correspondente
    └── assets/
        ├── css/                        # hub.css: só o que é específico do Hub
        ├── js/                         # core, módulos, workers e dicionários do Hub
        ├── vendor/                     # bibliotecas de terceiros, versão fixada + manifest.json
        └── fonts/                      # woff2 locais (seção 5 de technology-stack.md)
```

Tudo do Hub vive em `hub/assets/`. Subpastas internas de `hub/assets/js/` (por exemplo `core/`, `modules/`, `workers/`) e pastas de dados ou datasets são detalhadas na fase que as cria; referências a `/hub/sobre/`, `/hub/cursos/power-bi/` e `/hub/apoie/` são **fases futuras** e a estrutura exata é **definida na fase correspondente**. Exemplos de módulos nas seções abaixo (`core/theme-init.js`, `core/loader.js` etc.) são ilustrativos e ficam sob `hub/assets/js/`.

O Hub **referencia** `assets/css/styles.css` do portfólio (não copia), conforme C1 (ver 4.1).

### 3.2 Camadas

1. **Shell** (todas as páginas): HTML semântico, `styles.css` do portfólio, `hub.css`, cabeçalho do Hub, tema, i18n.
2. **Core**: utilitários sem dependência externa.
3. **Módulos**: um por página de ferramenta, carregados só nessa página.
4. **Engines pesados** (WASM): isolados em Web Workers, carregados sob demanda por `loader.js` (seção 7).
5. **Conteúdo**: JSON bilíngue `{pt, en}`, sem lógica (fases futuras).

### 3.2.1 Orçamento de peso (C3, meta provisória a medir)

| Item | Orçamento | Regra de contagem |
|---|---|---|
| Shell do Hub | **≤ 150 KB transferidos**, cache vazio | HTML + CSS + JS próprios + `styles.css` do portfólio. **Sem** fontes e **sem** imagens. |
| Fontes locais (woff2) | **≤ 120 KB**, orçamento separado | Soma dos woff2 carregados numa página. |
| Bibliotecas pesadas (sql.js, Papa Parse, Pyodide) | Fora do shell; orçamento próprio por biblioteca | Carregam sob demanda, nunca no shell. |

Todos os valores são **meta provisória [S]**, a confirmar por medição no primeiro protótipo (Fase 2). "Transferidos" depende da compressão do host, ainda não medida (P3). O valor de 300 KB do PRD está **revogado** (C3).

### 3.3 Módulos e interfaces

Todas as interfaces são contratos em JSDoc, sem TypeScript.

**`core/theme-init.js`** (script bloqueante no `<head>`): aplica `localStorage["ld-theme"]` em `document.documentElement.dataset.theme` antes da primeira pintura, evitando flash de tema errado. Arquivo externo, não inline, para permitir CSP sem `unsafe-inline`.

**`core/theme.js`**: liga o botão de tema; mesma chave `ld-theme` e mesma regra de `app.js` linhas 152–155. Duplicação consciente, registrada no risco R6.

**`core/hub-i18n.js`**: lê `window.LANG` e `window.onLang` criados pelo `i18n.js` do portfólio.
```js
/** @param {string} key  @param {Object<string,string|number>} [vars] @returns {string} */
export function ht(key, vars) {}
/** Registra dicionário do módulo. dict = { en: {...}, pt: {...} } */
export function registerDict(namespace, dict) {}
/** Executa fn agora e a cada troca de idioma. */
export function onLangChange(fn) {}
```
Não redefine `window.t` (pertence ao portfólio).

**`core/loader.js`**: carregamento sob demanda com progresso e verificação.
```js
/** @typedef {{name:string, version:string, files:string[], sizeBytes:number}} VendorEntry */
/** @returns {Promise<void>} */
export function loadScript(url) {}
/** @param {string} url @param {(loaded:number,total:number|null)=>void} [onProgress] @returns {Promise<ArrayBuffer>} */
export function fetchWithProgress(url, onProgress) {}
/** Lê vendor/manifest.json e devolve a entrada pedida. */
export function vendor(name) {}
```
Progresso pode ser indeterminado se o servidor não enviar `Content-Length` com compressão [S].

**Contrato de engine** (SQL e Python implementam o mesmo formato):
```js
/**
 * @typedef {Object} Engine
 * @property {(onProgress?:Function)=>Promise<void>} init      carrega WASM (idempotente)
 * @property {(code:string,opts?:{timeoutMs?:number})=>Promise<RunResult>} run
 * @property {()=>Promise<void>} reset                         descarta estado
 * @property {()=>void} dispose                                termina o Worker
 * @typedef {Object} RunResult
 * @property {string[]} [columns] @property {any[][]} [rows] @property {number} [rowCount]
 * @property {string} [stdout] @property {string} [stderr]
 * @property {number} elapsedMs @property {{message:string,line?:number}} [error]
 */
```
`timeoutMs` é implementado **terminando e recriando o Worker**, porque o GitHub Pages (suposição D2) não envia COOP/COEP e, portanto, `SharedArrayBuffer` não está disponível para interromper execução [S, depende de 6.2]. Web Worker de parsing CSV e de execução SQL é **MVP (P0)** (C10.1), inclusive "Parar/Cancelar".

**`core/csv.js`**: envolve Papa Parse (`worker: true`, `dynamicTyping` opcional). Entrada `File`, saída `{name, columns, rows, errors}`. O arquivo do usuário nunca sai do navegador. O Worker é MVP (C10.1). Critério do MVP: arquivos de CSV até **10 MB**; 50 MB é meta a validar por medição, não critério (C6).

**Contrato de conteúdo** (fases futuras, formato indicativo):
```json
{ "id": "sql-basico", "type": "course|tool|resource", "url": "relative/path",
  "title": {"pt": "…", "en": "…"}, "summary": {"pt": "…", "en": "…"},
  "tags": ["sql"], "level": "beginner|intermediate|advanced", "updated": "2026-11-12" }
```
Texto sempre inserido com `textContent` ou escape equivalente ao `esc()` de `app.js` linha 3.

**`vendor/manifest.json`**: para cada biblioteca, `name`, `version`, `license`, `sourceUrl`, `sha256`, `sizeBytes`, `verifiedOn`. É o gate de licença e integridade (seção 9).

---

## 4. Como o Hub compartilha tokens e i18n sem editar o portfólio

### 4.1 Tokens e estilos

**Escolha (M6): referência, não cópia.** Cada página do Hub inclui `<link rel="stylesheet">` apontando para `assets/css/styles.css` do portfólio (caminho relativo à profundidade da página; a partir de `hub/ferramentas/sql/index.html`, `../../../assets/css/styles.css`) **antes** de `hub/assets/css/hub.css`. O arquivo é lido, nunca modificado.

- Isso traz variáveis (`--plum`, `--ink`, `--f-display`…), tema escuro, `.btn`, `.chip`, `.nav`, `.wrap`, `.eyebrow`, tipografia base [C].
- `hub.css` só adiciona classes com prefixo `hub-` para não colidir com `.lane`, `.proj`, `.frame`, `.hidden` do portfólio.
- **Prós da referência:** um só fonte de verdade para tokens; identidade visual sempre alinhada; nenhuma duplicação a manter; cabe no orçamento de 150 KB do shell, que já conta o `styles.css`.
- **Risco de acoplamento:** o Hub depende de nomes de variáveis e classes de `styles.css`. Qualquer mudança em `assets/` pode quebrar o Hub sem aviso, porque o portfólio não tem testes. Por isso, **quando `assets/` mudar, rodar a regressão visual do Hub é obrigatório** (C1/M6). Essa regra é um acoplamento operacional entre dois conjuntos de páginas: quem altera o portfólio passa a ter uma obrigação de teste no Hub. Mitigação: lista da "API visual" (variáveis e classes usadas) em `hub/README`; regressão visual manual (e, se aprovada, automatizada via Playwright) a cada mudança em `assets/`. Alternativa descartada: copiar `styles.css` para `hub/assets/css/` (desacopla, mas duplica e diverge). Quando o Lucas autorizar tocar o portfólio, extrair `tokens.css` (fase futura, **precisa de aprovação** por alterar páginas atuais).
- Fontes: `@font-face` em `hub.css` com os **mesmos nomes de família** (`Bricolage Grotesque`, `Figtree`, `JetBrains Mono`), apontando para woff2 locais em `hub/assets/fonts/`. As variáveis `--f-display/--f-body/--f-mono` passam a resolver para os arquivos locais sem mudar nada em `styles.css`. Páginas do Hub não incluem o CSS do Google Fonts; o portfólio mantém (C9).

### 4.2 i18n

Ordem de carregamento no final do `<body>` de cada página do Hub (exemplo para `hub/ferramentas/sql/index.html`):

```html
<script src="../../assets/js/i18n/pt.hub.js"></script>   <!-- hub/assets/js/..., define window.PT_EXTRA -->
<script src="../../../assets/js/i18n.js"></script>        <!-- do portfólio, sem edição -->
<script type="module" src="../../assets/js/modules/sql-lab.js"></script>
```

Os caminhos de `hub/assets/js/` acima são ilustrativos; a estrutura interna de `js/` é fixada na fase que a cria.

- Chaves do Hub com prefixo `hub.` (ex.: `hub.nav.tools`) para não colidir com as do portfólio (`n.proj`, `b.small`…) [C: dicionário em `i18n.js` linhas 9–87].
- O inglês fica no HTML (`data-i="hub.nav.tools"`), o português em `PT_EXTRA`, exatamente como o portfólio.
- Preferência compartilhada: mesma chave `ld-lang` e mesmo `?lang=pt` [C]. Trocar idioma no portfólio vale no Hub e vice-versa.
- Strings dinâmicas (mensagens de erro, progresso, tabelas): `ht()` com dicionário próprio, redesenhando em `onLang` [C: `window.onLang`].
- Limitações herdadas: mesma URL para PT e EN, sem `hreflang`; `<html lang>` troca via JS. Aceitável e coerente com o portfólio. SEO bilíngue por URL ficaria como melhoria futura [S].

### 4.3 Armazenamento

Todo o Pages de projetos sob `luudelfino91-lgtm.github.io` compartilha a mesma origem, logo o mesmo `localStorage` [S, comportamento geral do GitHub Pages (suposição D2), não verificado]. Convenção: chaves do portfólio `ld-*` (existentes), chaves do Hub `hub-*`. Nunca guardar dado sensível. Dados de usuário (CSV, SQLite) ficam em memória ou OPFS/IndexedDB, nunca enviados. Rascunho de código em `localStorage` está **fora do MVP (P2)** e não tem RF/T até ser formalizado (C6).

---

## 5. Roteamento, páginas de erro e navegação

**Recomendação: multipágina estática em `hub/**/index.html`, sem roteador, com hash apenas para estado interno da página.**

| Critério | Multipágina (recomendada) | SPA com hash |
|---|---|---|
| Carregar WASM só onde precisa | Natural: cada página carrega o seu | Exige lazy loading manual e descarte de módulos |
| Falha de uma ferramenta | Isolada na página | Pode derrubar a SPA inteira |
| Compat. GitHub Pages (suposição D2) | Total (arquivos estáticos) | Total, mas deep link depende de JS |
| Compartilhar link | URL limpa por ferramenta | `#/…` funciona, menos legível |
| SEO e compartilhamento social | Metas por página | Metas únicas |
| Complexidade | Baixa. Cabeçalho duplicado em cada HTML (precedente: `certificacoes.html`) | Roteador próprio a manter |
| Custo | Duplicação de nav (mitigada por `data-i` e checklist) | Menos HTML, mais JS |

Regras:

- URLs sempre **relativas** (o site vive em `/portfolio/` hoje e pode mudar de base com domínio próprio, ROADMAP v1.2 [C]).
- Pastas com `index.html` para URLs sem extensão, conforme a árvore da seção 3.1.
- Hash somente dentro de uma página (ex.: `ferramentas/sql/#ex=join-basico` para carregar um exercício). Reutiliza o padrão já conhecido do portfólio.
- **404 e erros (C4).** Como o Hub é multipágina e não tem roteador, **não existe "404 interna"**. Os requisitos de erro valem para **estado inválido dentro da página** (hash ou parâmetro inválido): a página mostra mensagem bilíngue e volta ao estado inicial. Um `404.html` na **raiz do portfólio** só é servido pelo GitHub Pages nessa posição [S, não verificado nesta sessão] e **altera o site atual: requer aprovação explícita do Lucas** e está **fora do MVP**. Enquanto isso, o Hub não depende de página 404 própria; uma URL inexistente cai no 404 padrão do host.
- Duplicação do cabeçalho: aceitar na Fase 2 (poucas páginas). Se passar de cerca de 8 páginas, avaliar um `<script>` que injeta o cabeçalho a partir de um template único, sem build.

**Ponto de integração com o portfólio.** Hoje nada no portfólio aponta para `/hub/`. Adicionar um link no nav de `index.html` altera página atual e **exige aprovação explícita do Lucas** (D4). Até lá, o Hub é acessível por URL direta.

---

## 6. Limites e comportamento do GitHub Pages (suposição D2)

Toda esta seção supõe GitHub Pages como hospedagem (D2 pendente). Se D2 mudar, ver plano B em `infrastructure-costs.md`.

### 6.1 Limites verificados [V]

Fonte primária lida nesta sessão: documentação oficial do GitHub Pages, "GitHub Pages limits" (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

| Limite | Valor |
|---|---|
| Tamanho do site publicado | no máximo 1 GB |
| Repositório-fonte | limite **recomendado** de 1 GB |
| Banda | limite **brando** de 100 GB por mês |
| Builds | limite brando de 10 por hora (não se aplica a workflow customizado de GitHub Actions) |
| Timeout de deploy | 10 minutos |
| Rate limit | respostas HTTP 429 |
| Uso proibido | negócio online, e-commerce ou SaaS comercial; transações sensíveis como senhas ou cartões |
| Se exceder | o GitHub pode parar de servir o site ou contatar o dono |

Trechos lidos em 2026-11-12 nessa URL (N6/C10.5): "Published GitHub Pages sites may be no larger than 1 GB."; "GitHub Pages sites have a *soft* bandwidth limit of 100 GB per month."; "GitHub Pages sites have a *soft* limit of 10 builds per hour." (a página acrescenta que o limite não se aplica a build e publicação por workflow customizado de GitHub Actions). Por isso permanecem [V].

A página lida **não** afirma gratuidade nem cita o termo "primariamente para transações comerciais" na redação desta leitura; a gratuidade para este repositório e os termos completos seguem **pendentes (P6)**.

Consequência para o Hub: o site publicado inteiro (portfólio + Hub + WASM + datasets) precisa caber em 1 GB, e **o histórico do Git** também pesa no repositório. Cada versão de WASM commitada fica no histórico para sempre (ver 6.3).

### 6.2 Política de cabeçalhos HTTP (suposição D2, [S])

Suposição D2: o host é o GitHub Pages, que **não permite configurar cabeçalhos** [S, não verificado nesta sessão]. Toda a política abaixo é condicionada a D2 e à medição P3. Se D2 mudar para host com `_headers`, esta tabela é reescrita.

| Necessidade | Efeito | Alternativa |
|---|---|---|
| COOP/COEP (isolamento de origem) | `crossOriginIsolated` falso; sem `SharedArrayBuffer` | Usar apenas engines que funcionem sem isso: sql.js, Pyodide em Worker. Evitar `coi-serviceworker` (hack de terceiros, instável). DuckDB-WASM fora da v1. |
| CSP por cabeçalho | Indisponível | `<meta http-equiv="Content-Security-Policy">` em cada página. Não suporta `frame-ancestors`. Testar `wasm-unsafe-eval` e necessidades do Pyodide antes de fixar a política [S]. |
| `Cache-Control` imutável | Não configurável; cache curto por padrão [S] | Versão no caminho (`vendor/sql.js@1.15.0/…`) e, opcionalmente, Service Worker com Cache API para os WASM (Fase 7). |
| MIME `application/wasm` | Esperado correto [S] | Teste de fumaça: `WebAssembly.instantiateStreaming` com fallback para `instantiate(ArrayBuffer)`. |
| Compressão de `.wasm` | Incerta [S] | Medir a transferência real no deploy de teste e registrar em `technology-stack.md`. |

Sobre D3 (arquivos próprios vs CDN): todas as rotas de bibliotecas (`hub/assets/vendor/…`) assumem **arquivos próprios como suposição [S]**. Se D3 optar por CDN, os caminhos viram URLs externas, a regra "zero requisição externa" do Hub precisa de exceção documentada e a CSP muda.

### 6.3 Arquivos grandes

Tamanhos (tabelas completas em `technology-stack.md`):

- sql.js 1.15.0: `sql-wasm.wasm` 684.897 bytes + `sql-wasm.js` 46.635 bytes, total 731.532 bytes [V: https://data.jsdelivr.com/v1/packages/npm/sql.js@1.15.0?structure=flat, relida em 2026-11-12; trecho lido: `/dist/sql-wasm.wasm` 684,897 bytes e `/dist/sql-wasm.js` 46,635 bytes].
- Papa Parse 5.7.1: `papaparse.min.js` 19.012 bytes [S: não relido nesta sessão].
- DuckDB-WASM (tag `latest` 1.33.1-dev57.0): `duckdb-eh.wasm` 35.913.747 bytes; `duckdb-mvp.wasm` 41.325.187 bytes [S: não relidos nesta sessão].
- Pyodide: **tamanho não verificado** [S].

Política:

1. **Orçamento de repositório**: vendor total (todas as versões no histórico) abaixo de 300 MB, deixando folga para o limite recomendado de 1 GB (meta de projeto [S]).
2. **Uma versão por biblioteca no ramo `main`**; atualizações de WASM grande são raras e deliberadas (cada uma permanece no histórico).
3. **DuckDB-WASM fora da v1.** Uma única versão com `eh` + worker + módulo soma cerca de 36,7 MB; com `mvp` de fallback, cerca de 78,9 MB [S]. Só entra com justificativa e aprovação.
4. **Pyodide** (Fase 4, bloqueado por D3 Pyodide): medir o conjunto mínimo (núcleo + stdlib + pandas/numpy, se exigidos) antes de commitar. Se o conjunto ultrapassar o orçamento, a escolha vira decisão do Lucas (D3): self-host de núcleo mínimo sem pandas, ou exceção de CDN com versão fixa.
5. Limite de 100 MB por arquivo no push do Git e comportamento de Git LFS com Pages **não foram verificados**; não usar LFS nem GitHub Releases como origem de WASM sem teste [S].
6. Datasets de exemplo pequenos (alvo: cada um abaixo de 1 MB, total abaixo de 5 MB) [S, meta de projeto].

---

## 7. Carregamento sob demanda de WASM

Fluxo para uma página de ferramenta (exemplo: SQL, se D3 aprovado para sql.js):

1. Página carrega shell, tema, i18n e o módulo da ferramenta (poucos KB, dentro do orçamento do shell).
2. Editor e interface renderizam imediatamente, com botão "Executar" desabilitado e rótulo "Preparando motor SQL…".
3. O módulo cria o Worker do SQL (Worker clássico para sql.js) e envia `init`.
4. O Worker faz `fetchWithProgress` de `vendor/sql.js@1.15.0/sql-wasm.wasm` e instancia.
5. Interface é habilitada; estado "pronto" persiste em memória enquanto a página viver.
6. Falhas (rede, WASM não suportado, memória) viram mensagem bilíngue com ação "tentar de novo" e sugestão de navegador.

Regras:

- **Nunca** carregar WASM em `<head>` nem em páginas que não o usam; bibliotecas pesadas ficam fora do orçamento do shell (3.2.1).
- Python (Fase 4): só inicia após clique explícito em "Iniciar Python" (download pesado, consentimento do usuário em conexão móvel) [decisão de UX proposta].
- Pyodide 314.0 teria passado a distribuir `pyodide.asm.mjs` e **deixado de suportar Workers clássicos** [S: a informação veio de espelho de terceiros do blog do Pyodide; a URL primária não pôde ser lida nesta sessão]. Se confirmado, usar `new Worker(url, {type:"module"})`.
- Cada engine em Worker próprio para manter a interface responsiva e permitir cancelamento por término do Worker.
- Em `file://` o Hub não funciona (Workers de módulo, `fetch` de WASM). Documentar servidor local.
- Fallback sem Workers: não suportar; exibir aviso.
- Navegadores-alvo (C6, sujeito à aprovação): Chrome, Edge e Firefox, **duas últimas versões**, testados via Playwright. Safari/WebKit é *best effort* e não é critério de aceite (WebKit do Playwright é aproximação; Safari real fica a cargo do Lucas).

---

## 8. Riscos técnicos

| ID | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Pyodide excede orçamento de repositório ou de banda | Média | Alto | Medir antes de commitar (Fase 4); núcleo mínimo; decisão D3 documentada; carregamento explícito por clique. |
| R2 | Termos do GitHub Pages sobre uso comercial e contribuição PIX | Baixa a média [S] | Médio | PIX é voluntário, sem venda nem paywall, cursos gratuitos. Registrar a interpretação e pedir a leitura do Lucas (D5, Fase 6). Plano B de migração em `infrastructure-costs.md`. |
| R3 | Sem cabeçalhos (suposição D2): sem SharedArrayBuffer, CSP só por `<meta>`, cache fraco | Alta (se D2) | Médio | Engines que dispensam isolamento; versionar caminhos; Service Worker opcional; migração para host com `_headers` se necessário. |
| R4 | Alteração em `assets/` (`styles.css`) do portfólio quebra o Hub (acoplamento por referência, 4.1) | Média | Médio | Lista de API visual; regressão visual obrigatória a cada mudança em `assets/`; futura extração de `tokens.css` com aprovação. |
| R5 | `i18n.js` evolui e quebra `PT_EXTRA`/`onLang` | Baixa | Médio | Hub só usa `LANG`, `onLang`, `PT_EXTRA`, `PAGE_META`, `setLang` (contrato registrado). Teste manual de troca de idioma a cada mudança. |
| R6 | Lógica de tema duplicada diverge de `app.js` | Baixa | Baixo | Mesma chave `ld-theme`; comentário apontando para `app.js` 152–155. |
| R7 | XSS por conteúdo do usuário (nomes de colunas de CSV, saída de Python) | Média | Médio (origem compartilhada com todos os sites do usuário [S]) | `textContent` ou escape; nunca `innerHTML` com dado do usuário; CSP por `<meta>`; sem `eval` próprio. |
| R8 | Bibliotecas de terceiros com vulnerabilidade ou mudança de licença | Média | Médio | `manifest.json` com versão, licença e hash; revisão trimestral; atualização manual. Licenças **ainda não verificadas** (P2). |
| R9 | Tag `latest` do DuckDB-WASM aponta para build de desenvolvimento (`1.33.1-dev57.0`) [S: não relido] | Alta se adotado | Médio | Fixar versão exata; preferir release estável; fora da v1. |
| R10 | Memória/tempo em dispositivos móveis modestos | Média | Médio | Limites de linhas exibidas, aviso de tamanho de arquivo (CSV: 10 MB no MVP), timeout por término do Worker. |
| R11 | Ausência de testes e CI | Certa | Médio | Verificação mínima (seção 9); CI opcional somente para validação, não build. |
| R12 | Contribuição PIX: chave exposta em repositório público (privacidade pessoal) | Média | Médio | Preferir chave aleatória; Lucas decide a chave (D5, Fase 6). Nunca CPF no repositório [S]. Sem confirmação automática de pagamento. Qualquer texto de PIX é provisório até a Fase 6. |
| R13 | Conflito ROADMAP v2 "Backend" vs D8 | Certa | Baixo | Lucas decide (D8 bloqueia a Fase 7); o plano assume "sem backend" como recomendação. |

---

## 9. Qualidade sem build

Sem build e sem backend, proponho verificação leve:

- **Checklist manual de release** (obrigatório): servidor local; troca PT/EN; tema claro/escuro; teclado e foco; Chrome, Edge e Firefox (duas últimas versões, Playwright), Safari como *best effort* (C6); inspeção de aba de rede (nenhuma requisição a domínios externos nas páginas **do Hub**; o portfólio mantém Google Fonts).
- **Contraste AA** verificado por cálculo com os pares de cor listados; Lighthouse é indicador complementar, não prova (C7).
- **Regressão visual do Hub** obrigatória quando `assets/` mudar (4.1).
- **`vendor/manifest.json`** com hash SHA-256 conferido por script manual local, e política de licença (aprovar somente MIT, BSD, Apache-2.0, MPL-2.0, OFL após leitura do arquivo `LICENSE` real).
- **GitHub Actions opcional** apenas para validar (links relativos, JSON válido, hashes). Não faz build nem altera o artefato. Custo em repositório público: gratuito [S, não verificado]. Se usado como deploy customizado, o limite brando de 10 builds por hora não se aplica [V].
- Observação de escopo: scripts e workflows são código de produto/infra e ficam para as fases seguintes; esta fase só os especifica.

---

## 10. Plano técnico de implementação por fase

Numeração de C2 (vale sobre qualquer outra). Tarefas que dependem de decisão pendente dizem "se D-n aprovado".

| Fase | Entrega | Critério de pronto | Depende de |
|---|---|---|---|
| **0. Portão G1** | Aprovação da Fase 1 e das decisões mínimas pelo Lucas | Decisões registradas | , |
| **1. Planning** (esta) | Planning, Architecture, Design, plano de testes, revisão de segurança | Aprovação em G1 | , |
| **2. Casca do Hub** | `hub/index.html`, `hub/ferramentas/index.html`, `hub/privacidade/index.html` (P1), `hub/assets/css/hub.css`, fontes locais, core (tema, i18n, loader); **sem cartão nem link de PIX/Apoie até a Fase 6 e D5** (C10.2) | PT/EN e tema funcionam; zero requisições externas nas páginas do Hub; shell dentro de ≤150 KB (meta provisória) e fontes ≤120 KB | Fase 0; D2 (URLs, cabeçalhos); D3 fontes locais |
| **3. Ferramentas de dados** | **3a:** visualizador de CSV (`hub/ferramentas/csv/`, Papa Parse, limite de 10 MB). **3b, depois de 3a:** SQL playground (`hub/ferramentas/sql/`, sql.js; **SQL depende de CSV**) | CSV: abre arquivos até 10 MB sem travar a interface. SQL: executa consultas, erros bilíngues, timeout por término do Worker (Worker de CSV e SQL é MVP, C10.1) | Fase 2; D3 sql.js e Papa Parse (se aprovado) |
| **4. Python playground** | Pyodide em Worker de módulo, início por clique | Orçamento de peso medido e aprovado; cancelamento funciona | Fase 3; D3 Pyodide (se aprovado) |
| **5. Cursos, recursos e IA** | Cursos, recursos gratuitos e curadoria estática de IA; **sem chamadas de API**. Estrutura de pastas definida nesta fase | Conteúdo bilíngue, links externos com `rel="noopener"`; nenhuma requisição a API de IA | Fase 2 |
| **6. PIX** | Página com payload PIX estático (copia-e-cola e QR); pasta definida nesta fase | Payload validado em app bancário real; sem backend | D5 aprovado e escolha da chave |
| **7. Endurecimento e release** | CSP por `<meta>`, Service Worker opcional para cache de WASM, regressão visual, documentação | Checklist da seção 9 completo | Fases 2 a 6; D8 (o plano assume "sem backend" como recomendação) |

Tabela de decisões pendentes (C2):

| Decisão | Bloqueia |
|---|---|
| D2 hospedagem | Fase 2 (URLs, cabeçalhos) |
| D3 fontes locais | Fase 2 |
| D3 sql.js, Papa Parse | Fase 3 |
| D3 Pyodide | Fase 4 |
| D5 PIX | Fase 6 (qualquer texto de PIX é provisório até lá) |
| D8 backend | Fase 7 |

Fora do MVP (P2), sem RF/T até serem formalizados (C6): página `sobre/`, rascunho de código em `localStorage`, convite de apoio dispensável por 30 dias, progresso de curso, exercícios concluídos. **MVP = Fases 2 e 3.**

Observação sobre IA no navegador: executar LLM local (WebGPU) baixaria modelos de centenas de MB a GB de um host externo e é fora do escopo; qualquer proposta passa pela regra de custo e pede aprovação [S, tamanhos não pesquisados].

---

## 11. Pendências e aprovações necessárias do Lucas

**Decisões pendentes (tratadas como suposição):**

1. **D2**: confirmar GitHub Pages como hospedagem (e corrigir o README que cita Vercel).
2. **D3**: arquivos próprios com versão fixada (recomendado). Decisão específica para Pyodide, que pode forçar exceção de CDN.
3. **D5**: PIX estático, escolha da chave e leitura dos termos do Pages (risco R2).
4. **D8**: sem backend, resolvendo o conflito com ROADMAP v2.

**Aprovações novas que esta arquitetura pede:**

5. Colocar link para `/hub/` no portfólio (altera página atual).
6. Futura extração de `tokens.css` do `styles.css` (altera página atual); opcional.
7. `404.html` na raiz do portfólio (altera o site atual; fora do MVP).
8. DuckDB-WASM (só se justificado); Vite/TypeScript não são propostos.
9. GitHub Actions apenas de validação (opcional).
10. Navegadores-alvo e meta provisória de peso (C3, C6).

**Pendente de verificação (itens que não foram lidos em URL primária nesta sessão):**

- P1: tamanho real e arquivos mínimos do Pyodide 314.x; a versão 314.0, a data 8 jun 2026 e a remoção de Workers clássicos vêm de espelho de terceiros do blog oficial (https://blog.pyodide.org/posts/314-release/ não pôde ser lida): **[S]**.
- P2: leitura dos arquivos `LICENSE` de sql.js, Papa Parse, Pyodide, DuckDB-WASM e das fontes.
- P3: cabeçalhos reais do GitHub Pages (MIME de `.wasm`, compressão, `Cache-Control`) com um arquivo de teste publicado.
- P4: limites atuais de Cloudflare Pages e Netlify.
- P5: limite de arquivo do Git e comportamento de LFS.
- P6: gratuidade e termos completos do Pages.
- P9: versão mais recente de sql.js e Papa Parse nas releases do GitHub (https://github.com/sql-js/sql.js/releases e https://github.com/mholt/PapaParse/releases não puderam ser lidas); tamanhos de Papa Parse e DuckDB-WASM não relidos.
