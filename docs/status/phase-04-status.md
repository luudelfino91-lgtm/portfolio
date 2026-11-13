# Project Status Report: Fase 4 (playground de Python), T-402

> **Atualização D11 (sem upload):** o Python não tem mais arquivo do usuário em `/data`; recebe os CSVs do cenário escolhido (fetch same-origin pela página, `postMessage` ao iframe). A CSP da página Python ganhou `connect-src 'self'`. PY-11 foi reescrito. Ver `docs/status/no-upload-status.md`.

**Data:** 2026-11-13. **Branch:** `feat/phase-4-python` (sem commit, sem PR). **Autor:** frontend-developer. **Estado:** **Implementado, testado só no Chrome (Chrome for Testing/Google Chrome via Playwright, Linux headless).** Não há revisão independente nem QA (T-405) desta entrega. **Não pronta para produção.**

## 1. O que existe

- `hub/ferramentas/python/index.html`: página do playground (editor `textarea` com rótulo, Executar, Parar, Limpar saída, tempo limite 5 a 120 s, CSV opcional, saída por `textContent`, aviso de privacidade, estado de carregamento "Carregando Python... cerca de 6 MB", PT/EN, tema claro/escuro). A pasta segue a convenção C1 (`.../python/index.html`), não `python.html`.
- `hub/ferramentas/python/runner.html`: documento do iframe, com `<meta>` CSP `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src data:; base-uri 'none'; form-action 'none'; object-src 'none'`.
- `hub/assets/js/python.js` (página), `python-runner.js` (dentro do iframe), `python-worker-src.js` (expõe a fonte do Worker como texto), `hub/assets/css/python.css`.
- `hub/assets/vendor/pyodide/`: Pyodide **314.0.7**, os 5 arquivos do núcleo (byte a byte do `npm pack pyodide@314.0.7`; SHA-512 do tarball conferido contra o registro) + texto da MPL-2.0. SHA-256 em `manifest.json`, `SHA256SUMS` (`sha256sum -c` OK) e `README.md`. Licença MPL-2.0; o tarball npm não traz `LICENSE`, o texto padrão foi copiado do sistema de build.
- Cartão de Python ativo em `hub/index.html` e textos da home em `i18n.js` (51 chaves `hub.py.*` em EN e PT, mais 2 chaves existentes ajustadas).
- `tests/hub/python.js` (103 verificações), integrado ao `tests/hub/run-all.sh`.

## 2. Arquitetura implementada (D10, variante D3)

1. A página não pede nenhum arquivo `pyodide*` até o clique em Executar (verificado na home e na página, e que depois do clique só os 5 arquivos do núcleo são pedidos).
2. No clique: `<iframe sandbox="allow-scripts" allow="" referrerpolicy="no-referrer" src="runner.html">` (sem `allow-same-origin`; origem opaca, `self.origin === "null"`).
3. O runner cria um Worker **módulo de `data:`** (fonte vinda do script externo `python-worker-src.js`), que herda a CSP do runner. O Pyodide é importado por URL absoluta (derivada de `location.href`), `packages: []`, `loadPackage` e `loadPackagesFromImports` substituídos por função que lança erro; sem `micropip`.
4. **Canário** (antes de baixar o Pyodide e antes de qualquer código do usuário): `eval`, `new Function`, `fetch` e `WebSocket` para `canary.invalid`. Exige `eval` bloqueado **e** evento `securitypolicyviolation` de `connect-src` para o `fetch`. Qualquer falha (inclusive navegador que não emita o evento) recusa executar com mensagem. Falha fechada.
5. Limites: tempo limite padrão 30 s (5 a 120, validado), código até 204.800 bytes, saída até 2.000 linhas e 256 KiB (três camadas: Worker, runner, página; aviso de truncamento), CSV até 10.485.760 bytes, aviso de memória (4 GiB) na interface. Parar e tempo limite removem o iframe (o runner também recebe `stop` e chama `worker.terminate()`); o Python recarrega no próximo Executar (6 MB de novo).
6. Mensagens: a página só aceita `event.source === iframe.contentWindow`, formatos conhecidos, tudo texto. O runner só aceita a página (`event.source === window.parent`) e trata o Worker como não confiável (o Python pode chamar `postMessage`): depois de pronto ignora `status` e `refused` forjados.
7. CSV: lido pela página, enviado por `postMessage` (cópia transferida), gravado em `/data/<nome sanitizado>`; o Python lê com `open()` ou `csv`. **Sem pandas** (T-403 continua fora). Um arquivo por vez.

