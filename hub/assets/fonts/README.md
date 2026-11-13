# Fontes locais do Hub (D3a)

Fontes servidas pelo próprio Hub; nenhuma página do Hub carrega `fonts.googleapis.com` nem `fonts.gstatic.com`. Subconjunto `latin` apenas (cobre PT e EN). Licença: SIL OFL 1.1 (ver `LICENSE.md`).

| Arquivo | Família (nome usado por `styles.css`) | Pacote npm (versão) | Pesos |
|---|---|---|---|
| `bricolage-grotesque-latin-wght-normal.woff2` | Bricolage Grotesque | `@fontsource-variable/bricolage-grotesque` 5.3.0 | variável 200-800 (usados: 500, 650, 750) |
| `figtree-latin-wght-normal.woff2` | Figtree | `@fontsource-variable/figtree` 5.3.0 | variável 300-900 (usados: 400-700) |
| `jetbrains-mono-latin-400-normal.woff2` | JetBrains Mono | `@fontsource/jetbrains-mono` 5.3.0 | 400 |
| `jetbrains-mono-latin-500-normal.woff2` | JetBrains Mono | `@fontsource/jetbrains-mono` 5.3.0 | 500 |

Procedência: `npm pack <pacote>` no registro npm, arquivos copiados de `package/files/` sem modificação.

Observação: o arquivo variável do Bricolage tem só o eixo de peso (o portfólio pede também o eixo `opsz` 12..96 ao Google; a versão com `opsz` pesa 77 KB e estouraria o orçamento de 120 KB). Diferença visual possível em títulos grandes; revisar na regressão visual.

Atualizar: refazer o `npm pack` com a versão nova, trocar os arquivos e atualizar esta tabela.

## Integridade (sha256)

```
a97804dc9fbe5fc972a08018c5eda4dab7ef2346f64c57e61419d05e6de4ea1c  bricolage-grotesque-latin-wght-normal.woff2
4ba7d3d096695818fe0686be4f1e82c6b05134e18a22260336130335027462dd  figtree-latin-wght-normal.woff2
14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb  jetbrains-mono-latin-400-normal.woff2
cb182feeed4d798ff6961d3c79f7026279448fca0676438aaecb21f3fc39553a  jetbrains-mono-latin-500-normal.woff2
```

Ressalva: a procedência (`@fontsource` 5.3.0) foi declarada pelo desenvolvedor e não foi refeita por terceiro independente. Os hashes só provam que os arquivos não mudaram desde o registro.
