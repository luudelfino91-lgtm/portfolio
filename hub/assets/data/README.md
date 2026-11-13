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

Além da loja (cenário **Vendas**, acima), há 4 bases sintéticas no mesmo padrão: gerador próprio determinístico (LCG, semente fixa), só biblioteca padrão, FKs declaradas, NULLs intencionais, datas ISO, e-mails em `example.com`, nomes por combinação genérica, zero dados reais. Cada `.sql` começa com comentários e `CREATE TABLE` (sem `PRAGMA`/`BEGIN`, como a loja) e passa em `PRAGMA integrity_check` (ok) e `PRAGMA foreign_key_check` (vazio). O teste `tests/hub/datasets.js` confere os 5 cenários e os CSV exportados (D11). Não edite os .sql à mão: altere o gerador, regere e atualize bytes e SHA-256 (o teste confere).

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

`node tests/hub/datasets.js` (sem servidor e sem navegador; precisa de `python3` e `node`): regera cada .sql duas vezes e compara com o commitado e com o SHA-256/bytes deste README, confere tamanho (<= 120 KB), integridade, FKs, contagens, e cada consulta-chave contra o oráculo (`compute_*_expected.py`; para a loja, `compute_loja_expected.py` e `compute_loja_keyq_expected.py`). Usa o sqlite3 do Python, não o sql.js do Hub. Desde D11 confere também os CSV de `csv/`: gerador determinístico, bytes/SHA-256 de cada arquivo, ida e volta de todas as células contra o `sqlite3`, `schema.json` = `PRAGMA`, tabelas de `scenarios.js` = `CREATE TABLE` e o diagrama ER de `scenarios.js` = o deste README.

## csv/ (D11): as tabelas de cada cenário em CSV e schema.json

D11 (Lucas): **nenhum upload de arquivo do usuário em lugar nenhum**; as três ferramentas trabalham só com as 5 bases de cenário. O **explorador de dados** (`hub/ferramentas/csv/`) e o **Python playground** leem estes arquivos, que o site serve na mesma origem. O SQL playground continua carregando os `.sql` acima.

| Item | Valor |
|---|---|
| Pasta | `hub/assets/data/csv/<slug>/<tabela>.csv` e `hub/assets/data/csv/<slug>/schema.json` (slug = `loja-exemplo`, `marketing-digital`, `logistica`, `rh`, `atendimento`) |
| Gerador | `docs/testing/fixtures/export_scenarios_csv.py` (somente biblioteca padrão; lê os `.sql` e exporta com `sqlite3`/`csv`) |
| Regerar | `python3 -I docs/testing/fixtures/export_scenarios_csv.py` (duas execuções geram arquivos idênticos); `--report` imprime a tabela abaixo |
| Conferir | `cd hub/assets/data/csv && sha256sum -c SHA256SUMS`; `node tests/hub/datasets.js` confere bytes e SHA-256 desta seção |
| Formato do CSV | UTF-8 sem BOM, fim de linha LF, 1ª linha = cabeçalho, aspas só quando necessário, linhas na ordem de `rowid`. **NULL = célula vazia**; por isso o gerador **recusa** texto vazio ou com espaços nas pontas (seria ambíguo). REAL sai com `repr()` do Python (ex.: `89.9`, `100.0`). |
| `schema.json` | tabelas na ordem do `CREATE TABLE`; por coluna: `name`, `type` (declarado), `pk`, `fk` (`tabela.coluna`), extraídos de `PRAGMA table_info`/`foreign_key_list` do próprio SQLite |
| Peso | 32 arquivos, **251.244 bytes** (245,4 KiB) no total, 61.434 B com gzip -9 arquivo a arquivo; maior arquivo: `atendimento/interacoes.csv` (46.294 B); maior cenário: atendimento (91.993 B em 6 arquivos). O Python busca só as tabelas do cenário escolhido, e só quando o usuário aperta Executar; o explorador busca o `schema.json` e uma tabela por vez. |

Bytes e SHA-256 de cada arquivo (o teste confere um a um):

