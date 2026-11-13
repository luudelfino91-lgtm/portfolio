# Fixtures de CSV e oráculo (T-311)

Fixtures da seção 3.2 de `docs/testing/test-strategy.md`, geradas por script determinístico, com a resposta esperada em `expected.json` calculada por um oráculo Python independente do Hub (só biblioteca padrão). Estado: **Executado** (gerador, oráculo e check de determinismo rodados; saídas no fim deste arquivo). Nenhum caso CSV-xx/SQL-xx foi executado contra o Hub: isto só entrega as fixtures.

## Como regenerar

```
cd docs/testing/fixtures
python3 -I gen_csv.py              # 21 fixtures pequenas (commitáveis), na própria pasta
python3 -I gen_csv.py --large      # + limit-10mb.csv, over-limit.csv, big-50mb.csv (no .gitignore)
python3 -I gen_csv.py --out DIR    # grava em outra pasta (usado no check de determinismo)
python3 -I compute_expected.py     # gera expected.json e SHA256SUMS a partir dos bytes dos arquivos
sha256sum -c --ignore-missing SHA256SUMS
```

O `expected.json` commitado foi gerado com os arquivos grandes presentes (`--large`). Sem eles, o oráculo marca as entradas grandes como `not_generated` e o `expected.json` muda; regenere com `--large` antes de comparar. `SHA256SUMS` lista também os grandes (use `--ignore-missing`).

Limite do MVP: 10 MiB = **10.485.760 bytes** (C6). `limit-10mb.csv` = exatamente 10.485.760 bytes; `over-limit.csv` = 10.485.761 bytes (mesmo conteúdo, 1 byte a mais de preenchimento no último campo); ambos CSV ASCII válidos, 10 colunas, 111.875 linhas. `big-50mb.csv` = 52.428.800 bytes (50 MiB), 554.664 linhas, só registro (CSV-51b, SQL-18b).

## Fixtures (24 arquivos: 21 pequenos + 3 grandes)

| Arquivo | Linhas x colunas | O que cobre | Casos |
|---|---|---|---|
| `basic.csv` | 10.000 x 10, `,`, UTF-8 | acentos (`ação`, `São Paulo`, `ç`, `ñ` na linha 1), tipos int/decimal/booleano/data/texto, nulos em `observacao` | CSV-01, 02, 03, 04, 50; SQL-10, 14, 15 |
| `semicolon.csv` | 200 x 10, `;`, decimal com vírgula | delimitador, decimal BR | CSV-12 |
| `tab.tsv` | 200 x 10, tab | delimitador | CSV-12 |
| `pipe.csv` | 200 x 10, `\|` | delimitador | CSV-12 |
| `bom.csv` | 3 x 3, UTF-8 com BOM; 1ª coluna `código` | BOM removido | CSV-14; SQL-13 |
| `latin1.csv` | 4 x 4, ISO-8859-1 | codificação | CSV-15 |
| `empty.csv` | 0 bytes | vazio | CSV-10; SQL-17 |
| `header-only.csv` | 0 x 4 | vazio parcial | CSV-11; SQL-17 |
| `one-col.csv` | 50 x 1 | 1 coluna, sem delimitador | CSV-13 |
| `quoted.csv` | 7 registros, 11 linhas físicas, 4 col. | vírgula, `""`, LF e CRLF dentro de campo | CSV-16 |
| `ragged.csv` | 7 x 4; 4 linhas irregulares (2 longas, 2 curtas) | inconsistência | CSV-17 |
| `nulls.csv` | 30 x 9 | vazio, `NULL`, `NA`, espaços, coluna 100% nula, coluna de 1 valor, texto | CSV-60, 61, 62; SQL-15 |
| `dup-headers.csv` | 3 x 7 (`nome`, `nome`, vazio, `Nome`, vazio) | nomes duplicados/vazios | CSV-18; SQL-12 |
| `crlf.csv`, `cr.csv` | 20 x 10 | fim de linha `\r\n` e `\r` | CSV-19 |
| `lf.csv` (extra) | 20 x 10 | referência `\n` do mesmo conteúdo (contagem igual a crlf/cr) | CSV-19 |
| `wide.csv` | 100 x 500 | largura | CSV-20 |
| `fake.csv` | PNG 1x1 (70 bytes) | binário com extensão `.csv` | CSV-30, 35 |
| `xss.csv` | 5 x 6 | ver Segurança | CSV-40, 41; SQL-40, 41 |
| `types.csv` | 6 x 10 | int, decimal, int+decimal, data ISO, data BR, booleano, texto misto, decimal BR, código com zeros, negativos | CSV-04; SQL-14 |
| `canary-CANARIO-NOME-4c8e1b.csv` | 2 x 3 | canários do método 5.2 | PRV-01 a PRV-05 (T-310) |
| `limit-10mb.csv` | 111.875 x 10 | borda do limite, 10.485.760 bytes | CSV-51, 53, 52 (aceito); SQL-18, 31 |
| `over-limit.csv` | 111.875 x 10 | 10.485.761 bytes | CSV-52 |
| `big-50mb.csv` | 554.664 x 10 | exploratório | CSV-51b; SQL-18b |

