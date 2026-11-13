# Pyodide: medição de tamanho e custo de download (T-401, insumo)

Branch `feat/phase-4-groundwork` (base `9222afc`). Data: 2026-11-13. Autor: security-auditor (medições e experimentos; a decisão de arquitetura é do solution-architect e a aprovação de D3c é do Lucas). Nada em `hub/` foi alterado e nada foi commitado. Este documento responde à pendência P1 de `docs/architecture/technology-stack.md` (seção 3.1: "tamanho do Pyodide não verificado").

Legenda: **[M]** medido nesta sessão, com comando ou fonte primária. **[P]** proxy, não é o número que se quer. **[N]** não medido. Nenhum número [P] deve ser copiado para o `manifest.json`.

## 1. Versão e integridade

| Item | Valor |
|---|---|
| Pacote | `pyodide` no npm, tag `latest` = **314.0.7** [M: `npm view pyodide dist-tags`] |
| Publicada em | 2026-09-14 [M: `npm view pyodide time`]. A 314.0.0 saiu em 2026-06-09. Há `next` = 315.0.0-alpha.2, que não deve ser usada |
| Python / Emscripten / ABI | Python 3.14.2, `emscripten_5_0_3`, ABI `2026_0`, `wasm32` [M: `info` do `pyodide-lock.json`] |
| Licença | `MPL-2.0` no `package.json` [M]. **O tarball não contém arquivo `LICENSE`** (14 arquivos, conferido): a licença do Pyodide e dos pacotes continua [N], pendente do gate de licença do `manifest.json` |
| Integridade do tarball | `sha512-0YvXxEhfEdpLfb/XkM2BFAeMROq0iMUX2bzzH9pOttyMcWkwq+HbE5uyuGD82LN7y2q+SNvi/6V5JEsOlD2R1A==` |
| Conferência | `npm view pyodide dist.integrity` devolveu o mesmo valor que `openssl dgst -sha512 -binary pyodide-314.0.7.tgz \| base64` sobre o arquivo baixado com `npm pack pyodide@314.0.7` (6.488.647 B). **Iguais** [M] |

Obtido em diretório temporário fora do repositório (`/tmp/p4/`). O registro npm entrega só o **núcleo**. Os pacotes (numpy, pandas...) não estão no tarball (ver seção 3).

## 2. Núcleo (o que "só Python" baixa) [M]

Tamanho em bytes sem compressão (`ls -l`), SHA-256 (`sha256sum`), gzip -9 (`gzip -9 -c | wc -c`) e bytes **realmente transferidos** no Chrome 153 contra um servidor local que emula gzip nível 6 (soma de `content-length` do corpo comprimido por arquivo, contado no servidor). Brotli não estava instalado: não medido.

| Arquivo | Bytes | gzip -9 | Transferido (gzip 6) | Carregado no `loadPyodide`? | SHA-256 |
|---|---:|---:|---:|---|---|
| `pyodide.asm.wasm` | 9.598.218 | 3.542.413 | 3.600.748 | sim | `cc36e3cab04fdfc9a63ff13eb52eae2b911bf46c025cc7b281f394bd3de1d5e6` |
| `python_stdlib.zip` | 2.545.637 | 2.501.808 | 2.503.781 | sim | `fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a` |
| `pyodide.asm.mjs` | 1.250.344 | 260.720 | 261.280 | sim | `f7cdc8ece80678ceb712f8e65ebe6d3a83203a180c399865f49612a051693635` |
| `pyodide-lock.json` | 119.077 | 26.457 | 25.716 | sim | `5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010` |
| `pyodide.mjs` | 17.931 | 7.190 | 7.196 | sim (é o ponto de entrada) | `6f1d60f7bf529beb300f0f47983c921d3982363640ba20af0e38efdddbc66109` |
| `pyodide.js` (clássico/CJS) | 18.912 | 7.499 | não carregado | não (inútil: ver seção 5) | `3141b814715a72e59b51b1b18b9ceae5bf19f7c852417e431bb0a34feadf825c` |
| **Total dos 5 carregados** | **13.531.207** (12,9 MiB) | 6.338.588 | **6.398.721** (6,1 MiB) | | |
| Total com `pyodide.js` | 13.550.119 | | | | |

