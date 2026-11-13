# Fase 4: isolamento do Worker de Python (SEC-P3-03, SEC-01)

Branch `feat/phase-4-groundwork` (base `9222afc`). Data: 2026-11-13. Autor: security-auditor. Escopo: experimentos reais; nenhum código de `hub/` foi alterado e nada foi commitado. A ferramenta final não foi implementada. Medidas de tamanho: `docs/architecture/pyodide-measurement.md`.

Pergunta: dá para impedir rede e `eval` **dentro do Worker** que roda Python de terceiros, mesmo no GitHub Pages (sem cabeçalhos HTTP próprios, só `<meta>` CSP)?

**Resposta curta (Chrome 153, testado): sim**, com Worker criado a partir de `blob:` ou `data:` (que herdam a CSP do documento criador), e **não** com Worker de URL `http(s)` (reproduz SEC-P3-03). O Pyodide 314.0.7 roda nos dois arranjos que confinam. O arranjo com menor superfície (iframe `sandbox` + Worker `data:` módulo) custa 6,1 MiB de download a cada carga de página, porque o cache HTTP não é reaproveitado (medido). **Firefox e Safari não foram testados**, e há um modo de falha aberta se um navegador não herdar a CSP (seção 6, mitigado por teste canário).

## 1. Método e limites do ambiente

- Chrome for Testing **153.0.8010.12**, Linux, headless, via Playwright (`/opt/npm-tools/node_modules/playwright`, `executablePath /usr/bin/google-chrome`), 2 núcleos, 8 GB de RAM.
- Duas origens locais: `http://127.0.0.1:8191` (o "site") e `http://127.0.0.1:8192` (a "origem de fora", com `Access-Control-Allow-Origin: *`, para que um bloqueio seja da CSP e não de CORS). **O servidor de fora registra toda requisição que recebe**: "hits no servidor de fora = 0" é a prova de que nada saiu, independente do que o navegador relata.
- Páginas de sonda em pasta temporária (`/tmp/p4/`, fora do repositório, **não preservadas**). Cada página tem `<meta http-equiv="Content-Security-Policy">` na primeira linha do `<head>`, sem script inline. O servidor local não envia nenhum cabeçalho de segurança. Base da CSP dos testes: `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src <variável>; base-uri 'none'; form-action 'none'; object-src 'none'`, mais `frame-src 'self'` nas páginas que embutem iframe.
- Em cada Worker, a sonda tenta: `eval`, `new Function`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts` e `import()` para a origem de fora, `fetch` para a própria origem, IndexedDB, Cache API, OPFS, Worker aninhado; e registra os eventos `securitypolicyviolation`. Depois carrega o Pyodide (módulo `pyodide.mjs` por `import()` absoluto, `loadPyodide({indexURL})`), roda `1+1`, e dentro do Python tenta `js.fetch`, `pyodide.http.pyfetch`, `pyodide.http.open_url` (XHR síncrono), `js.eval`, `js.Function`, `js.importScripts`, `js.WebSocket`, e lê `js.document`, `js.window`, `js.localStorage`, `js.top`, `js.parent`, `js.opener`, o sistema de arquivos virtual e o IndexedDB.
- **Não testado**: Firefox, Safari, celular, HTTPS, **GitHub Pages real** (o shell não alcança `github.io`), `micropip`, `urllib` dentro do Python, WebTransport, `<iframe csp="...">`, carregamento de pacotes (numpy, pandas), `postMessage` de arquivos grandes, leitor de tela. Todo o resultado é de **um navegador, uma versão**.

## 2. Resultados por variante (Chrome 153)

Legenda das colunas: **eval** = `eval`/`new Function` no Worker; **rede de fora** = `fetch`, XHR, WebSocket, EventSource, `importScripts`, `import()` para `:8192`; **hits** = requisições recebidas pelo servidor de fora; **armazenamento** = IndexedDB, Cache API e OPFS dentro do Worker; **Pyodide** = carrega e roda `1+1`.

| Variante | Worker criado? | eval | rede de fora | hits | armazenamento | Pyodide `1+1` |
|---|---|---|---|---|---|---|
| **A1** Worker clássico de URL same-origin, `worker-src 'self'` | sim | **permitido** | **permitida** (todos) | 6 | permitido | **não**: `Classic web workers are not supported` |
| **A2** Worker módulo de URL same-origin | sim | **permitido** | **permitida** | 9 (inclui os do Python) | permitido | sim (2,3 a 2,5 s) |
| **B1** Worker clássico de `blob:`, `worker-src blob:` | sim | bloqueado | bloqueada | **0** | permitido | sim (ver nota do detector, seção 5) |
| **B2** Worker módulo de `blob:` | sim | bloqueado | bloqueada | **0** | permitido | **sim** (2,3 a 3,0 s) |
| **B0** `blob:` com `worker-src 'self'` (sem `blob:`) | **não**: bloqueado pela CSP | n/a | n/a | 0 | n/a | n/a |
| **B3** como B2, sem `'wasm-unsafe-eval'` | sim | bloqueado | bloqueada | 0 | permitido | **não**: `WebAssembly.instantiateStreaming(): Compiling or instantiating WebAssembly module violates ... 'unsafe-eval'` |
| **B4** como B2, `connect-src` só com `http://127.0.0.1:8191/vendor/pyodide/` | sim | bloqueado | bloqueada | 0 | permitido | sim; `fetch` a outro caminho da própria origem **bloqueado** |
| **B5** como B2, `connect-src 'none'` | sim | bloqueado | bloqueada | 0 | permitido | **não** (o Pyodide precisa de `fetch` para o `.wasm`) |
| **C1** iframe `sandbox="allow-scripts"` com `srcdoc`, Worker módulo de `blob:` | sim, mas **falha ao iniciar** | n/a | n/a | 0 | n/a | não (ver nota do módulo, seção 5) |
| **C3** igual a C1, Worker **clássico** de `blob:` | sim | bloqueado | bloqueada | 0 | **bloqueado** | sim |
| **C2** iframe `sandbox`, documento próprio, Worker **de URL** | **não**: `SecurityError ... cannot be accessed from origin 'null'` | n/a | n/a | 0 | n/a | n/a |
| **D1** iframe `sandbox`, documento próprio, Worker módulo de `blob:` | sim, mas **falha ao iniciar** | n/a | n/a | 0 | n/a | não |
| **D2** iframe `sandbox`, documento próprio, Worker clássico de `blob:` | sim | bloqueado | bloqueada | **0** | **bloqueado** | sim |
| **D3** iframe `sandbox`, documento próprio, Worker **módulo de `data:`**, `worker-src data:` | sim | bloqueado | bloqueada | **0** | **bloqueado** | **sim** (2,6 a 3,2 s) |
| **D4** iframe `sandbox`, Worker **clássico** de `data:` | sim | bloqueado | bloqueada | 0 | bloqueado | sim |