CSV-21 (célula de 100 KB), CSV-22 e CSV-31 a CSV-34 usam arquivos montados em tempo de teste (buffer em memória), não fixtures fixas.

## Segurança e canários

`xss.csv` contém: cabeçalhos `<img src=x onerror=alert(1)>`, `<script>alert(1)</script>`, `a"b`, `` `tick` ``, `"; DROP TABLE t; --`, `=cmd|' /C calc'!A0`; células com `<script>`, `</script>`, `</script><script>alert(1)</script>`, aspas simples/duplas/crases, `=cmd|' /C calc'!A0`, `+SUM(1+1)`, `-2+3`, `@SUM(A1)`, `=HYPERLINK(...)`, `javascript:alert(1)`, `{{7*7}}`, `${7*7}`, `"><svg/onload=alert(1)>`, `<iframe src=javascript:...>`, `&lt;b&gt;&amp;`.

Canários (método 5.2 do test-strategy):

- Conteúdo: `CANARIO-9f3a7c`, dentro de `canary-CANARIO-NOME-4c8e1b.csv`.
- Nome do arquivo: `CANARIO-NOME-4c8e1b` (o próprio nome do arquivo acima).
- SQL: `CANARIO-SQL-51b2` vai só na consulta escrita pelo teste (não está em arquivo).

Nomes de arquivo maliciosos (CSV-22, SQL-11, SQL-41): **não** são commitados (inválidos em Windows e no Pages). O teste Playwright os cria em memória com `setInputFiles({name, mimeType, buffer})` usando o conteúdo de `xss.csv`:

