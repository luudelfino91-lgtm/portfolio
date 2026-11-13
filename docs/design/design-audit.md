# Auditoria de design: portfólio existente

Fase 1 (Design) · Lucas Delfino, Data & AI Community Hub
Escopo: `docs/IDENTIDADE-VISUAL.md`, `assets/css/styles.css`, `index.html`, `assets/js/app.js`, `assets/js/i18n.js`.
Esta auditoria é **somente leitura**. Nada aqui altera o portfólio. Todo item que exigiria mexer em arquivos do portfólio vem marcado **[requer aprovação do Lucas]**.

Método dos contrastes: calculados à mão com a fórmula de luminância relativa WCAG 2.x (sRGB linearizado). Nenhuma ferramenta automática foi executada. Antes de congelar valores, reconferir com um verificador (por exemplo o do navegador). Os valores abaixo estão arredondados em duas casas.

---

## 1. Tokens

### 1.1 Cores (`styles.css:4-40`)

Tema claro em `:root` (4-18). Tema escuro duplicado em dois blocos idênticos: `@media (prefers-color-scheme:dark)` com `:root:not([data-theme="light"])` (19-30) e `:root[data-theme="dark"]` (31-40). O botão de tema grava `data-theme` (`app.js:153-155`).

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--bg` | `#FBFAFD` | `#110E17` | fundo da página |
| `--surface` | `#FFFFFF` | `#1A1622` | cartões, nav |
| `--surface-2` | `#F5F0F8` | `#221C2C` | fundos secundários, hover |
| `--line` / `--line-strong` | `#E7DFEC` / `#D6C9DE` | `#2E2639` / `#3D3349` | bordas |
| `--ink` | `#191328` | `#F1ECF5` | texto principal |
| `--ink-2` | `#4A4458` | `#C3BACD` | texto secundário |
| `--ink-3` | `#7A7389` | `#8F869B` | texto terciário |
| `--plum` | `#8A3D86` | `#D7A2E4` | destaque, links, CTA |
| `--plum-ink` | `#6E2D6B` | `#E6BFEF` | texto sobre `--orchid-soft` |
| `--orchid` | `#CD9CDA` | `#CD9CDA` | acento gráfico, marca |
| `--orchid-soft` | `#F3E7F7` | `#2A1F33` | etiquetas, avisos |
| `--midnight` | `#191328` | `#191328` | blocos sempre escuros |
| `--on-dark` | `#FFFFFF` | `#191328` | texto sobre `--plum` |
| `--ok` | `#2F7D5B` | `#7CCFA6` | estado positivo |
| `--grad` | 100deg ameixa, `#B06AC0`, `#8C7BE0` | tons claros | só texto de destaque (`.grad`, linha 58) |
| `--mock-*` | 8 tokens | 8 tokens | prévias SVG (`app.js:16-48`) |

Observações:
- **Não existem tokens semânticos de erro nem de aviso.** Só `--ok`. O Hub precisa deles (seção 6 e `hub-ux.md`).
- `--on-dark` tem nome enganoso: no escuro vale `#191328` (texto escuro sobre plum claro). Funciona, mas confunde. Não renomear (afeta o portfólio).
- Há **cores fixas fora de token** (violam a regra "estilize por tokens"). Todas são intencionais (blocos sempre escuros), mas devem ser lidas como exceções: `#fff` em `.mark` (76) e `.cert` (111); `#E7C3F0` (112, 227); pontos coloridos de `.lights` (185); `#fff`/`#191328` em `.play span` (192); `#F1ECF5`/`#B9AEC6` em `.t-cert` (219-220); gradiente e cores de `.contact` (242-251); sintaxe de `pre.code` (280-281). Para o Hub, o ideal é reaproveitar `--midnight` e `--orchid` em vez de repetir hex.
- **Atributos `style=` inline** em `index.html:79, 142, 144, 164, 172, 173`. Não afetam o Hub, mas indicam que falta classe utilitária.

