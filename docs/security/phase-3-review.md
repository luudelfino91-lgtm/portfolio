# Revisão de segurança e privacidade do CSV e do SQL playground (T-312, Fase 3)

Branch `feat/phase-3-csv-sql`, commits `85b41ca` (CSV), `77b9245` (SQL), vendor em `76920c4`. Data: 2026-11-12. Revisor: security-auditor. Nenhum código de `hub/` nem teste foi alterado. Este é o único arquivo escrito.

Base da análise: o conteúdo de `HEAD` (`77b9245`). Os testes em navegador rodaram contra cópias extraídas com `git archive HEAD` em `/tmp/aud/` (fora do repositório). Durante a revisão a árvore de trabalho recebeu alterações de outros agentes (`i18n.js`, `README.md` do vendor, testes, `manifest.json` e `SHA256SUMS` ainda sem commit); elas não foram revisadas aqui, exceto onde indicado.

## Veredito: APROVAR COM RESSALVAS

Sem achados críticos nem altos. 1 médio (CSV com muitas colunas trava e derruba a aba), 4 baixos, 6 informativos.

Condições para dar a Fase 3 por concluída:
1. Tratar SEC-P3-01 (limite de colunas no leitor de CSV) ou o Lucas aceitá-lo por escrito. SR-10 e ST-04 exigem "nunca travamento".
2. Decidir sobre `'wasm-unsafe-eval'` (SEC-P3-02): remover depois de um teste rápido em Firefox e Safari, ou manter até esse teste. Nenhuma das duas opções bloqueia o merge.
3. Registrar SEC-P3-03 como restrição de projeto para a Fase 4 (o Worker não é limitado pela CSP da página).

Tudo foi testado só no Chrome 153 (Chrome for Testing) em Linux, com servidor local. Firefox, Safari, GitHub Pages real e celular não foram testados (ver "NÃO verificado").

## 1. CSP de cada página

Comando: extração da `<meta>` de cada `index.html` e carga no Chrome (`/tmp/aud/scripts/sweep.js`). Em todas as 5 páginas a `<meta>` está na linha 4, logo após `<head>` (SR-04).

| Página | Diferença em relação à base da Fase 2 |
|---|---|
| `hub/`, `hub/ferramentas/`, `hub/privacidade/` | Nenhuma. `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'` |
| `hub/ferramentas/csv/index.html:4` | Acrescenta `worker-src 'self'` |
| `hub/ferramentas/sql/index.html:4` | Acrescenta `worker-src 'self'` e `'wasm-unsafe-eval'` no `script-src` |

Sem `unsafe-inline`, `unsafe-eval`, `blob:`, `data:` em script nem domínio externo. Console do Chrome em cada uma das 5 páginas, ao abrir: zero erros e zero avisos, zero requisições fora da origem.

### 1.1 `'wasm-unsafe-eval'` é necessário? Não no Chrome (testado). Recomendação: remover, com teste em Firefox e Safari.

O que foi executado:
- Cópia `/tmp/aud/site-nowasm` (fora do repo) igual a `HEAD`, só sem o token na linha 4 do `sql/index.html`. Conferido com `diff` (uma linha diferente).
- Mesmo roteiro nas duas versões (Playwright, Chrome 153): abrir a página, esperar o estado `ready`, executar `SELECT sqlite_version() AS v, 1+1 AS r`.

Resultado medido:

| Versão | Motor SQL | Consulta | `WebAssembly.Module` no documento (script externo da página) | `eval` / `new Function` no documento |
|---|---|---|---|---|
| Original (com token) | `ready`, SQLite 3.54.1 | `3.54.1 2` | permitido | bloqueados |
| Sem o token | `ready`, SQLite 3.54.1 | `3.54.1 2` | **bloqueado** (`Compiling or instantiating WebAssembly module violates ... CSP`) | bloqueados |

