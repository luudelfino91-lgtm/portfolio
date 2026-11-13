# Technology Stack: comparação e justificativa

Fase 1 (Architecture) · Data de referência: 2026-11-12 · Status: proposta, reconciliada com `docs/decisions/phase-1-reconciliation.md`. O documento arquitetural vinculante é `solution-architecture.md` (M7); este arquivo o detalha.

Legenda: **[V]** lido nesta sessão em URL **primária** (API do jsDelivr/npm do próprio pacote, documentação oficial) · **[C]** lido no código · **[S]** suposição ou não verificado em fonte primária nesta sessão. Espelhos de terceiros nunca são [V] (C8).

Suposições explícitas: **D2** (GitHub Pages) e **D3** (arquivos próprios em `hub/assets/vendor/`, em vez de CDN) estão **pendentes** e são tratadas como suposição [S] em todas as rotas e caminhos deste documento. Decisões D3 bloqueiam: fontes locais, Fase 2; sql.js e Papa Parse, Fase 3; Pyodide, Fase 4.

Aviso importante: nesta rodada só foram relidos em fonte primária os dados do **sql.js 1.15.0** (API do jsDelivr/npm) e os limites do GitHub Pages. Todo o restante (Papa Parse, DuckDB-WASM, Pyodide e **todas as licenças**) é **[S]** e está listado em "pendente de verificação" (seção 9). Licenças têm de ser confirmadas lendo o `LICENSE` real antes de qualquer commit em `vendor/` (gate no `manifest.json`).

Tamanhos são **bytes sem compressão** como publicados no pacote npm via API do jsDelivr. A transferência real pelo GitHub Pages pode ser menor se houver gzip ou brotli, o que **não foi medido** [S].

Orçamento de peso (C3, meta provisória a medir no primeiro protótipo): shell do Hub (HTML + CSS + JS próprios + `styles.css` do portfólio, sem fontes e sem imagens) ≤ 150 KB transferidos, cache vazio; fontes locais ≤ 120 KB, à parte; sql.js, Papa Parse e Pyodide carregam sob demanda, fora do shell, com orçamento próprio. O valor de 300 KB do PRD está revogado.

---

## 1. Resumo das recomendações

| Necessidade | Recomendação | Alternativas avaliadas | Status |
|---|---|---|---|
| SQL no navegador | **sql.js 1.15.0** [V] | DuckDB-WASM, SQLite WASM oficial, wa-sqlite, AlaSQL | Fase 3b (depende de CSV), se D3 aprovado |
| Python no navegador | **Pyodide 314.x** (versão exata a fixar após medir) | PyScript, JupyterLite, MicroPython WASM, Brython/Skulpt | Fase 4, se D3 Pyodide aprovado |
| Leitura de CSV | **Papa Parse 5.7.1** [S] | Parser próprio, d3-dsv, DuckDB (lê CSV nativamente) | Fase 3 (CSV antes de SQL), se D3 aprovado |
| Fontes (páginas do Hub) | **Locais (woff2, mesmos nomes de família)** | Google Fonts, fontes de sistema | Fase 2, se D3 aprovado; o portfólio mantém Google Fonts (C9) |
| Arquivos grandes | **Arquivos próprios, versão no caminho, carregamento sob demanda** | CDN (jsDelivr), Releases, LFS, bucket externo | v1, D3 pendente |

---

## 2. SQL no navegador

### 2.1 Dados verificados