Respostas às perguntas:

**(a) Baseline, SEC-P3-03 reproduzido.** Em A1 e A2 (Worker de URL, com a mesma `<meta>` que o Hub usa), `eval` e `new Function` funcionam, `fetch`, XHR, WebSocket, EventSource, `importScripts` e `import()` chegam à origem de fora (o servidor recebeu `/js_fetch`, `/js_xhr`, `/js_ws`, `/js_es`, `/x.js`). **O mesmo vale dentro do Python com o Pyodide carregado (A2)**: `js.fetch`, `pyfetch` e `open_url` para `:8192` funcionaram (o servidor recebeu `/py_jsfetch`, `/py_pyfetch`, `/py_openurl`; `js.eval('1+1')` devolveu 2). Ou seja: com Worker de URL, código Python colado por terceiros **exfiltra o CSV** (SEC-01 confirmado como explorável). Worker de URL não pode ser usado para código não confiável.

**(b) Worker de `blob:`.** Herda a CSP do documento criador, no Chrome 153: `eval` e `new Function` ficam bloqueados (`EvalError ... 'unsafe-eval' is not an allowed source`), `fetch`, XHR, WebSocket, EventSource, `importScripts` e `import()` para outra origem ficam bloqueados por `connect-src` / `script-src` (eventos `securitypolicyviolation` registrados no Worker e **zero hits no servidor de fora**). Dentro do Python (B1, B2, B4): `js.fetch` -> `TypeError: Failed to fetch`; `pyfetch` -> `AbortError`; `open_url` -> `NetworkError`; `js.eval` e `js.Function` -> `EvalError`; `js.importScripts` -> bloqueado; `js.WebSocket.new(...)` retorna o objeto, mas a conexão é bloqueada (0 hits). O que o arranjo exige:
- `worker-src blob:` (sem isso o Worker não nasce, B0). `script-src` sozinho não basta.
- **`'wasm-unsafe-eval'` em `script-src`**: no Worker de `blob:` o Pyodide **não** instancia o WebAssembly sem ele (B3). No Worker de URL (Fase 3) isso não valia (SEC-P3-02), porque aquele Worker não herdava a CSP. Aqui o token é necessário, e é a única flexibilização de script.
- `connect-src 'self'` (ou o prefixo do caminho do vendor, B4): o Pyodide busca `.wasm`, `python_stdlib.zip` e `pyodide-lock.json` por `fetch`.
- O Pyodide **não precisa de `unsafe-eval`**: carrega e roda com `eval` bloqueado.
- A fonte do Worker não pode ser buscada pela página por `fetch` se `connect-src` for restrito (B4/B5 falharam no primeiro desenho por isso): a fonte tem de vir embutida em um `<script src>` externo que a exponha como string, ou ser montada em outro lugar.
- Worker aninhado: um Worker criado de dentro do Worker de `blob:` (de `blob:` ou `data:`) **herda a mesma política**: `fetch` e `eval` bloqueados (B2, teste "nested").
- Em B2 o Worker tem a origem do site (`http://127.0.0.1:8191`) e continua com acesso ao armazenamento dela: ver seção 4.