Conclusões:
- O desenvolvedor está certo. O WASM inicia sem o token porque `sql-wasm.js` e `sql-wasm.wasm` só são carregados dentro do Worker (`sql-worker.js:18` faz `importScripts`; `sql/index.html` não tem `<script>` do sql.js, só `theme.js`, `i18n.js`, `nav.js` e `sql.js` da página). O documento nunca compila WASM.
- O Worker não é limitado pela `<meta>` da página (ver SEC-P3-03). Dentro do Worker do Hub, `eval` e `new Function` funcionam e o WASM compila. Logo o token não tem efeito sobre o motor.
- O token só afeta o documento. Ele permite compilar WASM no documento, o que não amplia a execução de JavaScript (`eval` e `new Function` seguem bloqueados nas duas versões). Quem já executa script no documento já faz tudo o que o JS faz. O ganho de removê-lo é pequeno: menos uma flexibilização, e as 5 páginas ficam com o mesmo `script-src`.
- A afirmação do `hub/assets/vendor/README.md` ("o WebAssembly exige `'wasm-unsafe-eval'` nas páginas que carregam sql.js") está incorreta para este desenho, onde só o Worker carrega o sql.js. Vale para quem carregar sql.js numa `<script>` da página.

Risco por navegador:
- Firefox (não testado): pesquisa em fontes secundárias. O Mozilla Bug 1735696 (sincronização de testes WPT, "[CSP] Fix dedicated worker inheritance", resolvido, Firefox 95) diz que o Worker dedicado recebe a CSP dos cabeçalhos da própria resposta, exceto `data:`, `blob:` e `filesystem:`, que herdam do criador. Um Worker de URL `https:` em GitHub Pages, sem cabeçalho CSP, ficaria sem política, como no Chrome. Isso é leitura de um bug, não teste.
- Safari/WebKit (não testado): a mensagem de 2021 na lista `webkit-dev` apenas supõe, por testes WPT, que o WebKit usa a CSP da resposta, e pede confirmação. Não há confirmação nas fontes que li. Safari é o navegador com maior incerteza.
- Se algum navegador herdasse a CSP da página no Worker (comportamento que, segundo a mesma lista, o Chrome tinha antes), remover o token faria o SQL falhar nesse navegador (falha fechada: a tela "init" aparece; sem vazamento). Manter o token seria então necessário.

Decisão recomendada: remover `'wasm-unsafe-eval'` do `sql/index.html`, condicionado a um teste de fumaça do playground SQL em Firefox e Safari (desktop e iOS), por QA ou pelo Lucas. Se qualquer um falhar, restaurar o token com um comentário no README explicando o motivo. Sem esse teste, manter o token é aceitável e não bloqueia o merge. Corrigir o texto do README do vendor nos dois casos. Quem decide a CSP é o Lucas (aprovação); eu recomendo.

`worker-src 'self'` é inócuo e útil como documentação. Não foi testada a CSP sem ele.

## 2. Arquivos do usuário (CSV e SQL)

### 2.1 XSS
- Busca estática em `hub/` (exceto `vendor/`): `grep -nE "innerHTML|insertAdjacentHTML|outerHTML|document\.write|eval\(|new Function|setTimeout\(['\"]|setInterval\(['\"]|javascript:|srcdoc|DOMParser|createContextualFragment"`: zero ocorrências. Zero `style=`, `on*=` e `<script>` inline nas páginas (`grep -nE "[[:space:]]style=|[[:space:]]on[a-z]+=|<script>[^<]|javascript:"`). Dado do usuário entra por `textContent` em `csv.js:73,89-108,120` e `sql.js:102,110,119-123,151,165-166,189-192`.
- `i18n.js` aplica `data-i` com `textContent` (`i18n.js:482`); os contêineres de resultado e erro (`sqlErrM`, `sqlResTable`, `csvData` etc.) não têm `data-i`. A rotina `Hub.t` (i18n.js:467-473) só devolve texto, sempre atribuído por `textContent`.
- Teste em navegador com `docs/testing/fixtures/xss.csv` (seis linhas com `<img onerror>`, `<script>`, `javascript:`, `"><svg/onload>`, `=cmd|...`) nas duas ferramentas: cabeçalhos e células aparecem literais; zero elementos `img`, `iframe`, `script`, `b` ou `svg[onload]` criados dentro das ferramentas; zero diálogos `alert`; zero erros de página; `({}).polluted === undefined`.
- Nome de arquivo `<img src=x onerror=alert(1)>.csv`: ferramenta CSV mostra `File: <img src=x onerror=alert(1)>.csv` como texto; SQL gera a tabela `img_src_x_onerror_alert_1`. Zero `img`, zero diálogos.
- SQL: `SELECT '<img src=x onerror=alert(1)>' AS "<b>x</b>", '</script><script>alert(1)</script>' AS y` e `SELECT * FROM "<img src=x onerror=alert(1)>"` (erro do motor repete o nome): tudo literal, sem execução.
- Não testei a troca PT/EN com os dados na tela (ST-01/ST-18) em navegador. Por leitura, `Hub.onLang` chama `renderAll()` a partir do estado (`sql.js:405`, `csv.js:206`), sem reinterpretar HTML.