## 3. CORS (SEC-P4-03) e servidor de teste

O runner está em origem opaca, então o navegador exige `Access-Control-Allow-Origin` nos arquivos do Pyodide. **O GitHub Pages envia `access-control-allow-origin: *` segundo a documentação, mas isso NÃO foi verificado (o shell não alcança github.io).** Foi adicionado esse cabeçalho **apenas** ao servidor de teste do próprio `tests/hub/python.js` (portas 8084 e 8085); o `lib.js` e os servidores 8081 a 8083 não foram alterados. PY-26 mostra o que acontece sem o cabeçalho: falha limpa, mensagem "O Python parou inesperadamente", UI utilizável. O fallback B2 (Worker `blob:` na própria página) **não foi implementado**, porque D3 funcionou com CORS; ele só é necessário se o Pages não enviar o cabeçalho (conferir com `curl -I` no `.wasm` e no `.mjs` depois do deploy).

## 4. Números da suíte (Chrome)

Execução de `tests/hub/run-all.sh` com `PORT_ROOT=8091 PORT_SUB=8092 PORT_GZ=8093` (as portas 8081/8082 estavam ocupadas por servidor de **outra worktree** em execução concorrente) e `HUB_LOG_DIR=/tmp/py-logs` (o script agora aceita esse diretório de logs: os logs em `/tmp/hub-*.log` são compartilhados entre worktrees e uma execução concorrente os sobrescreveu e contaminou a minha primeira contagem).

| Grupo | PASS | FAIL | N/A |
|---|---|---|---|
| reg | 16 | 0 | 0 |
| shell | 6 | 0 | 0 |
| i18n/tema/privacidade | 26 | 0 | 1 |
| a11y | 17 (ver nota) | 0 | 0 |
| budget_file | 5 | 0 | 0 |
| csv | 47 | 0 | 0 |
| sql | 139 | 0 | 0 |
| sample | 63 | 0 | 0 |
| **python (novo)** | **103** | 0 | 0 |
| check-i18n-keys | exit 0 | | |

Notas: (a) na execução completa o a11y deu 16 PASS e 1 FAIL (RSP-03), porque o teste isenta os cartões esticados por **nome** (`CSV viewer|SQL playground`) e o novo cartão "Python playground" não estava na lista; corrigi a lista em `tests/hub/a11y.js` e **reexecutei só o a11y: 17 PASS, 0 FAIL**. Não repeti a suíte inteira depois disso. (b) Mudanças em testes existentes, com justificativa: `a11y.js` HUB-02 agora espera 3 cartões (csv, sql, python) porque T-402 ativou o cartão; `a11y.js` RSP-03 inclui o cartão de Python na isenção; `run-all.sh` ganhou `python` e `HUB_LOG_DIR`. Nenhum teste do REG precisou de nova linha de base (REG-01 passa: só `docs/`, `hub/`, `tests/` mudaram). (c) Na linha de base (antes das minhas mudanças) o sql teve 1 FAIL (SQL-51, teclado) e 136 PASS; na execução final deu 139 PASS e 0 FAIL, então esse teste é intermitente (não investigado).

