# PRD: Data & AI Community Hub

Versão 0.3 (Fase 1, reconciliação, adendo C10). Data: 2026-11-12. Status: aguardando aprovação do Lucas (portão G1). Vale `docs/decisions/phase-1-reconciliation.md` (C1 a C10) sobre qualquer divergência.

## 1. Premissas e decisões

Aprovadas (fatos): D1 (JS/HTML/CSS puros, sem build), D4 (Hub em `hub/` no mesmo repositório, sem alterar as páginas atuais), D6 (trabalho via branch e PR).

Pendentes. Nenhuma é tratada como decidida; o planejamento usa uma recomendação e as tarefas ligadas a elas dizem "se D-n aprovado":

| ID | Recomendação usada no planejamento | Bloqueia (C2) | Se mudar |
|---|---|---|---|
| D2 | Hospedagem em GitHub Pages (o README ainda cita Vercel como recomendado; divergência a corrigir) | Fase 2 (URLs, cabeçalhos) | Caminhos e rotas precisam ser revalidados |
| D3 | Fontes locais; `sql.js`, Papa Parse e Pyodide como arquivos próprios com versão fixada | Fontes: Fase 2. sql.js e Papa Parse: Fase 3. Pyodide: Fase 4 | Com CDN, muda a política de privacidade, o uso sem rede e o limite de tamanho do repositório |
| D5 | PIX com QR estático e copia-e-cola, sem coleta de dados | Fase 6 (qualquer texto de PIX é provisório até lá) | Qualquer coleta exige revisão de privacidade |
| D8 | O plano assume "sem backend" (descartar backend, formulário e blog do roadmap antigo) como recomendação | Fase 7 | Reabre a restrição "sem backend" |

D9 (equipe): os nomes reais dos agentes e o mapeamento dos papéis genéricos estão fixados em C5 (`product-manager`, `solution-architect`, `ui-ux-designer`, `frontend-developer`, `qa-engineer`, `security-auditor`, `technical-writer`, `independent-reviewer`, `tech-lead`) e valem a partir da aprovação do G1.

Nota sobre fontes (M5, C9): o portfólio mantém o Google Fonts e não será alterado sem aprovação. "Zero requisição externa" vale **somente para as páginas do Hub**. Se D3 (fontes locais) não for aprovado, essa afirmação precisa ser reescrita.

## 2. Problema

O portfólio atual mostra projetos, mas é uma vitrine estática: o visitante não pratica nada, não leva nada útil e não há como apoiar o trabalho do Lucas. Iniciantes em dados no Brasil têm poucas opções gratuitas, em português, que rodem sem instalar nada e sem criar conta.

## 3. Público

1. Aprendizes de dados (PT principalmente): querem praticar SQL e Python sem instalação.
2. Analistas em atividade: querem inspecionar CSV e rodar consultas rápidas com privacidade (os dados não saem do navegador).
3. Recrutadores e contratantes: continuam a ver o portfólio; o Hub reforça autoridade.
4. Apoiadores: quem quer contribuir voluntariamente via PIX.

## 4. Objetivos e métricas

| Objetivo | Métrica verificável |
|---|---|
| Entregar valor prático sem custo | Visualizador de CSV e SQL playground funcionando, depois do primeiro carregamento, **sem rede enquanto a aba permanece aberta** (recarregar offline exigiria Service Worker, que não faz parte do MVP) |
| Preservar o portfólio | Zero diff em `index.html`, `certificacoes.html` e `assets/` nas fases em que isso for proibido (REG-01); regressão contra a linha de base de T-210 aprovada; regressão visual do Hub (T-211) sempre que `assets/` mudar |
| Privacidade | Nenhuma requisição para outra origem nas páginas do Hub e nenhum dado do usuário em qualquer requisição (teste com canário, método 5.2 do plano de testes) |
| Custo | Custo recorrente de R$ 0 (sem domínio pago, sem API paga). Conclusão condicionada à verificação dos termos do GitHub Pages (C8) |
| Bilíngue | Script de chaves i18n sem chave faltante em PT ou EN no Hub |

## 5. Requisitos funcionais

