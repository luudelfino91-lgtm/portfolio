# Dados de exemplo do Hub

## loja-exemplo.sql

Cenário **Vendas**. Banco de exemplo do SQL playground (T-307): uma **loja online fictícia**. Tudo é inventado (nomes são combinações aleatórias de listas genéricas; qualquer coincidência com pessoas reais é acidental; e-mails usam o domínio reservado `example.com`). É um script SQL (CREATE TABLE + INSERT) que a página `hub/ferramentas/sql/` busca na mesma origem (caminho relativo `../../assets/data/loja-exemplo.sql`) e executa no Web Worker. Nada é enviado a terceiros.

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

## Cenários adicionais (T-307 ampliado)

Além da loja (cenário **Vendas**, acima), há 4 bases sintéticas no mesmo padrão: gerador próprio determinístico (LCG, semente fixa), só biblioteca padrão, FKs declaradas, NULLs intencionais, datas ISO, e-mails em `example.com`, nomes por combinação genérica, zero dados reais. Cada `.sql` começa com comentários e `CREATE TABLE` (sem `PRAGMA`/`BEGIN`, como a loja) e passa em `PRAGMA integrity_check` (ok) e `PRAGMA foreign_key_check` (vazio). O teste `tests/hub/datasets.js` confere os 5 cenários. Não edite os .sql à mão: altere o gerador, regere e atualize bytes e SHA-256 (o teste confere).

Tabelas de domínio pequenas (canais, centros_distribuicao, transportadoras, departamentos, cargos) têm menos de 20 linhas, como `categorias` na loja.

## marketing-digital.sql

Cenário **Marketing digital**: campanhas, canais, anúncios, métricas diárias e leads (origem = campanha). Permite CTR, CPA, ROAS por canal e mês e leads sem conversão. Datas em 2025.

| Item | Valor |
|---|---|
| Bytes | 60380 |
| SHA-256 | `d35d08b22adc0d3f22eef679856a1c2279bd303c9abeadd97573e2b80a087407` |
| Gerador | `docs/testing/fixtures/gen_marketing-digital.py` (somente biblioteca padrão, gerador pseudoaleatório próprio LCG, semente 20250202) |
| Regerar | `python3 -I docs/testing/fixtures/gen_marketing-digital.py` (duas execuções geram o mesmo sha256) |
| Oráculo dos testes | `docs/testing/fixtures/compute_marketing-digital_expected.py` (sqlite3 do Python sobre o mesmo .sql; confere integridade, FKs, contagens, somas e 3 consultas-chave, cada uma recalculada em Python puro) |

| Tabela | Linhas | Colunas |
|---|---|---|
| canais | 6 | id (PK), nome (único), tipo (pago, proprio, parceiro) |
| campanhas | 24 | id (PK), nome, objetivo, data_inicio, data_fim (NULL em 3: campanhas contínuas), orcamento (REAL) |
| anuncios | 80 | id (PK), campanha_id (FK), canal_id (FK), nome, formato, status (ativo, pausado, encerrado) |
| metricas_diarias | 480 | id (PK), anuncio_id (FK), data, impressoes, cliques (<= impressoes), custo (REAL), conversoes (<= cliques), receita (REAL; 0 sem conversão), único por (anuncio_id, data) |
| leads | 300 | id (PK), campanha_id (FK), canal_id (FK), nome, email (NULL em 27), criado_em, convertido_em (NULL em 208 = sem conversão), valor_contrato (REAL, NULL sem conversão) |

Cada anúncio tem 6 dias amostrados dentro da janela da campanha (não é série diária contínua). O canal de cada lead é um dos canais dos anúncios da campanha dele.