`tests/hub/python.js` cobre: `print(1+1)` -> `2` (raiz e subpasta `/portfolio/`, PT e EN); exceção com traceback sem `pageerror` e sem quadros internos do Pyodide; erro de sintaxe; `input()` -> EOFError; HTML impresso permanece texto; laço infinito + Parar (62 a 87 ms, nenhum Worker restante, roda de novo); Parar durante o carregamento; tempo limite de 5 s; valores inválidos de tempo; 200.000 linhas truncadas em 2.000; linha única de 400.000 caracteres; inundação de saída com UI responsiva; zero requisição `pyodide*` antes do clique (home e página); só os 5 arquivos do núcleo depois; `js.eval`, `js.Function`, `run_js`, XHR síncrono, `open_url`, `urllib`, `importScripts`, `micropip`, `loadPackage` falham; `js.fetch`/`WebSocket` sem await: **0 hits** no servidor de fora (porta 8085); toda tentativa de rede externa relatada pelo Chrome falhou por CSP; sonda direta no Worker (origem `null`, IndexedDB/Cache/OPFS negados); mensagens forjadas pelo Python; canário (duas simulações de falha: eval permitido; rede liberada) recusa sem baixar o Pyodide e sem executar; CSP/sandbox presentes; CSV (10.485.760 aceito, 10.485.761 recusado, nome sanitizado, remoção); código de 204.800 bytes aceito e 204.811 recusado; sem CORS (falha limpa); paridade de chaves PT/EN; axe-core 16 estados com zero violações (qualquer impacto); temas; nenhum cookie e `localStorage` só `ld-lang`/`ld-theme`.

## 5. NÃO verificado (leia antes de aprovar)

- **Só Chrome.** Firefox, Safari (desktop e iOS), Edge, celular: **não testados.** Em especial: herança de CSP em Worker `data:`, Worker módulo em iframe sandbox e o evento `securitypolicyviolation` em Worker. Se algum navegador não os entregar, o canário recusa executar (falha fechada), e a ferramenta fica indisponível nele; isso é o comportamento desejado, mas **não foi observado em nenhum navegador real**, só simulado por CSP afrouxada no servidor de teste.
- **GitHub Pages real:** CORS, MIME do `.wasm`, compressão, subpasta, cache. Tudo local (`http://127.0.0.1`). A subpasta foi testada só como alias `/portfolio/` do servidor de teste.
- **Cache:** em iframe de origem opaca o cache HTTP não é reaproveitado (medido na Fase 4, SEC-P4-04): 6,1 MiB a cada abertura da página, aceito por D10. O servidor de teste não comprime; o número de 6,1 MiB é o medido antes, não repetido aqui.
- **Memória:** o teto de 4 GiB é só um aviso na interface; nenhuma execução de alto consumo foi feita nesta tarefa. Celular não medido.
- **CPU/tempo:** tempos de carga medidos só em CPU local sem rede.
- **Leitor de tela e teclado completo** (apenas axe e verificações de estrutura). Não há teste de Tab/Esc dedicado à página.
- **`WebTransport`** (SEC-P4-11) não está no canário nem em teste.
- **Advisories e inventário de licenças do conteúdo do `.wasm`/stdlib** (SEC-P4-12): não feitos. A licença MPL-2.0 vem do `package.json`; o texto da licença não veio do pacote.
- Arquivos de teste de CSV com nome não ASCII em disco não chegam ao `input` pelo `setInputFiles` do Playwright; o teste usa payload em memória.
- Perda de saída: se o programa imprimir mais de 100 linhas em rajada e travar logo em seguida, o que estava só no buffer do Worker (menos de 50 ms) pode não aparecer; as primeiras 100 linhas e qualquer linha depois de 50 ms de pausa saem na hora.

## 6. Pendências e pedidos

