# Project Status Report: Fase 1 (Planning, Architecture, Design)

**Data:** 2026-11-12. **Modo:** semi-autônomo. **Branch:** `feat/phase-1-planning`.
**Status da fase:** `IN REVIEW`. **Não aprovada.** Aguarda o portão G1 (Lucas Delfino).

## 1. Resultado da revisão independente

| Revisão | Resultado | Observação |
|---|---|---|
| 1ª | **REJEITAR** | Inconsistência entre documentos (A1 a A6, M1 a M7). Nenhuma violação de custo, backend ou do portfólio. |
| 2ª | **REJEITAR** (ajustes localizados) | 17 de 18 achados fechados, 1 parcial (M4). Problemas novos N1 a N7, mais L1 a L8. |
| 3ª | **Não houve** | Os ajustes da 2ª foram aplicados (adendo C10) e conferidos por mim com grep e script. **Nenhum revisor independente os reavaliou.** |

Portanto: **a Fase 1 não tem aprovação independente.** O estado correto é "corrigida após a 2ª rejeição, sem 3ª revisão".

## 2. Estado por entrega

| Entrega | Arquivo | Estado |
|---|---|---|
| PRD, backlog (49 tarefas: 20 MVP, 20 P1, 2 P2, 7 da trilha de conteúdo sem marca), roadmap | `docs/roadmap/` | Planejado, corrigido após 2ª rejeição |
| Arquitetura, stack, custos | `docs/architecture/`, `docs/cost-analysis/` | Planejado, corrigido após 2ª rejeição |
| Auditoria de design e UX do Hub | `docs/design/` | Planejado. Tabela de contraste **calculada por script** (ver 4) |
| Plano de testes | `docs/testing/` | Planejado. **Nada foi executado**: não existe código do Hub |
| Revisão de segurança (21 riscos) | `docs/security/` | Planejado. Sem risco crítico no estado atual |
| Escolhas canônicas | `docs/decisions/phase-1-reconciliation.md` | Proposta (C1 a C10), vale sobre os demais |
| Código do Hub | n/a | **Não iniciado.** Portfólio intacto (`git status` só em `docs/`) |

## 3. Itens ainda abertos

1. **Revisão independente final** não feita (ver 1).
2. **test-strategy, seção 7:** 3 itens abertos (nenhuma tarefa cita o orçamento de 150 KB; codificações CSV-15 fora de T-302; confirmação do Lucas para RNF-03).
3. **Rótulos [V]** (sql.js 731.532 B, limites do Pages) foram relidos por um agente, mas a 2ª revisão não conseguiu reproduzir a leitura. Trate como "verificado por um agente, não reproduzido".
4. **Não verificado em fonte primária:** licenças, versão e tamanho do Pyodide, advisories de sql.js e Papa Parse, termos do GitHub Pages sobre doações. O "custo recorrente US$ 0" segue **condicionado** a isso.
5. **Orçamentos de 150 KB (shell) e 120 KB (fontes)** são metas provisórias, sem medição.
6. **Edge e Firefox** não estão instalados no ambiente de teste: esses testes só poderão ser executados em outro ambiente.
7. **Trilha de conteúdo v1.1** (T-801 a T-807): sem marca de prioridade; o Lucas precisa decidir.

## 4. Verificações que eu executei

- Contraste WCAG: script Python sobre os hex de `assets/css/styles.css`, 48 pares nos dois temas. 8 falhas, todas esperadas: `--ink-3` no tema claro sobre `--bg` (4,35) e `--surface-2` (4,03), que já eram achados da auditoria, e 6 controles negativos que o documento já listava como "não usar". Nenhum par proposto para o Hub falhou. Os hex de `--err`, `--warn` e `--hub-ink-3` são propostas ainda não aprovadas.
- `git status`: nenhuma alteração fora de `docs/`.
- Conferência cruzada entre backlog e test-strategy (cartões, fixtures, viewports, prioridade dos testes de Worker).

## 5. Decisões que o Lucas precisa tomar no G1

| # | Decisão | Recomendação |
|---|---|---|
| D2 | Hospedagem. O README cita Vercel, o canonical aponta para GitHub Pages | GitHub Pages |
| D3 | Fontes locais no Hub (Fase 2); sql.js e Papa Parse (Fase 3); Pyodide (Fase 4) | Arquivos próprios, versão fixada |
| G1-a | Aprovar o adendo C10 (Worker de CSV e SQL no MVP; sem Apoie/PIX na casca; limite de CSV de 10 MB) | Aprovar |
| G1-b | Cartões "Em breve" na casca (Python, Cursos, Recursos, IA) | Opcional, fora do critério de aceite |
| G1-c | Link do portfólio para o Hub em `index.html` (altera o portfólio) | Adiar até o Hub existir |
| G1-d | Correção global de `--ink-3` no tema claro (altera o portfólio, falha AA) | Aprovar separadamente |
| D5, D8, D9 | PIX, backend legado, equipe | Podem esperar (bloqueiam as Fases 6 e 7) |

## 6. Custo de tokens (dados reais da sessão)

17 execuções de subagentes, **≈ 1,18 milhão de tokens** somados (planejamento 193 mil; QA e segurança 213 mil; revisão 1: 90 mil; reconciliação 313 mil; revisão 2: 107 mil; ajustes finais 266 mil). Isso exclui o meu próprio consumo.

**Onde houve desperdício:** quase 700 mil tokens foram retrabalho. Os autores trabalharam em paralelo sem uma convenção comum (URLs, fases, orçamento de peso), o que gerou duas rodadas de reconciliação. **Lição para as próximas fases:** o Tech Lead deve escrever as convenções canônicas *antes* de lançar agentes em paralelo. Isso já está registrado para a Fase 2.

## 7. Próximo passo

Com D2, D3 (fontes) e a aprovação do C10, a Fase 2 (casca do Hub) pode começar. Recomendo uma 3ª revisão independente curta e focada nos itens do C10 antes ou junto da Fase 2.
