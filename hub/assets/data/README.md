# Dados de exemplo do Hub

## loja-exemplo.sql

Banco de exemplo do SQL playground (T-307): uma **loja online fictícia**. Tudo é inventado (nomes são combinações aleatórias de listas genéricas; qualquer coincidência com pessoas reais é acidental; e-mails usam o domínio reservado `example.com`). É um script SQL (CREATE TABLE + INSERT) que a página `hub/ferramentas/sql/` busca na mesma origem (caminho relativo `../../assets/data/loja-exemplo.sql`) e executa no Web Worker. Nada é enviado a terceiros.

| Item | Valor |
|---|---|
| Bytes | 29301 |
| SHA-256 | `83eeb92f7104f1787469db22f1cb20c6571ec3731cfa0dce3e1e89559dbd2133` |
| Gerador | `docs/testing/fixtures/gen_loja.py` (somente biblioteca padrão, gerador pseudoaleatório próprio, semente 20250101) |
| Regerar | `python3 -I docs/testing/fixtures/gen_loja.py` (duas execuções geram o mesmo sha256) |
| Oráculo dos testes | `docs/testing/fixtures/compute_loja_expected.py` (sqlite3 do Python sobre o mesmo .sql) |

Não edite o .sql à mão: altere o gerador, regere e atualize bytes e SHA-256 acima (o teste `tests/hub/sample.js` confere).

### Tabelas

| Tabela | Linhas | Colunas |
|---|---|---|
| clientes | 40 | id (PK), nome, email (NULL em 3), cidade (NULL em 5), data_cadastro |
| categorias | 6 | id (PK), nome (único) |
| produtos | 30 | id (PK), nome, categoria_id (FK), preco (REAL), estoque |
| pedidos | 200 | id (PK), cliente_id (FK), data_pedido, data_entrega (NULL quando não entregue), status (pago, enviado, entregue, cancelado) |
| itens_pedido | 500 | id (PK), pedido_id (FK), produto_id (FK), quantidade, preco_unitario (REAL; alguns itens com desconto), único por (pedido_id, produto_id) |

Datas em texto ISO `YYYY-MM-DD`, todas em 2025. Os clientes 39 e 40 e os produtos 29 e 30 nunca aparecem em pedidos (por construção); outros clientes sem pedido surgem do sorteio (o teste usa o oráculo, não um número fixo).

### Diagrama ER (texto)

```
categorias 1 ──< produtos 1 ──< itens_pedido >── 1 pedidos >── 1 clientes

categorias(id PK, nome)
produtos(id PK, nome, categoria_id FK -> categorias.id, preco, estoque)
clientes(id PK, nome, email, cidade, data_cadastro)
pedidos(id PK, cliente_id FK -> clientes.id, data_pedido, data_entrega, status)
itens_pedido(id PK, pedido_id FK -> pedidos.id, produto_id FK -> produtos.id, quantidade, preco_unitario)
```

## exercicios.md

Regra de comparação (colunas, tipos, ordem), mensagens de falha, isolamento da verificação e os 5 exercícios guiados do SQL playground (T-307). O oráculo independente dos resultados esperados é `docs/testing/fixtures/compute_exercises_expected.py` (sqlite3 do Python, cálculo em Python puro sobre `loja-exemplo.sql`); os testes estão em `tests/hub/exercises.js`. Se o `loja-exemplo.sql` for regerado, confira as linhas esperadas (4/9/5/9/10) no oráculo e em `exercicios.md`.