```
canais 1 ──< anuncios >── 1 campanhas
canais 1 ──< leads    >── 1 campanhas
anuncios 1 ──< metricas_diarias

canais(id PK, nome, tipo)
campanhas(id PK, nome, objetivo, data_inicio, data_fim, orcamento)
anuncios(id PK, campanha_id FK -> campanhas.id, canal_id FK -> canais.id, nome, formato, status)
metricas_diarias(id PK, anuncio_id FK -> anuncios.id, data, impressoes, cliques, custo, conversoes, receita)
leads(id PK, campanha_id FK -> campanhas.id, canal_id FK -> canais.id, nome, email, criado_em, convertido_em, valor_contrato)
```

Consultas-chave do oráculo: `ctr_por_canal` (6 linhas), `roas_por_canal_mes` (62 linhas), `leads_sem_conversao` (10 linhas). CPA = custo / conversões.

## logistica.sql

Cenário **Logística**: centros de distribuição, transportadoras, veículos, rotas, entregas (previsto x realizado) e ocorrências. Permite SLA/atraso, custo por km e entregas por transportadora. Referência fixa: 2025-11-15.

| Item | Valor |
|---|---|
| Bytes | 54680 |
| SHA-256 | `e40fd6324a3b4ff5057f7ff573f49cd7077171099ae3ab5c4612889d4077f9e8` |
| Gerador | `docs/testing/fixtures/gen_logistica.py` (somente biblioteca padrão, gerador pseudoaleatório próprio LCG, semente 20250303) |
| Regerar | `python3 -I docs/testing/fixtures/gen_logistica.py` (duas execuções geram o mesmo sha256) |
| Oráculo dos testes | `docs/testing/fixtures/compute_logistica_expected.py` (sqlite3 do Python sobre o mesmo .sql; confere integridade, FKs, contagens, somas e 3 consultas-chave, cada uma recalculada em Python puro) |

| Tabela | Linhas | Colunas |
|---|---|---|
| centros_distribuicao | 6 | id (PK), nome (único), cidade, capacidade_diaria |
| transportadoras | 8 | id (PK), nome (único), email_contato, ativa (0/1; a 8 é inativa) |
| veiculos | 40 | id (PK), transportadora_id (FK), codigo (único, `VEI-0001`), tipo, capacidade_kg |
| rotas | 30 | id (PK), centro_id (FK), destino, distancia_km (REAL) |
| entregas | 500 | id (PK), rota_id (FK), veiculo_id (FK), data_prevista, data_realizada (NULL em 56), status (entregue, em_transito, devolvida, cancelada), atraso_dias (NULL se não entregue; = max(0, realizada - prevista)), peso_kg, custo (REAL) |
| ocorrencias | 160 | id (PK), entrega_id (FK), tipo, data_ocorrencia, descricao (NULL em 26) |

A transportadora de uma entrega vem de `veiculos.transportadora_id`; o centro vem de `rotas.centro_id`. Entregas adiantadas contam como atraso 0 (a coluna não guarda valores negativos).

```
centros_distribuicao 1 ──< rotas 1 ──< entregas >── 1 veiculos >── 1 transportadoras
                                          1 ──< ocorrencias

centros_distribuicao(id PK, nome, cidade, capacidade_diaria)
transportadoras(id PK, nome, email_contato, ativa)
veiculos(id PK, transportadora_id FK -> transportadoras.id, codigo, tipo, capacidade_kg)
rotas(id PK, centro_id FK -> centros_distribuicao.id, destino, distancia_km)
entregas(id PK, rota_id FK -> rotas.id, veiculo_id FK -> veiculos.id, data_prevista, data_realizada, status, atraso_dias, peso_kg, custo)
ocorrencias(id PK, entrega_id FK -> entregas.id, tipo, data_ocorrencia, descricao)
```

Consultas-chave do oráculo: `sla_por_transportadora` (8 linhas), `custo_por_km_transportadora` (8 linhas), `atraso_por_centro` (6 linhas).

## rh.sql

Cenário **RH**: departamentos, cargos, funcionários (hierarquia por `gestor_id`), histórico salarial, avaliações e ausências. Permite headcount, turnover, média salarial por cargo e hierarquia (self join). Nomes e salários são fictícios; não há atributos sensíveis (gênero, raça, idade). Referência fixa: 2025-11-15.

