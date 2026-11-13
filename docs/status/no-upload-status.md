# Status: D11, nenhum upload de arquivo do usuário

**Data:** 2026-11-13. **Branch:** `feat/no-upload` (a partir de `feat/scenario-datasets`). **Sem commit, push ou PR.**
**Estado:** Implementado e testado **somente no Chrome** (Playwright). Não pronto para produção.

## 1. Decisão

D11 (Lucas): nenhum upload de arquivo do usuário em lugar nenhum. CSV, SQL e Python trabalham só com as 5 bases de cenário embutidas (Vendas, Marketing digital, Logística, RH, Atendimento). RF-05 e RF-08 do PRD estão superados.

## 2. O que mudou

- **Removido:** input de arquivo, arrastar e soltar, `File`/`FileReader`, "carregar CSV como tabela", limite de tamanho, mensagens e chaves i18n correspondentes, `hub/assets/js/csv-worker.js`, `hub/assets/vendor/papaparse/` (manifest, SHA256SUMS e README do vendor atualizados).
- **Seletor de cenário comum** (`hub/assets/js/scenarios.js`, `hub/assets/css/scenarios.css`): grupo de radios nativos em `fieldset`, uma parada de Tab, alvo de 24 px, texto do diagrama ER igual ao README dos dados, tudo por `textContent`.
- **SQL:** carrega o `.sql` do cenário. Vendas mantém 12 exemplos e 5 exercícios. Os outros 4 cenários têm 3 consultas de exemplo cada, baseadas nas consultas-chave de `compute_<slug>_expected.py`.
- **Exercícios:** continuam só para Vendas. Exercícios dos outros 4 cenários são trabalho futuro (**T-404-b**).
- **CSV vira explorador de dados:** cenário + tabela, prévia, contagem de linhas e colunas, tipos, chaves (PK/FK) e contagem de vazios.
- **Python:** a página busca (`fetch` same-origin, `credentials: 'omit'`) os CSVs do cenário e envia ao iframe por `postMessage` `{t:'run', id, code, tables:[{name,buf}]}`; o Worker grava `/data/<tabela>.csv`. Reenviado a cada execução, então `/data` começa intacto. Limites: 8 arquivos, 1 MiB cada, 4 MiB no total. Ponto de extensão para pandas deixado como comentário ao lado de `packages: []` em `python-worker-src.js` (não implementado).
- **Gerador:** `docs/testing/fixtures/export_scenarios_csv.py` (somente stdlib, determinístico, `--out` e `--report`). Exporta `hub/assets/data/csv/<slug>/<tabela>.csv`, `schema.json` por cenário e `SHA256SUMS`. NULL vira célula vazia; texto vazio ou só com espaços é recusado; REAL com `repr()`; ordem por rowid. Bytes e SHA-256 de cada arquivo estão em `hub/assets/data/README.md` e são conferidos por `tests/hub/datasets.js`.
- **Páginas e textos:** `hub/privacidade`, `hub/ferramentas/index.html`, `hub/index.html` e `i18n.js` (343 chaves em EN e em PT, paridade verificada). Nome EN do cenário de Atendimento é "Customer service" ("support" quebrava PRV-08).

## 3. Decisão de arquitetura do explorador

O explorador **não usa sql.js nem Worker**. Lê o CSV exportado (parser próprio de cerca de 25 linhas) e o `schema.json` (tipos, PK, FK, extraídos do PRAGMA do SQLite pelo gerador). Motivos: não exigir `wasm-unsafe-eval` na CSP da página, ter uma única fonte de verdade gerada, e manter a página leve. Consequência: a CSP da página CSV ficou **mais estreita** (sem `worker-src`). Trade-off: o tipo vem do esquema declarado, não é inferido do conteúdo.

## 4. CSP

- CSV: sem `worker-src`; resto igual.
- SQL: inalterada.
- Python: único acréscimo, `connect-src 'self'` na página pai (para buscar os CSVs). Iframe `sandbox="allow-scripts"`, Worker de `data:` e canário **não foram alterados** além do `postMessage` de `tables`. O teste PY-11 confere que nada é buscado fora de `/data/csv/` do próprio site.

## 5. Testes removidos ou reescritos, com justificativa