1. **`hub/ferramentas/index.html` (lista de ferramentas) não foi alterado:** só `hub/index.html` estava no escopo. O cartão de Python deve entrar lá e a chave `hub.tools.lede` ("The CSV viewer and the SQL playground...") precisa de ajuste; o teste HUB-03 em `a11y.js` só checa csv e sql nessa página.
2. `hub/privacidade/` ainda diz que só o leitor de CSV e o playground de SQL rodam no navegador; atualizar para incluir Python e o iframe isolado.
3. `docs/security/phase-4-worker-isolation.md` descreve o canário como "não implementado": o canário existe agora; atualizar o registro (SEC-P4-02, SEC-P4-05, SEC-P4-06, SEC-P4-09 e SEC-P4-10 têm implementação, sem verificação em outros navegadores).
4. Verificar no deploy do Pages: `curl -I` com `access-control-allow-origin` no `.wasm` e `.mjs`; abrir a página no Chrome do usuário; depois Firefox e Safari.
5. Revisão de segurança independente do canário e do runner (security-auditor) e QA (T-405) ainda não aconteceram.

## 7. Correções da revisão independente (2026-11-13)

Corrigido: **M3** (`python-runner.js` recusa iniciar se `window.origin`/`self.origin` não forem `"null"` ou se for página de topo; sem listener de `run` e sem Worker; PY-21 cobre runner como topo e emoldurado sem sandbox por página atacante, com `postMessage` de `{t:'run',code}` repetido: zero Worker, zero requisição `pyodide*`). `location.origin` não foi usado porque devolve a origem da URL, não a do documento. **B1** (depois de pronto o runner ignora `fatal`, `status` e `refused` do Worker; `done` só uma vez por execução, em andamento, id atual, `ok` booleano; PY-22). **M1** (cartão de Python e `hub.tools.lede` em `hub/ferramentas/index.html`; seção "Playground de Python" e frase de `hub.priv.s1.p` em `hub/privacidade/` PT/EN; `docs/security/phase-4-worker-isolation.md` atualizado: canário implementado e testado no Chrome, riscos não verificados mantidos). **B4** (`a11y.js` RSP-03: a isenção agora vale para qualquer link dentro de `.hub-card`, mas só depois de provar por clique no canto inferior direito de **cada** cartão de `hub/` e `hub/ferramentas/` que ele navega para o próprio `href`; sem lista de nomes).

Limite conhecido: o Python do usuário ainda pode forjar um `done` válido (id atual, `ok` booleano) e encerrar a própria execução mais cedo; não afeta outras sessões.

Contagens reais (Chrome; portas 8581/8582/8583, python.js em 8586/8587, logs em `/tmp/py-fix`; **não** rodei o `run-all.sh` inteiro nem csv, sql, sample, budget_file): python **110 PASS**/0 FAIL (antes 103), a11y 17/0, reg 16/0, shell 6/0, i18n_theme_privacy 26/0 + 1 N/A, check-i18n-keys PASS. O allowlist de REG não precisou mudar (só `docs/`, `hub/`, `tests/` alterados). Fica **não verificado**: o resto do que está na seção 5 (outros navegadores, Pages real, memória, celular, WebTransport, advisories), e os testes csv/sql/sample/budget depois destas correções.


## 8. numpy + pandas (D12, `feat/pandas`, 2026-11-13)

**Estado: Implementado, testado só no Chrome (Playwright, Linux headless). Commits locais `c9a4f2b` e `d5c6356` (sem push nem PR); as correções da reconferência (seção 8.6) estão no working tree, sem commit. A revisão independente rejeitou condicionalmente a primeira versão; QA (T-405) não feita.** Decisão e justificativa: D12 em `docs/decisions/decision-log.md`. Segurança: `docs/security/phase-4-worker-isolation.md` seção 11.