Prioridade: P0 = MVP, P1 = planejado, não bloqueia o MVP, P2 = desejável. MVP = Fases 2 e 3 (C6). Contagem dos RF: 19 no total; 8 P0 (RF-01 a RF-05, RF-07, RF-08, RF-19); 9 P1 (RF-06, RF-09, RF-10, RF-11, RF-13, RF-14, RF-16, RF-17, RF-18); 2 P2 (RF-12, RF-15). A contagem de tarefas está no fim de `backlog.md`.

| ID | Requisito | Prio | Fase |
|---|---|---|---|
| RF-01 | Página inicial do Hub em `hub/` com **2 cartões ativos na casca da Fase 2: CSV e SQL**. Sem cartão nem link de Apoie/PIX até a Fase 6 e D5. Cartões "Em breve" (Python, Cursos, Recursos, IA) só existem se o Lucas aprovar no G1 e ficam fora do critério de aceite (C10.2) | P0 | 2 |
| RF-02 | Link do Hub para o portfólio; o link inverso no `index.html` só com autorização do Lucas | P0 | 2 |
| RF-03 | Alternância PT/EN no Hub, com persistência da escolha e mesmo idioma do portfólio | P0 | 2 |
| RF-04 | Tema claro/escuro e tokens de identidade visual reutilizados do portfólio por referência a `assets/css/styles.css` | P0 | 2 |
| RF-05 | Carregar CSV local de até 10 MB (arrastar/selecionar), mostrar pré-visualização tabular, contagem de linhas/colunas e tipos inferidos | P0 | 3 |
| RF-06 | Perfil rápido por coluna (nulos, distintos, mín/máx) | P1 | 3 |
| RF-07 | SQL playground: editor, execução com `sql.js`, resultado em tabela, mensagens de erro legíveis (depende do CSV, C2) | P0 | 3 |
| RF-08 | Carregar o CSV como tabela consultável no SQL playground | P0 | 3 |
| RF-09 | Dataset de exemplo embutido e 5 exercícios guiados de SQL com verificação de resposta | P1 | 3 |
| RF-10 | Exportar resultado como CSV | P1 | 3 |
| RF-11 | Python playground com Pyodide (executar código, ver saída, erros) | P1 | 4 |
| RF-12 | Python com pandas sobre o CSV carregado | P2 | 4 |
| RF-13 | Página de cursos de Power BI e Excel (listas curadas de materiais gratuitos, em PT/EN) | P1 | 5 |
| RF-14 | Página de recursos gratuitos (modelos, cheat sheets, datasets) para download | P1 | 5 |
| RF-15 | Recursos de IA (guias de prompts para análise de dados, checklists), sem chamada a API | P2 | 5 |
| RF-16 | Página de apoio via PIX: QR estático, botão copia-e-cola, aviso de que é voluntário (se D5 aprovado) | P1 | 6 |
| RF-17 | Estado inválido dentro da página (hash ou parâmetro inválido) mostra mensagem PT/EN e link para o início do Hub. O Hub é multipágina, sem roteador e sem 404 interna (C4). Um `404.html` na raiz do portfólio **requer aprovação do Lucas e está fora do MVP** | P1 | 2 |
| RF-18 | Página `hub/privacidade/` (PT/EN) explicando o que é tratado no navegador, o armazenamento usado e a ausência de cookies | P1 | 2 |
| RF-19 | Leitura de CSV e execução de SQL em Web Worker, sem bloquear a interface, com "Parar/Cancelar" para CSV e SQL (timeout do SQL por término do Worker) (C10.1) | P0 | 3 |

Fora do MVP (P2), **sem RF nem tarefa até serem formalizados** (C6): página `sobre/`, rascunho de código no `localStorage`, convite de apoio dispensável por 30 dias, progresso de curso, exercícios concluídos.

