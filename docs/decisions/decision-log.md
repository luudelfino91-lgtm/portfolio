# Decision log

Fonte única de verdade para decisões do projeto. Novas decisões entram no fim.

| ID | Data | Decisão | Decidido por | Status |
|---|---|---|---|---|
| D1 | 2026-11-12 | Stack do Hub: JavaScript, HTML e CSS puros, sem build. Vite/TypeScript só com justificativa e nova aprovação. | Lucas Delfino | Aprovada |
| D4 | 2026-11-12 | O Hub fica no mesmo repositório, em `/hub/`, sem alterar as páginas atuais. | Lucas Delfino | Aprovada |
| D6 | 2026-11-12 | Acesso de escrita ao repositório liberado, via branch e Pull Request. Nunca push direto na `main`. | Lucas Delfino | Aprovada. Push funcionando desde 2026-11-12 (PR #1) |
| D7 | 2026-11-12 | Criar o comando `/build-community-hub` e as definições de agentes em `.claude/`. | Lucas Delfino | Aprovada, criada na branch `chore/agent-system-setup` |
| D2 | 2026-11-12 | Hospedagem: GitHub Pages. | Lucas Delfino ("Corrija e prossiga", 16:54), conforme recomendação do relatório da Fase 1 | Aprovada (leitura do Tech Lead; custo US$ 0 segue condicionado aos termos do Pages, não verificados) |
| D3a | 2026-11-12 | Fontes locais no Hub (sem Google Fonts nas páginas do Hub). | Idem | Aprovada. D3 para sql.js/Papa Parse (Fase 3) e Pyodide (Fase 4) segue pendente |
| C10 | 2026-11-12 | Adendo C10: Worker de CSV/SQL no MVP; sem Apoie/PIX na casca; limite de CSV de 10 MB. | Idem | Aprovada (leitura do Tech Lead) |
| D3b | 2026-11-12 | sql.js e Papa Parse em arquivos próprios, com versão fixada (sem CDN). | Lucas Delfino (resposta no chat, 21:4x) | Aprovada. D3 para Pyodide (Fase 4) segue pendente |
| RNF-03 | 2026-11-12 | Hub sem cookies de rastreamento e sem analytics de terceiros. | Lucas Delfino | Confirmada (PRV-06 e PRV-08 passam a definitivas) |
| G1-b | 2026-11-12 | Chip "Em construção" nos 2 cartões ativos permanece até a Fase 3 entregar as ferramentas. | Lucas Delfino | Aprovada (desvio da C10.2 aceito) |
| G1-c | 2026-11-12 | Link Portfólio para Hub em `index.html`, em PR separado. | Lucas Delfino | Aprovada |
| G1-d | 2026-11-12 | Correção do contraste de `--ink-3` no tema claro, em PR separado. | Lucas Delfino | Aprovada |
| D3c | 2026-11-13 | Pyodide em arquivos próprios com versão fixada (sem CDN), na Fase 4. | Lucas Delfino ("faça o que for o melhor", delegando ao especialista) | Adotada provisoriamente: sujeita à medição de tamanho (docs/architecture/pyodide-measurement.md). Se o peso estourar o limite do Pages, nova proposta de exceção |
| D5 | 2026-11-13 | PIX: QR estático e copia-e-cola, voluntário, sem coletar dados; só exibido a partir da Fase 6. Lucas forneceu a chave (aleatória) e o código copia-e-cola no chat, validados pelo Tech Lead (CRC16 confere, chave igual à do campo PIX). | Lucas Delfino | Aprovada. Dados NÃO gravados no repositório ainda; entram na Fase 6 (`hub/assets/data/`). O nome do favorecido no código inclui o número do CNPJ e ficará público quando exibido |
| D8 | 2026-11-13 | Backend do roadmap legado (formulário, blog) descartado; usar alternativas estáticas. | Lucas Delfino ("Sim") | Aprovada |
| D9 | 2026-11-13 | Equipe: manter as 9 definições de agentes, acionadas sob demanda. | Lucas Delfino ("Sim") | Aprovada |

## Pendentes


Nenhuma decisão pendente no momento. Novas decisões entram na tabela acima; as que dependerem do Lucas entram aqui.
