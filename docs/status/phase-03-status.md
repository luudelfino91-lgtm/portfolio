# Project Status Report: Fase 3 (leitor de CSV e SQL playground)

> **Atualização D11 (sem upload):** o leitor de CSV virou explorador dos cenários embutidos (sem Papa Parse, sem Worker de CSV, sem arquivo do usuário), e T-302, T-305 e o item (a) de T-306 foram superados. As linhas abaixo descrevem o estado antes da D11. Ver `docs/status/no-upload-status.md`.

**Data:** 2026-11-13. **Branch:** `feat/phase-3-csv-sql` (PR #6). **Commit verificado:** e377ca0 (revisão independente final: APROVAR, sem achados críticos/altos/médios; a905171 foi o commit anterior (suíte reexecutada em 2026-11-13 por mim e pelo revisor independente, com as portas de teste livres; as alterações deste ajuste de documentação e de `tests/hub/lib.js` vêm depois e foram reverificadas na reexecução registrada na seção 3).
**Status:** `IN REVIEW`, com **revisão independente: APROVADA** na reavaliação final (a primeira foi REJEITADA e as correções foram reverificadas). **Não pronta para produção.** Itens MVP abertos: T-301 (parcial), T-306 (parcial), T-310 (parcial), T-312 (relatório de segurança em elaboração) e a verificação fora do Chrome.

## 1. O que existe
- `hub/ferramentas/csv/` (hoje explorador dos cenários embutidos, sem Papa Parse e sem Worker de CSV; **histórico (superado pela D11):** leitor de CSV com Web Worker e Papa Parse 5.7.1) e `hub/ferramentas/sql/` (playground com sql.js **1.16.0** local e Worker próprio; **histórico (superado pela D11):** CSV como tabela).
- `hub/assets/vendor/` com `sqljs/` (e, **histórico, removido pela D11**, `papaparse/`) (cópias byte a byte do registro npm; SHA-256 em `manifest.json` e `SHA256SUMS`, conferidos com `sha256sum -c`; também no `README.md`).
- Cartões de CSV e SQL sem chip "Em construção" na home e em `hub/ferramentas/`.
- Fixtures de CSV com `expected.json` e a suíte `tests/hub/` (`run-all.sh`).
- CSP das páginas do Hub por `<meta>`. A página SQL tem `'wasm-unsafe-eval'` e `worker-src 'self'`; as demais continuam sem.

## 2. Estado por tarefa
Legenda: **ENTREGUE (Chrome)** = implementado e coberto por teste automatizado passando, só no Chrome; **PARCIAL** = falta parte do critério; **NÃO INICIADO** = sem evidência de implementação.

| Tarefa | Estado | Evidência e ressalva |
|---|---|---|
| T-301 vendorização | PARCIAL | sql.js 1.16.0 e Papa Parse 5.7.1 (histórico: Papa Parse removido pela D11) vendorizados, integridade SHA-512 comparada com o registro npm. `manifest.json` e `SHA256SUMS` criados, conferidos com `sha256sum -c` (sem conferência automática em teste/CI). Advisories não verificados |
| T-302 leitor de CSV | SUPERADA (D11; histórico: ENTREGUE (Chrome)) | Histórico: suíte csv 47 PASS. Arrastar e soltar (CSV-02) sem verificação real; Firefox/Edge/WebKit não executados |
| T-303 perfil por coluna (P1) | NÃO INICIADO | Fora do MVP; sem evidência |
| T-304 SQL playground | ENTREGUE (Chrome) | Suíte sql 139 PASS. MIME de `.wasm` e comportamento no Pages real não verificados |
| T-305 CSV como tabela | SUPERADA (D11; histórico: ENTREGUE (Chrome)) | Histórico: coberto pela suíte sql, testes SQL-10 a SQL-18 removidos |
| T-306 Worker, Parar/Cancelar | PARCIAL | Histórico, superado pela D11: critério (a) de 10 MB e item (b), 50 MB (CSV-51b, SQL-18b), não existem mais (sem upload). Segue vigente: Worker de SQL, Parar e tempo limite (SQL-32/33) |
| T-307 exercícios (P1) | NÃO INICIADO | Fora do MVP |
| T-308 exportar CSV (P1) | NÃO INICIADO | Fora do MVP |
| T-309 i18n e acessibilidade | ENTREGUE (Chrome) | Verificador de chaves exit 0, a11y 17 PASS. Leitor de tela não verificado |
| T-310 QA e privacidade | PARCIAL | Suíte só no Chrome; Firefox, Edge e WebKit "Não executado"; sem relatório final; revisão independente rejeitada |
| T-311 fixtures e oráculo | PARCIAL | Fixtures e `expected.json` em uso. **Independência de `compute_expected.py` em relação ao código do Hub não verificada** |
| T-312 segurança (fora do recorte pedido) | PARCIAL | Relatório entregue (`docs/security/phase-3-review.md`): aprovar com ressalvas, 0 críticos/altos; SEC-P3-01 corrigido. Pendentes: Firefox/Safari, Pages real, advisories diretos (GitHub/OSV inacessíveis) |

## 3. Números da suíte
`sh tests/hub/run-all.sh`, só **Chrome**, todos PASS, reexecutados em 2026-11-13 com as portas 8081/8082 livres (`lib.js` agora falha se uma porta estiver ocupada por servidor antigo).

| Grupo | Resultado |
|---|---|
| reg | 16 |
| shell | 6 |
| i18n/tema/privacidade | 26 + 1 "Não aplicável" (HUB-50) |
| a11y | 17 |
| budget | 5 |
| csv | 47 |
| sql | 139 |

## 4. Critérios NÃO verificados
- Firefox, Edge e WebKit (só Chrome foi executado).
- `big-50mb.csv` (CSV-51b, SQL-18b): **sem teste**. Pico de memória: não medido.
- MIME do `.wasm` e compressão no GitHub Pages real (T-213 e deploy de teste pendentes).
- Arrastar e soltar de arquivos reais (CSV-02).
- Leitor de tela (NVDA/VoiceOver) e dispositivo móvel real.
- Independência de `compute_expected.py` (oráculo calculado sem o código do Hub).
- Advisories: `npm audit` 0 vulnerabilidades e tarballs idênticos ao registro; a base direta do GitHub Advisory e o OSV ficaram inacessíveis, então a ausência de advisories não está provada (docs/security/phase-3-review.md).
- Segurança da Fase 3: APROVAR COM RESSALVAS, 0 críticos/altos. SEC-P3-01 (médio, colunas sem limite) corrigido (teto de 2.000 colunas, prévia de 200) com testes; 'wasm-unsafe-eval' mantido por precaução (não necessário no Chrome; Firefox/Safari sem teste); a `<meta>` CSP não limita o Worker (SEC-P3-03, a considerar na Fase 4/Pyodide); memória por consulta não limitada além do teto do WASM (SEC-P3-04).

## 5. Suposições abertas
- **A1 a A10:** seguem abertas como registradas na Fase 1; este relatório não as reverificou nem as reescreveu.
- Do SQL: (1) decimal com vírgula (`1,5`) vira **REAL**; (2) o resultado exibe no máximo **1.000 linhas**; (3) o **timeout padrão é 10 s**. Os três são escolhas de implementação ainda sem aceite do Lucas.

## 6. Decisões pendentes
D3c (Pyodide, Fase 4), D5 (PIX, Fase 6), D8 (sem backend, Fase 7) e D9. Nenhuma bloqueia o MVP da Fase 3, mas nenhum documento as trata como decididas.

## 7. Revisão independente
**Primeira revisão REJEITADA (3 Altos), corrigidos; reavaliação final APROVADA (e377ca0):**
1. Texto de privacidade (`hub.priv.s1.p` e `hub/privacidade/index.html`) dizia que as ferramentas ainda não estavam disponíveis. Reescrito: CSV e SQL rodam no navegador, arquivos processados localmente e não enviados, afirmações **provisórias até a revisão final (T-310)** (PRV-10). Corrigido no working tree.
2. `hub.home.lede` (EN e PT) dizia "being built"/"sendo construídas". Reescrito; HUB-03 em `tests/hub/a11y.js` agora também falha com essas expressões, em EN e PT, na home e em ferramentas. Corrigido no working tree.
3. `manifest.json` de dependências (PRV-12): criado (com `SHA256SUMS`), `sha256sum -c` OK. Verificado pelo revisor independente na nova revisão.

Documentação que citava sql.js 1.15.0 foi atualizada para 1.16.0 (pesos reais: 47.621 + 688.197 = 735.818 B), com a anotação "atualizado de 1.15.0 na vendorização (T-301)". A reavaliação final do revisor independente aprovou (sem achados críticos/altos/médios).

## 8. Para você decidir
- Aceitar as três suposições do SQL (REAL para decimal com vírgula, 1.000 linhas, 10 s).
- D3c, D5, D8 e D9 quando as fases correspondentes chegarem.
- Antes do merge: execução em Firefox/Edge e o deploy de teste no Pages real (MIME/compressão do `.wasm`). O merge é deploy de produção e portão seu.
