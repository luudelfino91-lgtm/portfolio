# Bibliotecas de terceiros do Hub (T-301)

Arquivos próprios, sem CDN (decisão D3b do Lucas). Cada arquivo abaixo é cópia **byte a byte** do pacote do registro npm.

| Biblioteca | Versão | Licença | Pacote de origem | Arquivos copiados |
|---|---|---|---|---|
| sql.js | **1.16.0** | MIT | `npm pack sql.js@1.16.0`, pasta `dist/` | `sqljs/sql-wasm.js`, `sqljs/sql-wasm.wasm`, `sqljs/LICENSE` |
| Papa Parse | **5.7.1** | MIT | `npm pack papaparse@5.7.1` | `papaparse/papaparse.min.js`, `papaparse/LICENSE` |

## Como foi verificado (2026-11-12)
- A integridade SHA-512 de cada `.tgz` baixado foi **comparada com o valor que o próprio registro npm publica** (`npm view <pacote> dist.integrity`): as duas bateram. Isso prova que o tarball é o que o registro serve, não que o código seja livre de vulnerabilidades.
- O campo `license` do `package.json` de cada pacote diz `MIT`; os arquivos `LICENSE` foram copiados do pacote.
- **Não verificado:** advisories de segurança dos dois pacotes (GitHub Advisory Database, npm audit) e diferença entre o tarball e o repositório de origem. Ficam como tarefa do `security-auditor` (T-312).
- A documentação da Fase 1 citava sql.js 1.15.0 como suposição. O npm mostra 1.16.0 como versão atual; usamos a 1.16.0 e a documentação deve ser atualizada.

## SHA-256 dos arquivos

```
9b96118841c6edfdf53c6f388c1419d1f473cf469df6a6fc2864b386d60bdb5e  sqljs/sql-wasm.js
43bbcdd44287e5a2db3b6b5af34b1a3485a7a441285d247976c1ebe3c61f8dbf  sqljs/sql-wasm.wasm
e032656b2c709e9a756d5be817da9885d58b2313c43d432c414eb8534a752685  papaparse/papaparse.min.js
60a3f6e4d7b29b4321359e683b36cf198d24f58e24582070f56e6fa89d5ee2be  sqljs/LICENSE
99aa68e4b42758b09828a46515f70369e5463458ab7a990189f641af2b8d9b4e  papaparse/LICENSE
```

## Pesos
| Arquivo | Bytes | gzip -9 (estimativa) |
|---|---|---|
| `sqljs/sql-wasm.wasm` | 688.197 | 336.356 |
| `sqljs/sql-wasm.js` | 47.621 | 17.336 |
| `papaparse/papaparse.min.js` | 19.012 | 6.898 |

Carregam **sob demanda**, só nas páginas das ferramentas, e não entram no orçamento do shell (150 KB). Se o GitHub Pages serve `.wasm` comprimido não foi verificado.

## Requisitos para quem usar
- `'wasm-unsafe-eval'` **não é exigido no Chrome**: a auditoria da Fase 3 mediu o motor funcionando sem o token, porque só o Worker carrega o sql.js (a CSP da página não se aplica ao Worker). O token foi mantido por precaução em Firefox e Safari, **sem teste** nesses navegadores; remova só depois de testá-los. **A página SQL (`hub/ferramentas/sql/`) agora tem `'wasm-unsafe-eval'` e `worker-src 'self'`; as demais páginas do Hub continuam sem eles.** Mudar a CSP é decisão de segurança: registrada e coberta por teste (`tests/hub`); a revisão de segurança da Fase 3 é do `security-auditor`.
- `sql-wasm.js` não deve ser editado. Para atualizar, repita o procedimento acima, atualize este README e o `manifest.json` (T-312).
