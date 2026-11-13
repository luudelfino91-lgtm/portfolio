# Status: banco de exemplo do SQL playground (T-307, versão enxuta)

**Branch:** `feat/sql-sample-db` (base `origin/main` 9ab04e3). **Estado:** Implementado e testado no Chrome (suíte `tests/hub/sample.js` incluída em `tests/hub/run-all.sh`); a execução completa tem 2 falhas fora desta suíte (seção 3). Sem commit feito por este agente.

## 1. O que foi entregue
- `hub/assets/data/loja-exemplo.sql`: loja online fictícia, 5 tabelas (clientes 40, categorias 6, produtos 30, pedidos 200, itens_pedido 500) com PK e FK declaradas, NULLs de propósito, clientes sem pedidos e produtos nunca vendidos. Bytes, SHA-256, tabelas e diagrama ER em `hub/assets/data/README.md`.
- Gerador determinístico `docs/testing/fixtures/gen_loja.py` (semente fixa, sem `random`) e oráculo independente `docs/testing/fixtures/compute_loja_expected.py` (sqlite3 do Python).
- Página SQL: botão "Carregar banco de exemplo", lista de 12 consultas de exemplo (só colocam o SQL no editor), tabelas listadas em "Suas tabelas" com coluna Chave (PK/FK). Recarga automática depois de Parar/tempo limite (antes dos CSV); Reiniciar banco remove tudo; recarregar substitui com aviso.
- Arquivos alterados: `hub/assets/js/sql.js`, `sql-worker.js` (mensagem `sample`; `PRAGMA foreign_key_list` no esquema), `i18n.js` (chaves `hub.sql.sample.*` e correlatas, PT e EN), `hub/ferramentas/sql/index.html`, `hub/assets/css/sql.css`, `tests/hub/sample.js` (novo), `tests/hub/run-all.sh`. CSP inalterada.

## 2. Limitações e itens abertos
- **Exercícios guiados com verificação automática (parte de T-307): não implementados.** As consultas foram escritas com resultado conhecido (conferido contra o oráculo) para servirem de base.
- Verificado só no Chrome (Playwright). Firefox, Edge e WebKit: **não executados**. Leitor de tela: não verificado. Pages real (MIME e caminho `/portfolio/hub/`): só verificado em servidor estático local.
- O banco de exemplo é buscado de novo a cada carregamento da página (`cache: 'no-cache'`); na recarga após Parar usa o texto em memória, sem novo fetch.
- Uma CSV com nome de tabela de exemplo (ex.: `pedidos.csv`) substitui essa tabela; a ordem de recarga preserva isso.

## 3. Verificação (Chrome, Playwright; execução de `sh tests/hub/run-all.sh` em 2026-11-13 depois da última alteração de código)
- sample: 63 PASS, 0 FAIL. sql: 139 PASS. shell 6, i18n_theme_privacy 26 PASS + 1 N/A, a11y 17, budget_file 5. `docs/testing/check-i18n-keys.js`: exit 0 (EN 258 = PT 258).
- reg: 15 PASS, 1 FAIL (REG-01 teste negativo, controle "limpo" em clone temporário). Causa provável, ambiental e anterior a esta tarefa: no clone, `origin/main` é o branch local `main` do repositório (843d198), que está à frente de `origin/main` (9ab04e3) usado pelo worktree. Não corrigido (fora do escopo).
- csv: 46 PASS, 1 FAIL na execução completa (CSV-53, cancelar a >= 40%: o progresso amostrado ficou em 38% antes do cancelamento, oscilação de tempo; nenhum arquivo de CSV foi alterado). Reexecutado sozinho: 47 PASS, 0 FAIL.
- `run-all.sh` terminou com rc=1 por causa desses dois itens; nenhum deles é da suíte `sample`.
