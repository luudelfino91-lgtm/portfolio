# Status: banco de exemplo do SQL playground (T-307, versão enxuta)

**Branch:** `feat/sql-sample-db` (base `origin/main` 9ab04e3). **Estado:** Implementado e testado no Chrome (suíte `tests/hub/sample.js` incluída em `tests/hub/run-all.sh`); a execução completa tem 2 falhas fora desta suíte (seção 3). Sem commit feito por este agente.

## 1. O que foi entregue
- `hub/assets/data/loja-exemplo.sql`: loja online fictícia, 5 tabelas (clientes 40, categorias 6, produtos 30, pedidos 200, itens_pedido 500) com PK e FK declaradas, NULLs de propósito, clientes sem pedidos e produtos nunca vendidos. Bytes, SHA-256, tabelas e diagrama ER em `hub/assets/data/README.md`.
- Gerador determinístico `docs/testing/fixtures/gen_loja.py` (semente fixa, sem `random`) e oráculo independente `docs/testing/fixtures/compute_loja_expected.py` (sqlite3 do Python).
- Página SQL: botão "Carregar banco de exemplo", lista de 12 consultas de exemplo (só colocam o SQL no editor), tabelas listadas em "Suas tabelas" com coluna Chave (PK/FK). Recarga automática depois de Parar/tempo limite (antes dos CSV); Reiniciar banco remove tudo; recarregar substitui com aviso.
- Arquivos alterados: `hub/assets/js/sql.js`, `sql-worker.js` (mensagem `sample`; `PRAGMA foreign_key_list` no esquema), `i18n.js` (chaves `hub.sql.sample.*` e correlatas, PT e EN), `hub/ferramentas/sql/index.html`, `hub/assets/css/sql.css`, `tests/hub/sample.js` (novo), `tests/hub/run-all.sh`. CSP inalterada.

- Arquivo adicional alterado: `tests/hub/reg.js` (correção ambiental do REG-01, ver seção 3).

## 2. Limitações e itens abertos
- **Exercícios guiados com verificação automática (parte de T-307): não implementados.** As consultas foram escritas com resultado conhecido (conferido contra o oráculo) para servirem de base.
- Verificado só no Chrome (Playwright). Firefox, Edge e WebKit: **não executados**. Leitor de tela: não verificado. Pages real (MIME e caminho `/portfolio/hub/`): só verificado em servidor estático local.
- O banco de exemplo é buscado de novo a cada carregamento da página (`cache: 'no-cache'`); na recarga após Parar usa o texto em memória, sem novo fetch.
- Uma CSV com nome de tabela de exemplo (ex.: `pedidos.csv`) substitui essa tabela; a ordem de recarga preserva isso.

## 3. Verificação (Chrome, Playwright; execução de `sh tests/hub/run-all.sh` em 2026-11-13 depois da última alteração de código)
- sample: 63 PASS, 0 FAIL. sql: 139 PASS. shell 6, i18n_theme_privacy 26 PASS + 1 N/A, a11y 17, budget_file 5. `docs/testing/check-i18n-keys.js`: exit 0 (EN 258 = PT 258).
- reg: 16 PASS, 0 FAIL. Na primeira execução do desenvolvedor o REG-01 (controle "limpo" no clone temporário) falhou por ambiente: o `origin/main` do clone era o branch `main` LOCAL do repositório, 22 commits atrás do `origin/main` real. Corrigido em `tests/hub/reg.js` (o clone agora busca o `origin/main` real do repositório); nenhum caso negativo foi removido. Reexecutado depois da correção, e de novo pelo revisor independente: 16 PASS.
- csv: 47 PASS, 0 FAIL nas reexecuções (Tech Lead e revisor independente). Na primeira execução completa do desenvolvedor, CSV-53 (cancelar a >= 40%) falhou uma vez com o progresso amostrado em 38%: **teste instável por timing** (a amostragem de progresso concorre com o fim da leitura); nenhum arquivo de CSV foi alterado por esta tarefa.
- `run-all.sh` completo, portas livres, depois da correção: rc=0, todos os grupos sem FAIL (reg 16, shell 6, i18n 26 + 1 N/A, a11y 17, budget 5, csv 47, sql 139, sample 63).
- Lacuna conhecida: nenhum teste força falha no meio do script de exemplo; o `ROLLBACK TO` do SAVEPOINT em `sqSample` foi verificado por leitura de código, não executado (cobertos: 404 e recarga após Parar/timeout).
