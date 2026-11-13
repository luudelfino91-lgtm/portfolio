# Hub (casca da Fase 2)

Páginas estáticas, sem build (D1). URLs sempre relativas; cada página escolhe o `<link>` do `styles.css` do portfólio pela profundidade (`../`, `../../`, `../../../`).

## API visual herdada de `assets/css/styles.css` (rodar a regressão visual do Hub se mudar)
Variáveis: `--bg --surface --surface-2 --line --line-strong --ink --ink-2 --ink-3 --plum --plum-ink --orchid-soft --midnight --orchid --r-lg --r-md --shadow --f-display --f-body --f-mono`.
Classes: `.wrap .nav .nav-in .brand .mark .links .nav-actions .icon-btn .menu-btn .lang .btn .btn-dark .btn-ghost .eyebrow .chip .grad .lede .arrow footer`.

## Próprio do Hub
- `assets/css/hub.css`: fontes locais, tokens novos no escopo `.hub` (`--err --warn --hub-ink-3 --focus-dark --tap`), cartões, aviso, estado vazio, migalhas, texto corrido.
- `assets/js/theme.js` (no `<head>`, sem defer), `assets/js/i18n.js` (dicionários PT/EN; `data-i`/`data-ia`; inglês também no HTML), `assets/js/nav.js` (menu móvel).
- `assets/fonts/`: ver `README.md` e `LICENSE.md` da pasta.
- Ao mudar um texto: alterar o HTML (inglês) e as duas entradas em `i18n.js`.
- Limitação: via `file://` os links para pastas (`ferramentas/`) abrem a listagem da pasta, não o `index.html`; use servidor estático.

## Convenções
- `aria-current`: `"page"` = página atual; `"true"` = ancestral da página atual (ex.: "Ferramentas" em `ferramentas/csv/` e `ferramentas/sql/`).
- Armazenamento: a Fase 2 não cria chaves `hub-*` em `localStorage`; só `ld-lang` e `ld-theme`.
- `Hub.t` e `Hub.onLang` são API futura, ainda sem uso na Fase 2; mantidas de propósito.
- `i18n.js` e `nav.js` carregam no `<head>` com `defer` (nesta ordem), para o texto já sair traduzido na primeira pintura.