Pontos:
- Os `.map`, `.d.ts`, `console*.html` e `README.md` do tarball não são necessários (o tarball descompactado tem 13.879.282 B).
- O `.wasm` comprime só 63% (3,5 de 9,6 MB). `python_stdlib.zip` já é um zip: gzip não ajuda (2,5 MB).
- O número do documento anterior ("dezenas de MB") era uma expectativa [S]. O medido é menor: **12,9 MiB sem compressão, 6,1 MiB com gzip**.
- Tempo de `loadPyodide` até `1+1` em Chrome 153 headless, Linux, servidor local (sem latência de rede, CPU de 2 núcleos): entre **1,8 e 3,1 s** nas execuções desta sessão (cerca de 15 cargas, `loadMs` registrado pelo Worker; os servidos sem cache HTTP, com gzip 6), incluindo descompressão. É medida de CPU deste ambiente; **celular e rede real [N]**.

## 3. Pacotes de um playground de dados

O `pyodide-lock.json` lista 357 pacotes. Ele **não traz tamanhos** (campos: `depends`, `file_name`, `imports`, `install_dir`, `name`, `package_type`, `sha256`, `tool`, `unvendored_tests`, `version`) [M]. Os wheels WASM ficam no CDN do projeto (jsDelivr, `cdn.jsdelivr.net/pyodide/v314.0.7/full/`) e na distribuição completa do GitHub. **Neste ambiente jsDelivr responde 403 ao CONNECT do proxy, o GitHub não está liberado para este repositório e PyPI não hospeda os wheels `pyemscripten_2026_0_wasm32`**: por isso o tamanho real dos wheels de numpy, pandas e matplotlib **não foi medido [N]**.

Fechos de dependência, lidos do `pyodide-lock.json` [M]:

| Pedido | Pacotes (versão) |
|---|---|
| numpy | numpy 2.4.6 (1 pacote) |
| pandas | pandas 3.0.2, numpy 2.4.6, python-dateutil 2.9.0.post0, six 1.17.0, pytz 2026.1.post1 (5 pacotes) |
| matplotlib | matplotlib 3.10.8, contourpy 1.3.3, numpy 2.4.6, cycler 0.12.1, six 1.17.0, fonttools 4.62.1, kiwisolver 1.5.0, packaging 26.1, pillow 12.2.0, pyparsing 3.3.2, python-dateutil, pytz (12 pacotes) |

Proxies [P], só para ordem de grandeza (tamanho do wheel **nativo** `manylinux` x86_64 cp314 no PyPI, mesma versão; o wheel WASM é outro arquivo e pode ser maior ou menor): numpy 16.638.245 B, pandas 10.897.535 B, matplotlib 9.824.193 B, pillow 7.083.360 B, contourpy 363.819 B, kiwisolver 1.475.913 B. Wheels Python puros no PyPI (o `sha256` do lock **não bate** com o do PyPI, então o arquivo do Pyodide é diferente; tamanho aproximado): six 11.050 B, python-dateutil 229.892 B, pytz 510.489 B, packaging 95.831 B, pyparsing 122.781 B, cycler 8.321 B, fonttools 1.152.647 B.

Consequência: a linha "Python + numpy" e "Python + pandas" abaixo tem **parte medida (núcleo) e parte não medida (wheels)**. Quem for executar T-401/T-402 precisa baixar os wheels de um ambiente com acesso ao jsDelivr ou à release do GitHub, conferir o `sha256` de cada um contra o `pyodide-lock.json` e só então preencher o `manifest.json`.

## 4. O que o usuário baixa no primeiro clique (cache vazio)

| Cenário | Medido | Não medido | Faixa de ordem de grandeza (não é medida) |
|---|---|---|---|
| Só Python | **6,1 MiB transferidos com gzip 6** (13,5 MB brutos), cinco arquivos do vendor (confirmado pelos eventos `response` do Playwright: `pyodide.js` clássico não é pedido) [M] | brotli; se o Pages comprime `.wasm` (ver seção 6) | se o Pages **não** comprimir: 13,5 MB |
| Python + numpy | núcleo 6,1 MiB [M] + wheel numpy [N] | tamanho do wheel numpy WASM | núcleo + um wheel de alguns MB a ~17 MB (proxy nativo 16,6 MB) |
| Python + pandas | núcleo 6,1 MiB [M] + pandas, numpy, dateutil, pytz, six [N] | tamanho dos 5 wheels | núcleo + pandas + numpy (proxies nativos somam 27,5 MB) + ~0,75 MB de wheels puros |

O piso medido de qualquer cenário é 6,1 MiB. O tamanho exato de "Python + pandas" é pendência de T-401 (quem tiver acesso à rede).

