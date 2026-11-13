# Data & AI Community Hub: UX, arquitetura de informação e componentes

Fase 1 (Design) · Lucas Delfino
Base: `docs/design/design-audit.md`, `docs/IDENTIDADE-VISUAL.md`, `assets/css/styles.css`.

Regras deste documento:
- A identidade visual é **preservada**: ameixa, orquídea, meia-noite; Bricolage Grotesque, Figtree, JetBrains Mono; tema claro e escuro.
- O portfólio **não é redesenhado nem alterado**. Tudo que tocaria arquivos do portfólio está marcado **[requer aprovação]**.
- Componentes novos usam só tokens existentes. Tokens novos estão listados na seção 10 como **proposta**.
- **Contraste: a única referência é a tabela de pares da seção 10.2** (C10.3), calculada por script com a fórmula WCAG 2.x a partir dos hex de `assets/css/styles.css` (linhas 5-8 e 21-24). Valores de contraste citados em outras seções são ilustrativos; em divergência, vale a tabela. T-206, A11-10 e HUB-22 apontam para ela.
- Não foram definidos chave PIX, textos finais, nem tecnologia dos motores (SQL, Python). Isso fica para as próximas fases.
- **Precedência:** `docs/decisions/phase-1-reconciliation.md` (C1 a C10) vale sobre qualquer divergência deste documento.
- **PIX é PROVISÓRIO** até a decisão D5 (Fase 6). D5 não está decidida; toda a seção 9 e qualquer menção a apoio, PIX ou convite são rascunho de design, sujeitos a mudança ou descarte.
- **P2, sem escopo aprovado** (C6): página `sobre/`, rascunho de código no `localStorage`, convite de apoio dispensável por 30 dias, progresso de curso e exercícios concluídos. Onde aparecem abaixo, são ideias, sem RF/T até serem formalizados.
- **Fases futuras** (python, cursos, recursos, apoie, IA): a estrutura é definida na fase correspondente. O MVP é Fases 2 e 3 (casca, CSV, SQL).

---

## 1. Visão e público

O Hub é um espaço aberto, **gratuito e bilíngue** (PT/EN) para quem trabalha ou quer trabalhar com dados. O portfólio continua sendo a vitrine profissional; o Hub é a parte de comunidade. Tom: editorial, direto, sem pressão de venda. Recrutadores não são o público do Hub; o Hub só precisa não atrapalhar a leitura do portfólio.

Princípios de UX:
1. **Resultado em um clique.** Cada ferramenta abre com um exemplo carregável. Quem chega curioso vê algo funcionando em menos de 10 segundos.
2. **Privacidade explícita.** Arquivos e código do usuário ficam no navegador. Dizer isso na tela da ferramenta, em uma linha (confirmar na implementação que é verdade).
3. **Claro primeiro, violeta como destaque.** Um único elemento violeta de ação por tela.
4. **Estado sempre visível.** Todo processo tem vazio, carregando, sucesso e erro desenhados.
5. **Gratuito de verdade.** Nada fica atrás de contribuição. Pedir apoio nunca bloqueia, nunca interrompe.

---

## 2. Jornadas

### 2.1 Visitante curioso (chega por LinkedIn, indicação ou busca)
- **Objetivo**: entender o que é isso e experimentar algo rápido.
- **Entrada**: home do Hub.
- **Fluxo**: home, vê "o que dá para fazer aqui" em 2 cartões ativos (CSV, SQL, C10.2), abre o visualizador de CSV, clica "Usar um exemplo", vê tabela e gráfico, volta para a home e abre o SQL playground. (Cursos e recursos só existem a partir da Fase 5.)
- **Sucesso**: abriu pelo menos uma ferramenta sem criar conta.
- **Atritos a evitar**: cabeçalho genérico demais; ferramenta que pede upload antes de mostrar valor; pedido de apoio antes de ele ter usado algo.
- **Decisão de design**: a home da Fase 2 tem um cartão por ferramenta ativa (CSV e SQL) e um botão "Experimente com um exemplo" que abre direto o visualizador de CSV já preenchido.

### 2.2 Estudante de SQL ou Python
- **Objetivo**: praticar, entender erro, avançar.
- **Entrada**: `/hub/ferramentas/sql/` (MVP) ou python (fase futura, estrutura definida na fase correspondente), por busca ou recomendação.
- **Fluxo**: abre o playground, escolhe um conjunto de dados de exemplo (esquema visível), executa a consulta pronta, lê o resultado, altera, comete um erro, lê a mensagem, corrige. Depois encontra "Exercícios" e "Guia rápido" na própria página.
- **Sucesso**: executou uma consulta própria e entendeu um erro.
- **Atritos**: espera de carregamento do motor (Python é pesado) sem explicação; erro cru e ilegível; perder o código ao atualizar a página (aceito no MVP); teclado do celular.
- **Decisões**: progresso do motor visível (barra com texto); erro com linha e dica em linguagem simples; rascunho de código no `localStorage` com "Limpar" é **P2, sem escopo aprovado** (no MVP, o código se perde ao recarregar e a tela avisa); botão "Copiar código" e "Baixar resultado em CSV"; atalho de teclado Ctrl/Cmd+Enter para executar, anunciado na tela.

### 2.3 Profissional de BI
- **Objetivo**: resolver uma tarefa de trabalho (inspecionar CSV, validar números, aprender DAX/Excel, conseguir modelo).
- **Entrada**: cursos de Power BI ou recursos gratuitos; ou ferramenta de CSV.
- **Fluxo**: recursos, filtra por "Power BI" e "Modelo", baixa um arquivo; ou abre o visualizador de CSV com um arquivo real, filtra, ordena, vê perfil das colunas (tipos, nulos, únicos), exporta.
- **Sucesso**: baixou ou concluiu a tarefa sem fricção.
- **Atritos**: arquivo grande travando o navegador; dúvida de privacidade com dado da empresa; baixar sem saber o que é o arquivo.
- **Decisões**: aviso de limite de tamanho antes de carregar; texto "Seu arquivo não sai do seu computador"; cada recurso mostra tipo, tamanho, idioma e versão do Power BI/Excel.

### 2.4 Apoiador (PROVISÓRIO até D5, Fase 6; fase futura)
Toda esta jornada é provisória: D5 não está decidida e a página `/hub/apoie/` só terá estrutura definida na Fase 6.
- **Objetivo**: retribuir de forma simples.
- **Entrada**: link "Apoie" no rodapé, cartão ao fim de cursos/recursos, ou linha após uma tarefa concluída.
- **Fluxo**: `/hub/apoie/` (fase futura), entende para onde vai a contribuição, copia a chave PIX ou escaneia o QR, volta ao que estava fazendo.
- **Sucesso**: copiou a chave ou escaneou o QR (a contribuição em si não é medida).
- **Atritos**: sentir pressão; não saber se é obrigatório; PIX não funciona fora do Brasil; chave difícil de copiar no celular.
- **Decisões**: texto curto e honesto, valor livre, sem metas nem barras de progresso, alternativas sem dinheiro (compartilhar, avisar de erro, estrela no GitHub), versão EN explicando que PIX é brasileiro.

---

## 3. Arquitetura de informação

### 3.1 Mapa do site
Páginas estáticas reais (URLs próprias, não hash), sob `hub/`, conforme C1 (slugs em português, assets em `hub/assets/`).

MVP (Fases 2 e 3):
```
/hub/                         Início
├─ ferramentas/               Índice de ferramentas
│  ├─ csv/                    Visualizador de CSV
│  └─ sql/                    SQL playground
└─ privacidade/               O que fica no navegador, o que não é coletado (P1, Fase 2)
```