### 2.2 Injeção SQL e identificadores (SR-07, SR-08)
- Todo identificador gerado passa por `sqQuote` (`sql-worker.js:36`): `DROP TABLE` (190), `CREATE TABLE` (191), `INSERT` (192), `PRAGMA table_info` (74), `DROP TABLE IF EXISTS` (223). Valores só por parâmetro `?` (192-202). O nome do arquivo nunca entra em código gerado além de `sqTableName`. Há `SAVEPOINT`/`ROLLBACK TO` na carga (188-210).
- Nomes saneados por `sqClean` (39-43): sem acentos, minúsculas, só `\p{L}\p{N}_`. Isso já impede aspas, ponto e vírgula e espaços.
- Teste com `docs/testing/fixtures/xss.csv` e arquivos próprios (`/tmp/aud/fx`, com cabeçalhos `__proto__,constructor,hasOwnProperty,select,rowid,sqlite_master,"x"" INTEGER); DROP TABLE data; --",toString` e duas colunas sem nome):
  - Arquivo `a"; DROP TABLE x;--.csv` virou a tabela `a_drop_table_x`; cabeçalho `x" INTEGER); DROP TABLE data; --` virou a coluna `x_integer_drop_table_data`. Nada foi executado. Consulta posterior em `sqlite_master` mostrou as 10 tabelas esperadas.
  - `select.csv` virou `select_`; `main.csv` virou `main`; `sqlite_master.csv` virou `t_sqlite_master`; `__proto__.csv` virou `proto`; coluna `rowid` virou `rowid_`; colunas vazias viraram `col_9`, `col_10`; duplicatas são numeradas.
- Palavras reservadas: testei as 147 palavras-chave da lista da documentação do SQLite (digitada por mim, não extraída do binário) com `CREATE TABLE k (k INTEGER)` e `SELECT/JOIN/GROUP BY/ORDER BY` sem aspas, no sql.js vendorizado em Node (`/tmp/aud/scripts/kw.js`). As 61 que falham sem aspas estão todas em `SQ_RESERVED` (`sql-worker.js:33`). Três palavras da lista (`current_date`, `current_time`, `current_timestamp`) estão na lista e funcionam sem aspas (excesso inofensivo). A lista cobre o que importa para digitar sem aspas.
- Poluição de protótipo: cabeçalhos viram elementos de arrays (`Papa.parse` sem `header: true`, `csv-worker.js:98-126`). Mas `SQ_RESERVED = {}` (32) e `used = {}` (59) são objetos comuns, e o cabeçalho `constructor` bate em `Object.prototype.constructor`: coluna e tabela chamadas `constructor` foram renomeadas para `constructor_` (reproduzido). Sem poluição, só renomeação desnecessária (SEC-P3-08).

### 2.3 Tratamento do arquivo
- `File.size` é checado antes de ler: `csv.js:146-147`, `sql.js:330-331` (limite `> 10485760`, vale o limite exato de 10 MiB). Testado: arquivo de 10.485.759 e de 10.485.760 bytes carregam nas duas ferramentas (2,5 s no CSV, 0,5 s no SQL); binário (bytes 0-255) e UTF-16 recebem o erro "does not look like a text file" (`csv-worker.js:88-89`); 15 MB recebe "too large" em ambas. Não testei 10.485.761 bytes (a comparação é `>`, por leitura).
- Leitura em Worker: `file.arrayBuffer()` e `Papa.parse` rodam em `csv-worker.js` e `sql-worker.js`. `importScripts('csv-worker.js')` em `sql-worker.js:17` funciona e o `onmessage` do CSV é substituído na linha 227. Papa Parse é chamado só com texto (sem `download`, `worker`, `header`, `transform`; `grep` em `hub/assets/js`), então os caminhos de XHR e de Worker por Blob existentes no Papa Parse não são usados.
- **Colunas (SEC-P3-01):** ver registro. Resumo: `csv.js:87,99` cria um `th` por coluna e um `td` por coluna em cada uma das 100 linhas de prévia, sem limite.
- SQL: tabela com mais de 2000 colunas falha no `CREATE TABLE` e vira erro recuperável (`wide-5000.csv`: "too many columns on wide_5000", zero tabelas criadas, motor segue `ready`).