| Item | Valor |
|---|---|
| Bytes | 65978 |
| SHA-256 | `e539e16660e1925e6b91cf314ed8c01b5374a98b7a44af9fd4f3461ccaccd421` |
| Gerador | `docs/testing/fixtures/gen_rh.py` (somente biblioteca padrão, gerador pseudoaleatório próprio LCG, semente 20250404) |
| Regerar | `python3 -I docs/testing/fixtures/gen_rh.py` (duas execuções geram o mesmo sha256) |
| Oráculo dos testes | `docs/testing/fixtures/compute_rh_expected.py` (sqlite3 do Python sobre o mesmo .sql; confere integridade, FKs, contagens, somas e 3 consultas-chave, cada uma recalculada em Python puro) |

| Tabela | Linhas | Colunas |
|---|---|---|
| departamentos | 8 | id (PK), nome (único), centro_custo |
| cargos | 22 | id (PK), nome (único), departamento_id (FK), nivel (1 a 5) |
| funcionarios | 200 | id (PK), nome, email, cargo_id (FK), departamento_id (FK), gestor_id (FK -> funcionarios.id; NULL só no id 1), data_admissao, data_desligamento (NULL = ativo; 32 desligados) |
| salarios_historico | 407 | id (PK), funcionario_id (FK), data_inicio, salario (REAL, mensal), motivo (admissao, reajuste), único por (funcionario_id, data_inicio) |
| avaliacoes | 337 | id (PK), funcionario_id (FK), avaliador_id (FK -> funcionarios.id), periodo (2024, 2025-S1), nota (1 a 5; NULL em 43), comentario (NULL em 208), único por (funcionario_id, periodo) |
| ausencias | 220 | id (PK), funcionario_id (FK), tipo (ferias, atestado, licenca), data_inicio, data_fim, dias |

Por construção, `gestor_id` sempre aponta para um id menor (sem ciclos) e o gestor foi admitido antes do subordinado; quem tem id <= 30 nunca é desligado. A diretoria (id 1) tem 7 subordinados diretos (coordenadores), que gerenciam analistas e assistentes. Salário atual = linha de maior `data_inicio` do funcionário.

```
departamentos 1 ──< cargos 1 ──< funcionarios >── 1 departamentos
funcionarios 1 ──< funcionarios (gestor_id)
funcionarios 1 ──< salarios_historico | avaliacoes (funcionario_id e avaliador_id) | ausencias

departamentos(id PK, nome, centro_custo)
cargos(id PK, nome, departamento_id FK -> departamentos.id, nivel)
funcionarios(id PK, nome, email, cargo_id FK -> cargos.id, departamento_id FK -> departamentos.id, gestor_id FK -> funcionarios.id, data_admissao, data_desligamento)
salarios_historico(id PK, funcionario_id FK -> funcionarios.id, data_inicio, salario, motivo)
avaliacoes(id PK, funcionario_id FK -> funcionarios.id, avaliador_id FK -> funcionarios.id, periodo, nota, comentario)
ausencias(id PK, funcionario_id FK -> funcionarios.id, tipo, data_inicio, data_fim, dias)
```

Consultas-chave do oráculo: `headcount_turnover_por_departamento` (8 linhas), `media_salarial_atual_por_cargo` (22 linhas), `subordinados_diretos_por_gestor` (10 linhas).

## atendimento.sql

Cenário **Atendimento**: clientes, agentes, tickets, interações e pesquisas de satisfação. Permite TMA, backlog e CSAT por agente. Data/hora em texto ISO `YYYY-MM-DDTHH:MM:SS` (sem fuso). Referência fixa: 2025-11-15 12:00.