Fases futuras (estrutura definida na fase correspondente; nomes e subpáginas abaixo não são vinculantes):
- `python/` (futuro, C1): Python playground (Fase 4); caminho e estrutura definidos na fase correspondente.
- `/hub/cursos/`: cursos (Fase 5), fase futura, estrutura definida na fase correspondente.
- `/hub/recursos/`: recursos gratuitos e IA (Fase 5), fase futura, estrutura definida na fase correspondente.
- `/hub/apoie/`: apoio via PIX (Fase 6), fase futura, PROVISÓRIO até D5.
- `/hub/sobre/`: **fora do MVP, P2, sem escopo aprovado**.

Não existe "404" no mapa do Hub: o Hub é multipágina, sem roteador (C4). Um `404.html` na raiz do portfólio **[requer aprovação]** e fica fora do MVP. Estado inválido dentro de uma página está definido em 5.10.

Justificativas:
- **Páginas reais em vez de hash**: o portfólio usa rota por hash (`app.js:130-141`, função `route()`) sem gestão de foco (auditoria 4.3). No Hub, cada ferramenta tem URL compartilhável, título próprio e foco correto no carregamento.
- **Ferramentas e Cursos têm índice próprio** porque terão crescimento.
- **IA e Recursos** são listas filtráveis, não páginas profundas.

### 3.2 Navegação principal do Hub
Reaproveita a pílula flutuante (`.nav`, `styles.css:73-93`). No MVP, os itens são só os de páginas existentes; os demais entram na fase correspondente (não exibir link para página inexistente).

| Item | Destino | Observação |
|---|---|---|
| Ferramentas / Tools | `/hub/ferramentas/` | MVP |
| Privacidade / Privacy | `/hub/privacidade/` | MVP (P1), pode ficar só no rodapé |
| Portfólio ↗ | `../` (portfólio) | MVP, separado visualmente, à direita |
| Cursos / Courses | `/hub/cursos/` | fase futura, estrutura definida na fase correspondente |
| Recursos / Resources (inclui IA) | `/hub/recursos/` | fase futura, idem |
| Apoie / Support | `/hub/apoie/` | fase futura, PROVISÓRIO até D5; link de texto, **não** botão violeta |

Controles à direita, iguais ao portfólio: seletor EN/PT, botão de tema, menu (mobile). O CTA violeta do portfólio ("Let's talk") **não** se repete; no Hub não há CTA de contratação.

Comportamento:
- Item ativo com `.on` **e** `aria-current="page"`.
- Menu mobile igual ao existente (painel suspenso abaixo de 860px) com Escape e clique fora para fechar.
- Marca: o mesmo monograma `.mark` (LD) e, em `small` mono, "data & ai hub" (equivalente ao `.brand small`, linha 79). Sem logotipo novo.
- Primeiro elemento focável: link "Pular para o conteúdo".
- Rodapé (MVP): Ferramentas, Privacidade, Portfólio ↗, voltar ao topo; Cursos, Recursos e Apoie (provisório) entram nas fases futuras; mesma estética de `footer` (254), usando `--ink-2` para o texto (ver 10.2).

### 3.3 Taxonomia
Etiquetas (chips) comuns a cursos, recursos e IA:
- **Tema**: Power BI, Excel, SQL, Python, IA, Estatística.
- **Nível**: Iniciante, Intermediário, Avançado.
- **Tipo**: Modelo, Planilha, Guia, Dataset, Vídeo, Exercício.
- **Idioma**: PT, EN, ambos.

Filtros usam o padrão existente (`.filter button[aria-pressed]`, `app.js:82-91`; uso nas fases de cursos e recursos), em grupo com `role="group"` e rótulo.

---

## 4. Conexão com o portfólio sem alterá-lo

O Hub vive em arquivos novos. O portfólio não é editado. Três camadas, da mais segura para a mais intrusiva:

**Camada 0: sem nenhuma alteração no portfólio (implementável já)**
- O Hub tem o item "Portfólio ↗" na navegação. Uma página `/hub/sobre/` é P2, sem escopo aprovado; no MVP a ponte é só esse item e o rodapé.
- O Hub compartilha identidade (mesmo monograma, mesmos tokens, mesmo seletor de idioma e tema).
- **Compartilhamento de preferências**: o Hub lê as mesmas chaves `localStorage` (`ld-theme`, `ld-lang`; `app.js:153-155`, `i18n.js:90`). Na mesma origem, quem escolheu escuro ou PT no portfólio chega com a escolha mantida. Isso depende de o Hub ficar na mesma origem (mesmo domínio do GitHub Pages).
- **Descoberta**: LinkedIn, README do GitHub, cartões de compartilhamento (`og:`) próprios do Hub.
- **Folha de estilo**: o Hub **reutiliza** `assets/css/styles.css` por link (somente leitura) e acrescenta um arquivo novo `hub.css` com os componentes da seção 8. Assim as mudanças futuras de token no portfólio se propagam, e nada no portfólio é editado.
- **i18n**: o Hub usa o gancho existente `window.PT_EXTRA` (`i18n.js:88`) para suas chaves PT, e novas chaves `UI` próprias, sem editar `i18n.js`. Limitação: o padrão de idioma é `en` quando não há escolha salva (`i18n.js:95`). Para uma comunidade majoritariamente brasileira, seria melhor usar o idioma do navegador como padrão. Alterar isso em `i18n.js` mudaria o portfólio: **[requer aprovação]**. Alternativa sem aprovação: um script de inicialização do Hub que, na primeira visita e sem `ld-lang` salvo, grava `ld-lang` conforme `navigator.language`. Atenção: isso também afetaria o idioma do portfólio para esse visitante, então **[requer aprovação]** de qualquer forma; sem aprovação, o Hub mantém `en` por padrão e destaca o seletor PT.

**Camada 1: link do portfólio para o Hub [requer aprovação]**
Mudança mínima e reversível, em ordem de menor para maior impacto:
1. Um link de texto "Hub" no rodapé (`index.html:217`), junto de "Projects" e "Certifications". Quase invisível, nenhum efeito na leitura de recrutadores.
2. Um item "Hub" no menu (`index.html:40-46`). Passa de 5 para 6 itens; visualmente cabe, mas diluir a navegação profissional é uma decisão de posicionamento do Lucas.

**Camada 2: qualquer outra mudança (hero, CTA, cartão do Hub na home) [requer aprovação e não é recomendada]**. Alteraria o foco recrutador do portfólio.

Recomendação: começar na Camada 0, decidir a Camada 1 depois de ver o Hub no ar.

Regra inversa: o menu do Hub (e, se um dia existir, `/hub/sobre/`, P2) linka ao portfólio sem copiar seus conteúdos (sem duplicar projetos, certificações ou números).

---

## 5. Páginas e estados

Estrutura comum de página: link de pular, nav, `h1` com eyebrow e lede (padrão `.sec-head`), conteúdo, rodapé. Em toda página, focar o `h1` (`tabindex="-1"`) quando houver troca dinâmica de conteúdo.

### 5.1 Início
Blocos:
1. Hero curto: eyebrow "Hub de dados e IA", título com uma palavra em `.grad`, lede de 1 frase, dois botões: `Experimente com um exemplo` (`.btn-dark`) e `Ver ferramentas` (`.btn-ghost`).
2. Faixa de cartões (C10.2). **Casca da Fase 2: 2 cartões ativos, CSV e SQL.** Nenhum cartão, botão ou link de Apoie/PIX até a Fase 6 e a D5. Cartões "Em breve" (Python, Cursos, Recursos, IA) só existem se o Lucas aprovar no G1 e ficam **fora do critério de aceite** (não geram RF/T).
3. "Comece por aqui": itens recomendados, limitados ao que existe (CSV e SQL).
4. Aviso de privacidade em uma linha, em `.notice` de informação.
5. Rodapé sem link de Apoie na Fase 2; o link discreto "Apoie" só entra na Fase 6, PROVISÓRIO até D5.