## 3. Execução do SQL do usuário

Teste em Chrome 153 contra o `HEAD`, usando a interface real (`/tmp/aud/scripts/sql-test.js`), com `basic.csv` (10.000 linhas) carregada:

| Caso | Resultado medido |
|---|---|
| `SELECT load_extension('/lib/evil.so')` | `no such function: load_extension`. `pragma_compile_options` inclui `OMIT_LOAD_EXTENSION` |
| `SELECT ... pragma_function_list` por `readfile, writefile, edit, fsdir, zipfile, system, shell, load_extension, fts5` | `NULL`: nenhuma existe |
| `ATTACH DATABASE 'evil.db' AS e; CREATE TABLE e.t ...; SELECT` | Funciona, no sistema de arquivos virtual (em memória) do Emscripten. `PRAGMA database_list` mostra `/dbfile_...`. Nada é gravado fora da aba |
| `VACUUM INTO '/tmp/out.db'` | Funciona, mesmo sistema de arquivos virtual. Nenhum acesso ao disco do usuário (o navegador não oferece esse acesso ao Worker) |
| `PRAGMA writable_schema=1` | Permitido. Só afeta o banco em memória do próprio usuário; `Reset database` ou recarga apaga |
| `WITH RECURSIVE` infinito, limite de 5 s | Aos 5 s o Worker é terminado. Mensagem "The query was stopped: time limit reached". A aba voltou a `ready` em 6,1 s com a tabela CSV recarregada (`SELECT count(*) FROM basic` = 10000). Tabelas criadas por SQL se perdem, e o aviso diz isso |
| Mesma consulta, thread principal | 65 tiques de 50 ms em 3 s (esperado ~60): a aba segue responsiva. O botão Parar apareceu aos 3 s, parou e restaurou o motor |
| `zeroblob(2000000000)` | `string or blob too big` (erro recuperável). `zeroblob(500000000)` com `length()`: 500000000 em 72 ms (alocação preguiçosa) |
| 5 milhões de linhas | 307 ms; exibe 1.000 linhas; contagem "more than 1,000,000" (`sql-worker.js:26,111`) |
| Texto de ~100 MB em uma célula | 1,4 s; célula cortada em 2.000 caracteres (`sql-worker.js:27,87`) |
| `CREATE TABLE big AS ... 30 milhões de linhas x randomblob(200)` com limite de 30 s | Aos ~24 s o navegador encerrou o motor: "The SQL engine stopped unexpectedly ... used too much memory". Motor recriado, `SELECT 1` seguinte funcionou. A aba sobreviveu. Pico de memória não medido |
| Requisições fora da origem durante toda a sessão | zero. Zero erros de página |

Observações:
- O limite de tempo (5/10/30/60 s) é aplicado por `setTimeout` na thread principal (`sql.js:260`) que termina o Worker (`stopWorker`, 202-208) e recria o banco, recarregando as tabelas de CSV a partir dos objetos `File` em memória (`restart`, 293-302). A recarga em lote de arquivos grandes não tem limite de tempo próprio; há botão "Cancel loading".
- Resultado: linhas (1.000) e células (20.000) limitadas (`sql.js:16-17`), então o DOM não explode.
- Não testei: produto cartesiano, 200 erros seguidos (ST-05), 50 MB, celular.

## 4. Privacidade (RNF-03)