| Teste | Ação | Justificativa |
|---|---|---|
| CSV-01 a CSV-53 (leitura de arquivo, delimitador, codificação, BOM, vazio, falso, limite 10 MB, cancelar a 40%, arrastar) | Removidos; `tests/hub/csv.js` reescrito (39 checagens do explorador) | Testavam recursos que D11 eliminou. Sem arquivo do usuário não há delimitador, codificação nem limite a verificar |
| SQL-10 a SQL-18 e SQL-41 (CSV como tabela, nomes saneados, 10 MB, nomes maliciosos de coluna) | Removidos de `tests/hub/sql.js` | A funcionalidade não existe mais. A defesa de texto (`textContent`) é coberta por NOUP e pelos testes de resultado |
| T-306(a) 10 MB (CSV-51/52/53, SQL-18) | Removido | Sem arquivo grande. SQL-32/33 (timeout, Parar) mantidos |
| SQL-31 (teto de resultado) | **Reescrito, existe** | Antes usava CSV grande; agora `WITH RECURSIVE` gera 5.000 linhas: exibe exatamente 1.000 e a legenda "mostrando 1.000 de 5.000" com a nota do limite (PT/EN); e uma consulta de 25 colunas confere o orçamento de células (20.000 células = 800 linhas) |
| NOUP-09 (novo) | Criado | `loadTable` do explorador recusa tabela fora da definição do cenário (option injetada `../../../README`): erro por `textContent`, zero requisições |
| PY-11 (CSV do usuário, nome saneado, remover, 10 MB) | Reescrito | Agora: 5 cenários na mesma sessão, linhas, vazios e cabeçalho iguais ao sqlite3, só tabelas do cenário buscadas, cache, `/data` intacto após sobrescrever, 404, vazio, Parar durante a busca |
| SEC-P3-01 (leitura de arquivo hostil) | Removido | Superfície eliminada; substituído por NOUP |
| HUB-03 / a11y (`#csvFile`) | Ajustados para `#csvTool` | O controle não existe mais |
| Fixtures grandes (`limit-10mb.csv`, etc.) | Não são mais pré-requisito | Nenhum teste as usa; `run-all.sh` atualizado |

Novos: `tests/hub/scenarios.js` (SCN, 39 checagens: seletor nas 3 ferramentas, contagem visível = oráculo, 3 consultas por cenário no sql.js real contra o oráculo, PT/EN, axe, 360 px), `tests/hub/nouploads.js` (NOUP, 8 checagens: grep e DOM), `tests/hub/oracle.js` (sqlite3 do Python sobre os mesmos `.sql`), e `tests/hub/datasets.js` com bytes e SHA-256 dos CSVs.

## 6. Resultado real da suíte completa

`bash tests/hub/run-all.sh` (PORT_ROOT=8881, PORT_SUB=8882, PORT_GZ=8883, PORT_PY=8884, PORT_OUT=8885), todas com exit 0 e FAIL 0:

| Suíte | PASS | N/A |
|---|---|---|
| datasets | 41 | 0 |
| reg | 16 | 0 |
| shell | 6 | 0 |
| i18n_theme_privacy | 26 | 1 |
| a11y | 17 | 0 |
| budget_file | 5 | 0 |
| csv | 39 | 0 |
| sql | 106 | 0 |
| sample | 62 | 0 |
| exercises | 63 | 0 |
| scenarios | 39 | 0 |
| nouploads | 8 | 0 |
| python | 113 | 0 |
| check-i18n-keys | exit 0 | |

O N/A de i18n_theme_privacy já existia antes desta tarefa. Durante o trabalho, o primeiro PY-11 falhou por defeito do próprio teste (índice de `slice` sobre lista filtrada) e uma referência morta a `FX`; os dois foram corrigidos e a suíte completa foi reexecutada.

## 7. Prova por grep

`grep -rnE 'type="file"|type=.file|FileReader|dataTransfer|\.files\b|webkitdirectory' hub` (HTML, JS e CSS, fora de `vendor/`) retorna **zero** ocorrências. Em `vendor/` só aparece `pyodide.asm.mjs` (código de terceiros, não usado para escolher arquivo). `REG-01`: `index.html`, `certificacoes.html` e `assets/` do portfólio sem diff.

## 8. Tamanhos

`hub/assets/data/csv/`: 27 CSVs (235.966 B) + 5 `schema.json` (15.278 B) = 32 arquivos, 251.244 B (conforme `hub/assets/data/README.md`), mais `SHA256SUMS` (2.932 B), 33 arquivos na pasta.

## 9. NÃO verificado

- Firefox, Edge, Safari/WebKit: não executados.
- Cabeçalhos, MIME e CORS do GitHub Pages real (os CSVs são buscados same-origin; só testado em servidores locais, inclusive com `/portfolio/` e gzip).
- Aparelho móvel real e leitor de tela (360 px foi emulado no Chrome; axe cobre regras automáticas).
- Revisão independente desta mudança (não houve).
- Documentos históricos (`docs/security/*`, `docs/architecture/*`, `docs/testing/test-strategy.md`, `docs/cost-analysis`) ainda citam Papa Parse e upload; não foram reescritos, valem como registro anterior à D11.
- Plano de testes oficial (`test-strategy.md`) não foi atualizado com os IDs SCN e NOUP.

## 10. Pontos para decisão do Tech Lead

1. Explorador sem sql.js (seção 3).
2. `connect-src 'self'` na página Python (seção 4).
3. O URL `/ferramentas/csv/` foi mantido para não quebrar links; se o produto quiser renomear (por exemplo `/dados/`), é decisão de produto.
4. Nome EN "Customer service".
5. Trabalho futuro: T-404-b (exercícios por cenário) e pandas (ponto de extensão só comentado).