Estados: sem estados de erro. Conteúdo estático. Se, aprovado no G1, um cartão apontar para algo "em breve", usar chip "Em breve" e `aria-disabled="true"` (padrão `.btn[aria-disabled]`, linha 67).

### 5.2 Visualizador de CSV

Layout (desktop ≥ 900px):

```
┌ frame-bar: [arquivo.csv] ........... [Trocar arquivo] [Exportar] ┐
├───────────────────────────────────────────────────────────────────┤
│ Resumo: 12.480 linhas · 14 colunas · 2,3 MB · delimitador ;        │
│ Abas:  Dados | Colunas | Gráfico                                  │
├───────────────────────────────────────────────────────────────────┤
│ tabela virtualizada, cabeçalho fixo, ordenação por coluna          │
└───────────────────────────────────────────────────────────────────┘
```

Funções: carregar por arrastar ou escolher; detectar delimitador e codificação com opção de ajustar; tabela com ordenação e filtro de texto; aba Colunas com tipo inferido, nulos e únicos; gráfico simples (barras e linha) com escolha de colunas; exportar CSV filtrado.

| Estado | Comportamento |
|---|---|
| **Vazio (inicial)** | Dropzone grande: "Arraste um CSV aqui ou escolha um arquivo". Abaixo, botão "Usar um exemplo" (conjunto pequeno). Linha de privacidade. Limite de tamanho informado. |
| **Arrastando** | Dropzone com borda `--plum` tracejada e fundo `--orchid-soft`; texto "Solte para carregar". |
| **Carregando** | Barra de progresso (`<progress>`) com texto "Lendo arquivo... 42%". Botão "Cancelar" (MVP, C10.1: encerra o Worker de parsing). Tabela substituída por esqueleto (versão estática sob reduced-motion). |
| **Sucesso** | Resumo e abas. `aria-live="polite"` anuncia "Arquivo carregado: 12.480 linhas, 14 colunas". |
| **Resultado vazio de filtro** | Estado vazio dentro da tabela: "Nenhuma linha corresponde ao filtro" e botão "Limpar filtro". |
| **Erro: arquivo não é CSV / vazio / codificação** | `.notice` de erro com causa e ação: "Não foi possível ler o arquivo. Tente outra codificação" com seletor. O arquivo anterior, se havia, é mantido. |
| **Erro: arquivo grande demais** | Antes de ler: "Este arquivo tem 180 MB. O limite é X MB. Dica: abra uma amostra das primeiras linhas" com botão "Carregar só as primeiras N linhas". |
| **Navegador sem suporte** | `.notice` de aviso explicando o que falta e que a página continua legível. |

### 5.3 SQL playground

Layout (desktop): coluna esquerda com **Esquema** (tabelas e colunas em mono, colapsável); centro-direita com **Editor** acima e **Resultado** abaixo, em painéis (`.ws`, seção 8.2). Barra de ações: `Executar` (`.btn-accent`), `Limpar`, `Copiar`, seletor de conjunto de dados, "Exemplos".

Mobile: abas `Editor | Resultado | Esquema` (`.tabs`).

| Estado | Comportamento |
|---|---|
| **Carregando o motor** | Painel de resultado mostra "Preparando o banco no seu navegador..." com barra; editor já editável; botão `Executar` desabilitado com texto "Aguarde". |
| **Vazio** | Editor com consulta de exemplo pré-preenchida; resultado diz "Execute a consulta para ver o resultado" com ícone de tecla `Ctrl/Cmd + Enter`. |
| **Executando** | Botão vira "Executando..." e `aria-busy="true"` no resultado; opção "Parar" se a consulta demorar mais de 3 s. **"Parar" é MVP para CSV e SQL** (C10.1): encerra o Worker. |
| **Sucesso** | Tabela de resultado, contagem de linhas e tempo ("42 linhas · 12 ms"), botão "Baixar CSV". |
| **Sucesso sem linhas** | "A consulta rodou e não retornou linhas" (distinto de erro). |
| **Erro de SQL** | `.notice` de erro com a mensagem do motor, linha e coluna marcadas no editor, e uma dica em linguagem simples quando reconhecível (ex.: "coluna não existe: veja o esquema à esquerda"). O resultado anterior fica esmaecido, não apagado. |
| **Tempo esgotado** | "A consulta passou de N segundos e foi interrompida" com sugestão de `LIMIT`. |
| **Falha ao carregar o motor** | "Não foi possível preparar o ambiente. Verifique a conexão e tente de novo" com botão "Tentar de novo". Se for problema de rede, mencionar uso offline após o primeiro carregamento só se for suportado (a confirmar). |

### 5.4 Python playground (fase futura, Fase 4; estrutura definida na fase correspondente)
Mesma casca do SQL, com saída em duas áreas: **Console** (`pre.code`, texto) e **Resultado** (tabela, gráfico estático, quando existir). Sem entrada interativa de teclado (`input()`) na v1: avisar.

| Estado | Comportamento |
|---|---|
| **Carregando o ambiente** | O primeiro carregamento é o mais pesado. Barra com etapas ("Baixando ambiente Python", "Instalando pacotes"), tamanho aproximado informado antes de começar e botão "Carregar ambiente" (carregamento sob demanda, não automático, para não gastar dados do celular sem aviso). |
| **Vazio** | Código de exemplo, saída vazia com "Execute para ver a saída". |
| **Executando** | Botão "Executando...", "Parar". (Fase 4; mesma regra de Worker do MVP para CSV e SQL, C10.1.) |
| **Sucesso** | Console com saída; erros e saída normal em estilos distintos. |
| **Erro de execução** | Traceback no console, a última linha em destaque e linha marcada no editor; dica quando reconhecível. |
| **Tempo esgotado ou laço infinito** | Botão "Parar" reinicia o ambiente: "Ambiente reiniciado. Suas variáveis foram perdidas, seu código não." |
| **Pacote indisponível** | "O pacote X não está disponível neste ambiente" com lista dos pacotes suportados. |
| **Aviso mobile** | `.notice` informativo e dispensável: "Escrever código é mais confortável em tela maior". Nunca bloqueia. |

### 5.5 IA (fase futura, Fase 5; estrutura definida na fase correspondente)
Lista filtrável de guias, prompts e ferramentas indicadas. Cartão por item: título, 1 linha, chips de tema e nível, tipo. Detalhe: página de leitura (coluna de 68ch, igual ao `.case-body p`, linha 276) com trechos copiáveis (`pre.code` com botão copiar).
- Vazio de filtro: "Nada com esses filtros" com "Limpar filtros".
- Link externo: ícone `↗` mono, `rel="noopener"`, e `aria-label` com "abre em nova aba".
- Honestidade: indicar data de revisão em mono (padrão `.t-when`, linha 207), já que conteúdo de IA envelhece rápido.