### 8.1 O que foi feito
- **Vendor (conferido):** (a) o sha256 dos 5 wheels (numpy 2.4.6, pandas 3.0.2, python-dateutil 2.9.0.post0, pytz 2026.1.post1, six 1.17.0) bate com o campo `sha256` do `pyodide-lock.json` da distribuição; (b) os 5 arquivos do núcleo vendorizado (`pyodide.asm.wasm`, `pyodide.asm.mjs`, `python_stdlib.zip`, `pyodide.mjs`, `pyodide-lock.json` original) são **byte a byte iguais** aos extraídos do `pyodide-314.0.7.tar.bz2` (`cmp`); (c) o fecho de dependências de pandas no lock é exatamente numpy, python-dateutil, pytz, six. Wheels em `hub/assets/vendor/pyodide/packages/` (7.889.748 B no total), `pyodide-lock.json` filtrado a 5 entradas (script `docs/testing/vendor-pyodide-lock-filter.py`), sha256/versão/licença em `manifest.json`, `SHA256SUMS` (`sha256sum -c` OK) e `README.md`.
- **Worker (`python-worker-src.js`):** lock e `packageBaseUrl` explícitos; detector de imports em Python (`ast.parse`) com namespace privado; `ensurePackages` carrega só o que falta, confere `loadedPackages` contra a lista e **repete o canário**; `loadPackage`/`loadPackagesFromImports` expostos continuam lançando erro ; o gerenciador interno recebeu portão nos 7 métodos do protótipo (ver 8.6); dica de `ModuleNotFoundError`. **Runner:** repassa mensagens `pkgs` e `hint` só em formatos conhecidos. **Página (`python.js`, `index.html`, `i18n.js` PT/EN):** aviso de download extra na nota e no status ("Baixando pandas... cerca de 8 MB"), tempo limite próprio de 120 s para o download (não conta no limite do usuário), aviso de módulo ausente, erro de pacote (a sessão é encerrada), botão **um exemplo de pandas por cenário** (merge + groupby, comentários PT/EN). Nota na página de privacidade, no cartão de Python (home e lista de ferramentas) e `README` do vendor atualizados.
- **Detecção: AST, não caixa de seleção.** Justificativa: não exige passo da pessoa, nunca deixa o usuário nomear um pacote, e o pedido de pacote decorre do código que será executado. Falsos positivos (comentário, string, docstring, nomes parecidos como `pandas_profiling`, `numpyro`, atributos, imports relativos) e falsos negativos (função, classe, `try`, `from`, submódulo, `__import__`/`import_module` com literal) estão em 42 casos executados contra o código real do Worker (PD-02). Não detectados e documentados: `getattr(__builtins__, '__import__')`, `__import__(variável)`, `exec("import pandas")`; o erro é `ModuleNotFoundError` com dica na página.
- **CSP, `sandbox`, canário, `connect-src`: inalterados** (PD-15 compara os textos).

### 8.2 Contagens reais (`bash tests/hub/run-all.sh`, `PORT_ROOT=9281 PORT_SUB=9282 PORT_GZ=9283 PORT_PY=9284 PORT_OUT=9285 HUB_LOG_DIR=/tmp/pd-logs`, Chrome)

| Grupo | PASS | FAIL | N/A |
|---|---|---|---|
| datasets | 41 | 0 | 0 |
| reg | 16 | 0 | 0 |
| shell | 6 | 0 | 0 |
| i18n/tema/privacidade | 26 | 0 | 1 |
| a11y | 17 | 0 | 0 |
| budget_file | 5 | 0 | 0 |
| csv | 39 | 0 | 0 |
| sql | 114 | 0 | 0 |
| sample | 62 | 0 | 0 |
| exercises | 63 | 0 | 0 |
| scenarios | 39 | 0 | 0 |
| nouploads | 10 | 0 | 0 |
| python | 113 | 0 | 0 |
| **python-pandas (novo)** | **85** | 0 | 0 |
| check-i18n-keys | exit 0 | | |

Mudanças em testes existentes: `run-all.sh` ganhou `python-pandas`; nenhum teste anterior foi alterado. Durante o desenvolvimento o teste novo achou e eu corrigi: (1) o exemplo de logística contava `atraso_dias` não nulo em vez de entregas (erro meu, pego pelo oráculo sqlite); (2) após falha parcial de wheel a sessão continuava quebrada (agora é encerrada); (3) o axe acusava `target-size` na migalha parcialmente sob o cabeçalho fixo depois da rolagem do clique (artefato de rolagem; o teste volta ao topo antes do axe).

