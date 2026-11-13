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
- **Sem pacotes:** nem `micropip` nem wheels. `numpy`, `pandas` etc. ficam fora do MVP (D10). O `pyodide-lock.json` lista 357 pacotes, mas nenhum wheel esta hospedado: pedir um e resultaria em 404 (mesma origem) ou bloqueio pela CSP (outras origens), e o Worker desativa `loadPackage`.
- **Carregamento:** so na pagina `hub/ferramentas/python/`, so apos o clique em Executar, dentro de um iframe `sandbox="allow-scripts"` (origem opaca). Por isso o servidor precisa enviar `Access-Control-Allow-Origin` nos arquivos desta pasta: **o GitHub Pages envia `access-control-allow-origin: *` segundo a documentacao/recordacao, NAO verificado** (`curl -I` no deploy). O servidor de teste local envia o cabecalho apenas no teste `tests/hub/python.js`.
- **Atualizar:** repetir os testes de isolamento (`docs/security/phase-4-worker-isolation.md`, SEC-P4-13) e `tests/hub/python.js`.