### 5.6 Cursos (fase futura, Fase 5; estrutura definida na fase correspondente)
Esboço não vinculante.
- **Índice**: dois cartões grandes (curso, nível, nº de módulos, duração, idioma, status). Chip "Em breve" se ainda não publicado.
- **Página do curso**: lede, "O que você vai aprender" (lista), grade curricular (padrão `.timeline`, 201-210, ou acordeão), pré-requisitos, material de apoio, botão `Começar` (`.btn-accent`).
- **Aula**: título, vídeo ou texto, arquivos da aula, navegação "Anterior / Próxima" (padrão `.btn-ghost` com `.arrow`, como `app.js:123`). Índice lateral das aulas (padrão `.index`, 131-153); no mobile vira faixa rolável.
- **Progresso** (marcação "concluída" local, exercícios concluídos): **P2, sem escopo aprovado**; sem RF/T até ser formalizado.
- **Vídeo**: carregar sob demanda (clique para carregar), com legenda e transcrição; sem iframes de terceiros carregando antes do clique.
- **Erro**: aula inexistente leva à página do curso com `.notice`.

### 5.7 Recursos gratuitos (fase futura, Fase 5; estrutura definida na fase correspondente)
Tabela/lista de linhas (`.res`, seção 8.12): nome, tipo, tamanho, idioma, versão da ferramenta, botão `Baixar`. Filtros por tema e tipo, busca por texto.
- Vazio: "Nenhum recurso com esses filtros".
- Arquivo indisponível: `.notice` de erro com opção de reportar.
- Cada download informa o que é e licença de uso.

### 5.8 Apoie (fase futura, PROVISÓRIO até D5)
Ver seção 9.

### 5.9 Privacidade (P1, Fase 2) e Sobre (P2)
- **Privacidade**: o que roda no navegador, o que é armazenado localmente (hoje: tema e idioma), quais serviços de terceiros existem (nas páginas do Hub, nenhuma requisição externa; o portfólio mantém Google Fonts, C9). A confirmar com a implementação.
- **Sobre**: **P2, sem escopo aprovado**, fora do MVP. Sem especificação até ser formalizado.

### 5.10 Estado inválido dentro da página (substitui a "404")
O Hub não tem roteador nem página 404 interna (C4). O requisito vale para hash ou parâmetro inválido:
- Hash ou parâmetro desconhecido (ex.: `#aba=xyz`, `?exemplo=inexistente`): ignorar o valor, mostrar o estado padrão da página e um `.notice` de aviso "Opção não reconhecida; mostrando o padrão", sem `role="alert"`. Nunca tela em branco nem exceção.
- Valor válido em formato, mas sem dado (ex.: conjunto de exemplo removido): mesmo tratamento, com link para a lista de exemplos.
- O valor inválido nunca é inserido como HTML (apenas texto).
- URL inexistente de página (caminho errado): responsabilidade da hospedagem. Um `404.html` na raiz **[requer aprovação]**, fora do MVP.

---

## 6. Comportamentos transversais

- **Idioma**: seletor EN/PT idêntico (`.lang`, 295-298). Troca sem recarregar. Conteúdo de ferramentas (mensagens de erro, rótulos) bilíngue. Mensagens vindas de motores (SQL, Python) ficam no idioma original; a dica explicativa é traduzida.
- **Tema**: claro por padrão quando não há preferência do sistema; o tema escuro redefine tokens, nunca cores fixas. Ler preferência num script curto no `<head>` para evitar flash (lacuna A6 da auditoria, aplicada só ao Hub).
- **Persistência**: apenas no navegador (`localStorage`). No MVP: tema e idioma. Rascunho de código, progresso de curso, exercícios concluídos e dispensa do convite de apoio (30 dias) são **P2, sem escopo aprovado**. Nada é enviado.
- **Teclado**: toda ação possível sem mouse. Atalhos documentados na tela e nunca únicos. Ctrl/Cmd+Enter executa; Esc fecha painéis. O editor deve permitir sair com Tab (`Esc` depois `Tab`) para não prender o foco.
- **Foco**: `:focus-visible` global (`styles.css:53`). Em fundos escuros do Hub (editor, console, cartão de apoio) usar `outline-color: var(--orchid)` (`--focus-dark`, ver 10.2), porque `--plum` sobre meia-noite no tema claro não atinge 3:1 (valores na tabela de pares, 10.2).
- **Anúncios**: uma única região `aria-live="polite"` por página para status (arquivo carregado, consulta executada, chave copiada). Erros que impedem a tarefa usam `role="alert"`.
- **Links**: no texto corrido, links sempre sublinhados (plum contra ink-2 não tem 3:1 de diferença só pela cor).
- **Movimento**: respeitar `prefers-reduced-motion` (`styles.css:47`); carregadores têm forma estática.
- **Erros**: sempre dizer o que aconteceu, por que, e o que fazer. Sem códigos soltos, sem culpar o usuário.

---

## 7. Requisitos responsivos

### 7.1 Pontos de quebra do Hub (propostos)
O portfólio usa cinco (auditoria 1.4). O Hub adota três, alinhados com os valores já existentes mais próximos:

| Nome | Largura | Equivale a hoje | Uso |
|---|---|---|---|
| compacto | ≤ 640px | 520 e 700 | uma coluna, abas no lugar de painéis, tabelas em rolagem |
| médio | ≤ 900px | 860, 900 e 960 | menu hambúrguer, índices viram faixa rolável, painéis empilhados |
| largo | > 900px até `.wrap` 1160px | | duas colunas e painéis lado a lado |

CSS não aceita variáveis em `@media`; documentar como constantes.

### 7.2 Regras
- Largura útil: `.wrap` 1160px e `padding-inline:20px` (`styles.css:51, 54`). Sem rolagem horizontal da página em 320px.
- **Alvos de toque novos: mínimo 44×44 px** (os 40px de `.icon-btn` não bastam em celular). Espaçamento mínimo de 8px entre alvos.
- **Campos de texto e editor: 16px de fonte no mínimo** para o iOS não ampliar a tela ao focar.
- **Tabelas de dados**: contêiner com rolagem horizontal, `tabindex="0"`, `role="region"` e `aria-label`, cabeçalho e primeira coluna fixos, fonte mono de 13px. Não converter para cartões (perde comparação).
- **Espaço de trabalho das ferramentas**:
  - largo: painéis lado a lado (esquema | editor/resultado), com divisor arrastável e alternativa por teclado;
  - médio: editor acima, resultado abaixo, esquema em gaveta;
  - compacto: abas `Editor | Resultado | Esquema`, uma visível por vez, executar fixo na base com 44px de altura (respeitando `env(safe-area-inset-bottom)`).
- **Teclado virtual do celular**: o editor não pode ficar escondido. Usar `visualViewport` ou `dvh`, não `vh`.
- **Menu**: o painel suspenso existente (`styles.css:88-93`) com Escape e clique fora.
- **Zoom**: tudo utilizável a 200% e com texto ampliado em 400% (reflow, WCAG 1.4.10). Sem altura fixa em painéis de texto.
- **Imagens e QR**: `max-width:100%`; QR com tamanho mínimo de 160px e contraste mantido.
- **Orientação**: sem travar paisagem ou retrato.
- **Impressão**: página de recursos e aula com estilo de impressão simples (sem nav, sem sombras). Opcional na v1.
- **Rede lenta**: nada carrega motores pesados antes de ação do usuário (Python: botão "Carregar ambiente"); mostrar tamanho antes.

---

## 8. Especificação dos componentes novos

Todos usam apenas tokens existentes, salvo menção a tokens propostos (seção 10). Nomes de classe são sugestões. Cada item descreve anatomia, variantes, estados e acessibilidade.

### 8.1 `.skip` (link de pular)
- **Anatomia**: link, oculto fora do foco, no topo do `<body>`.
- **Estilo**: ao receber foco, posição fixa no canto superior esquerdo, `.btn-dark`, `z-index` acima de `.nav` (que usa 50, linha 73).
- **A11y**: primeiro elemento focável; destino `#main` com `tabindex="-1"`.