### 8.3 Medições (localhost sem rede, 2 núcleos; mediana de 3; `PD-12`)
- Carga: só Python a frio ~2,6 s; `import numpy` com motor quente ~1,0 s; pandas a **frio** (núcleo + 5 wheels) ~5,9 s; quente (tudo carregado) ~0,15 s; quente com `read_csv` ~0,46 s. Tempos de rede real **não medidos**.
- Download extra: pandas com fecho 7.889.748 B (7,52 MiB); numpy sozinho 2.960.568 B. O cache HTTP não é reaproveitado no iframe de origem opaca: **a cada abertura da página que usa pandas, ~13,6 MiB** (núcleo 6,1 MiB com gzip + 7,52 MiB).
- Memória (heap do WASM): núcleo 43 MiB; +numpy 52 MiB; +pandas 75 MiB; DataFrame de 3 milhões de linhas com merge 543 MiB; arrays de numpy até falhar: `MemoryError` em 4.096 MiB de arrays (heap 4.039 MiB), aba viva e Worker utilizável depois. Pico do **processo** do navegador e celular não medidos.
- Parar durante o download de pacotes: 37 ms; Parar durante cálculo longo do numpy: 33 ms.

### 8.4 NÃO verificado
Firefox, Safari, Edge, celular; GitHub Pages real (CORS dos wheels para origem opaca, MIME/compressão de `.whl`, cache, subpasta real); **advisories/CVE de numpy 2.4.6, pandas 3.0.2, dateutil, pytz, six e Pyodide (sem acesso a bases de CVE)**; licenças do código nativo além dos metadados dos wheels; memória em celular; timeout de 120 s do download de pacotes (existe, não esperado em teste); leitor de tela. `pd.read_csv` de URL da própria origem falhou, mas não é garantia de projeto (`connect-src 'self'`).

### 8.5 Correções da revisão independente (A1, M1, M2, M3, B1 a B4)
- **A1 (alto), commit d5c6356:** portão só em `loadPackage`/`loadPackageInner` no protótipo, protótipo e `lockfile_packages` congelados. **Insuficiente**, como a reconferência mostrou (ver 8.6): `installPackage`, `downloadPackage` e `downloadAndInstall` seguiam abertos.
- **M1:** limite documentado (D12, §11.1) e coberto por PD-10b: `setInterval` de uma execução anterior continua durante o download/canário da seguinte; o canário repetido não é fronteira. Comentário "antes de executar o código do usuário" corrigido.
- **M2:** barreira linear (sobre o texto bruto, com falsos positivos: ver 8.6) antes do `ast.parse`, detecção de Pyodide morto (sonda de vida), recriação da sessão, mensagens PT/EN, timer no caminho quente de `python.js:run()`; Parar testado com o Worker mudo; SEC-P4-19 reescrito. Testes: PD-02b (12 códigos patológicos até 100.000 termos, 7 válidos; via página em EN/PT; `exec` de 1000 parênteses; caminho quente travado; timer encurtado para 3 s por cópia da página só no teste, o de 120 s **não** foi esperado).
- **M3:** `window.scrollTo(0,0)` antes de todo `axe` em `python.js`, `csv.js`, `sql.js`, `sample.js`, `scenarios.js`, `exercises.js` e `python-pandas.js`. Estabilidade: `python.js` completo 3 vezes seguidas, 113 PASS / 0 FAIL nas três. Na `origin/main` (worktree limpo) o PY-14 passou 3/3 (só ele, com `ONLY=PY-14`): **não reproduzi** a instabilidade sem as minhas mudanças; a falha do revisor ocorreu na minha branch (o botão novo muda a rolagem), então o artefato é de rolagem + cabeçalho fixo e a correção é a mesma do `python-pandas.js`.
- **B1:** a dica de módulo aceitava só `[A-Za-z0-9_]` e truncava nomes unicode; agora pega o nome inteiro (PD-08/B1). **B2:** a saída de `exec("import pandas")` e de módulos fora da lista não cita mais micropip/`loadPackage` e traz uma nota própria (PD-08/B2). **B3:** estado atualizado acima. **B4:** PD-02 conta casos dinamicamente (42 casos do detector) e PD-02b inclui o DoS do AST.

