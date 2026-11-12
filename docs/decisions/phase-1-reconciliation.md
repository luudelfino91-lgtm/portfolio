# Fase 1: reconciliação (escolhas canônicas)

**Origem:** a revisão independente rejeitou a Fase 1 por inconsistência entre documentos (achados A1 a A6, M1 a M7).
**Autor:** Tech Lead. **Status:** proposta, sujeita à aprovação do Lucas no portão G1.
Quando um documento divergir deste, **este vale**. Todos os documentos da Fase 1 devem ser alinhados a ele.

## C1. Árvore de URLs e pastas (A1)
Slugs em português para o usuário, assets em pasta própria do Hub:

```
hub/
├── index.html                      # /hub/
├── ferramentas/
│   ├── index.html
│   ├── csv/index.html              # visualizador de CSV
│   └── sql/index.html              # SQL playground
├── privacidade/index.html          # P1, Fase 2
├── (futuro) python/ cursos/ recursos/ apoie/
└── assets/{css,js,vendor,fonts}/   # tudo do Hub aqui
```
- Referências a `/hub/sobre/`, `/hub/cursos/power-bi/`, `/hub/apoie/` são **fases futuras**; a estrutura exata dessas pastas é definida na fase correspondente.
- O Hub **referencia** `assets/css/styles.css` do portfólio (não copia). Quando `assets/` mudar, é obrigatório rodar a regressão visual do Hub (M6).

## C2. Numeração de fases e portão único (A2, A6)
Vale a numeração do PM:

| Fase | Entrega |
|---|---|
| 0 | Portão G1: aprovação da Fase 1 e das decisões mínimas |
| 1 | Planning, Architecture, Design, plano de testes, revisão de segurança |
| 2 | Casca do Hub (`/hub/`, `/hub/ferramentas/`, `/hub/privacidade/`) |
| 3 | Visualizador de CSV e, depois dele, SQL playground (SQL depende de CSV) |
| 4 | Python playground |
| 5 | Cursos e recursos (inclui IA) |
| 6 | PIX |
| 7 | Endurecimento e release |

Decisões pendentes e quando bloqueiam:

| Decisão | Bloqueia |
|---|---|
| D2 hospedagem | Fase 2 (URLs, cabeçalhos) |
| D3 fontes locais | Fase 2 |
| D3 sql.js, Papa Parse | Fase 3 |
| D3 Pyodide | Fase 4 |
| D5 PIX | Fase 6 (qualquer texto de PIX é provisório até lá) |
| D8 backend | Fase 7 (o plano assume "sem backend" como recomendação) |

Tarefas que dependem de uma decisão pendente dizem "se D-n aprovado". Nenhum documento trata D2, D3, D5 ou D8 como decididos.

## C3. Orçamento de peso (A3)
- **Shell do Hub** (HTML + CSS + JS próprios + `styles.css` do portfólio, **sem** fontes e sem imagens): **≤ 150 KB transferidos**, cache vazio. Meta provisória, a confirmar por medição no primeiro protótipo.
- **Fontes** locais (woff2): ≤ 120 KB, orçamento separado.
- Bibliotecas pesadas (sql.js, Papa Parse, Pyodide) **não** entram no shell; carregam sob demanda e têm orçamento próprio.
- O valor de 300 KB do PRD fica **revogado**.

## C4. Páginas de erro (A4)
O Hub é multipágina e não tem roteador. Não existe "404 interna". Requisitos de erro valem para **estado inválido dentro da página** (hash ou parâmetro inválido). Um `404.html` na raiz do portfólio **requer aprovação** e fica fora do MVP.

## C5. Nomes de agentes (A5)
A coluna "Assigned Agent" usa os nomes reais: `product-manager`, `solution-architect`, `ui-ux-designer`, `frontend-developer`, `qa-engineer`, `security-auditor`, `technical-writer`, `independent-reviewer`, `tech-lead`. Mapeamento dos papéis genéricos: Conteúdo → `technical-writer`; DevOps/Release → `tech-lead`; Documentação → `technical-writer`; Segurança/Privacidade → `security-auditor`. Cada tarefa de implementação tem como portão `qa-engineer` e, quando significativa, `independent-reviewer`.

## C6. Escopo do MVP (M1, M2)
- **MVP = Fases 2 e 3** (casca + CSV + SQL), mas com **limite de CSV de 10 MB** como critério. 50 MB é meta a validar por medição, não critério.
- Web Worker para o SQL é **P1** (não bloqueia o MVP).
- **Fora do MVP (P2), sem RF/T até serem formalizados:** página `sobre/`, rascunho de código no `localStorage`, convite de apoio dispensável por 30 dias, progresso de curso, exercícios concluídos.
- `privacidade/` entra como P1 na Fase 2 (as ferramentas tratam arquivos do usuário).
- Navegadores (M3): Chrome, Edge e Firefox, **duas últimas versões**, testados via Playwright. Safari/WebKit é *best effort*: WebKit do Playwright é aproximação e Safari real fica a cargo do Lucas. Não é critério de aceite.