### 8.2 `.ws` (espaço de trabalho, painéis de ferramenta)
Deriva de `.frame` (`styles.css:181-192`).
- **Anatomia**: `.ws` (borda `--line`, raio `--r-lg`, fundo `--surface`); `.ws-bar` (mesma barra de `.frame-bar`, com nome do arquivo ou consulta em `--f-mono` e ações à direita); `.ws-body`.
- **Diferença**: sem as três luzes (`.lights`) nas ferramentas, para não parecer decoração; o rótulo mono permanece. O selo `.live` é reutilizado como etiqueta de estado ("PRONTO", "EXECUTANDO", "ERRO").
- **Variantes**: `--split` (dois painéis), `--stack`.
- **A11y**: cada painel é `role="region"` com `aria-label`; o divisor, se existir, é `role="separator"` com `aria-valuenow` e operável por setas.

### 8.3 `.drop` (zona de soltar arquivo)
- **Anatomia**: área com ícone, título, texto de apoio, botão "Escolher arquivo" (`.btn-dark`) e linha de privacidade.
- **Estilo**: borda 2px tracejada `--ink-3` (4.35:1 sobre `--bg`; ver nota de coerência abaixo), raio `--r-lg`, fundo `--surface`.
- **Estados**: repouso; `:hover` borda `--plum`; `--over` (arrastando) fundo `--orchid-soft`, borda `--plum` sólida; foco com anel padrão; `--error` borda `--err` (token proposto) com mensagem.
- **Nota de coerência (`--ink-3` na borda, não no texto)**: WCAG 1.4.11 exige 3:1 para limites de componentes de interface; 1.4.3 exige 4,5:1 para texto normal. `--ink-3` sobre `--bg` dá 4,35:1: acima de 3:1 (borda passa) e abaixo de 4,5:1 (texto falha). Não há contradição: critérios diferentes, limiares diferentes. Dentro de `.hub`, texto usa `--hub-ink-3` (seção 10.2); a borda pode manter `--ink-3`. Ressalva: sobre `--surface-2` (4,03) e `--orchid-soft` (3,79) a borda ainda passa 3:1, mas confirmar por ferramenta.
- **A11y**: é um `<label>` ligado a `<input type="file">` (nunca só arrastar); teclado ativa o seletor; anuncia resultado em região live.

### 8.4 `.field` (campo de formulário: texto, busca, select)
- **Anatomia**: `<label>` acima (Figtree 600 14px, `--ink`), controle, texto de ajuda e mensagem de erro abaixo (13px, `--ink-2`; erro em `--err`).
- **Estilo**: fundo `--surface`, texto `--ink`, borda 1px `--ink-3` (3:1 mínimo), raio `--r-sm`, altura 44px, fonte 16px. Placeholder em `--ink-2`.
- **Estados**: `:hover` borda `--ink-2`; `:focus-visible` anel `--plum` (padrão global); `[aria-invalid="true"]` borda `--err` e ícone, nunca só cor; `:disabled` opacidade .55 (padrão `.btn[aria-disabled]`).
- **A11y**: `for`/`id`, `aria-describedby` apontando para ajuda e erro.

### 8.5 `.editor` (editor de código)
- **Anatomia**: `<textarea>` estilizado com números de linha (coluna `--f-mono`), dentro de `.ws-body`.
- **Estilo**: segue `pre.code` (`styles.css:280-281`): fundo `--midnight` nos dois temas, texto `#EDE3F3` como já usado, comentários `#9C92A8` (6.09:1), palavra-chave `#E7A9F0`, texto `#B8E3C8`. Em tema escuro a borda `--line-strong` separa o painel do fundo. Fonte `--f-mono` 14px mínimo (13.5px no existente; 16px em campo focado no iOS), altura de linha 1.6.
- **Cores fixas**: reutiliza as de `pre.code`; não se criam novas. Se realce de sintaxe mais rico for necessário, usar tokens propostos `--syn-*`.
- **Estados**: foco com anel `--orchid`; erro marca a linha com fundo `--err` a 18% (via `color-mix`, como `.dot`, linha 103) e ícone na margem.
- **A11y**: `aria-label` "Editor de código SQL/Python"; instrução de teclado "Esc e depois Tab para sair do editor"; mensagens de erro ligadas por `aria-describedby`.
- **Implementação**: se for usado um componente de editor de terceiros, validar leitor de tela e teclado; um `<textarea>` com realce sobreposto costuma ser mais acessível que alternativas complexas. Decisão técnica fica para a fase de arquitetura.

### 8.6 `.dtable` (tabela de dados)
- **Anatomia**: contêiner rolável, `<table>`, `<caption class="sr">`, `<thead>` fixo, primeira coluna fixa opcional, rodapé com contagem.
- **Estilo**: fundo `--surface`, linhas separadas por `--line`, cabeçalho em `--surface-2` com texto `--ink` 600; células em `--f-mono` 13px; números alinhados à direita com `font-variant-numeric:tabular-nums` (já usado, linha 116); linha com `:hover` em `--surface-2`.
- **Ordenação**: botão dentro do `<th>` com `aria-sort`.
- **Valores nulos**: `—` em `--ink-2` com `aria-label="vazio"`.
- **Células longas**: truncadas com reticências e título; abrir completo ao focar/expandir.
- **Virtualização**: se houver milhares de linhas, manter `aria-rowcount` e `aria-rowindex`.
- **A11y**: contêiner com `tabindex="0"`, `role="region"`, `aria-label`.

### 8.7 `.tabs` (abas)
Visual derivado do seletor segmentado `.lang` (295-298).
- **Anatomia**: `role="tablist"`, botões `role="tab"`, painéis `role="tabpanel"`.
- **Estilo**: pílulas com borda `--line`; ativa em `--ink` com texto `--bg` (como `.links a.on`, linha 83). Altura 44px.
- **Teclado**: setas esquerda/direita movem; Home/End; ativação automática.
- **Uso**: Editor/Resultado/Esquema (compacto), Dados/Colunas/Gráfico, Console/Resultado.

### 8.8 `.notice` (aviso de status)
Deriva de `.draft` (282).
- **Variantes**: `info` (fundo `--orchid-soft`, texto `--plum-ink`, 7.82:1), `ok` (borda e ícone `--ok`), `warn` (`--warn` proposto), `err` (`--err` proposto).
- **Anatomia**: ícone (forma diferente por variante: i, check, triângulo, x), título curto em negrito, texto, ação opcional (botão link).
- **Estilo**: raio `--r-md`, padding 14px 16px, fundo = cor da variante a 12% sobre `--surface` via `color-mix`; borda esquerda 3px na cor da variante (como `.permit`, linha 312).
- **A11y**: `role="status"` para info/ok; `role="alert"` para erro que bloqueia. Nunca depender só de cor. Dispensável quando for informativo; lembrar a dispensa em `localStorage` é **P2, sem escopo aprovado** (no MVP, reaparece a cada visita).

### 8.9 Estados de carregamento: `.skel`, `<progress>`
- **`.skel`**: blocos `--surface-2` com leve pulso de opacidade; **sob `prefers-reduced-motion`**, estáticos.
- **Barra de progresso**: `<progress>` estilizado, trilho `--line`, preenchimento `--plum`, altura 8px, raio 999px; texto de etapa ao lado, em `--ink-2`, `aria-live="polite"` sem repetir a cada 1%: anunciar em marcos (25%, 50%, 75%, 100%).
- **Sem spinner** infinito sem texto: sempre dizer o que está acontecendo.
- **Tempo longo**: após 8 s mostrar "Isto está demorando mais que o normal" com opção de cancelar.