| Item | Valor |
|---|---|
| Bytes | 114854 |
| SHA-256 | `bfb9f9bce4c218af26aea6fb985703e13c62c41cdefb7e70eb362736845aa650` |
| Gerador | `docs/testing/fixtures/gen_atendimento.py` (somente biblioteca padrão, gerador pseudoaleatório próprio LCG, semente 20250505) |
| Regerar | `python3 -I docs/testing/fixtures/gen_atendimento.py` (duas execuções geram o mesmo sha256) |
| Oráculo dos testes | `docs/testing/fixtures/compute_atendimento_expected.py` (sqlite3 do Python sobre o mesmo .sql; confere integridade, FKs, contagens, somas e 3 consultas-chave, cada uma recalculada em Python puro) |

| Tabela | Linhas | Colunas |
|---|---|---|
| clientes | 120 | id (PK), nome, email (NULL em 13), plano (basico, pro, empresarial), data_cadastro |
| agentes | 20 | id (PK), nome, equipe (N1, N2, Financeiro), data_entrada |
| tickets | 320 | id (PK), cliente_id (FK), agente_id (FK; NULL em 4 = sem agente), assunto, prioridade (baixa, media, alta, urgente), canal (email, chat, telefone, formulario), status (aberto, em_andamento, resolvido, fechado), aberto_em, fechado_em (NULL em 16 = backlog; só nos status aberto e em_andamento) |
| interacoes | 566 | id (PK), ticket_id (FK), autor_tipo (cliente, agente), agente_id (FK; NULL quando o autor é o cliente), data_hora, mensagem |
| pesquisas_satisfacao | 184 | id (PK), ticket_id (FK, único), nota (1 a 5; NULL em 58 = pesquisa sem resposta), comentario (NULL na maioria), respondida_em (NULL sem resposta) |

TMA = média de (`fechado_em` - `aberto_em`) em minutos dos tickets com `fechado_em`; os agentes 5 e 6 são propositalmente mais lentos e o 1 e o 2 mais rápidos. CSAT = % de notas >= 4 entre as respondidas.

```
clientes 1 ──< tickets >── 1 agentes
tickets 1 ──< interacoes >── (0..1) agentes
tickets 1 ── (0..1) pesquisas_satisfacao

clientes(id PK, nome, email, plano, data_cadastro)
agentes(id PK, nome, equipe, data_entrada)
tickets(id PK, cliente_id FK -> clientes.id, agente_id FK -> agentes.id, assunto, prioridade, canal, status, aberto_em, fechado_em)
interacoes(id PK, ticket_id FK -> tickets.id, autor_tipo, agente_id FK -> agentes.id, data_hora, mensagem)
pesquisas_satisfacao(id PK, ticket_id FK -> tickets.id, nota, comentario, respondida_em)
```

Consultas-chave do oráculo: `tma_por_agente` (20 linhas), `backlog_por_prioridade` (4 linhas), `csat_por_agente` (20 linhas).

### Teste dos 5 cenários

`node tests/hub/datasets.js` (sem servidor e sem navegador; precisa de `python3` e `node`): regera cada .sql duas vezes e compara com o commitado e com o SHA-256/bytes deste README, confere tamanho (<= 120 KB), integridade, FKs, contagens, e cada consulta-chave contra o oráculo (`compute_*_expected.py`; para a loja, `compute_loja_expected.py` e `compute_loja_keyq_expected.py`). Usa o sqlite3 do Python, não o sql.js do Hub.

## exercicios.md

Regra de comparação (colunas, tipos, ordem), mensagens de falha, isolamento da verificação e os 5 exercícios guiados do SQL playground (T-307). O oráculo independente dos resultados esperados é `docs/testing/fixtures/compute_exercises_expected.py` (sqlite3 do Python, cálculo em Python puro sobre `loja-exemplo.sql`); os testes estão em `tests/hub/exercises.js`. Se o `loja-exemplo.sql` for regerado, confira as linhas esperadas (4/9/5/9/10) no oráculo e em `exercicios.md`.
