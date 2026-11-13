# Roadmap de produto: Data & AI Community Hub

Versão 0.4 (Fase 1, reconciliação, adendo C10). Data: 2026-11-12. Não há datas; o roadmap é por fases e portões. Vale `docs/decisions/phase-1-reconciliation.md` (C1 a C10). D2 (GitHub Pages), D3a (fontes locais), D3b (sql.js e Papa Parse em arquivos próprios), G1-b, G1-c, G1-d e C10 estão aprovados e RNF-03 está confirmada (`decision-log.md`); D3c (Pyodide), D5 e D8 seguem pendentes, com recomendações em `prd.md`. A pergunta 14 está fechada.

## Escopo do MVP

Princípio: o menor Hub que já entrega valor prático e prova a arquitetura. **MVP = Fases 2 e 3** (casca + CSV + SQL), com limite de CSV de 10 MB como critério (10 MB = 10 MiB = 10.485.760 bytes; 50 MB é meta a validar por medição, só registro). Contagem de tarefas (`backlog.md`): 51 no total, 20 MVP, 22 P1, 2 P2 e 7 da trilha paralela sem marca. T-214 (link Portfólio para Hub) e T-215 (contraste de `--ink-3`) estão na Fase 2/portfólio, em PR separado do portfólio, fora do MVP do Hub.

ENTRA no MVP:
- Casca do Hub em `hub/` com identidade visual (referência a `styles.css`), PT/EN e tema claro/escuro.
- Home da casca com 2 cartões ativos (CSV e SQL), com chip "Em construção" até a Fase 3 entregar cada ferramenta (G1-b); sem Apoie/PIX até a Fase 6.
- Visualizador de CSV local (até 10 MB).
- SQL playground (`sql.js`) sobre o CSV carregado, depois do CSV.
- Web Worker para parsing de CSV e execução de SQL, com Parar/Cancelar (T-306, C10.1).
- Privacidade (nada sai do navegador), revisão de segurança (CSP, manifest de dependências, varredura de segredos: T-312), linha de base e regressão do portfólio, regressão visual do Hub quando `assets/` mudar.

NÃO ENTRA no MVP:
- P1 (planejado): `hub/privacidade/` (Fase 2, T-212), estado inválido na página (T-207), perfil por coluna (T-303), exercícios guiados (T-307), exportação de CSV (T-308).
- Fases posteriores: Python playground, cursos de Power BI/Excel, recursos de IA, recursos para download, PIX.
- P2 sem tarefa até serem formalizados: página `sobre/`, rascunho de código no `localStorage`, convite de apoio dispensável por 30 dias, progresso de curso, exercícios concluídos.
- Domínio próprio, formulário, blog, backend, `404.html` na raiz (requer aprovação).

Motivo da ordem: valor ao usuário e risco. CSV vem primeiro e SQL depende dele. Pyodide é pesado e depende de D3. Cursos e recursos são conteúdo e dependem de material do Lucas. PIX só faz sentido depois de haver algo a apoiar.

## Fases

| Fase | Escopo | Prioridade de valor | Dependências | Tarefas |
|---|---|---|---|---|
| 0 Portão G1 | Aprovação da Fase 1 e das decisões mínimas | n/a | Fase 1 concluída | Registro no `decision-log.md` |
| 1 Planning | PRD, backlog, roadmap, arquitetura, design, plano de testes, revisão de segurança | n/a | Nenhuma | Documentos da Fase 1 |
| 2 Casca do Hub [MVP] | `hub/`, `hub/ferramentas/`, `hub/privacidade/` (P1), navegação, i18n, tokens, tema | Base | G1; D2 e D3a (fontes) aprovadas | T-201 a T-213; T-214 e T-215 em PR separado do portfólio (fora do MVP) |
| 3 CSV, depois SQL [MVP] | Visualizador de CSV; SQL playground (depende do CSV); Web Worker com Parar/Cancelar; segurança (T-312) | Alta | Fase 2; D3b (sql.js, Papa Parse) aprovada | T-301 a T-312 |
| 4 Python | Pyodide, pandas, exercícios | Média-alta | Fase 3; D3c (Pyodide); ADR de tamanho (T-401) | T-401 a T-405 |
| 5 Cursos e recursos (inclui IA) | Power BI/Excel, downloads, IA sem API | Média | Fase 2; material e formato fornecidos pelo Lucas | T-501 a T-505 |
| 6 PIX | Página de apoio voluntário | Média | D5 aprovada; algo útil publicado (Fase 3) | T-601 a T-603 |
| 7 Endurecimento e release | Auditoria, docs, OG, release | Obrigatória | Fases aprovadas; D8 (o plano assume "sem backend" como recomendação) | T-701 a T-704 |
| Paralela | Pendências de conteúdo do portfólio (v1.1) | Independente | Capturas e textos do Lucas | T-801 a T-807 |