### 1.2 Tipografia
- Famílias (`styles.css:14-16`): `--f-display` Bricolage Grotesque, `--f-body` Figtree, `--f-mono` JetBrains Mono. Carregadas por Google Fonts (`index.html:26-28`).
- Pesos carregados: Bricolage 500/650/750, Figtree 400-700, JetBrains Mono 400/500. O CSS usa Bricolage 700 (116, 157, 168, 236), que não está na lista, e JetBrains Mono 600 (187, 296), também ausente. O navegador aproxima para o peso carregado mais próximo; o resultado visual pode divergir entre navegadores. **[requer aprovação]** se for ajustar a lista de pesos no portfólio. No Hub, declarar apenas pesos realmente usados.
- Não há escala tipográfica em tokens. Tamanhos estão espalhados (10, 10.5, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16.5, 17, 18.5 px...). Há textos abaixo de 12 px: `.cert` 10px (111), `.live` 10.5px (187), `.brand small` 11.5px (79), `.meta dt` 11.5px (269).
- Títulos usam `clamp()` (99, 125, 165, 265) e `text-wrap:balance` (55). Padrão bom, reaproveitável.
- Sem fonte self-hosted: dependência externa de `fonts.googleapis.com` (privacidade e funcionamento offline). Para o Hub, que processa arquivos do usuário, recomenda-se self-host. No portfólio: **[requer aprovação]**.

### 1.3 Forma, sombra e espaço
- Raios: `--r-lg:22px`, `--r-md:14px`, `--r-sm:10px` (13). Também valores soltos: 999px (pílulas), 28px (`.id-card`, 104), 32px (`.contact`, 242), 16px (`.frame`, 181), 18px (menu mobile, 89). `--r-sm` não é usado em nenhum seletor.
- Sombra única `--shadow` (10, 26, 37). Boa: um só nível de elevação.
- **Sem escala de espaçamento.** Valores de 6 a 96 px repetidos à mão (`section.block` 96px, linha 123; cartões 22-28px).
- Largura: `.wrap` 1160px (54), `body` com `padding-inline:20px` (51).

### 1.4 Breakpoints
Cinco pontos de quebra diferentes: 520 (299), 700 (127, 178, 292), 860 (88, 252), 900 (118, 211, 239, 283, 310), 960 (144). Sem padrão. Para o Hub, propor três (`hub-ux.md`, seção 7).

---

## 2. Componentes reutilizáveis

| Componente | Seletor (linha) | Reuso no Hub |
|---|---|---|
| Eyebrow (rótulo em pílula) | `.eyebrow` (59) | direto, cabeçalho de cada página |
| Chip | `.chip` (60), variante `.core` (225) | direto: nível, tipo de arquivo, status |
| Botões | `.btn`, `-dark`, `-accent`, `-ghost` (61-67) | direto; faltam `:hover` de cor, `:active`, estado `disabled` nativo (só `aria-disabled`, 67) |
| Botão de ícone | `.icon-btn` (85) | direto (40px, abaixo de 44px recomendado em toque) |
| Seletor segmentado | `.lang` (295-298) | base para alternar painéis e unidades |
| Nav pílula flutuante | `.nav`, `.nav-in`, `.links`, `.brand`, `.mark` (73-93) | direto como casca do Hub |
| Cabeçalho de seção | `.sec-head` (124-127) | direto |
| Cartão/ladrilho | `.tile` (215), `.proj` (161), `.lane-head` (156), `.r-facts li` (308) | quatro variações do mesmo cartão; consolidar em `.card` no Hub |
| Moldura de janela | `.frame`, `.frame-bar`, `.lights`, `.live` (181-192) | base ideal para o espaço de trabalho das ferramentas (barra com nome de arquivo em mono) |
| Bloco de código | `pre.code` (280-281) | direto para saída e exemplos |
| Aviso | `.draft` (282) | base do componente `.notice` |
| Citação lateral | `.permit` (312) | opcional |
| Índice lateral | `.index`, `.count` (131-153) | base do índice de cursos e recursos |
| Filtro | `.filter button[aria-pressed]` (141-143, `app.js:82-91`) | direto |
| Linha do tempo | `.timeline` (201-210) | base da grade curricular |
| Definição (`dl`) | `.meta` (268-272) | metadados de curso e ferramenta |
| Estatística | `.stat`, `.kpi`, `.nums` (113-117, 167-169, 234-237) | métricas |
| Galeria | `.gallery` (288-292) | capturas de tela |
| Bloco escuro de contato | `.contact`, `.c-list` (242-252) | base do cartão de apoio, com ressalva de foco (4.2) |
| Animação de entrada | `.reveal` (285) | desligada por reduced-motion |