**(c) iframe `sandbox="allow-scripts"` (origem opaca).**
- Worker de **URL não funciona** (C2): a origem opaca não pode carregar script de outra origem.
- Worker módulo de `blob:` **não inicia** no Chrome 153 (C1, D1). Reproduzido com um Worker trivial `postMessage("hi")`: clássico responde, módulo falha com `error`, sem mensagem.
- Worker clássico de `blob:` (C3, D2) e clássico/módulo de `data:` (D3, D4) funcionam e herdam a CSP do documento do iframe (eval e rede de fora bloqueados, 0 hits). Para `srcdoc` o iframe herda também a CSP da página pai (a interseção vale).
- Em todos, **IndexedDB** dá `SecurityError`, **Cache API** é indisponível (`caches` indefinido ou `SecurityError`), **OPFS** negado, e `origin` do Worker é `null`.

**(d) iframe + Worker de `blob:`/`data:`.** É o que D2 e D3 medem. **D3 (módulo de `data:`) é a combinação que usa o Pyodide 314 como ele é suportado (módulo) e é a de menor superfície.** D2 (clássico de `blob:`) só funciona por um efeito colateral, descrito na seção 5.

**Resultado complementar, dependência de CORS.** Com o servidor sem `Access-Control-Allow-Origin`, B2 (origem do site) continuou funcionando, mas **D3 e D2 falharam** (`Failed to fetch dynamically imported module .../pyodide.mjs`): a origem opaca precisa de CORS nos arquivos do Pyodide. O GitHub Pages responde com `Access-Control-Allow-Origin: *` (recordação [S]), mas **isto não foi verificado**: o shell não alcança `github.io`. É a primeira coisa a conferir no deploy.

**Resultado complementar, cache HTTP (medido).** Servidor com `Cache-Control: public, max-age=3600`, três cargas seguidas no mesmo contexto do navegador:

| Arranjo | Carga 1 | Carga 2 | Carga 3 |
|---|---|---|---|
| B2 (Worker `blob:`, origem do site) | `.wasm` 3.600.748 B + stdlib 2.503.781 B transferidos | **0 B** (cache) | **0 B** |
| D3 (iframe `sandbox` + Worker `data:`) | 3.600.748 + 2.503.781 | **3.600.748 + 2.503.781 de novo** | **de novo** |

