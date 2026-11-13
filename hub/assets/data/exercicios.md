# Exercícios guiados do SQL playground (T-307)

Este documento fixa a **regra de comparação antes** de qualquer exercício ser verificado. O código (`hub/assets/js/sql-worker.js`, função `sqVerify`, e o bloco "REGRA DE COMPARAÇÃO" acima dela) implementa exatamente o que está aqui; os testes (`tests/hub/exercises.js`) conferem o resultado esperado com um oráculo Python independente (`docs/testing/fixtures/compute_exercises_expected.py`).

## 1. Regra de comparação

A verificação compara o resultado da consulta **do usuário** (a última instrução do texto que devolve colunas) com o resultado esperado, que é o da consulta de referência do exercício executada no mesmo motor (SQLite via sql.js, no Web Worker) sobre o mesmo banco de exemplo.

1. **Colunas.** O número de colunas deve ser igual. Elas são comparadas por **posição e por nome**; o nome não diferencia maiúsculas de minúsculas (`Nome` = `nome`). O enunciado de cada exercício lista as colunas pedidas, na ordem, com os nomes (use `AS` quando preciso).
2. **Valores.**
   - `NULL` só é igual a `NULL`.
   - Números: inteiro e real são iguais se forem numericamente iguais (`3` = `3.0`). Dois inteiros comparam exatamente. Se algum dos dois for REAL, a diferença deve ser no máximo `1e-9 * max(1, |a|, |b|)` (tolerância).
   - Texto compara exatamente, diferenciando maiúsculas de minúsculas. Texto nunca é igual a número (`'3'` ≠ `3`).
   - BLOB compara byte a byte.
3. **Linhas.** O número de linhas deve ser igual. A **ordem só importa quando o enunciado pede `ORDER BY`** (exercício marcado como ordenado, com desempate total dito no enunciado). Nos demais, as linhas são comparadas como **multiconjunto** (a ordem é ignorada, repetições contam: uma linha duplicada a mais é diferença).
4. **Cada exercício marca se é ordenado.** Neste conjunto só o exercício 1 é ordenado.

## 2. Mensagens de falha (nunca revelam a resposta)

A mensagem diz **o que** difere, sem mostrar o valor esperado nem a consulta de referência:

| Situação | Mensagem diz |
|---|---|
| A consulta tem erro de SQL | a mensagem do motor e a instrução com erro |
| Nenhum texto executável | que não há consulta |
| Nenhuma instrução devolveu colunas (só `INSERT`, `CREATE`...) | que a consulta precisa devolver linhas (um `SELECT`) |
| Número de colunas diferente | quantas a sua consulta tem e quantas o enunciado pede |
| Nome de coluna diferente | a posição e o nome que você usou ("o enunciado pede outro nome") |
| Número de linhas diferente | quantas a sua consulta devolveu e quantas são esperadas |
| Exercício ordenado, mesmas linhas em outra ordem | que a ordem não é a pedida e em qual linha a ordem diverge primeiro |
| Exercício ordenado, valor diferente | "valor diferente na linha N, coluna X" |
| Exercício não ordenado, linhas diferentes | "o conjunto de linhas difere" |

## 3. Resultado esperado e a solução

- O resultado esperado **não é um arquivo de respostas**: é calculado a cada verificação executando a consulta de referência (guardada como definição em `hub/assets/js/sql.js`, constante `EXERCISES`) em um banco novo carregado só com o banco de exemplo.
- A consulta de referência **só é mostrada** depois que o usuário acerta o exercício ou clica em "Ver solução" (com confirmação). Isso é um recurso didático, não uma proteção: o arquivo JavaScript é público e quem quiser pode lê-lo.
- Existem várias formas corretas (JOIN, subconsulta, `NOT EXISTS`, `NOT IN`...); todas passam se o resultado for igual pela regra acima.

## 4. Isolamento (consultas com efeito colateral)

A verificação roda em um **banco em memória novo e descartável**, criado dentro do mesmo Worker, só para aquela verificação (carregado com o texto do banco de exemplo). A referência roda ali **antes** do SQL do usuário, e o banco é fechado ao terminar. O banco do playground (tabelas de CSV, banco de exemplo carregado, o que o usuário alterou) **nunca é tocado**. Escolha documentada: banco novo em vez de `SAVEPOINT`/`ROLLBACK`, porque o SQL do usuário pode conter `COMMIT`, `ROLLBACK` ou `RELEASE` e desfazer o ponto de retorno. Consequência: a verificação julga a consulta contra os dados originais do exemplo, mesmo que o usuário tenha alterado as tabelas no editor principal.

A verificação usa o mesmo Worker, o mesmo limite de tempo e o mesmo botão Parar do playground. Se estourar o tempo ou for parada, o motor é recriado e o banco de exemplo é recarregado, como em qualquer consulta.

## 5. Progresso e privacidade

Quais exercícios foram resolvidos fica **só em memória da página** (some ao recarregar). Nada é gravado em `localStorage`, cookies, `sessionStorage` ou IndexedDB (só idioma e tema persistem), e nada é enviado para fora do navegador. O banco de exemplo precisa estar carregado: se não estiver, o botão "Verificar" oferece carregá-lo.

## 6. Os cinco exercícios

| # | Tema | Colunas pedidas | Ordenado | Linhas esperadas |
|---|---|---|---|---|
| 1 | SELECT, WHERE, ORDER BY: produtos com estoque abaixo de 20, preço decrescente e nome | `nome`, `preco`, `estoque` | sim | 4 |
| 2 | INNER JOIN: pedidos com status `enviado` e o nome do cliente | `pedido_id`, `cliente`, `data_pedido` | não | 9 |
| 3 | LEFT JOIN + IS NULL: clientes sem nenhum pedido | `id`, `nome`, `cidade` | não | 5 |
| 4 | GROUP BY + HAVING: clientes com 8 ou mais pedidos não cancelados | `cliente_id`, `pedidos` | não | 9 |
| 5 | Subconsulta: produtos mais caros que a média da própria categoria | `nome`, `preco`, `categoria_id` | não | 10 |

As linhas esperadas valem para o `loja-exemplo.sql` atual (SHA-256 em `README.md`) e foram conferidas pelo oráculo Python.