### 8.10 `.empty` (estado vazio)
- **Anatomia**: ícone linear 32px em `--ink-3`, título (`--f-display` 650, 20px), 1 linha de explicação, ação principal.
- **Estilo**: centralizado, fundo `--surface-2`, borda tracejada `--line-strong`, raio `--r-lg`, sem ilustração pesada.
- **Regra**: todo vazio oferece uma ação ("Usar um exemplo", "Limpar filtros"). Nunca um espaço em branco.

### 8.11 `.card` (cartão do Hub)
Consolida `.tile` e `.proj` (auditoria 2).
- **Anatomia**: eyebrow ou chip de tema, título (`--f-display` 700, 20-24px), descrição 15px `--ink-2`, linha de metadados em mono, **um** link principal cobrindo o cartão (`::after` esticado no link do título).
- **Estilo**: `--surface`, borda `--line`, raio `--r-lg`, padding 26px (20px no compacto); `:hover` borda `--line-strong` e `--shadow`, como `.proj:hover` (162).
- **Variantes**: `--tool` (ícone + chip de estado), `--course` (nível, módulos, duração), `--soon` (opacidade .8, chip "Em breve", sem hover).
- **A11y**: um só link por cartão; `aria-describedby` na descrição.

### 8.12 `.res` (linha de recurso)
- **Anatomia**: nome (600), descrição curta, chips (tema, nível), metadados mono (tipo `.xlsx`, tamanho, idioma, versão), botão `Baixar` (`.btn-ghost`, 44px).
- **Estilo**: linha com borda inferior `--line`; no compacto empilha, botão ocupa a largura.
- **A11y**: o botão tem `aria-label` "Baixar {nome}, {tipo}, {tamanho}".

### 8.13 `.copy` (botão copiar)
- **Estados**: repouso "Copiar"; sucesso "Copiado" por 2 s com ícone de check; erro "Não foi possível copiar. Selecione e copie manualmente" e o texto fica selecionado.
- **A11y**: resultado anunciado em região live (`role="status"`), não só mudança de texto no botão; botão mantém largura fixa para não saltar.

### 8.14 `.support` (cartão de apoio) e `.nudge` (linha discreta): PROVISÓRIO até D5
Ver seção 9.

### 8.15 Cabeçalho e rodapé do Hub
Variantes de `.nav` e `footer` (73-93, 254-256): mesmo markup visual. Mudanças: itens da seção 3.2; `aria-current`; marca com "data & ai hub". Rodapé com `--ink-2` em vez de `--ink-3`.

### 8.16 `.crumb` (migalhas)
Para páginas de segundo nível (`Ferramentas / SQL`): lista em mono 13px, separador `/`, último item sem link com `aria-current="page"`. Cor `--ink-2`.

### 8.17 `.acc` (acordeão, grade curricular)
Botão com `aria-expanded` e `aria-controls`; título em `--f-display`; conteúdo recolhido com `hidden`. Alternativa: lista aberta, estilo `.timeline` (201-210).

---

## 9. Contribuição voluntária via PIX (PROVISÓRIO até D5, Fase 6)

> **PROVISÓRIO.** D5 (PIX) não está decidida. Texto, posição, frequência, convite e estrutura da página `/hub/apoie/` abaixo são rascunho para discussão e podem ser alterados ou descartados. Nada nesta seção entra no MVP (Fases 2 e 3). A dispensa do convite por 30 dias é P2, sem escopo aprovado.

### 9.1 Princípios
1. **Voluntária e opcional, dita com clareza.** Tudo no Hub continua gratuito.
2. **Discreta.** Nunca modal, banner fixo, pop-up, barra de progresso de meta, contador regressivo nem texto culpabilizante.
3. **Contextual e rara.** Aparece quando o visitante recebeu valor, no máximo uma vez por sessão, dispensável e lembrada.
4. **Transparente.** Dizer o que a contribuição ajuda a manter.
5. **Honesta com quem está fora do Brasil.** PIX é brasileiro.

### 9.2 Onde aparece (do mais discreto ao mais explícito)

| # | Local | Forma | Frequência |
|---|---|---|---|
| 1 | Rodapé de todas as páginas do Hub | Link de texto "Apoie o projeto" | sempre, sem destaque |
| 2 | Item "Apoie" na navegação | Link de texto, não botão violeta | sempre |
| 3 | Fim de curso, aula e recurso | `.nudge`: uma linha + link, dentro do conteúdo, após o valor entregue | 1 por página |
| 4 | Depois de uma tarefa concluída em ferramenta (resultado exibido e ação como exportar ou copiar feita) | `.nudge` abaixo do painel, sem tirar foco, sem anúncio de leitor de tela (não é alerta) | no máximo 1 vez por sessão; "não reaparece por 30 dias ao dispensar" é P2, sem escopo aprovado |
| 5 | `/hub/apoie/` | Página completa | sob demanda |

Onde **não** aparece: hero do Hub, durante carregamento ou erro (o usuário está frustrado), sobre o editor, dentro de modais, e em nenhum lugar do portfólio por padrão. Um link "Apoie" no portfólio **[requer aprovação]** e não é recomendado, para preservar a leitura profissional de recrutadores.

### 9.3 `.nudge`
- **Texto (PT)**: "Isso foi útil? Se quiser, você pode apoiar o projeto com qualquer valor. [Ver como]" · **EN**: "Was this useful? If you like, you can support the project with any amount. [How]"
- **Estilo**: texto 14px `--ink-2`, ícone de coração linear em `--plum`, link sublinhado em `--plum`, borda superior `--line`, sem fundo colorido, sem botão. Botão "Dispensar" (`×`, 44px de área) à direita.
- **Comportamento**: sem animação de entrada; some ao dispensar; guardar a dispensa em `localStorage` (30 dias) é P2, sem escopo aprovado.
- **A11y**: `<aside aria-label="Apoie o projeto">`, sem `role="alert"`, foco nunca é movido.

### 9.4 `/hub/apoie/` (provisório)
Estrutura:
1. `h1`: "Apoie o projeto" com eyebrow "Contribuição voluntária".
2. Lede de 2 frases: tudo é gratuito; a contribuição ajuda a manter e ampliar.
3. Cartão `.support`:
   - À esquerda: **QR do PIX** sobre fundo branco fixo com margem de silêncio, preto sobre branco nos dois temas (a legibilidade do QR vale mais que o tema), mínimo 160px, `alt` "QR Code do PIX para contribuição voluntária".
   - À direita: **chave PIX "copia e cola"** em `--f-mono`, botão `.copy`, nome do recebedor e instituição (para o apoiador conferir antes de pagar). Valor livre.
   - Fundo do cartão: `--surface` com borda `--line`. Evitar o bloco `.contact` escuro (242-252) para não parecer um CTA de venda.
4. "Para onde vai": 3 itens curtos e verdadeiros (a definir pelo Lucas).
5. "Outras formas de ajudar" (sem dinheiro): compartilhar com um colega, avisar de erro, sugerir um tema, estrela no GitHub.
6. Aviso em `.notice` de info: "Fora do Brasil? O PIX só funciona com contas brasileiras. As outras formas acima ajudam igualmente." (aparece em EN e para quem tiver idioma EN).
7. Nota de transparência: contribuição voluntária, sem contrapartida e sem recibo, a menos que o Lucas decida outro formato.

### 9.5 Estados do cartão de PIX
- **Repouso**: chave visível, botão "Copiar chave".
- **Copiado**: "Chave copiada" (região live), botão com check por 2 s.
- **Falha ao copiar**: chave selecionada automaticamente e texto "Selecione e copie".
- **QR não carregou**: texto "Não foi possível exibir o QR Code. Use a chave abaixo." (a chave sempre existe em texto).
- **Mobile**: botão `Copiar chave` com 44px e largura total; QR acima da chave.