No iframe de origem opaca o cache HTTP **não é reaproveitado** entre cargas no Chrome 153 (chave de cache particionada por origem opaca). Efeito: o custo de 6,1 MiB se paga **a cada carga da página do Python**, não uma vez por visitante. Isso muda a conta de banda do Pages (100 GB/mês, limite flexível): o "sessão fria" vira "visita à página". **Não testado**: contornar buscando os arquivos na página pai (cache da origem do site) e entregando-os ao iframe; o Pyodide busca por URL, então isso exigiria blob URLs nomeados ou adaptação, e nenhum dos dois foi tentado.

## 3. Python dentro do Pyodide: DOM, storage, arquivos [testado, Chrome 153]

- `js.document`, `js.window`, `js.localStorage`, `js.sessionStorage`, `js.top`, `js.parent`, `js.opener`: **ausentes** (`AttributeError`) em todas as variantes. Não há DOM nem `localStorage` nem cookies de página no Worker. A página só é alcançada pelas mensagens que o runner enviar.
- Sistema de arquivos virtual: `os.listdir('/')` = `dev, home, lib, proc, tmp` (memória do WASM); `/etc/passwd` e `/proc/self/environ` **não existem**. Python só vê os arquivos que a página gravar nele.
- `navigator.sendBeacon` não existe em Worker (Chrome). `RTCPeerConnection` e `SharedWorker` indefinidos em Worker. **`WebTransport` existe** (`typeof` = `function`) e **não foi testado** (sem servidor adequado); pela especificação ele segue `connect-src`.
- `BroadcastChannel` e `navigator.locks` existem. No Worker de origem do site (B2) um `BroadcastChannel` alcança abas do Hub da mesma origem (nenhuma escuta hoje); no iframe de origem opaca fica isolado em `null`.

## 4. Riscos da execução de código arbitrário do usuário (T-402, RNF-03)

Medido com um Worker de `blob:` módulo (B2) e uma página de CSP igual à da sonda (`/tmp/p4`, scripts `dos`):

| Risco | Experimento | Resultado |
|---|---|---|
| Laço infinito | `while True: pass`, 3 s, depois `worker.terminate()` | A thread principal seguiu viva (30 ticks de 100 ms em 3 s; um clique durante o laço respondeu em 111 ms). `terminate()` retornou em 0 ms. **Reiniciar** um Worker novo com Pyodide levou **2,2 s** (cache HTTP desligado). `1+1` no novo Worker: 23 ms. Estado do usuário (variáveis, arquivos virtuais) **perde-se** ao encerrar |
| Memória | acumular `bytearray(50 MB)` até falhar | O Python lançou `MemoryError` após **4.250 MB** em 2,5 s; heap do WASM chegou a **4.294.901.760 B (4 GiB)**; a aba **sobreviveu**. Em notebook com 8 GB passou; **o teto de 4 GiB não é configurável aqui**, e em celular a aba tende a ser encerrada pelo sistema antes (não medido) |
| Recursão e exceções | recursão infinita; `1/0` | `RecursionError` capturado; exceção devolvida como erro do Python; Worker segue vivo |
| Inundação de saída | `while True: print('x'*100)` com um `postMessage` por linha, 3 s | 356.516 mensagens em 3 s; um clique no mesmo período levou **656 ms** (contra 111 ms no laço sem saída). A thread principal degrada. **A saída precisa ser agrupada em lotes e limitada** (linhas e bytes), e a página precisa descartar o excesso |
| Tempo limite | temporizador na página que chama `terminate()` | Funcionou como acima. O teto de tempo é decisão da página, não do Worker |
| Leitura de arquivos | `os.path.exists` de caminhos do host | Só o sistema virtual; só o que o usuário carregar e a página gravar |
| Persistência além de idioma e tema (RNF-03) | IndexedDB, Cache API e OPFS dentro do Worker | **Em B2 (origem do site): permitidos** (`indexedDB.open` abriu, `caches.open` e `getDirectory` funcionaram), logo código Python poderia gravar dados localmente e ler qualquer IndexedDB/OPFS/Cache futuro do Hub. **Em D2/D3 (origem opaca): bloqueados.** Não houve gravação cross-tab testada, só abertura |
| Rede | ver seção 2 | Bloqueada de/para outra origem em B/C/D; **permitida em A** |
| Saída para o servidor do próprio site | `connect-src 'self'` | Permite `GET` a qualquer caminho do site (dados na query string chegam aos logs do GitHub Pages, que o atacante não lê). B4 reduz a um prefixo de caminho (só o vendor); exige a **URL absoluta de produção** na `<meta>` (depende da hospedagem/domínio final) |