## C7. Critérios de aceite (M3)
- Critério de processo ("se não autorizado, só é registrado") vira regra de governança, não critério de teste.
- "Contraste AA" é verificado por cálculo com os pares de cor listados; Lighthouse é indicador complementar, não prova de AA.
- Qualquer limite de tempo precisa de máquina de referência ou é reescrito como "não bloqueia a interface" medido por teste automatizado.

## C8. Fontes e verificação (M4)
Marque [V] apenas quando houver URL **primária** lida na sessão. Dados vindos de espelhos de terceiros ou de API não reproduzida passam a [S]. A conclusão "custo recorrente US$ 0" é condicionada à verificação dos termos do GitHub Pages.

## C9. Outros
- **Google Fonts:** o portfólio mantém Google Fonts (não será alterado sem aprovação). "Zero requisição externa" vale só para páginas do Hub. O PRD deve dizer isso (M5).
- **T-201:** o ADR se resume a registrar a aprovação de `solution-architecture.md`, que é o documento vinculante (M7).
- **T-806:** status coerente com o conteúdo (B3).

---

# Adendo C10 (segunda revisão independente)

**Autor:** Tech Lead. **Status:** proposta, sujeita ao G1. Vale sobre qualquer divergência.

## C10.1 Web Worker entra no MVP (N1)
A arquitetura (`csv.js` com `worker: true`, término do Worker como timeout), a segurança (SR-11, "Worker obrigatório") e os testes P0 (CSV-51/52, SQL-18) já pressupõem Worker. Para eliminar a incoerência com o menor custo, **o Worker de parsing CSV e de execução SQL passa a ser MVP (P0)**:
- RF-19 e T-306 viram MVP; "Parar/Cancelar" do CSV e do SQL (timeout por término do Worker) também. CSV-53 e os testes de cancelamento passam a P0.
- O limite de 10 MB continua sendo o critério; 50 MB continua exploratório.
- Python (Fase 4) segue a mesma regra. A condição "Worker bloqueia o MVP se 10 MB falhar" deixa de existir.

## C10.2 Casca da Fase 2 sem "Apoie" (N2)
Até a Fase 6 e a D5, **não há cartão nem link de PIX/Apoie** na casca. A home da Fase 2 tem **2 cartões ativos** (CSV, SQL). Cartões "Em breve" (Python, Cursos, Recursos, IA) só existem se o Lucas aprovar no G1 e ficam fora do critério de aceite. RF-01, T-203, HUB-02 e hub-ux 5.1 devem refletir isso.

## C10.3 Tabela única de contraste (N3)
`hub-ux.md` ganha uma tabela única de pares (primeiro plano, fundo, tema, limiar, valor) que cobre todo texto e componente do Hub. T-206, A11-10 e HUB-22 apontam para ela.

## C10.4 Fixtures (N4)
Nome canônico do arquivo de 10 MB: **`limit-10mb.csv`**. T-311 aponta para a lista completa "Fixtures a criar" do test-strategy. O critério de T-306 separa: (a) 10 MB como critério; (b) 50 MB como registro.

## C10.5 Demais ajustes
- N5: test-strategy seção 7 marca cada item como "corrigido em T-xxx" ou "aberto", com a contagem atual.
- N6: [V] só com fonte primária lida e reproduzível; tamanho do sql.js e "10 builds/h" ficam [S] até haver trecho e URL lidos.
- N7: o status de D6 no decision-log fica, com evidência: o Tech Lead abriu o PR #1 em 2026-11-12 (https://github.com/luudelfino91-lgtm/portfolio/pull/1).
- L1: legenda do backlog define [P2]. L3: menor viewport = 360 px em todos os documentos. L5: T-202 especifica o `<link>` por profundidade de página (`../assets/...` em `hub/index.html`; `../../assets/...` em `hub/ferramentas/index.html` e `hub/privacidade/index.html`; `../../../assets/...` em `hub/ferramentas/csv/` e `hub/ferramentas/sql/`). L6: T-208 depende de T-212 ou `privacidade/` entra em T-208 como "se existir". L7: nova tarefa `security-auditor` para CSP, manifest de dependências e varredura de segredos, dona de SR/ST. L8: intervalos de tarefas no test-strategy conforme o backlog.