**Não existem**: campos de formulário, textarea/editor, select, tabela de dados, abas, diálogo, tooltip, dropzone, barra de progresso, esqueleto de carregamento, estado vazio, alerta de erro, botão de copiar, breadcrumb, paginação, acordeão. O Hub precisa de todos (especificados em `hub-ux.md`).

---

## 3. Padrões de navegação

- **Casca**: pílula flutuante sticky (`.nav`, 73), com marca, 5 links, seletor EN/PT, botão de tema, menu e CTA "Let's talk" (`index.html:34-58`).
- **Itens**: 3 âncoras na mesma página (`#projetos`, `#trajetoria`, `#stack`), 1 página externa (`certificacoes.html`), 1 âncora de contato. Mistura âncora e página sem diferenciação visual.
- **Destaque de seção ativa**: `IntersectionObserver` (`app.js:144-149`) alterna a classe `.on` em `[data-nav]` e `#laneIndex a`. Só classe, **sem `aria-current`**.
- **Mobile** (`styles.css:88-93`): abaixo de 860px os links viram painel suspenso; o CTA some; `aria-expanded` e `aria-controls` presentes (`index.html:52`, `app.js:158`). O painel fecha no `hashchange` (`app.js:139`), mas não com Escape, clique fora, nem clicando de novo na mesma âncora (não dispara `hashchange`).
- **Índice do portfólio**: coluna sticky no desktop (131); faixa horizontal rolável sticky abaixo de 960px (144-153), `top:78px`.
- **Rotas**: SPA mínima por hash, `#/case/slug` (`route()`, `app.js:130-141`). A home é ocultada com `hidden` e o case é renderizado em `<main id="case">`.
- **Idioma**: padrão `en`, escolha em `localStorage["ld-lang"]`, `?lang=pt` força PT (`i18n.js:92-97`). Atualiza `lang` do `<html>` (`i18n.js:108`) e título/descrição (121-127). Existe gancho `window.PT_EXTRA` (88) que o Hub pode usar sem alterar o arquivo.
- **Tema**: lido de `localStorage["ld-theme"]` **no fim do script** (`app.js:153-155`), depois da renderização.

---

## 4. Acessibilidade observável no código

### 4.1 Pontos fortes
- Foco visível global: `:focus-visible{outline:2px solid var(--plum);outline-offset:3px}` (`styles.css:53`).
- `prefers-reduced-motion` tratado globalmente: desliga `scroll-behavior`, transições e animações (47). A única animação (`.reveal`, 285) só move em Y e é neutralizada.
- `lang` do `<html>` dinâmico (`en` / `pt-BR`), `lang="en"` inicial (`index.html:2`).
- Landmarks: `<header>`, `<nav aria-label>`, `<main>`, `<footer>` (`index.html:34, 40, 61, 215`).
- Grupo de idioma com `role="group"` e `aria-pressed` (`index.html:48`); filtro com `aria-pressed` (`app.js:82`).
- `aria-label` traduzido via `data-ia` (`index.html:36, 40, 49, 52`; `i18n.js:114-120`).
- Imagens com `alt` traduzível (`index.html:76, 120, 125`), prévias SVG com `role="img"` e `aria-label` (`app.js:18`).
- Fallback de imagem quebrada (`app.js:161-165`).
- Sobreposição "play" aparece também em `:focus-visible` (`styles.css:191`).
- `[hidden]` forçado com `!important` (50).

### 4.2 Contraste calculado (WCAG AA: 4.5:1 texto normal, 3:1 texto grande e componentes de interface)

Tema claro:

| Par | Razão | Veredito | Onde |
|---|---|---|---|
| `--ink` / `--bg` | 17.32 | passa | texto geral |
| `--ink` / `--surface` | 18.01 | passa | cartões |
| `--ink-2` / `--bg` | 8.93 | passa | lede, descrições |
| `--ink-2` / `--surface-2` | 8.27 | passa | hover de links |
| `--plum` / `--bg` | 6.53 | passa | `.t-org` (209), links |
| `--plum` / `--surface` | 6.79 | passa | `.domain` (165) |
| `--plum` / `--orchid-soft` | 5.69 | passa | `.eyebrow` (59), `.count` (139) |
| `--plum-ink` / `--orchid-soft` | 7.82 | passa | `.chip.core` (225), `.draft` (282) |
| `--on-dark` (#FFF) / `--plum` | 6.79 | passa | `.btn-accent` (64) |
| `--bg` / `--ink` | 17.32 | passa | `.btn-dark` (63), `.links a.on` (83) |
| `--ok` / `--bg` | 4.81 | passa por pouco | `.status` (102) |
| **`--ink-3` / `--surface`** | **4.52** | passa por 0.02 | `.stat span` (117), `.tile .sub` (217), `.edu span` (232), `.kpi span` (169), `.lang button` (296) |
| **`--ink-3` / `--bg`** | **4.35** | **falha** | `.index h4` (132), `.index .note` (140), `.t-when` (207), `footer` (254) |
| **`--ink-3` / `--surface-2`** | **4.03** | **falha** | `.nums span` (237) |
| `--ink-3` / `--orchid-soft` | 3.79 | falha (não usado hoje; evitar no Hub) | |
| `--orchid` / branco | 2.25 | só decorativo | `.mark::after`, `.index a::before` |
| `--line-strong` / `--bg` | 1.52 | bordas decorativas; **insuficiente** para identificar campos de formulário (exige 3:1) | `.btn-ghost` (65), `.lang` |
| `--grad` (texto) / `--bg` | 3.35 a 6.53 conforme o trecho | passa só como texto grande (3:1) | `.grad` em h1/h2 (58, 99, 125) |
| `--plum` / `--midnight` (anel de foco no bloco escuro) | **2.65** | **falha** o mínimo 3:1 (WCAG 1.4.11) | links de `.c-list` (248), `.back` no `.t-cert` (`index.html:173`), `.play` |

Tema escuro:

| Par | Razão | Veredito |
|---|---|---|
| `--ink` / `--bg` | 16.42 | passa |
| `--plum` / `--bg` | 9.27 | passa |
| `--plum` / `--surface` | 8.62 | passa |
| `--plum` / `--orchid-soft` | 7.59 | passa |
| `--on-dark` (#191328) / `--plum` | 8.74 | passa |
| `--ink-3` / `--bg` | 5.50 | passa |
| `--ink-3` / `--surface` | 5.12 | passa |
| `--ink-3` / `--surface-2` | 4.76 | passa |

Blocos sempre escuros (`--midnight`, L = 0.0083):

| Par | Razão | Veredito |
|---|---|---|
| `#C9BFD4` / midnight (`.contact p`, 246) | 10.19 | passa |
| `#B9AEC6` / midnight (`.c-list span`, 251; `.t-cert .sub`, 220) | 8.52 | passa |
| `#9C92A8` / midnight (comentário em `pre.code .c`, 281) | 6.09 | passa |
| `--orchid` / midnight | 8.02 | passa (candidato a anel de foco em blocos escuros) |

Conclusão: o tema escuro é saudável. O **tema claro tem um token fraco, `--ink-3`**, usado em 15+ textos pequenos (12 a 13.5 px). Falha em `--bg` e `--surface-2` e passa com folga mínima em `--surface`. Para o Hub, propõe-se redefinir `--ink-3` apenas dentro do escopo `.hub` (valor sugerido `#6E677D`: 5.18 sobre `--bg`, 4.80 sobre `--surface-2`), sem tocar o portfólio.

### 4.3 Lacunas de semântica e ARIA
1. **Sem link "pular para o conteúdo"** (`index.html:32-34`). Obrigatório no Hub.
2. **`aria-current` ausente** nos itens ativos (`app.js:146-147`). Só classe `.on`.
3. **Troca de rota sem gestão de foco** (`route()`, `app.js:130-141`): ao abrir um case, só rola ao topo (`window.scrollTo`). O foco permanece no link anterior (agora oculto), `document.title` não muda e não há anúncio. Leitor de tela não percebe a mudança de "página". Padrão a adotar no Hub: mover o foco para o `h1` (`tabindex="-1"`) e atualizar o título.
4. **Hierarquia de títulos**: o índice usa `<h4>` (`index.html:102`) logo depois de `<h2>`, pulando `h3`; os títulos de trilha (`.lane-head h3`) vêm depois no DOM.
5. **`<div id="toolFilter" aria-label=...>` sem `role`** (`index.html:105`): `aria-label` em `div` sem papel é ignorado por leitores. Falta `role="group"`.
6. **Três links para o mesmo destino por cartão**: "Ver case", a moldura (`frame-view`) e, quando há relatório, "Abrir relatório" (`app.js:64-70`). Excesso de paradas de Tab. No Hub, um link principal por cartão.
7. **Botão de tema sem estado** (`index.html:49`): `aria-label` fixo e sem `aria-pressed`.
8. **Menu mobile**: sem Escape nem fechar ao clicar fora (ver seção 3).
9. **Texto de aviso fixo em português**: `app.js:104` ("Rascunho. ...") e "Portfólio Xperiun" (`index.html:217`) não passam pela i18n.
10. **`title` duplicando `alt`** em `.cert` (`index.html:79`); redundante.
11. **Sem `forced-colors`, `prefers-contrast` nem `@media print`** em `styles.css`. `.grad` com `color:transparent` (58) some em modo de alto contraste do Windows se o fundo for descartado.
12. **Tema aplicado tarde**: a preferência salva só é lida ao fim de `app.js` (155), com a página já renderizada. Possível flash de tema errado. `<meta name="theme-color">` fixo em `#191328` (`index.html:24`).
13. **Alvos de toque**: `.icon-btn` 40×40 (85), `.lang button` ≈ 29px de altura (296), `.filter button` ≈ 27px (142), `.btn` ≈ 40px (61). Acima de 24px (WCAG 2.2, 2.5.8), abaixo de 44px recomendado para toque. Para ferramentas no celular, usar 44px nos controles novos.

### 4.4 Reduced motion
Cobertura boa e simples (`styles.css:47`). Ressalvas: o seletor `*` não alcança pseudo-elementos; hoje nenhum pseudo-elemento anima, então não há falha. `app.js:132` e `137` usam `behavior:"instant"`, coerente. Regra para o Hub: carregadores e esqueletos devem ter versão estática sob `prefers-reduced-motion`.

---

## 5. Pontos fortes a preservar
- Hierarquia editorial clara: eyebrow, título com palavra em gradiente, lede, ações.
- Densidade baixa, bordas finas, uma sombra, raios generosos: dá a identidade "editorial claro".
- Roxo usado com economia (links, CTA, marcadores), neutros em tinta.
- Mono para metadados (datas, arquivos, rótulos técnicos): extensível a nomes de tabela, coluna e arquivo nas ferramentas.
- Tema escuro bem calibrado.
- Bilinguismo estrutural (`data-i`, `data-ia`, `PT_EXTRA`).

---

## 6. Lacunas para o Hub e achados no portfólio

### 6.1 O que o Hub precisa e o portfólio não tem (sem aprovação: vive em arquivos novos)
Tokens de erro e aviso; escopo `.hub` com `--ink-3` corrigido; foco em blocos escuros; controles de formulário com borda de 3:1; tabela de dados; abas; dropzone; editor; carregamento, vazio e erro; botão de copiar; aviso de status; link de pular; escala de espaçamento; breakpoints consolidados.

### 6.2 Achados no portfólio existente (todos **[requer aprovação do Lucas]**; nenhum foi aplicado)

| # | Achado | Severidade | Correção mínima sugerida |
|---|---|---|---|
| A1 | `--ink-3` falha AA em `--bg` e `--surface-2` (4.35 e 4.03), 15+ usos | Alta (A11y) | escurecer `--ink-3` claro para ≈ `#6E677D`; mudança de cor sutil, mesma família |
| A2 | Anel de foco `--plum` sobre `--midnight` no claro: 2.65:1 | Média | em `.contact` e `.t-cert`, `outline-color: var(--orchid)` (8.02:1) |
| A3 | Sem link "pular para o conteúdo" | Média | adicionar link visível no foco |
| A4 | Troca de rota sem foco/título | Média | focar o `h1` do case e atualizar `document.title` |
| A5 | `aria-current` ausente; `role="group"` ausente no filtro | Baixa | atributos, sem efeito visual |
| A6 | Tema lido tarde | Baixa | ler `ld-theme` num script curto no `<head>` |
| A7 | Textos fixos em PT fora da i18n (`app.js:104`, `index.html:217`) | Baixa | chaves `data-i` |
| A8 | Pesos de fonte usados e não carregados (Bricolage 700, Mono 600) | Baixa | alinhar pesos |
| A9 | Cinco breakpoints | Baixa | só documentar; não refatorar |

Nenhum destes muda a identidade visual. Mesmo assim, por regra, **só serão feitos com sua aprovação explícita**. A1 é o único com efeito visível (cinza lilás um pouco mais escuro).