| Arquivo | Bytes | SHA-256 |
|---|---|---|
| `atendimento/agentes.csv` | 674 | `3ed4f5c35fc3a9f5425159f8330ceccff6e823c49c82777305ca58cf203fa7df` |
| `atendimento/clientes.csv` | 6596 | `e61554a463e4cd9fa0b652cb371ebc7a518bd6123a45394446440d498d5d2ec4` |
| `atendimento/interacoes.csv` | 46294 | `e1000c3cf8bb37b628df62cbe35c242438f44e7a72bba9c472e924302d96ff81` |
| `atendimento/pesquisas_satisfacao.csv` | 5113 | `9fcd655d84cf30f25ecd2203969505bb0825c8a5b788a17471318ed675d02bcf` |
| `atendimento/schema.json` | 3007 | `fc1ef400c6b0009deceedb461ff6625d81e800dbe50ce1faa9cb9c4128ffc801` |
| `atendimento/tickets.csv` | 30309 | `776401f3dabadb60d8ce49be9016e9ee30e0402bc9b17bfc6c0e2ac91a75a2e4` |
| `logistica/centros_distribuicao.csv` | 198 | `2eabdd6d1d8a1b53dd6a19684cf4154685a0aedc61a3773334c8391370b25eef` |
| `logistica/entregas.csv` | 26903 | `fc5497cda230c03bd766aa111b87c81267e2f61cba8d5c9e0943b65bfa277cff` |
| `logistica/ocorrencias.csv` | 10456 | `228e8879526201ac3290e63874d9fb83dcd7d664367078400b8d795b58f9b2a8` |
| `logistica/rotas.csv` | 697 | `d0c85e5f092aa912d25c383a2c3e81263142003afde73d619961d7eb4bde4d88` |
| `logistica/schema.json` | 3295 | `a0a0dea1cff9157880784f1d26deda2f49fa736749b9e247b7799e839cb298d8` |
| `logistica/transportadoras.csv` | 336 | `675f2b8e41f7560b482b1b69a4887dbfc5babc192ac4062a2284bcf01eb84591` |
| `logistica/veiculos.csv` | 1044 | `6c1747809959029bf2732f43f4000c8b90ed71f15a2dd2f8c44071b87590247c` |
| `loja-exemplo/categorias.csv` | 83 | `ec8702ae8d426796f3b8948f49361517c16b50bcd9f56ca39291eac361d4777b` |
| `loja-exemplo/clientes.csv` | 2335 | `023e60481bc0f7de0a5d6a36bf72dcdcbafa5dbc4c920a4d7dfbea7bf65788a6` |
| `loja-exemplo/itens_pedido.csv` | 8832 | `f642b34f410a023539ffa578f94e7337acca7ae91c808486ad769ab5a1842b24` |
| `loja-exemplo/pedidos.csv` | 7066 | `12a1237ad002bb9e272bcc8d6e5d80b92aa41adb8cf6a69ddcac2bedcb028a05` |
| `loja-exemplo/produtos.csv` | 981 | `bdfe7594ea735a9a42e1f59335d42e44448e9f709e2f9619a4ec3d5aa68abc6d` |
| `loja-exemplo/schema.json` | 2360 | `7e5f356bfd51b238d77dae3ce6a23ba32880e6f2aba882067ec3888ce21da16a` |
| `marketing-digital/anuncios.csv` | 2918 | `836c8a1adc0e211812e660ad158aa4d1678f0b78726bd264726e54f58ee346c5` |
| `marketing-digital/campanhas.csv` | 1414 | `aab1a2fb173e16d58c6bc7b85b697006181c5c81d8d7a935c24c46b37cb03bd1` |
| `marketing-digital/canais.csv` | 117 | `0eb820a5918c12da60d32ccd506049a9368e495701e7aa47efd890309eab456e` |
| `marketing-digital/leads.csv` | 17481 | `4e08fb5eb50f37143444b38c9aef8eed98f467868a78b917c036771a1aa420dc` |
| `marketing-digital/metricas_diarias.csv` | 20952 | `27fb1dc94b29fd78d576e24e6d6fab2c179dd73d41aa2bee1508fa1ad75f118f` |
| `marketing-digital/schema.json` | 3184 | `e911d9c5311f070f9473d8b40a81f74330c5da3a2ad9b982b553f870e456ffd2` |
| `rh/ausencias.csv` | 8706 | `2540fa18b9a251b388083832d9f344f227244aa5936f838a3287790be47d5e21` |
| `rh/avaliacoes.csv` | 9957 | `f0b7a707fa62fc52b8146f75c7de289b12109121dcde7a2d503ed62305043822` |
| `rh/cargos.csv` | 680 | `181ae81798a7742e1582cebce9b591db2c25f8b9f89bbaa22866058ccec0299d` |
| `rh/departamentos.csv` | 163 | `c5acad89b45a051a429d6e0833367df7e67be96cbdebae234d1e007b28dad9b2` |
| `rh/funcionarios.csv` | 11650 | `28ea390bc3842777d684fc650d3a1eccd0669e7d4d552de471570561e3d85fb8` |
| `rh/salarios_historico.csv` | 14011 | `d4949030dd5b71b4381911a546effa60a3ce7c84f747e2ae9d4006605bea06df` |
| `rh/schema.json` | 3432 | `68751a6340a51269f02f1e8a697de2da009d18b09bb5212e0d10925813521e34` |

Total: 32 arquivos, 251244 bytes

## exercicios.md

Regra de comparação (colunas, tipos, ordem), mensagens de falha, isolamento da verificação e os 5 exercícios guiados do SQL playground (T-307). O oráculo independente dos resultados esperados é `docs/testing/fixtures/compute_exercises_expected.py` (sqlite3 do Python, cálculo em Python puro sobre `loja-exemplo.sql`); os testes estão em `tests/hub/exercises.js`. Se o `loja-exemplo.sql` for regerado, confira as linhas esperadas (4/9/5/9/10) no oráculo e em `exercicios.md`.