## 5. Pontos frágeis dos arranjos

1. **Detector de Worker clássico do Pyodide.** O Pyodide 314 recusa Worker clássico chamando `importScripts("data:text/javascript,")` e considerando "não clássico" se der erro (lido no `pyodide.mjs`: função `isClassicWorker`). Nos Workers de `blob:`/`data:` clássicos (B1, C3, D2, D4) **a CSP bloqueia essa chamada, o detector é enganado e o Pyodide carrega**. Isso funciona por acidente e pode quebrar em qualquer versão. O arranjo que usa suporte oficial é Worker **módulo** (B2, D3).
2. **Worker módulo de `blob:` em origem opaca falha no Chrome 153** (C1, D1). Só `data:` módulo (D3) ou clássico passam. Não testado em outros navegadores.
3. **`worker-src data:`** permite ao runner criar Workers `data:`; o código Python pode criar um aninhado, que **herda a mesma política** (testado em D3: fetch e eval bloqueados), então não amplia o alcance.
4. O Pyodide com `eval` bloqueado funcionou **nesta** versão (314.0.7). Atualizar o Pyodide exige repetir o teste.
5. O carregamento de pacotes (`loadPackage`, `micropip`) **não foi testado**: o `pyodide-lock.json` padrão aponta para os 357 pacotes e `micropip` busca no PyPI; em B/D o PyPI estaria bloqueado por `connect-src`, mas isso é dedução da política, não teste.

## 6. Recomendação de arquitetura

### 6.1 Alvo: iframe `sandbox="allow-scripts"` + Worker módulo de `data:` (variante D3)

Menor superfície medida: rede e `eval` bloqueados no Worker e nos Workers aninhados; sem IndexedDB, Cache API, OPFS ou `BroadcastChannel` da origem do site; sem DOM nem `localStorage` (não há no Worker de qualquer forma); origem `null`. Sem `allow-same-origin`, **nunca** (com ele o iframe volta à origem do site e perde o ganho de armazenamento; não foi testado, mas é a definição do atributo).

Desenho:
1. A página da ferramenta (Hub) não carrega Pyodide. No clique em "Executar", cria `<iframe sandbox="allow-scripts" src=".../runner.html">` (documento próprio, mesma pasta, com `<meta>` CSP).
2. CSP do `runner.html` (via `<meta>`; a diretiva `sandbox` não vale em `<meta>`, por isso o atributo fica no iframe): `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'` (ou o prefixo absoluto do vendor, ver 6.3); `worker-src data:; base-uri 'none'; form-action 'none'; object-src 'none'`. A página pai precisa de `frame-src 'self'`.
3. O runner cria o Worker módulo a partir de `data:` com a fonte embutida em um `<script src>` externo, carrega o Pyodide **por URL absoluta** do vendor, com a lista fechada de pacotes.
4. **Teste canário antes de rodar código do usuário**: o Worker tenta `eval('1')` e um `fetch` para uma URL de fora (por exemplo uma URL inexistente em outro domínio); se `eval` funcionar ou o evento `securitypolicyviolation` não ocorrer, a ferramenta **recusa executar** e mostra mensagem. Isso cobre o modo de falha aberta se um navegador não herdar a CSP (Firefox e Safari não testados). A parte "eval bloqueado no Worker" foi medida; o canário em si não foi implementado nem testado como recurso.
5. Comunicação pai <-> iframe só por `postMessage`; o pai valida `event.source === iframe.contentWindow` (a origem das mensagens é `"null"`) e trata tudo o que vem como texto não confiável (`textContent`, sem HTML). Arquivos do usuário vão por `postMessage` (transferível) para o iframe, que os grava no sistema virtual.
6. **Limites impostos pela página**: botão Parar (`terminate()` do Worker e remoção do iframe), tempo limite padrão (a decidir; teste usou 3 s), saída em lotes com teto de linhas e bytes, tamanho máximo do arquivo carregado, e aviso de memória (teto de 4 GiB do WASM, não configurável).
7. Sem `micropip`; lista fechada de pacotes autohospedados; `pyodide-lock.json` filtrado; nenhum `loadPackage` de URL.

