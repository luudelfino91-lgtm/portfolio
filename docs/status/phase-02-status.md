# Project Status Report: Fase 2 (casca do Hub)

**Data:** 2026-11-12. **Branch:** `feat/phase-2-hub-shell` (empilhada sobre a Fase 1). **Commit verificado:** `3bec59f`.
**Status:** `PUBLICADA` em 2026-11-12 (PRs #1, #2 e #3 mesclados na `main` por merge commit, `48a65a9`). Itens MVP ainda abertos: T-208 (parcial). T-213 executado em parte, ver seção 8.

## 1. O que existe
`hub/` com 5 páginas (home, ferramentas, privacidade, e placeholders de CSV e SQL), `hub.css`, `theme.js`, `i18n.js`, `nav.js`, 4 fontes woff2 locais (OFL) e READMEs. O portfólio não foi alterado: `git diff origin/main...HEAD` só toca `.claude/`, `docs/`, `hub/` e `tests/`.

## 2. Estado por evidência
| Item | Estado | Evidência |
|---|---|---|
| Casca do Hub | Implementado e testado só em **Chrome 153** | `bash tests/hub/run-all.sh` no commit `3bec59f`: **exit 0**, PASS por grupo reg 16, shell 6, i18n/tema/privacidade 26, a11y 15, budget 5 (HUB-50 "Não aplicável"). Rodado por mim no commit, com working tree limpo antes e depois |
| Acessibilidade | axe-core 4.14 sem violações nos 40 cenários; contraste computado (968 pares) sem falhas | testes do QA |
| Privacidade | Zero cookies, zero requisições externas, só `ld-lang` e `ld-theme`, CSP em meta bloqueia script inline | QA e Security |
| Orçamento | Shell ≈ 15 KB gzip (limite 150), fontes 104.500 B (limite 120 KB) | medido |
| Segurança | Nenhum achado crítico, alto ou médio; 1 baixo | `docs/security/phase-2-review.md` |
| Verificador de chaves i18n | Fixture sem chave PT: exit 1; fixture íntegra: 0; Hub real: 0 | executado por mim |

## 3. Revisão independente
**REJEITADA** (HEAD `e63e958`). Procedeu: a suíte falhava no commit (REG-01 falhava por construção depois que `tests/` foi commitado, ao contrário do que a mensagem do commit dizia), o relatório do QA estava desatualizado, T-205 sem verificador com código de saída, e alguns testes eram frouxos. Corrigidos nos commits seguintes. **Nenhum revisor independente reavaliou as correções.** A verificação foi minha.

## 4. Bugs
BUG-01 (média, nome acessível da marca) e BUG-02 (baixa, Tab no menu móvel): **corrigidos e retestados.**

## 5. Abertos, sem esconder
1. **T-213 (MVP) não executado:** exige o site real no GitHub Pages. Isso só existe depois do merge, que é deploy de produção e portão seu.
2. **T-208 (MVP) incompleto:** não executados Lighthouse, capturas REG-32/REG-61, Firefox, Edge, Chrome anterior, zoom 200/400%, leitor de tela, HUB-12.
3. **Só Chrome foi testado** (download de Firefox/Edge bloqueado no ambiente).
4. **Baseline do portfólio (`baseline.sha256`)** foi gerada depois do commit da Fase 2; o `git diff` prova que o portfólio não mudou, mas ela não é uma foto "antes de tudo".
5. **Procedência das fontes** (`@fontsource` 5.3.0) é declarada, não refeita por terceiro. Os sha256 estão registrados.
6. **Desvios aguardando aceite** (ver decision-log): chip "Em construção" nos cartões, i18n próprio, Bricolage sem `opsz`.
7. **RNF-03** (sem analytics) ainda é suposição sua a confirmar; PRV-06 e PRV-08 seguem provisórios.
8. T-201 (aprovação formal do ADR) é humana e não foi tema do review.

## 6. Custo
8 execuções de subagentes na Fase 2 ≈ **525 mil tokens** (sem contar o meu). Cerca de 100 mil foram correção do que a revisão achou (2 bugs, relatório, testes frouxos). Falha minha: afirmei "67/0" antes de commitar `tests/`; a conferência certa é sobre o commit, o que passei a fazer.

## 7. Para você decidir
- Fazer merge do PR #1, #2 e deste (deploy de produção, portão 7).
- Aceitar ou não o chip "Em construção".
- Responder RNF-03.
- G1-c (link do portfólio para o Hub) e G1-d (`--ink-3`) seguem sem aprovação.
- Depois do merge, rodo T-213 e o que falta de T-208 contra o Pages real. A Fase 3 (CSV e SQL) pode começar em paralelo, pois depende só de D3b (arquivos próprios para sql.js e Papa Parse).

## 8. Atualização pós-merge: T-213 no GitHub Pages real (2026-11-12)

Executado pelo Tech Lead no Chrome do Lucas, em `https://luudelfino91-lgtm.github.io/portfolio/hub/`.

| Verificação | Resultado |
|---|---|
| 5 páginas do Hub (`hub/`, `ferramentas/`, `ferramentas/csv/`, `ferramentas/sql/`, `privacidade/`) | **200** em todas |
| `hub.css`, 3 JS e 4 woff2 | **200**; bytes das fontes iguais aos do repositório (41.344 + 20.156 + 21.168 + 21.832 = 104.500) |
| `index.html`, `certificacoes.html` e `assets/css/styles.css` do portfólio | **200**; tamanhos idênticos aos de antes (16.601, 58.998 e 23.212 B): portfólio intacto |
| Requisições no carregamento da home do Hub | **12, todas para `luudelfino91-lgtm.github.io`**; nenhuma para Google Fonts ou terceiros |
| Aparência | Home abre com tema escuro (preferência do sistema do Lucas), 2 cartões "Em construção", seletor EN/PT, link para a política de privacidade |

**Ainda NÃO verificado no site real:** compressão (gzip/brotli) e cabeçalhos HTTP do Pages, 404 de página inexistente, URL em maiúsculas/minúsculas, PT/EN e tema claro na versão publicada, Lighthouse, Firefox e Edge. A leitura de `cookie` e `localStorage` foi bloqueada pela ferramenta do navegador, então a ausência de cookies no site real **não** foi reconfirmada aqui (continua verificada só nos testes locais).