Contagens reais da rodada de correção (Chrome; portas 9581 a 9585; logs `/tmp/pd-fix2`; **não** rodei `run-all.sh` inteiro nem csv, sql, sample, exercises, scenarios, nouploads, datasets, shell, budget_file depois destas mudanças, embora `csv/sql/sample/scenarios/exercises` tenham recebido só o `scrollTo` antes do axe, conferido por `node --check`): python.js 113/0 (x3), python-pandas.js **101 PASS**/0 FAIL (antes 85), reg 16/0, a11y 17/0, i18n_theme_privacy 26/0 + 1 N/A, check-i18n-keys exit 0. Não verificado: timer de 120 s (só a versão encurtada a 3 s numa cópia da página), outros navegadores, Pages real, CVEs.

### 8.6 Reconferência independente (HEAD d5c6356)
- **Portão completo no `packageManager` (reproduzido):** com o Worker de d5c6356, `installPackage` (wheel de bytes próprios), `Reflect.apply(proto.installPackage)`, `downloadPackage` (manifest do site e URL de fora) e `downloadAndInstall` retornavam "chamada aceita". Inspecionei o protótipo (13 membros) e coloquei portão nos 7 que resolvem, baixam ou instalam (`loadPackage`, `loadPackageInner`, `addPackageToLoad`, `recursiveDependencies`, `downloadPackage`, `installPackage`, `downloadAndInstall`); protótipo e lock congelados. PD-08/A1+ prova: todos lançam "disabled", `import evilpkg` falha, 0 hits, nenhuma requisição ao `manifest.json`. **Não fechado, dito com todas as letras:** a instância do `packageManager` não congela e `pyodide_js._api`/`pm._lock` podem ser substituídos pelo código do usuário (só afeta a própria sessão). O provado é "sem rede de fora, sem pacote fora dos 5 wheels do mesmo site"; a defesa real é CSP + sandbox de origem opaca + sha256. Não afirmo que o usuário não carrega pacotes.
- **Barreira de profundidade sem falsos positivos:** `tooComplex` agora roda sobre o código com literais de texto (`'..'`, `".."`, triplas, prefixos r/b/f) e comentários mascarados por uma varredura linear; conservadora (em dúvida não bloqueia). Limites: 140 colchetes, 750 em cadeias (medido: ~800 passam). Os 8 casos legítimos (700 hífens em string, base64 de 4000 chars, `"a.b"*700` em string, 200 `(` em string, 650 termos `1+1+…`, comentário de 700 hífens, docstring, f-string/bytes) **executam** (PD-02b, EN e PT). Medido fora da barreira: `elif`×3000, `lambda`×5000, `if/else`×3000 e `exec` de 1000 `(` matam o Pyodide e a página recupera (mensagem "O Python travou", sessão recriada); `(`×1000 no código é recusado pela barreira. Nenhum prende a UI. Status para o caso recusado agora é "O código não foi executado." / "The code was not run." (e "O Python travou..." para o Pyodide morto), em vez de "Não foi possível iniciar o Python".
- Observação: o `fill` do Playwright em 3000 linhas leva ~55 s (artefato do teste; o PD-02b define o valor direto).
- **Contagens reais da reconferência** (Chrome; portas 9881 a 9885; logs `/tmp/pd-fix3`; **não** rodei `run-all.sh` inteiro): python.js 113/0, python-pandas.js **105 PASS**/0 FAIL, reg 16/0, a11y 17/0, i18n_theme_privacy 26/0 + 1 N/A, check-i18n-keys exit 0. Não verificado: Firefox/Safari/celular, Pages real, CVEs, o timer de 120 s (só a versão de 3 s), outras formas de aninhamento além das medidas, e que não existam outros caminhos para a instância/`_api` substituída pelo usuário além do descrito.