### 6.2 Alternativa se o alvo não for viável: Worker módulo de `blob:` na própria página (variante B2)

Se o GitHub Pages **não** enviar `Access-Control-Allow-Origin` nos arquivos, ou se o custo de banda do D3 (cache não reaproveitado, seção 2) for inaceitável, a alternativa é B2 com a mesma CSP (`worker-src blob:`, `'wasm-unsafe-eval'`, `connect-src` restrito) mais o canário. Ela **fecha rede e eval** (o risco SEC-01), mas **não fecha armazenamento**: o código do usuário alcança IndexedDB, Cache API, OPFS e `BroadcastChannel` da origem. Condição: o Hub **não pode guardar dados do usuário nesses armazenamentos** (hoje só `localStorage` de idioma e tema, inacessível ao Worker). Cada nova persistência futura precisa ser revisada contra isto.

### 6.3 O que NÃO usar

- Worker de URL `http(s)` para Python (A1, A2): a CSP não vale, exfiltração comprovada.
- Confiar na `<meta>` da página para limitar um Worker de URL (SEC-P3-03).
- Worker clássico do Pyodide (depende do efeito colateral da seção 5).
- `allow-same-origin` no sandbox.
- CDN para os arquivos do Pyodide (`connect-src` precisaria de domínio externo; ver D3c).

### 6.4 Restrições de CSP e hospedagem

- `connect-src` pode ser restrito a **prefixo de caminho** (B4, medido): reduz o vazamento por `GET` ao servidor do próprio site, mas exige **URL absoluta de produção** na `<meta>`. Isso depende de a hospedagem final (D2, e se haverá domínio próprio) estar decidida. Sem isso, `'self'` e a exposição residual da seção 4.
- No GitHub Pages **não há cabeçalhos próprios**: `frame-ancestors` e a diretiva `sandbox` não funcionam em `<meta>`; o iframe com atributo `sandbox` compensa só o lado do iframe.
- O `.wasm` precisa ser servido com `application/wasm` e, de preferência, comprimido: **não verificado no Pages**.

## 7. Registro de riscos novos (Fase 4)