### 9.6 Pontos que dependem do Lucas (não definidos aqui)
- A chave PIX, nome do recebedor e instituição **não foram inventados**: usar marcador `[chave PIX a definir pelo Lucas]`.
- Conferir implicações fiscais e legais de receber contribuições com a pessoa que for orientar o Lucas (contador). Fora do escopo de design.
- Se houver, no futuro, outro meio para fora do Brasil, entra como segundo bloco, sem alterar o princípio.

---

## 10. Tokens

### 10.1 Tokens existentes usados
`--bg`, `--surface`, `--surface-2`, `--line`, `--line-strong`, `--ink`, `--ink-2`, `--ink-3`, `--plum`, `--plum-ink`, `--orchid`, `--orchid-soft`, `--midnight`, `--on-dark`, `--ok`, `--grad`, `--shadow`, `--r-lg`, `--r-md`, `--r-sm`, `--f-display`, `--f-body`, `--f-mono`.

### 10.2 Tokens novos e tabela única de pares de contraste

#### Tabela única de pares (C10.3): referência de T-206, A11-10 e HUB-22

**Status: valores calculados por script (Python 3, fórmula WCAG 2.x, `python3 -I`) pelo Tech Lead em 2026-11-12, a partir dos hex da tabela.** Hex de `--err`, `--warn` e `--hub-ink-3` são PROPOSTAS (tokens novos), ainda não aprovadas. Valores acima do limiar marcados "ok"; abaixo, "FALHA". Colunas "claro" e "escuro" são os dois temas na mesma linha (hex de `styles.css` linhas 5-8 e 21-24; `--err`, `--warn`, `--hub-ink-3` vêm da tabela de tokens novos abaixo; `--midnight` é `#191328` nos dois temas). Limiar: 4,5 texto, 3 componente.

| # | Par (primeiro plano sobre fundo) | Claro: fg / bg | Escuro: fg / bg | Limiar | Valor claro | Valor escuro |
|---|---|---|---|---|---|---|
| 1 | `--ink` / `--bg` | 191328 / FBFAFD | F1ECF5 / 110E17 | 4,5 | 17,33 ok | 16,43 ok |
| 2 | `--ink` / `--surface` | 191328 / FFFFFF | F1ECF5 / 1A1622 | 4,5 | 18,02 ok | 15,28 ok |
| 3 | `--ink` / `--surface-2` | 191328 / F5F0F8 | F1ECF5 / 221C2C | 4,5 | 16,05 ok | 14,21 ok |
| 4 | `--ink` / `--orchid-soft` | 191328 / F3E7F7 | F1ECF5 / 2A1F33 | 4,5 | 15,09 ok | 13,45 ok |
| 5 | `--ink-2` / `--bg` | 4A4458 / FBFAFD | C3BACD / 110E17 | 4,5 | 8,94 ok | 10,21 ok |
| 6 | `--ink-2` / `--surface` | 4A4458 / FFFFFF | C3BACD / 1A1622 | 4,5 | 9,30 ok | 9,50 ok |
| 7 | `--ink-2` / `--surface-2` | 4A4458 / F5F0F8 | C3BACD / 221C2C | 4,5 | 8,28 ok | 8,84 ok |
| 8 | `--ink-3` texto / `--bg` (global; esperado falhar no claro) | 7A7389 / FBFAFD | 8F869B / 110E17 | 4,5 | 4,35 FALHA | 5,51 ok |
| 9 | `--ink-3` texto / `--surface` | 7A7389 / FFFFFF | 8F869B / 1A1622 | 4,5 | 4,52 ok | 5,12 ok |
| 10 | `--ink-3` texto / `--surface-2` | 7A7389 / F5F0F8 | 8F869B / 221C2C | 4,5 | 4,03 FALHA | 4,76 ok |
| 11 | `--hub-ink-3` (cor corrigida) texto / `--bg` | 6E677D / FBFAFD | 8F869B / 110E17 | 4,5 | 5,18 ok | 5,51 ok |
| 12 | `--hub-ink-3` texto / `--surface` | 6E677D / FFFFFF | 8F869B / 1A1622 | 4,5 | 5,39 ok | 5,12 ok |
| 13 | `--hub-ink-3` texto / `--surface-2` | 6E677D / F5F0F8 | 8F869B / 221C2C | 4,5 | 4,80 ok | 4,76 ok |
| 14 | `--hub-ink-3` texto / `--orchid-soft` | 6E677D / F3E7F7 | 8F869B / 2A1F33 | 4,5 | 4,51 ok | 4,51 ok |
| 15 | `--ink-3` borda de componente / `--bg` | 7A7389 / FBFAFD | 8F869B / 110E17 | 3 | 4,35 ok | 5,51 ok |
| 16 | `--ink-3` borda / `--surface` (`.field`) | 7A7389 / FFFFFF | 8F869B / 1A1622 | 3 | 4,52 ok | 5,12 ok |
| 17 | `--ink-3` borda / `--surface-2` | 7A7389 / F5F0F8 | 8F869B / 221C2C | 3 | 4,03 ok | 4,76 ok |
| 18 | `--ink-3` borda / `--orchid-soft` (`.drop --over`) | 7A7389 / F3E7F7 | 8F869B / 2A1F33 | 3 | 3,79 ok | 4,51 ok |
| 19 | `--line-strong` / `--bg` (confirma que não serve de borda de controle) | D6C9DE / FBFAFD | 3D3349 / 110E17 | 3 | 1,52 FALHA | 1,61 FALHA |
| 20 | `--plum` texto/link / `--bg` | 8A3D86 / FBFAFD | D7A2E4 / 110E17 | 4,5 | 6,53 ok | 9,26 ok |
| 21 | `--plum` texto/link / `--surface` | 8A3D86 / FFFFFF | D7A2E4 / 1A1622 | 4,5 | 6,79 ok | 8,61 ok |
| 22 | `--plum` texto/link / `--surface-2` | 8A3D86 / F5F0F8 | D7A2E4 / 221C2C | 4,5 | 6,05 ok | 8,01 ok |
| 23 | `--plum` anel de foco, progresso, borda / `--bg` | 8A3D86 / FBFAFD | D7A2E4 / 110E17 | 3 | 6,53 ok | 9,26 ok |
| 24 | `--plum` borda / `--orchid-soft` | 8A3D86 / F3E7F7 | D7A2E4 / 2A1F33 | 3 | 5,69 ok | 7,58 ok |
| 25 | `--plum-ink` / `--orchid-soft` (`.notice` info) | 6E2D6B / F3E7F7 | E6BFEF / 2A1F33 | 4,5 | 7,81 ok | 9,73 ok |
| 26 | `--plum-ink` / `--bg` | 6E2D6B / FBFAFD | E6BFEF / 110E17 | 4,5 | 8,97 ok | 11,89 ok |
| 27 | `--plum-ink` / `--surface` | 6E2D6B / FFFFFF | E6BFEF / 1A1622 | 4,5 | 9,33 ok | 11,05 ok |
| 28 | `--err` texto / `--bg` | B3261E / FBFAFD | F2A39D / 110E17 | 4,5 | 6,29 ok | 9,56 ok |
| 29 | `--err` texto / `--surface` | B3261E / FFFFFF | F2A39D / 1A1622 | 4,5 | 6,54 ok | 8,89 ok |
| 30 | `--err` texto / `--surface-2` | B3261E / F5F0F8 | F2A39D / 221C2C | 4,5 | 5,82 ok | 8,27 ok |
| 31 | `--err` borda/ícone / `--bg` | B3261E / FBFAFD | F2A39D / 110E17 | 3 | 6,29 ok | 9,56 ok |
| 32 | `--warn` texto / `--bg` | 8A5A00 / FBFAFD | E8C170 / 110E17 | 4,5 | 5,70 ok | 11,19 ok |
| 33 | `--warn` texto / `--surface` | 8A5A00 / FFFFFF | E8C170 / 1A1622 | 4,5 | 5,93 ok | 10,40 ok |
| 34 | `--warn` texto / `--surface-2` | 8A5A00 / F5F0F8 | E8C170 / 221C2C | 4,5 | 5,28 ok | 9,68 ok |
| 35 | `--warn` borda/ícone / `--bg` | 8A5A00 / FBFAFD | E8C170 / 110E17 | 3 | 5,70 ok | 11,19 ok |
| 36 | `--ok` texto / `--bg` | 2F7D5B / FBFAFD | 7CCFA6 / 110E17 | 4,5 | 4,80 ok | 10,31 ok |
| 37 | `--ok` texto / `--surface` | 2F7D5B / FFFFFF | 7CCFA6 / 1A1622 | 4,5 | 4,99 ok | 9,59 ok |
| 38 | `--ok` borda/ícone / `--bg` | 2F7D5B / FBFAFD | 7CCFA6 / 110E17 | 3 | 4,80 ok | 10,31 ok |
| 39 | `--bg` texto / `--ink` fundo (`.btn-dark`, aba ativa) | FBFAFD / 191328 | 110E17 / F1ECF5 | 4,5 | 17,33 ok | 16,43 ok |
| 40 | `--on-dark` / `--plum` (`.btn-accent`, se usado) | FFFFFF / 8A3D86 | 191328 / D7A2E4 | 4,5 | 6,79 ok | 8,74 ok |
| 41 | `--focus-dark` (`--orchid`) / `--midnight` (anel no editor) | CD9CDA / 191328 | CD9CDA / 191328 | 3 | 8,04 ok | 8,04 ok |
| 42 | `--plum` / `--midnight` (anel que NÃO deve ser usado em fundo escuro) | 8A3D86 / 191328 | D7A2E4 / 191328 | 3 | 2,65 FALHA | 8,74 ok |
| 43 | `--line-strong` borda do editor / `--bg` (tema escuro; separa painel) | D6C9DE / FBFAFD | 3D3349 / 110E17 | 3 | 1,52 FALHA | 1,61 FALHA |
| 44 | Texto do editor `#EDE3F3` / `--midnight` | EDE3F3 / 191328 | EDE3F3 / 191328 | 4,5 | 14,49 ok | 14,49 ok |
| 45 | Comentário `#9C92A8` / `--midnight` | 9C92A8 / 191328 | 9C92A8 / 191328 | 4,5 | 6,09 ok | 6,09 ok |
| 46 | Palavra-chave `#E7A9F0` / `--midnight` | E7A9F0 / 191328 | E7A9F0 / 191328 | 4,5 | 9,73 ok | 9,73 ok |
| 47 | Texto de string `#B8E3C8` / `--midnight` | B8E3C8 / 191328 | B8E3C8 / 191328 | 4,5 | 12,75 ok | 12,75 ok |
| 48 | `--ink-2` e `--ink` sobre `--midnight` (texto de console/cartão escuro) | 4A4458 / 191328 | C3BACD / 191328 | 4,5 | 1,94 FALHA | 9,63 ok |

