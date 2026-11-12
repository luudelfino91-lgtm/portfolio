# Decision log

Fonte única de verdade para decisões do projeto. Novas decisões entram no fim.

| ID | Data | Decisão | Decidido por | Status |
|---|---|---|---|---|
| D1 | 2026-11-12 | Stack do Hub: JavaScript, HTML e CSS puros, sem build. Vite/TypeScript só com justificativa e nova aprovação. | Lucas Delfino | Aprovada |
| D4 | 2026-11-12 | O Hub fica no mesmo repositório, em `/hub/`, sem alterar as páginas atuais. | Lucas Delfino | Aprovada |
| D6 | 2026-11-12 | Acesso de escrita ao repositório liberado, via branch e Pull Request. Nunca push direto na `main`. | Lucas Delfino | Aprovada. Push funcionando desde 2026-11-12 (PR #1) |
| D7 | 2026-11-12 | Criar o comando `/build-community-hub` e as definições de agentes em `.claude/`. | Lucas Delfino | Aprovada, criada na branch `chore/agent-system-setup` |

## Pendentes

| ID | Decisão | Recomendação |
|---|---|---|
| D2 | Hospedagem e domínio próprio | Ficar no GitHub Pages por ora |
| D3 | CDN versus arquivos próprios para `sql.js`, `Pyodide` e fontes | Arquivos próprios com versão fixada; fontes locais |
| D5 | Chave PIX e formato de exibição | QR estático e copia-e-cola, sem coleta de dados |
| D8 | Backend do roadmap legado (formulário, blog) | Descartar; usar alternativas estáticas |
| D9 | Equipe | Manter as 9 definições, acionadas sob demanda |