| ID | Sev. | Risco | Recomendação | Dono |
|---|---|---|---|---|
| SEC-P4-01 | **Alta** (se Worker de URL), **Baixa** (com D3/B2 e canário) | Python de terceiros exfiltra o CSV por `js.fetch`, `pyfetch`, `open_url` em Worker de URL com `<meta>` (reproduzido em A2). Em Worker de `blob:`/`data:` herdando a CSP: 0 hits no servidor de fora no Chrome 153 | Seção 6.1 (D3) ou 6.2 (B2), mais canário; nunca Worker de URL | solution-architect; frontend-developer; Lucas decide |
| SEC-P4-02 | **Média** | **Falha aberta em navegador que não herde a CSP** em `blob:`/`data:` (Firefox, Safari não testados; no Chrome a herança só vale para estes esquemas, e antigamente o Chrome herdava a CSP da página nos Workers de URL, ver `phase-3-review.md`). Sem teste, a ferramenta pode rodar sem confinamento | Canário que recusa executar se `eval` funcionar; teste em Firefox e Safari antes do merge; QA por navegador | qa-engineer; Lucas |
| SEC-P4-03 | Média | D3/D2 dependem de `Access-Control-Allow-Origin` nos arquivos do Pyodide (falha sem ele, testado). O Pages envia `*` [S], não verificado | Conferir no deploy (`curl -I` no `.wasm` e no `.mjs`); se faltar, B2 | Lucas (deploy); tech-lead |
| SEC-P4-04 | Média | D3: cache HTTP não reaproveitado em iframe de origem opaca (6,1 MiB por carga, medido). Pressiona a banda de 100 GB/mês (limite flexível) e a experiência em rede lenta | Medir no Pages real; considerar B2 (cache funciona) ou entrega dos arquivos pela página pai (não testado); pôr aviso de tamanho antes do clique | solution-architect; Lucas |
| SEC-P4-05 | Média | Memória: heap do WASM sobe a 4 GiB sem teto configurável (medido); em celular a aba pode ser encerrada, e o usuário perde o estado | Aviso na UI; limite de tamanho de arquivo; botão Parar; testar em celular | frontend-developer; QA |
| SEC-P4-06 | Média | CPU: laço infinito ou mineração consome um núcleo até o usuário parar (a thread principal fica livre, medido). Sem tempo limite automático, a aba aquece | Tempo limite padrão com `terminate()` (decisão do Lucas: valor); botão Parar sempre visível | frontend-developer |
| SEC-P4-07 | Média | Em B2, código Python alcança IndexedDB/Cache/OPFS/BroadcastChannel da origem do site: persistência fora de idioma e tema (RNF-03) e leitura de dados futuros do Hub | D3 (bloqueia); ou proibir armazenar dados do usuário na origem | frontend-developer; security-auditor |
| SEC-P4-08 | Baixa | `connect-src 'self'` deixa `GET` a qualquer caminho do site (saída para os logs do Pages, que o atacante não lê) | Prefixo de caminho (B4) quando a URL final existir | Lucas (D2) |
| SEC-P4-09 | Baixa | Inundação de saída degrada a thread principal (clique em 656 ms contra 111 ms) | Lotes e teto de linhas/bytes | frontend-developer |
| SEC-P4-10 | Baixa | Dependência do detector de Worker clássico do Pyodide (variantes B1, C3, D2, D4 só funcionam por efeito colateral) | Usar só Worker módulo (B2, D3) | frontend-developer |
| SEC-P4-11 | Baixa | `WebTransport` existe no Worker e não foi testado contra `connect-src` | Incluir no canário/teste de QA; pela especificação segue `connect-src` | qa-engineer |
| SEC-P4-12 | Info | Licença do Pyodide e dos pacotes: o tarball npm não traz `LICENSE`; advisories não consultados; wheels de numpy/pandas não obtidos nem verificados (SHA-256) | Gate de licença e advisories no `manifest.json` antes de vendorizar | tech-lead; technical-writer |
| SEC-P4-13 | Info | Atualizar o Pyodide pode mudar o comportamento com `eval` bloqueado e o detector de Worker | Repetir estes testes a cada atualização | qa-engineer |

## 8. O que ainda depende do Lucas

1. **D3c**: aprovar o Pyodide em arquivos próprios, versão fixada (314.0.7), sem CDN. Os números (13,5 MB vendorizados, 6,1 MiB por carga com gzip) justificam arquivos próprios; falta o tamanho dos pacotes.
2. **Arquitetura**: D3 (maior isolamento, 6,1 MiB a cada carga) ou B2 (cache funciona, armazenamento da origem exposto). Recomendo D3 como alvo e B2 como fallback; a decisão é dele.
3. **Domínio/URL final de produção** (D2) para poder restringir `connect-src` a um prefixo de caminho.
4. Valor do **tempo limite** padrão, **tamanho máximo de arquivo** e se aceita o teto de 4 GiB de memória com aviso.
5. Quais **pacotes** entram (sugestão mínima: numpy e pandas, sem micropip, sem matplotlib na primeira versão).
6. Quem faz o **teste em Firefox e Safari** (desktop e iOS) e o **deploy de verificação** no Pages (CORS, compressão, MIME, cache).

Eu recomendo; não autorizo integração externa nem a decisão de arquitetura.

## 9. NÃO verificado

- Firefox, Safari, Edge, celular. Herança de CSP em `blob:`/`data:`, Worker módulo em iframe sandbox e opacidade de cache nesses navegadores.
- GitHub Pages real: CORS, `Cache-Control`, compressão, MIME, subpasta.
- HTTPS (os testes usaram `http://127.0.0.1`).
- Carregamento de numpy/pandas e seus wheels; `micropip`; `urllib`; WebTransport; `<iframe csp>`.
- Entrega dos arquivos do Pyodide pela página pai para contornar o cache de origem opaca.
- Memória real em celular; tempo de carga fora do localhost.
- O canário (descrito, não implementado).
- Scripts dos testes em `/tmp/p4/scripts/` (fora do repositório, não preservados). Os servidores de teste usaram só as portas 8191 a 8194.
