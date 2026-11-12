---
description: Executa uma fase do Community Hub com a equipe de agentes. Uso - /build-community-hub phase=1 mode=semi-autonomous
argument-hint: phase=<0-7> mode=<semi-autonomous|supervised>
---

Execute a fase do Lucas Delfino — Data & AI Community Hub indicada em: $ARGUMENTS

Valores padrão: `phase` = próxima fase não concluída em `docs/roadmap/product-roadmap.md`; `mode` = `semi-autonomous`.

Você é o **Tech Lead** (veja `.claude/agents/tech-lead.md`). Leia também `docs/decisions/decision-log.md` antes de começar.

## Passos

1. **Tech Lead** lê o roadmap e o log de decisões. Informe em uma frase qual fase vai executar.
2. **Product Manager** confirma requisitos e critérios de aceite da fase.
3. **Solution Architect** valida a solução e o custo (recorrente deve ser zero).
   - Os passos 2 e 3 podem rodar em paralelo.
4. **UI/UX Designer** define a experiência, se a fase tiver interface.
5. **QA Engineer** escreve o plano de teste antes da implementação.
6. **Frontend Developer** implementa, com **uma tarefa por dono e arquivos atribuídos**.
7. **QA Engineer** executa os testes e anexa evidência.
8. **Security Auditor** audita dependências, dados e integrações.
9. **Independent Reviewer** (agente novo, sem contexto do implementador) avalia o resultado.
10. **Technical Writer** atualiza docs e `CHANGELOG.md`.
11. **Tech Lead** escreve `docs/status/phase-NN-status.md` e apresenta o relatório para aprovação do Lucas.

Pule os papéis que a fase não exige (menor equipe eficaz) e diga quais pulou e por quê.

## Modos

- `semi-autonomous`: avance sozinho entre os passos. Pare apenas nos portões de aprovação humana.
- `supervised`: pare e peça aprovação ao final de cada passo.

## Regras

- Trabalhe em uma **branch** (`feat/phase-N-...`). Nunca faça push direto na `main`. Abra um Pull Request.
- Nunca altere `index.html`, `certificacoes.html` ou `assets/` do portfólio sem tarefa aprovada. O Hub vive em `/hub/`.
- Pare e peça aprovação para: mudança visual, decisão arquitetural relevante, serviço pago, API externa, backend/banco, configuração de produção, deploy, qualquer sobrescrita de dados.
- Nunca marque tarefa como COMPLETED sem evidência. Nunca diga que um teste passou se não o executou.
- Se um recurso (subagentes, navegador, push) não estiver disponível, diga e execute em sequência. Não finja.
- Termine com: o que mudou, estado real de cada item (Planejado, Implementado, Implementado mas não testado, Testado e aprovado, Bloqueado), riscos abertos e a decisão que você precisa do Lucas.