**sql.js** [V para os dois arquivos principais, lidos nesta sessão em https://data.jsdelivr.com/v1/packages/npm/sql.js@1.15.0?structure=flat: `sql-wasm.wasm` 684.897 B e `sql-wasm.js` 46.635 B; o campo `license` não existe nos metadados do pacote, mas há arquivo `/LICENSE` de 2.199 B, **não lido**]. Que 1.15.0 é a versão mais recente (`latest`) e os demais arquivos da tabela vêm de consulta anterior não repetida: [S] até confirmação nas releases do GitHub (https://github.com/sql-js/sql.js/releases, não lida):

| Arquivo | Bytes | Observação |
|---|---|---|
| `dist/sql-wasm.wasm` | 684.897 | Motor SQLite (~0,65 MiB) |
| `dist/sql-wasm.js` | 46.635 | Cola JS |
| `dist/worker.sql-wasm.js` | 50.099 | Variante com protocolo de Worker pronto |
| `dist/sql-wasm-inline.js` | 959.508 | WASM embutido em base64 em um só arquivo |
| `dist/sql-asm.js` | 1.414.714 | Versão asm.js, sem WASM (fallback) |

Download típico da v1: `sql-wasm.js` + `sql-wasm.wasm` = **731.532 bytes (~0,73 MB)**.

**DuckDB-WASM** (`@duckdb/duckdb-wasm`) [S: consulta anterior não repetida nesta rodada], tag `latest` no jsDelivr = **1.33.1-dev57.0** (uma versão de desenvolvimento) e tag `next` = 1.33.1-dev110.0 (https://data.jsdelivr.com/v1/packages/npm/@duckdb/duckdb-wasm?structure=flat). Arquivos de https://data.jsdelivr.com/v1/packages/npm/@duckdb/duckdb-wasm@1.33.1-dev57.0?structure=flat:

| Arquivo | Bytes |
|---|---|
| `dist/duckdb-eh.wasm` | 35.913.747 |
| `dist/duckdb-mvp.wasm` | 41.325.187 |
| `dist/duckdb-coi.wasm` | 35.644.774 |
| `dist/duckdb-browser-eh.worker.js` | 773.223 |
| `dist/duckdb-browser-mvp.worker.js` | 839.642 |
| `dist/duckdb-browser-coi.worker.js` | 886.740 |
| `dist/duckdb-browser.mjs` | 32.000 |

Download típico do bundle `eh`: 35.913.747 + 773.223 + 32.000 = **36.718.970 bytes (~36,7 MB)**. O bundle `coi` é de multi-thread e depende de isolamento de origem (COOP/COEP) [S], indisponível no GitHub Pages.

### 2.2 Comparação

| Critério | **sql.js** | DuckDB-WASM | SQLite WASM oficial (`@sqlite.org/sqlite-wasm`) | wa-sqlite | AlaSQL |
|---|---|---|---|---|---|
| Download inicial | **~0,73 MB** [V] | **~36,7 MB** (eh) [S] | Não medido [S] | Não medido [S] | Não medido [S] |
| Dialeto | SQLite | DuckDB (colunar, window functions e agregações ricas) | SQLite | SQLite | Subconjunto de SQL em JS |
| Persistência | Em memória; exportar/importar arquivo `.sqlite` | Em memória; OPFS possível [S] | OPFS, parte exige isolamento de origem [S] | VFS variados [S] | Opcional (localStorage/IndexedDB) |
| Precisa de COOP/COEP | Não [S] | Só no bundle `coi`; `eh` não [S] | Algumas funções [S] | Algumas VFS [S] | Não |
| Dependências | Nenhuma | Nenhuma, mas muito pesado | Nenhuma | Nenhuma | Nenhuma |
| Adequação a ensino básico/intermediário (SELECT, JOIN, GROUP BY, CTE) | Alta | Alta | Alta | Alta | Média: diverge do SQL padrão |
| Adequação a dados grandes (centenas de MB) | Baixa (memória) | Alta | Média | Média | Baixa |
| Licença | MIT [S] | MIT [S] | Domínio público/Apache [S] | MIT [S] | MIT [S] |
| Manutenção | Ativa (1.15.0 como mais recente: [S], releases não lidas) | Ativa, mas `latest` aponta para dev [S] | [S] | [S] | [S] |

### 2.3 Decisão proposta

**sql.js na v1.** Razões, na ordem das prioridades:

1. É cerca de 50 vezes menor que o DuckDB-WASM (0,73 MB [V] contra 36,7 MB [S]), o que cabe em GitHub Pages, no orçamento de repositório e em conexões móveis.
2. SQLite cobre o currículo de SQL para análise de dados (SELECT, JOIN, agregações, CTE, window functions nas versões recentes do SQLite [S]).
3. Sem requisito de cabeçalhos HTTP.
4. Dependência mínima, com API estável e pequena.

**DuckDB-WASM fica fora da v1.** Só entra como módulo opcional "Laboratório avançado" se houver caso de uso que SQLite não cobre (arquivos grandes, Parquet, SQL analítico avançado). Condições: justificativa escrita, versão estável fixada (não a `dev`), carregamento só no clique, aprovação do Lucas (impacto de ~36,7 MB no repositório e na banda; ver `infrastructure-costs.md`).

Lacuna: não verifiquei a versão do SQLite embutida no sql.js 1.15.0, então o suporte exato a window functions e funções JSON é [S].

---

## 3. Python no navegador

### 3.1 Dados verificados

**Pyodide 314.0** [S], publicado em **8 de junho de 2026**, Python 3.14.2, Emscripten 5.0.3 (rebaixado de [V]: a única leitura anterior foi por espelho de terceiros, `hn.jakechampion.name`; a URL primária https://blog.pyodide.org/posts/314-release/ não pôde ser lida nesta rodada por falta de aprovação de permissão). Pontos relevantes, todos [S]:

- Novo esquema de versão que acompanha o Python (314.x = Python 3.14).
- `pyodide.asm.js` foi renomeado para `pyodide.asm.mjs`; **Workers clássicos deixaram de ser suportados**.
- `sqlite3`, `ssl` (sem TLS real) e `lzma` voltaram à biblioteca padrão; OpenSSL foi removido.
- O artigo afirma que o download inicial **cresce** (stdlib restaurada), **sem informar números**.

**Tamanho em bytes do Pyodide: não verificado** [S]. A página de implantação (https://pyodide.org/en/stable/usage/downloading-and-deploying.html) não pôde ser lida. Não existe número seguro neste documento; a Fase 4 deve baixar a distribuição, registrar o tamanho de cada arquivo (núcleo `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`, e cada pacote como numpy e pandas) e registrá-los em `vendor/manifest.json`. Expectativa qualitativa [S]: o núcleo tem dezenas de MB e pandas/numpy somam ainda mais, muito acima de sql.js.

Pode haver patch 314.x posterior a 314.0 (hoje é 2026-11-12); **não verificado**.

Licença: [S] MPL-2.0 para o Pyodide; CPython sob a PSF License; pacotes (numpy, pandas) sob BSD. Confirmar.

### 3.2 Comparação

| Critério | **Pyodide** | PyScript | JupyterLite | MicroPython WASM | Brython / Skulpt |
|---|---|---|---|---|---|
| Natureza | CPython compilado para WASM | Camada de conveniência sobre Pyodide/MicroPython [S] | Distribuição Jupyter que roda sobre Pyodide [S] | Intérprete minúsculo | Python traduzido para JS |
| Pandas/NumPy | Sim (pacotes WASM) [S] | Sim, via Pyodide [S] | Sim, via Pyodide [S] | Não | Não |
| Peso | Grande (não medido) | Pyodide + runtime extra | Maior ainda, mais ativos de interface [S] | Pequeno [S] | Pequeno [S] |
| Build? | Não | Não, mas costuma ser usado por CDN [S] | Normalmente exige build/CLI própria [S], conflita com D1 | Não | Não |
| Dependências extras | Nenhuma | Nova camada a manter | Muitas | Nenhuma | Nenhuma |
| Adequação a Data Analytics | **Alta** | Alta (mas redundante) | Alta, experiência de notebook | Baixa | Baixa |
| Controle de Workers e cancelamento | Total | Menor | Menor | Total | Limitado |

### 3.3 Decisão proposta

**Pyodide direto, em Worker de módulo, iniciado por clique.** Razões:

1. Única opção leve em complexidade que entrega o ecossistema real (pandas) exigido para "ambiente de Python".
2. PyScript acrescenta uma camada sem benefício para o caso de uso e dificulta o controle de Workers.
3. JupyterLite entrega a experiência de notebook, mas depende de ferramentas de empacotamento [S] e conflita com D1.
4. MicroPython, Brython e Skulpt não rodam pandas; servem apenas para tutoriais de lógica.

**Dependência de decisão D3.** Hospedar Pyodide em arquivos próprios é a recomendação, mas depende do tamanho medido (pendência P1). Se estourar o orçamento de 300 MB de vendor ou a política de banda, abrir proposta formal para exceção de CDN com versão fixada, com todos os campos da regra de custo (`infrastructure-costs.md`, seção 6).

---

## 4. Leitura de CSV: Papa Parse

### 4.1 Dados verificados

Papa Parse **5.7.1** como `latest` [S]: veio de consulta anterior à API do jsDelivr (https://data.jsdelivr.com/v1/packages/npm/papaparse?structure=flat) não repetida nesta rodada; as releases do GitHub (https://github.com/mholt/PapaParse/releases) não puderam ser lidas. Listagem de arquivos em https://data.jsdelivr.com/v1/packages/npm/papaparse@5.7.1?structure=flat [S]:

| Arquivo | Bytes |
|---|---|
| `papaparse.min.js` | **19.012** (~19 KB) |
| `papaparse.js` | 51.775 |
| `LICENSE` | 1.079 (conteúdo não lido) |

A existência de um arquivo `LICENSE` de 1.079 bytes é compatível com uma licença curta como a MIT, mas **o conteúdo não foi lido**. Licença: [S] MIT.

### 4.2 Comparação

| Critério | **Papa Parse** | Parser próprio | d3-dsv | DuckDB (CSV nativo) |
|---|---|---|---|---|
| Peso | ~19 KB [S] | 0 KB (código nosso) | [S] pequeno | Já pago pelos 36,7 MB, se adotado |
| Casos difíceis (aspas, quebras de linha, BOM, delimitador automático, codificação) | Cobre bem [S] | Fácil errar | Cobre, sem autodetecção de delimitador [S] | Cobre |
| Streaming e `worker: true` | Sim [S] | A construir | Não | Sim |
| Manutenção | Biblioteca madura [S] | Nossa | Mantida, mas mais um pacote | , |

### 4.3 Decisão proposta

**Papa Parse**, com `worker: true` para arquivos grandes. Custo de 19 KB é irrisório frente ao risco de parser caseiro com CSVs reais de operação (aspas, vírgula decimal brasileira, ponto e vírgula, BOM de Excel). Registrar a pendência de ler a licença.

Excel (`.xlsx`) não foi avaliado. Se os cursos exigirem importar planilhas, avaliar leitor de XLSX em fase posterior; a licença e a forma de distribuição precisam de verificação [S].

---

## 5. Fontes: locais ou Google Fonts

### 5.1 Fatos do código [C]

- Portfólio carrega CSS do Google Fonts em `index.html` linhas 26–28 e em `certificacoes.html` linhas 22–24.
- Famílias: Bricolage Grotesque (eixos `opsz` 12..96 e `wght` 500, 650, 750), Figtree (400, 500, 600, 700), JetBrains Mono (400, 500).
- `styles.css` linhas 14–16 define as pilhas com `system-ui` como fallback.

### 5.2 Comparação

| Critério | Google Fonts (como no portfólio) | **Fontes locais** |
|---|---|---|
| Privacidade do visitante | Cada visita contacta servidores do Google e expõe o IP [S] | Nenhuma requisição de terceiros |
| Regra "zero serviço externo" | Viola | Cumpre |
| Funciona offline / em Service Worker | Não | Sim |
| Desempenho | Dois domínios extras e CSS bloqueante | Mesma origem, controle de `font-display` e `preload` |
| Manutenção | Nenhuma | Manter arquivos e `@font-face` |
| Licença | OFL [S] | OFL [S], redistribuição permitida, com o texto da licença junto |
| Peso | Entrega apenas subconjuntos usados | Depende de quais subconjuntos incluir; **não medido** [S] |

### 5.3 Decisão proposta

**Fontes locais nas páginas do Hub** (`hub/assets/fonts/`, se D3 aprovado), orçamento de ≤ 120 KB à parte do shell (C3), em woff2, subconjunto latino (cobre acentos do português) [S], com `font-display: swap`, e `@font-face` com os mesmos nomes de família para que as variáveis de `styles.css` funcionem sem edição. O portfólio **mantém** Google Fonts (C9; alterá-lo violaria D4); "zero requisição externa" vale só para páginas do Hub. Migrar o portfólio para fontes locais é uma melhoria opcional que precisa de aprovação.

Pendências: obter os arquivos de origem confiável, confirmar a licença OFL de cada família, medir o peso final, incluir o texto da licença na pasta.

---

## 6. Como servir arquivos grandes

### 6.1 Opções

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **Arquivos próprios no repositório, versão no caminho** (recomendada, D3) | Zero terceiros; versão fixa; funciona com Pages | Aumenta repositório e histórico; banda do Pages; sem `Cache-Control` imutável [S] | **Padrão**, com orçamento |
| CDN pública (jsDelivr etc.) com versão fixa | Não pesa no repositório; cache compartilhado; alta disponibilidade [S] | Terceiro externo; privacidade; risco de indisponibilidade; depende de D3; vira "serviço externo" | Só por exceção documentada |
| GitHub Releases como origem | Não pesa no repositório | CORS e MIME incertos, URL de download redireciona [S]; não testado | Não usar sem teste |
| Git LFS | Reduz histórico | Pages pode não servir objetos LFS [S]; não testado | Não usar |
| Bucket externo (S3, R2 etc.) | Escala | Serviço novo, possível custo; backend implícito | Não, exige aprovação |
| Hospedar em outro host estático gratuito (Cloudflare Pages, Netlify) | Permite `_headers` [S] | Quebra a premissa D2 e a estrutura | Plano B de migração |

### 6.2 Práticas

1. Versão no caminho: `hub/assets/vendor/sql.js@1.15.0/`. Troca de versão = novo diretório e atualização do `manifest.json`, o que contorna o cache curto [S].
2. Carregamento só nas páginas que precisam, e Python só após clique.
3. Verificar tamanho antes de commitar: nenhum arquivo individual acima de 50 MB sem proposta [S, meta de projeto, aproxima limite do Git não verificado].
4. Remover da pasta os arquivos não usados (debug, `.map`, bundles de Node, versão `asm.js`), mantendo só os necessários. Para o sql.js: `sql-wasm.js` e `sql-wasm.wasm`.
5. Opcional: Service Worker com Cache API para evitar rebaixar WASM, escopo `hub/` apenas (Fase 7).
6. Medir compressão real (gzip/brotli) em um deploy de teste e registrar no `manifest.json` (`transferBytes`).

---

## 7. Demais componentes (sem biblioteca externa)

| Componente | Abordagem | Observação |
|---|---|---|
| Interface e roteamento | HTML estático multipágina + ES Modules | D1 |
| Editor de código | `<textarea>` com destaque simples | Evita CodeMirror/Monaco (pesados); reavaliar se a UX exigir |
| Gráficos | SVG gerado no cliente, como o `mockSVG` do portfólio [C] | Avaliar biblioteca só se a necessidade comprovar |
| QR Code do PIX | Imagem estática pré-gerada, ou gerador pequeno com licença verificada | Pendente (D5); não pesquisado |
| Payload PIX (BR Code) | Texto estático "copia e cola"; CRC16 conforme padrão EMV | Gerador em JS puro é pequeno; validar em app bancário real [S] |
| IA | Curadoria estática; sem API | Qualquer LLM local exige download externo de modelo e aprovação |
| Vite/TypeScript | **Não propostos** | D1 mantida |

---

## 8. Tabela-resumo de versões, licenças e tamanhos

| Biblioteca | Versão verificada | Tamanho a baixar (sem compressão) | Fonte do tamanho | Licença | Status da licença |
|---|---|---|---|---|---|
| sql.js | 1.15.0 [S: `latest` não confirmado nas releases] | 731.532 B (js + wasm) [V] | API jsDelivr, lida em 2026-11-12 (ver trecho abaixo) | MIT | [S] não verificada |
| Papa Parse | 5.7.1 [S] | 19.012 B [S] | API jsDelivr, consulta não repetida | MIT | [S] não verificada |
| Pyodide | 314.0 (8 jun 2026) [S]; patch posterior [S] | não verificado | blog do Pyodide: só via espelho | MPL-2.0 | [S] não verificada |
| DuckDB-WASM | `latest` = 1.33.1-dev57.0 [S] | 36.718.970 B (bundle eh) [S] | API jsDelivr, consulta não repetida | MIT | [S] não verificada |
| Fontes (3 famílias) | , | não medido | , | OFL | [S] não verificada |

Fontes primárias **lidas** nesta rodada:

- https://data.jsdelivr.com/v1/packages/npm/sql.js@1.15.0?structure=flat (tamanhos de `sql-wasm.wasm` e `sql-wasm.js`)
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Trechos lidos em 2026-11-12 (N6/C10.5), que sustentam o [V]: jsDelivr devolveu `/dist/sql-wasm.wasm` 684,897 bytes e `/dist/sql-wasm.js` 46,635 bytes (soma 731.532 B). GitHub Pages: "Published GitHub Pages sites may be no larger than 1 GB."; "GitHub Pages sites have a *soft* bandwidth limit of 100 GB per month."; "GitHub Pages sites have a *soft* limit of 10 builds per hour."

## 9. Pendente de verificação (rebaixado para [S] por falta de leitura primária)

Chamadas de WebFetch a estas URLs primárias foram interrompidas por falta de aprovação de permissão; nada foi inferido nem citado de espelhos:

- https://blog.pyodide.org/posts/314-release/ (versão, data, Python 3.14.2, Workers clássicos). A leitura anterior foi por espelho de terceiros e deixa de contar como [V].
- https://pyodide.org/en/stable/usage/downloading-and-deploying.html (tamanho do Pyodide).
- https://github.com/sql-js/sql.js/releases (versão mais recente do sql.js).
- https://github.com/mholt/PapaParse/releases (versão mais recente do Papa Parse).
- Metadados jsDelivr de Papa Parse e DuckDB-WASM (consulta anterior não repetida).
- Arquivos `LICENSE` de todas as bibliotecas e fontes.