Observações: a linha 48 no tema claro serve para provar que `--ink-2` não pode ser usado sobre `--midnight`; use texto do editor (linha 44). As linhas 19, 42 e 48 (claro) são pares de verificação negativa: se passarem, melhor; se falharem, a regra de uso correspondente continua valendo. Qualquer linha que falhar vira correção de token ou regra de uso antes de T-206.

Script de cálculo (colar valores na tabela; não calcular à mão):

```python
def lum(h):
    c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4 for x in c]
    return .2126*c[0]+.7152*c[1]+.0722*c[2]
def ratio(a,b):
    hi,lo=sorted([lum(a),lum(b)],reverse=True)
    return (hi+.05)/(lo+.05)
# ratio("191328","FBFAFD")  -> linha 1, claro
```

#### Tokens novos: **proposta** (viveriam num arquivo novo do Hub; não alteram `styles.css`). A coluna de contraste abaixo é histórica (cálculo manual) e **não é referência**; vale a tabela de pares acima.

| Token | Claro | Escuro | Uso | Contraste (histórico, não vinculante) |
|---|---|---|---|---|
| `--err` | `#B3261E` | `#F2A39D` | erro: texto, borda, ícone | claro: 6.29 em `--bg`, 6.54 em branco; escuro: 9.56 em `--bg` |
| `--warn` | `#8A5A00` | `#E8C170` | aviso | claro: 5.70 em `--bg`; escuro: 11.2 em `--bg` |
| `--hub-ink-3` (sobrescreve `--ink-3` só dentro de `.hub`) | `#6E677D` | `#8F869B` (igual ao atual) | textos pequenos de apoio (texto exige 4,5:1; bordas de componente, 3:1, podem usar `--ink-3`, ver 8.3) | claro: 5.18 em `--bg`, 4.80 em `--surface-2`; escuro: já passa (5.50, 4.76) |
| `--focus-dark` | `#CD9CDA` (= `--orchid`) | `#CD9CDA` | anel de foco sobre fundos meia-noite | 8.02 em `--midnight` |
| `--tap` | `44px` | `44px` | altura mínima de alvos novos | n/a |

Fundos de variantes de `.notice` e erro de linha usam `color-mix(in srgb, var(--err) 12%, var(--surface))`, mesmo mecanismo já usado em `.dot` (`styles.css:103`), sem novas cores.

Tokens opcionais, só se o realce de sintaxe precisar ir além do `pre.code` atual: `--syn-key`, `--syn-str`, `--syn-com`, `--syn-num`, com valores iguais aos já usados em `styles.css:281` e um quinto para números a definir.

Opcionais de organização (sem impacto visual): escala de espaçamento (`--s-1` a `--s-8`) e escala tipográfica. Adiar até haver repetição real.

### 10.3 Itens que **não** serão feitos sem aprovação
- Alterar `--ink-3` global, tokens do portfólio, `styles.css`, `index.html`, `app.js` ou `i18n.js`.
- Adicionar link do portfólio para o Hub (qualquer camada).
- Trocar idioma padrão (afetaria o portfólio).
- Mudar paleta, fontes, marca, ou layout das seções do portfólio.

---

## 11. Critérios de aceite de design para o Hub (checklist)
- Todos os pares da tabela de 10.2 com o limiar indicado (4,5:1 texto; 3:1 componente), nos dois temas.
- Casca da Fase 2 com 2 cartões ativos (CSV, SQL) e sem Apoie/PIX (C10.2).
- Anel de foco visível em todos os controles, inclusive sobre fundos escuros.
- Toda ferramenta tem os estados: vazio, carregando, sucesso, erro, sem suporte.
- Navegável por teclado e leitor de tela, com link de pular e foco no `h1` ao trocar de conteúdo.
- Funcional e legível em 320px, sem rolagem horizontal da página; tabelas rolam no próprio contêiner.
- Textos em PT e EN, com `lang` correto.
- `prefers-reduced-motion` respeitado.
- Pedido de apoio (provisório, Fase 6, após D5): nunca bloqueante, no máximo uma vez por sessão, dispensável. Fora do MVP.
- Estado inválido por hash ou parâmetro tratado conforme 5.10.
- Nenhuma cor fora de token, salvo as exceções documentadas (editor/código e QR).
- Portfólio inalterado.