Observações de ordem: as Fases 5 e 6 não dependem da Fase 4 e podem ser antecipadas se o Pyodide se mostrar inviável. A trilha paralela pode andar a qualquer momento, mas toca `assets/` e exige autorização (e dispara T-211).

## Portões de aprovação humana

Nenhuma fase começa sem o "aprovado" escrito do Lucas no portão anterior. O PM registra cada aprovação no `decision-log.md`. Portões são verificação humana; o QA nunca os marca como "passou".

Decisões por portão, alinhadas à tabela "Bloqueia" de C2:

| Portão | Quem aprova | Evidência exigida | Decisões necessárias |
|---|---|---|---|
| G1 (Fase 0, fim da Fase 1) | Lucas | Leitura de PRD, backlog e roadmap; respostas às perguntas abertas | D2 (bloqueia a Fase 2) e D3 fontes locais (bloqueia a Fase 2). D5 e D8 não são necessárias aqui. Resposta à pergunta 13 (cartões "Em breve") |
| G2 (fim da Fase 2) | Lucas | Relatório de QA (T-208, T-209), linha de base (T-210), URL de teste (T-213), Hub navegável, portfólio sem regressão | D3b (sql.js e Papa Parse) já aprovada; o link no `index.html` (G1-c) e o contraste de `--ink-3` (G1-d) já aprovados, em PR separado do portfólio (T-214, T-215) |
| G3 (fim da Fase 3, release do MVP) | Lucas | Relatório T-310 (com revisão do independent-reviewer), relatório de segurança T-312, teste com CSV real do Lucas, canário sem saída de dados | Aprovar publicação do MVP |
| G4 (Fase 4) | Lucas | ADR T-401 aprovado antes de codar; relatório T-405 ao final | D3c (Pyodide) |
| G5 (Fase 5) | Lucas | Lista de conteúdos com fonte/licença; relatório T-505 | Formato dos cursos |
| G6 (Fase 6) | Lucas | Chave PIX e texto aprovados; payload validado e teste do QR | D5 |
| G7 (Fase 7, release final) | Lucas | Auditoria T-701, README atualizado, PR revisado pelo tech-lead e independent-reviewer | D8 (o plano assume "sem backend"); aprovar merge na `main` |

Regras gerais: merge na `main` só por PR e com aprovação do Lucas (D6); nenhuma tarefa vira COMPLETED sem evidência anexada.

## Perguntas em aberto para o Lucas

1. D2: ficar no GitHub Pages? O README recomenda Vercel; qual vale? Há plano de domínio próprio (e custo)? Os termos do GitHub Pages precisam ser verificados para sustentar "custo recorrente zero" (C8).
2. D3: fontes locais (D3a) e arquivos próprios com versão fixada para `sql.js` e Papa Parse (D3b) estão aprovados. Segue aberta a decisão separada D3c sobre Pyodide (Fase 4, pode ser grande para o repositório).
3. D5 (só até a Fase 6): qual chave PIX (CPF, e-mail, aleatória) pode ficar pública? Prefere QR estático + copia-e-cola? Quer mensagem/nome exibidos?
4. D8 (só até a Fase 7): confirma descartar backend, formulário de contato com servidor e blog com CMS?
5. C5: confirma os 9 agentes e o mapeamento de papéis genéricos?
6. Link para o Hub no `index.html`: aprovado (G1-c, T-214). Segue aberta: autoriza, em fase futura, um `404.html` na raiz?
7. Analytics: aceita ficar sem nenhum (suposição)? Ou algum contador sem cookies e gratuito?
8. Conteúdo da Fase 5: já existem materiais próprios de Power BI/Excel, ou serão curadoria de links de terceiros? Qual licença usar nos downloads?
9. Limite de CSV: 10 MB (10 MiB = 10.485.760 bytes) como critério do MVP e 50 MB como meta de medição está bom?
10. Pendências v1.1: quais capturas e textos (T-801 a T-805) você consegue entregar e quando? O projeto de Logística segue aguardando relatório?
11. Posso substituir o `docs/ROADMAP.md` legado (ou apontá-lo para este roadmap)? Hoje ele lista OG e EN como pendentes, mas já existem.
12. Você testa o Safari real (best effort) ou prefere que fique sem verificação?
14. FECHADA. RNF-03 confirmada pelo Lucas: o Hub fica sem cookies de rastreamento e sem analytics de terceiros. PRV-06 e PRV-08 são P0 definitivos. (A opção de contador sem cookies segue na 7.)
13. (G1, C10.2) A home da Fase 2 terá só 2 cartões ativos (CSV, SQL), sem Apoie/PIX. Você aprova também cartões "Em breve" (Python, Cursos, Recursos, IA)? Se sim, ficam desabilitados e fora do critério de aceite; se não, não existem na casca.
