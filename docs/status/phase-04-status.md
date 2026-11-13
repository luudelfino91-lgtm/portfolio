# Project Status Report: Fase 4 (playground de Python), T-402

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
