# Bibliotecas de terceiros do Hub (T-301)

Arquivos próprios, sem CDN (decisão D3b do Lucas). **Papa Parse 5.7.1 foi removido em D11** (sem upload, nenhuma ferramenta lê CSV de arquivo do usuário; o explorador de dados lê os CSV embutidos com um leitor próprio de ~25 linhas em `hub/assets/js/csv.js` e o `csv-worker.js` foi apagado); a vendorização e a revisão de segurança dele ficam como histórico em `docs/`. Cada arquivo abaixo é cópia **byte a byte** do pacote do registro npm.

| Biblioteca | Versão | Licença | Pacote de origem | Arquivos copiados |
|---|---|---|---|---|
| sql.js | **1.16.0** | MIT | `npm pack sql.js@1.16.0`, pasta `dist/` | `sqljs/sql-wasm.js`, `sqljs/sql-wasm.wasm`, `sqljs/LICENSE` |
| Pyodide | **314.0.7** | MPL-2.0 | `npm pack pyodide@314.0.7` (D3c, D10) | `pyodide/pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`, `LICENSE-MPL-2.0.txt` |

## Como foi verificado (2026-11-12)
- A integridade SHA-512 de cada `.tgz` baixado foi **comparada com o valor que o próprio registro npm publica** (`npm view <pacote> dist.integrity`): as duas bateram. Isso prova que o tarball é o que o registro serve, não que o código seja livre de vulnerabilidades.
- O campo `license` do `package.json` de cada pacote diz `MIT`; os arquivos `LICENSE` foram copiados do pacote.
- **Verificado na revisão de segurança da Fase 3** (`docs/security/phase-3-review.md`): `npm audit` com 0 vulnerabilidades e tarballs idênticos ao registro. **Não verificado:** GitHub Advisory Database direta e OSV (inacessíveis) e diferença entre o tarball e o repositório de origem (T-312).
- A documentação da Fase 1 citava sql.js 1.15.0 como suposição. O npm mostra 1.16.0 como versão atual; usamos a 1.16.0 e a documentação foi atualizada.

## SHA-256 dos arquivos

```
9b96118841c6edfdf53c6f388c1419d1f473cf469df6a6fc2864b386d60bdb5e  sqljs/sql-wasm.js
43bbcdd44287e5a2db3b6b5af34b1a3485a7a441285d247976c1ebe3c61f8dbf  sqljs/sql-wasm.wasm
60a3f6e4d7b29b4321359e683b36cf198d24f58e24582070f56e6fa89d5ee2be  sqljs/LICENSE
```

## Pesos
| Arquivo | Bytes | gzip -9 (estimativa) |
|---|---|---|
| `sqljs/sql-wasm.wasm` | 688.197 | 336.356 |
| `sqljs/sql-wasm.js` | 47.621 | 17.336 |

Carregam **sob demanda**, só nas páginas das ferramentas, e não entram no orçamento do shell (150 KB). Se o GitHub Pages serve `.wasm` comprimido não foi verificado.

## Requisitos para quem usar
- `'wasm-unsafe-eval'` **não é exigido no Chrome**: a auditoria da Fase 3 mediu o motor funcionando sem o token, porque só o Worker carrega o sql.js (a CSP da página não se aplica ao Worker). O token foi mantido por precaução em Firefox e Safari, **sem teste** nesses navegadores; remova só depois de testá-los. **A página SQL (`hub/ferramentas/sql/`) agora tem `'wasm-unsafe-eval'` e `worker-src 'self'`; as demais páginas do Hub continuam sem eles.** Mudar a CSP é decisão de segurança: registrada e coberta por teste (`tests/hub`); a revisão de segurança da Fase 3 é do `security-auditor`.
- `sql-wasm.js` não deve ser editado. Para atualizar, repita o procedimento acima, atualize este README e o `manifest.json` (T-312).

## Pyodide 314.0.7 (T-402, Fase 4)