```
<img src=x onerror=alert(1)>.csv
"><script>alert(1)</script>.csv
a'b"c`d.csv
2024 vendas ação.csv
order.csv
=cmd|' /C calc'!A0.csv
..\..\etc\passwd.csv
```

## Suposições abertas (o PRD e o test-strategy não definem estas regras)

O oráculo aplica as regras abaixo e as marca em `expected.json` (`assumptions`, `type_rule_status: "assumed"`, `assumption_refs` por coluna). Cabe ao produto (frontend-developer, com o PM) confirmar ou trocar; se mudar, ajuste `compute_expected.py` e regenere.

- **A1 (nulo, CSV-62):** nulo = vazio ou só espaços/tabs. `nulls_extended` também conta `NULL` e `NA` (sem diferenciar caixa). Os dois números estão no JSON; o teste CSV-60 deve escolher o que a UI documentar.
- **A2 (booleano):** só `true`/`false` (sem diferenciar caixa). `0/1` e `sim/não` não são booleanos.
- **A3 (decimal BR e data BR):** `1234,56` -> `decimal_br`; `31/01/2024` -> `date_br`. São tipos propostos; o Hub pode tratá-los como texto (SQL-14 admite datas como texto). Decisão pendente.
- **A4 (linha curta):** célula ausente conta como nula; célula excedente é ignorada nas estatísticas.
- **A5 (zeros à esquerda):** `00123` é texto, não inteiro.
- **A6:** linhas totalmente em branco são ignoradas; `rows` = registros após o cabeçalho.
- **A7 (codificação):** BOM -> utf-8-sig; UTF-8 válido -> utf-8; senão windows-1252.
- **A8 (min/max):** numérico pelo valor (devolvido como o texto original da célula); data ISO, data BR e texto em ordem lexicográfica de pontos de código Unicode (JS compara em unidades UTF-16 e SQLite em bytes; divergem só fora do BMP, que as fixtures não usam; data BR não é cronológica); booleano `false` < `true`.
- **A9 (distintos):** valores não nulos distintos pelo texto exato, sem trim.
- **A10 (delimitador):** o oráculo detecta (consistência de colunas nas 20 primeiras linhas) e confere contra o declarado; 1 coluna -> `delimiter: null`.
- Tamanho de `big-50mb.csv`: 50 MiB (52.428.800), não 50.000.000; ajustar se o PM preferir MB decimal.
- O texto do test-strategy fala em "cerca de 100 mil linhas" para `limit-10mb.csv`; saíram 111.875 (limite exato de bytes).

## Saídas das execuções (2026-11-12)

### Gerador, duas execuções em pastas distintas (determinismo)

```
$ python3 -I gen_csv.py --large --out /tmp/fa
gerados 24 arquivos em /tmp/fa
$ python3 -I gen_csv.py --large --out /tmp/fb
gerados 24 arquivos em /tmp/fb
$ (cd /tmp/fa && sha256sum * > /tmp/sa); (cd /tmp/fb && sha256sum * > /tmp/sb); diff /tmp/sa /tmp/sb && echo PASSOU
DETERMINISMO: PASSOU (24 arquivos, sha256 identicos)
```

Resultado: **Executado: passou**. Os sha256 dos 24 arquivos são os de `SHA256SUMS`.

### Gerador e oráculo na pasta das fixtures; oráculo duas vezes

```
$ python3 -I gen_csv.py --large
gerados 24 arquivos em .../docs/testing/fixtures
$ python3 -I compute_expected.py
expected.json: 24 entradas; SHA256SUMS: 25 linhas
$ python3 -I compute_expected.py && cmp expected.json (cópia da 1ª execução)
expected.json: 24 entradas; SHA256SUMS: 25 linhas
oraculo deterministico: expected.json identico
```

### Tamanhos exatos e conferência

```
$ ls -l limit-10mb.csv over-limit.csv big-50mb.csv   (antes de apagar os grandes)
10485760 limit-10mb.csv
10485761 over-limit.csv
52428800 big-50mb.csv
$ sha256sum -c --ignore-missing SHA256SUMS   (grandes apagados após o cálculo)
21 linhas "OK" (20 fixtures pequenas + expected.json), 0 falhas
```

O oráculo aborta se o tamanho dos arquivos grandes ou o delimitador detectado divergir do declarado; terminou sem abortar.

### Valores do oráculo usados pelos casos (extrato de `expected.json`)

```
basic.csv   rows=10000 cols=10 delimiter="," encoding=utf-8
            id: integer, soma 50005000 | salario: decimal, min 1500.80, max 10499.91, soma 59924576.82
            observacao: 2211 nulos, 8 distintos
types.csv   inteiro=integer inteiro_ou_decimal=decimal data_iso=date data_br=date_br(A3)
            booleano=boolean(A2) texto_misto=text decimal_br=decimal_br(A3) codigo_zeros=text(A5)
nulls.csv   numero: nulos=10 (vazio/espacos), nulos_extended=20; texto_null: nulos=0, extended=5
sha256 limit-10mb.csv = 9bb37077b3be4272b1d29ddbf21d70fae197ae7be44d5e1c5073d4cf5d48cf9e
sha256 over-limit.csv = 7d6dca3c5ace7b35d95ab342b377ec411e7fc8dfd88c1b7833c09a231b8af9da
sha256 big-50mb.csv   = de50c5cf040130c7dd5a6a0a140c062b2699b2a23f7af90554ddf681783a02bc
```

### Não executado

Nenhum caso CSV-xx/SQL-xx foi executado (o Hub da Fase 3 ainda não existe). Windows/macOS não foram testados para o gerador (só Linux, Python 3.13).