Teste no Chrome: ferramenta CSV com `canary-CANARIO-NOME-4c8e1b.csv`, troca para PT e tema escuro, ferramenta SQL com o mesmo arquivo e uma consulta com texto `SQL-CANARIO-777`; depois inspeção (`/tmp/aud/scripts/priv-test.js`):
- Requisições fora da origem: zero (nem de contexto). Requisições que não sejam `GET` ou que tenham corpo: zero. Nenhuma URL contém "canar". Total: 34 requisições, todas da própria origem.
- `location.href` sem estado nenhum do usuário. `localStorage`: só `ld-lang` e `ld-theme`. `sessionStorage` vazio, `document.cookie` vazio, `ctx.cookies()` vazio, IndexedDB vazio, `caches` vazio, zero Service Workers.
- Busca estática: nenhum `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `download`, `createObjectURL`, `clipboard` nem `window.open` em `hub/assets/js/*.js` além do uso interno `postMessage` de Worker. Os arquivos de vendor contêm `fetch`, `XMLHttpRequest` e `Blob` (carregador do Emscripten e modo de Worker do Papa Parse); as chamadas do Hub não os usam. A única URL do Emscripten é montada por `locateFile` relativa ao Worker (`sql-worker.js:239`). A requisição do `.wasm` aparece na lista de rede só da origem.
- Os textos de `privacidade/` (`hub.priv.s1` a `s4`) batem com o comportamento medido. Os trechos que dizem "provisórias até a revisão final" continuam adequados (PRV-10).
- `img-src data:` (SEC-P2-04): nenhuma página, CSS ou JS do Hub usa `data:` (`grep`: zero). Pode ser removido.

## 5. Dependências vendorizadas

Verificado (comandos executados):
- `sha256sum` dos 5 arquivos em `hub/assets/vendor/` bate com `README.md` e, para os 3 binários/JS, com `git show 76920c4:<arquivo> | sha256sum`.
- `npm pack sql.js@1.16.0 papaparse@5.7.1` em pasta temporária. `sha512` dos dois `.tgz` calculado com `openssl` bate com `npm view <pacote> dist.integrity` (`sql.js` `q/JOZuJf...MRMw==`, `papaparse` `qOR+UDWv...DvY0g==`). `cmp` byte a byte: `sql-wasm.js`, `sql-wasm.wasm` e `papaparse.min.js` do repositório são idênticos aos do tarball. SHA-256 dos `LICENSE` também bate. Licença `MIT` nos dois `package.json`.
- `npm install --package-lock-only --ignore-scripts` + `npm audit` com `sql.js@1.16.0` e `papaparse@5.7.1` num `package.json` temporário: **`found 0 vulnerabilities`**. Esse resultado cobre apenas o banco de advisories do npm.
- Consulta ao índice de advisories do GitLab para `papaparse` (via WebFetch): lista GHSA-798h-g4j5-5537 (duplicata), CVE-2020-36649 (ReDoS, afeta versões anteriores à 5.2.0, corrigido na 5.2.0) e GMS-2020-421 (duplicata, sem versões). 5.7.1 está fora das faixas informadas. A página não prova que não existam outros.
- Motor: o sql.js 1.16.0 executado reporta SQLite **3.54.1** (`select sqlite_version()`). Fontes secundárias (linuxcompatible.org, 16/10/2026) dizem que 3.54.1 corrige um estouro de buffer de heap em builds de 32 bits; o WASM do sql.js é de 32 bits, e a versão executada é a 3.54.1. A VulnCheck publicou CVE-2026-119586 (comando injection no `.recover` do **shell** `sqlite3`, "3.54.1 e anteriores"). O sql.js não inclui o shell; a página não esclarece se a biblioteca é afetada, e eu não testei. Esses dois itens vêm de fontes secundárias.
- Procedência: `package.json` do sql.js e do papaparse não têm `postinstall`/`preinstall` (não relevante para o uso vendorizado, mas conferido).
- `manifest.json` e `SHA256SUMS`: existem na árvore de trabalho, ainda sem commit (`??` no `git status`); `sha256sum -c SHA256SUMS` passa com 5 `OK`.

NÃO foi possível verificar:
- GitHub Advisory Database direto: `gh api /advisories` foi bloqueado ("sessions are bound to their configured repositories"). OSV (`api.osv.dev`) foi recusado pelo proxy. A página de advisories do GitLab para `sql.js` (`advisories.gitlab.com/pkg/npm/sql.js/`) não foi concedida. Snyk e `sql.js` (pesquisa web): resultados ruidosos (outros pacotes), sem advisory identificado para `sql.js`; não é prova de ausência.
- Que o tarball npm corresponda ao repositório de origem no GitHub (nem compilação reproduzível do WASM).
- Os CVEs do SQLite embutido além do que as fontes secundárias acima dizem; `sqlite.org/cves.html` não foi lido.
- Que a versão 1.16.0 do sql.js contenha de fato o patch do 3.54.1 além da string de versão executada.

Resumo: não encontrei vulnerabilidade conhecida em `sql.js 1.16.0` nem `papaparse 5.7.1` nas fontes que consegui consultar (npm audit = 0, GitLab para papaparse). Isso é ausência de evidência nas fontes consultadas, não prova.

## 6. MIME do `.wasm` e cabeçalhos no GitHub Pages

- O shell não alcança `github.io` (`curl -I https://luudelfino91-lgtm.github.io/portfolio/` retornou "CONNECT tunnel failed, response 403"; `pages.github.com` também 403). **O MIME real do `.wasm` no Pages e os cabeçalhos reais não foram verificados.**
- Teste local do pior caso: servidor com `.wasm` como `application/octet-stream` e `X-Content-Type-Options: nosniff`. O sql.js continua funcionando: `ready`, SQLite 3.54.1. Chrome registra dois erros no console (`wasm streaming compile failed: ... Incorrect response MIME type` e `falling back to ArrayBuffer instantiation`) e usa o caminho alternativo. Ou seja, MIME errado degrada (console com erros e mais lento), mas não quebra no Chrome. Não testado em Firefox e Safari.
- O servidor Python local serve `.wasm` como `application/wasm` e não diz nada sobre o Pages.
- CSP continua só por `<meta>` (SEC-P2-02): sem `frame-ancestors`, sem `report-uri`, sem `sandbox`.

## 7. Cobertura dos requisitos SR/ST

| ID | Resultado | Evidência ou nota |
|---|---|---|
| SR-01, SR-03 | Passa | `grep` zero; testes de XSS (seção 2.1) |
| SR-02 | Passa (leitura) | contêineres de resultado sem `data-i`; troca PT/EN com dados não testada por mim |
| SR-04 | Passa, com mudança documentada | seção 1 |
| SR-05, SR-06 | Passa | seção 4 |
| SR-07 | Passa | seção 2.2 |
| SR-08 | Passa; observação | seção 2.2, SEC-P3-08 |
| SR-09 | Não aplicável | não há exportação na Fase 3 (T-308 não iniciado; `grep` por `download`, `createObjectURL` vazio) |
| SR-10 | **Falha parcial** | tamanho, linhas e células: ok. Colunas no CSV: sem limite (SEC-P3-01) |
| SR-11 | Passa | SQL e leitura em Worker; Parar/limite recriam o Worker; falha de memória recuperável (seção 3) |
| SR-12 | Não aplicável | Python é Fase 4 |
| SR-13 | Passa | só `ld-lang` e `ld-theme` |
| SR-14 | Parcial | `manifest.json` ainda sem commit; sem conferência de hash em tempo de execução nem na CI (SEC-P3-05) |
| SR-15 | Passa | `grep` de padrões de segredo no diff `7eb0336..HEAD` fora de `vendor/` só achou nomes de arquivo de teste (`..\..\etc\passwd.csv`) e fixtures; zero padrões de chave nos arquivos vendorizados |
| SR-16, SR-17 | Passa | zero links externos, zero `_blank`; `location.search` só aceita `lang=pt|en` |
| ST-02, ST-08, ST-09, ST-11, ST-16 | Passa (Chrome) | seções 1, 2.2, 4 |
| ST-04 | **Falha** em muitas colunas (CSV); passa em vazio/binário/UTF-16/limite | seção 2.3 |
| ST-05 | Passa nos casos testados | seção 3 |
| ST-01, ST-10, ST-13, ST-18 | Parcial | ST-10 só no documento (no Worker a CSP não vale, SEC-P3-03); ST-13 só por leitura; ST-18 não executado por mim |

## 8. Registro de riscos novos (Fase 3)

| ID | Sev. | Risco | Recomendação | Dono |
|---|---|---|---|---|
| SEC-P3-01 | **Média** | O leitor de CSV cria `th` por coluna na tabela de colunas e na tabela de prévia, e `td` por coluna em 100 linhas (`csv.js:87,99,102-111`), sem limite de colunas. Medido: `wide-5000.csv` (1,4 MB, 99 linhas, 5.000 colunas): 1.015.235 elementos no DOM e a thread principal parada por 10,7 s. `wide-1M.csv` (8 MB, 4 linhas x 1.000.000 colunas): aba do Chrome caiu ("Target crashed") após ~27 s. A ferramenta SQL não sofre disso: o `CREATE TABLE` falha com erro (limite de 2.000 colunas do SQLite) e a thread principal ficou livre. Impacto: negação de serviço da própria aba ao abrir um arquivo hostil ou acidental; sem vazamento de dados. SR-10 ("nunca travamento") e ST-04 não passam | Limitar colunas exibidas (por exemplo 200, com aviso "mostrando N de M colunas") e/ou recusar acima de um teto (2.000 colunas, igual ao SQLite) com mensagem clara, aplicado no Worker antes de enviar o resultado; enviar do Worker só as colunas exibidas. Acrescentar caso de teste com 5.000 e 1.000.000 de colunas | frontend-developer; QA |
| SEC-P3-02 | Baixa | `'wasm-unsafe-eval'` na CSP da página SQL é desnecessário no Chrome (testado). Mantê-lo permite compilar WASM no documento sem ganho. Não testei Firefox e Safari | Seção 1.1: remover após teste de fumaça em Firefox e Safari; corrigir o `README.md` do vendor | frontend-developer; QA; Lucas aprova a CSP |
| SEC-P3-03 | Baixa (Fase 3). **Alta para a Fase 4** | A CSP por `<meta>` não alcança Workers que vêm de URL `http(s)`. Medido no Chrome 153 com Worker de teste `/hub/assets/js/probe-worker.js` (cópia fora do repo): dentro do Worker, `eval` e `new Function` funcionam e `fetch` para outra origem (`http://127.0.0.1:8103`) é **permitido**, enquanto o mesmo `fetch` no documento é bloqueado por `connect-src`. Hoje o Worker só executa código estático do Hub e do vendor; dado do usuário é SQL (interpretado pelo SQLite) ou texto, nunca JS. Então não há caminho de exploração na Fase 3. Mas `connect-src 'self'` e `worker-src 'self'` não confinam o Worker, e a Fase 4 (Pyodide, código de terceiros colado) depende disso (SEC-01 da Fase 1) | Documentar. Na Fase 4 não confiar na `<meta>` para impedir rede no Worker: projetar isolamento diferente (por exemplo, Worker local que herde a CSP da página, `iframe` com `sandbox` e CSP própria, ou aceitar o risco e avisar o usuário; nenhuma dessas opções foi testada por mim) e testar no Chrome, Firefox e Safari antes de qualquer decisão. Testar com a aba Network | solution-architect; security-auditor; Lucas decide |
| SEC-P3-04 | Baixa | Consumo de memória por consulta não é limitado além do teto do WASM. Medido: consulta que cria ~30 milhões de linhas com `randomblob(200)` derrubou o motor em ~24 s com recuperação correta, mas o uso de RAM da aba durante esse tempo não foi medido e o limite de tempo selecionável vai até 60 s. Em celular com pouca RAM, a aba inteira pode ser encerrada pelo sistema | Medir pico de memória em notebook modesto e celular (já listado como pendência em `phase-03-status.md`); considerar reduzir o teto de tempo no celular ou `PRAGMA max_page_count` na criação do banco (decisão do desenvolvedor, não testada por mim) | frontend-developer; QA |
| SEC-P3-05 | Baixa | `manifest.json` e `SHA256SUMS` do vendor estão só na árvore de trabalho (sem commit). Sem conferência automática dos hashes (CI ou teste). A conferência em tempo de execução da SR-14 não existe; ela teria pouco valor contra quem altera o repositório (altera o hash junto) | Commitar `manifest.json` com campos de advisories (data da consulta, fonte, resultado: ver seção 5) e rodar `sha256sum -c` num teste. Atualizar a SR-14 para "verificada em teste/CI" | tech-lead; QA |
| SEC-P3-06 | Info | `ATTACH`, `VACUUM INTO` e `PRAGMA` (incluindo `writable_schema`) funcionam, mas só no sistema de arquivos virtual e no banco em memória do Worker. `load_extension` não existe (`OMIT_LOAD_EXTENSION`). Nenhum efeito fora da aba | Aceitar. Manter `OMIT_LOAD_EXTENSION` como critério ao atualizar o sql.js (testar `load_extension`) | frontend-developer |
| SEC-P3-07 | Info | Recarga silenciosa de tabela de mesmo nome: carregar `vendas.csv` de novo substitui `vendas` (com aviso "replaced"), inclusive uma tabela criada por `CREATE TABLE vendas` do usuário | Aceitar; aviso já existe | frontend-developer |
| SEC-P3-08 | Info | `SQ_RESERVED = {}` (`sql-worker.js:32`) e `used = {}` (`:59`) são objetos comuns: o nome `constructor` é tratado como "usado/reservado" e vira `constructor_` (reproduzido). Sem poluição de protótipo e sem efeito de segurança | Trocar por `Object.create(null)` ou `Map` | frontend-developer |
| SEC-P3-09 | Info | `Hub.t` substitui `{x}` em sequência (`i18n.js:471`): um nome de arquivo `{rows} {cols}.csv` apareceu como "Table rows_cols created from 2 rows 2 columns.csv" (reproduzido). Só texto, sem HTML | Substituir em uma passada com `replace(/\{(\w+)\}/g, ...)` | frontend-developer |
| SEC-P3-10 | Info | Pontos já conhecidos, sem mudança: `img-src data:` sem uso (remover); CSP por `<meta>` sem `frame-ancestors`; MIME e compressão do `.wasm` no Pages sem verificação | Ver SEC-P2-02, SEC-P2-04 | Lucas; frontend-developer |
| SEC-P3-11 | Info | O README do vendor (`hub/assets/vendor/README.md`) ainda diz que "advisories não foram verificados" e que o WASM "exige" o token. As duas frases ficam desatualizadas com este relatório | Atualizar o README depois de decidir SEC-P3-02 | frontend-developer; technical-writer |

Resolvidos ou fechados nesta fase: SEC-P2-03 (a regra "revisar `worker-src` e `wasm-unsafe-eval` com aprovação do Lucas" foi cumprida por este relatório; a aprovação final do Lucas continua pendente).

## 9. NÃO verificado

- Firefox, Safari (desktop e iOS), Edge e Chrome em celular: nada executado. Em particular: se o playground SQL funciona sem `'wasm-unsafe-eval'` e se o Worker herda a CSP da página.
- GitHub Pages real: MIME do `.wasm`, compressão, cabeçalhos, comportamento em subpasta `/portfolio/`. `file://`. O shell não alcança `github.io`.
- Advisories: GitHub Advisory Database direta, OSV e página GitLab do `sql.js` indisponíveis. Cobertura real: `npm audit` (0 vulnerabilidades) e GitLab para `papaparse`. CVEs do SQLite 3.54.1 só por fontes secundárias; `sqlite.org/cves.html` não lido.
- Que os arquivos npm correspondam ao código-fonte no GitHub dos dois projetos.
- Troca PT/EN com dados na tela (ST-18), arrastar e soltar real, leitor de tela, produto cartesiano e 200 erros seguidos (ST-05), arquivos de 50 MB, pico de memória.
- Exportação de CSV (SR-09): não existe. Precisa de revisão quando T-308 for implementada.
- Teste do `manifest.json` e `SHA256SUMS` em CI: não existe. As duas alterações sem commit na árvore (`i18n.js`, `README.md`, testes, `privacidade/index.html`) não foram revisadas.
- Parecer jurídico, LGPD e GDPR: fora de escopo.

Os scripts de teste desta revisão ficaram em `/tmp/aud/scripts/` (fora do repositório, não preservados) e os comandos relevantes estão descritos acima.