- **Origem e integridade (2026-11-13):** `npm pack pyodide@314.0.7` (6.488.647 B). O SHA-512 do `.tgz` (`sha512-0YvXxEhfEdpLfb/XkM2BFAeMROq0iMUX2bzzH9pOttyMcWkwq+HbE5uyuGD82LN7y2q+SNvi/6V5JEsOlD2R1A==`) bateu com `npm view pyodide@314.0.7 dist.integrity`. Os 5 arquivos do nucleo sao copia byte a byte do tarball; os SHA-256 estao no `manifest.json` e no `SHA256SUMS` e coincidem com os de `docs/architecture/pyodide-measurement.md`. Nao foram copiados `pyodide.js` (classico, inutil para Worker modulo), `*.map`, `*.d.ts`, `console*.html`, `README.md`.
- **Licenca:** MPL-2.0 (campo `license` do `package.json`). O tarball npm **nao traz arquivo de licenca**; `pyodide/LICENSE-MPL-2.0.txt` e o texto padrao da MPL-2.0 (copiado de `/usr/share/common-licenses/MPL-2.0` do ambiente de build, nao do pacote). Os arquivos sao distribuidos **sem modificacao** (MPL-2.0 secao 3.2 pede aviso e acesso ao codigo-fonte: o fonte esta em https://github.com/pyodide/pyodide, tag 314.0.7). O `.wasm` e o `python_stdlib.zip` embutem CPython (licenca PSF) e outros componentes com licencas proprias; **esse inventario nao foi feito** (SEC-P4-12 segue aberto para advisories e licencas de componentes embutidos).
- **Pacotes (D12):** somente `numpy`, `pandas`, `python-dateutil`, `pytz` e `six` (lista fechada; `micropip` e demais pacotes **nao** existem). Ver a secao seguinte. O `pyodide-lock.json` vendorizado e o oficial **filtrado** a esses 5 pacotes.
- **Carregamento:** so na pagina `hub/ferramentas/python/`, so apos o clique em Executar, dentro de um iframe `sandbox="allow-scripts"` (origem opaca). Por isso o servidor precisa enviar `Access-Control-Allow-Origin` nos arquivos desta pasta: **o GitHub Pages envia `access-control-allow-origin: *` segundo a documentacao/recordacao, NAO verificado** (`curl -I` no deploy). O servidor de teste local envia o cabecalho apenas no teste `tests/hub/python.js`.
- **Atualizar:** repetir os testes de isolamento (`docs/security/phase-4-worker-isolation.md`, SEC-P4-13) e `tests/hub/python.js`.

## numpy + pandas (D12, 2026-11-13)

- **Origem:** distribuicao completa oficial `https://github.com/pyodide/pyodide/releases/download/314.0.7/pyodide-314.0.7.tar.bz2` (337.536.678 B, sha256 `192b5864e6e6d30ab074861af800cb8b4acb0998ef0f9342c3367448aeb86645`), pasta `pyodide/`. Os wheels sao copia byte a byte; o **sha256 de cada um confere com o campo `sha256` do `pyodide-lock.json` oficial** (e o Pyodide o confere de novo no navegador ao baixar). Os 5 arquivos do nucleo ja vendorizados (`pyodide.asm.wasm`, `pyodide.asm.mjs`, `python_stdlib.zip`, `pyodide.mjs`) sao **byte a byte iguais** aos da distribuicao completa (conferido com `cmp`).
- **Arquivos** (`pyodide/packages/`; bytes e sha256 em `manifest.json` e `SHA256SUMS`):

| Pacote | Versao | Bytes | Licenca (metadados do wheel) | Tipo |
|---|---|---|---|---|
| numpy | 2.4.6 | 2.960.568 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 | nativo (13 `.so` WASM), cp314 pyemscripten_2026_0_wasm32 |
| pandas | 3.0.2 | 4.177.749 | BSD-3-Clause | nativo (45 `.so` WASM), cp314 pyemscripten_2026_0_wasm32 |
| python-dateutil | 2.9.0.post0 | 229.892 | Apache-2.0 / BSD-3-Clause (dupla) | Python puro |
| pytz | 2026.1.post1 | 510.489 | MIT | Python puro |
| six | 1.17.0 | 11.050 | MIT | Python puro |

  Total 7.889.748 B (7,52 MiB). O fecho de dependencias de `pandas` no lock oficial e exatamente numpy, python-dateutil, pytz e six; `numpy` nao depende de nada.
- **`pyodide/pyodide-lock.json` FILTRADO:** do lock oficial (357 pacotes, 119.077 B, sha256 `5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010`) restam so os 5 pacotes acima, sem alterar nenhuma entrada. Gerado por `python3 -I docs/testing/vendor-pyodide-lock-filter.py <lock oficial> <pasta dos .whl> hub/assets/vendor/pyodide/pyodide-lock.json` (o script confere os sha256 e o fecho). Os `file_name` sao nomes simples: o Worker passa `packageBaseUrl` = `.../vendor/pyodide/packages/`.
- **Carregamento:** so no Worker, so em um Executar cujo codigo importa um desses pacotes (analise do AST). Nada e baixado ao abrir a pagina nem para codigo sem esses imports.
- **Licencas:** os textos estao dentro de cada wheel (`*.dist-info/`); as licencas do codigo nativo embutido e as de terceiros dentro dos `.so` **nao foram inventariadas** alem do que os metadados declaram. numpy lista varias (BSD-3, 0BSD, MIT, Zlib, CC0). **Advisories/CVE nao consultados** (sem acesso a bases de CVE); consultar antes de producao.
- **Atualizar:** repetir o procedimento, o script de filtro, `tests/hub/python-pandas.js` (PD-01 confere lock, wheels, SHA256SUMS e manifest) e `docs/security/phase-4-worker-isolation.md` (secao 11).