## 6. Requisitos não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| RNF-01 | Sem build, sem backend, sem API paga, sem dependência de npm no deploy | Inspeção do repositório; site abre via servidor estático |
| RNF-02 | Processamento 100% no navegador; nenhum dado do usuário enviado. "Externa" = outra origem; "saída" = dado do usuário em qualquer requisição | Teste automatizado com canário (método 5.2); aba Network sem requisição para outra origem |
| RNF-03 | Sem cookies de rastreamento e sem analytics de terceiros (suposição; confirmar com Lucas) | PRV-06 e PRV-08 |
| RNF-04 | **REVOGADO** (era 300 KB de peso inicial). Substituído por RNF-13 e RNF-14 conforme C3 | n/a |
| RNF-05 | CSV de até **10 MB** carrega sem long task > 1 s (critério do MVP). 50 MB é meta a validar por medição, sem ser critério | Fixture `limit-10mb.csv` (critério) e `big-50mb.csv` (medição) com `PerformanceObserver`, Chrome headless, sem throttling |
| RNF-06 | Acessibilidade: navegação por teclado, `lang` correto, contraste AA verificado por cálculo com os pares de cor listados e axe. Lighthouse acessibilidade >= 90 é indicador complementar, não prova de AA | A11-02, A11-04 a A11-08, A11-10; `lighthouse@13.6.0`, mobile, mediana de 3 |
| RNF-07 | Responsivo de 360 px (menor viewport suportado) a desktop | RSP-01 em 360, 768 e 1280 px |
| RNF-08 | Identidade visual preservada: só tokens de `styles.css` (por referência) e fontes locais do Hub (se D3 aprovado) | Busca por cores fixas (HUB-23) e revisão visual |
| RNF-09 | Navegadores: duas últimas versões de Chrome, Edge e Firefox, via Playwright. Safari/WebKit é best effort (o WebKit do Playwright é aproximação; Safari real fica a cargo do Lucas) e não é critério de aceite | Relatório de QA com `Não executado (motivo)` quando o navegador não existir no ambiente |
| RNF-10 | Licenças de dependências compatíveis (open source) e registradas | Arquivo de licenças do Hub e `manifest.json` com hashes |
| RNF-11 | Limites do GitHub Pages respeitados (repositório abaixo de 1 GB; Pyodide é grande e pode exigir decisão em D3) | Medição de tamanho |
| RNF-12 | Caminhos relativos que funcionem em subpasta do Pages; sem roteador | HUB-41 em subpasta e em URL real do Pages (T-213, se D2 aprovado) |
| RNF-13 | Orçamento do shell do Hub (HTML + CSS + JS próprios + `styles.css` do portfólio, **sem** fontes e sem imagens): <= 150 KB transferidos, cache vazio. Meta provisória, a confirmar por medição no primeiro protótipo. Bibliotecas pesadas (sql.js, Papa Parse, Pyodide) não entram no shell, carregam sob demanda e têm orçamento próprio | HUB-40: soma de bytes transferidos por `page.on("response")`, cache vazio, excluindo fontes e imagens |
| RNF-14 | Fontes locais (woff2) <= 120 KB, orçamento separado (se D3 aprovado) | Soma dos bytes dos arquivos em `hub/assets/fonts/` |

Regra de contagem (RNF-13 e RNF-14): bytes transferidos, cache vazio, página única por vez, shell sem fontes e sem imagens, `styles.css` do portfólio incluído, bibliotecas sob demanda fora da soma e medidas à parte.

## 7. Fora de escopo

- Backend, banco de dados, contas de usuário, login, formulário de contato com servidor (D8 recomendada: descartar).
- Blog com CMS; embeds interativos dependentes de serviço pago.
- Qualquer API paga ou chave de API; chat de IA hospedado.
- Processamento de pagamento, webhook ou confirmação automática de PIX; emissão de recibo.
- Domínio próprio pago (depende de D2).
- Roteador do lado do cliente e `404.html` na raiz (este só com aprovação; fora do MVP).
- Alterações em `index.html`, `certificacoes.html` e `assets/` na fase de planejamento (e, nas fases seguintes, só com aprovação explícita).
- Reescrever o portfólio existente.
- Itens P2 sem RF/T listados na seção 5.

## 8. Riscos principais

| Risco | Mitigação |
|---|---|
| Pyodide (~10 MB+) pesa e pressiona o limite do Pages | MVP exclui Python; decidir D3 (Pyodide) antes da Fase 4 |
| CSV grande trava o navegador | Limite de 10 MB como critério do MVP, medição de 50 MB como meta (só registro) e Web Worker com Parar/Cancelar como parte do MVP (RF-19, T-306, C10.1) |
| Divergência de hospedagem (README cita Vercel) | Decidir D2 e corrigir README |
| Mudança em `assets/` quebra o Hub, que referencia `styles.css` | T-211: regressão visual obrigatória quando `assets/` mudar |
| Segurança de PIX (chave pessoal exposta) | Decidir D5; usar só chave que o Lucas aceite tornar pública |
| Escopo crescer | Portões humanos por fase |