PRV-14 (T-405): zero requisição `pyodide*` antes do clique. Neste teste o carregamento só ocorreu depois de chamar `start()`; as páginas de sonda não carregam nada do Pyodide antes disso [M: contagem de `/__served` zerada antes da chamada]. A conferência na página real do Hub é do QA.

## 5. Orçamento do repositório e do site

| Orçamento | Limite | Núcleo Pyodide | Observação |
|---|---|---|---|
| Vendor acumulado (`docs/architecture`) | 300 MB | 13,55 MB = **4,5 %** | Mesmo triplicando para incluir numpy, pandas e dependências (proxies nativos, ordem de ~50 MB) ficaria bem abaixo [P] |
| Site publicado no Pages | 1 GB | 1,4 % | Limite oficial, ver `infrastructure-costs.md` (lido em 2026-11-12) |
| Repositório recomendado | 1 GB | histórico git | **Cada versão vendorizada é um blob novo e incompressível** (wasm, zip). 13,5 MB por atualização; 10 versões = 135 MB no histórico. A árvore de trabalho atual (sem `.git`) tem 4,8 MB (`du`), então o Pyodide seria a maior parte do repositório |
| Banda "recomendada" do Pages | 100 GB/mês (limite flexível) | 6,1 MiB por sessão fria | 100.000 MB / 6,4 MB ≈ **15.600 sessões frias por mês** só com o núcleo (conta bruta; sem pacotes; sem cache). Com pandas o número cai na proporção do tamanho real dos wheels, que é pendência [N] |

Conclusão sobre o teto de 300 MB: **o vendor do Pyodide não passa do teto de 300 MB** com folga larga (13,5 MB o núcleo). O risco real não é o espaço, é (a) a banda de sessões frias se o site tiver pico de acessos e (b) o histórico do git com cada atualização. A recomendação (D3c = arquivos próprios, versão fixada) se sustenta pelos números medidos; a aprovação continua sendo do Lucas. Uma exceção de CDN não é necessária pelo critério de tamanho.

Com cache do navegador o segundo uso é quase gratuito, **se** o Pages enviar `Cache-Control` útil. O `max-age` padrão do Pages (recordação, 10 minutos) é [S] e **não foi verificado** (o shell não alcança `github.io`). Com `max-age=600`, a cada 10 minutos o navegador revalida (304, poucos bytes se o `ETag` valer). Medir no deploy.

## 6. O que NÃO foi medido

- Tamanho real dos wheels WASM de numpy, pandas, matplotlib e dependências (ver seção 3). Sem eles, "Python + numpy/pandas" é incompleto.
- Comportamento do GitHub Pages real: compressão de `.wasm`, MIME do `.wasm` (`application/wasm` é necessário para `instantiateStreaming`; o Chrome faz fallback, com aviso), `Cache-Control`, cabeçalho CORS (ver `phase-4-worker-isolation.md`, o sandbox depende dele), comportamento em subpasta `/portfolio/`.
- Brotli, HTTP/2, rede móvel, latência real.
- Tempo de carga e memória em celular, Safari, Firefox. Só Chrome 153 for Testing, Linux, headless, 2 núcleos, 8 GB de RAM.
- Licença: conteúdo do `LICENSE` do Pyodide e dos wheels (o tarball não o traz). Advisories do Pyodide 314.0.7 e dos pacotes: não consultados nesta sessão.
- Equivalência entre o tarball do npm e o código-fonte no GitHub.
- Tempo de `import pandas` e de operações reais sobre CSVs grandes.

## 7. Entrada sugerida para `vendor/manifest.json` (a preencher em T-401/T-402, não commitada)

```
pyodide 314.0.7 (npm), tarball sha512-0YvXxEhf...R1A== (conferido com npm view)
pyodide.asm.wasm      9598218  cc36e3ca...bd5e6
python_stdlib.zip     2545637  fa1957e5...6dd7a
pyodide.asm.mjs       1250344  f7cdc8ec...63693
pyodide-lock.json      119077  5dc2fc11...c010
pyodide.mjs             17931  6f1d60f7...6109
```

(Os hashes completos estão na tabela da seção 2.) Antes de qualquer commit de `vendor/pyodide/`: ler a licença real, rodar a consulta de advisories, trocar o `pyodide-lock.json` por uma cópia filtrada só com os pacotes autorizados (lista fechada, ver o documento de isolamento) e **não** vendorizar `pyodide.js` clássico, os `.map` nem os 357 pacotes.
