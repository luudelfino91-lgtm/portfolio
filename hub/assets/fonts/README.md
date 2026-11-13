# Fontes locais do Hub (D3a)

Fontes servidas pelo próprio Hub; nenhuma página do Hub carrega `fonts.googleapis.com` nem `fonts.gstatic.com`. Subconjunto `latin` apenas (cobre PT e EN). Licença: SIL OFL 1.1 (ver `LICENSE.md`).

| Arquivo | Família (nome usado por `styles.css`) | Pacote npm (versão) | Pesos |
|---|---|---|---|
| `poppins-latin-400-normal.woff2` | Poppins | `@fontsource/poppins` 5.3.0 | 400 |
| `poppins-latin-500-normal.woff2` | Poppins | `@fontsource/poppins` 5.3.0 | 500 |
| `poppins-latin-600-normal.woff2` | Poppins | `@fontsource/poppins` 5.3.0 | 600 |
| `poppins-latin-700-normal.woff2` | Poppins | `@fontsource/poppins` 5.3.0 | 700 |
| `jetbrains-mono-latin-400-normal.woff2` | JetBrains Mono | `@fontsource/jetbrains-mono` 5.3.0 | 400 |
| `jetbrains-mono-latin-500-normal.woff2` | JetBrains Mono | `@fontsource/jetbrains-mono` 5.3.0 | 500 |

Procedência: `npm pack <pacote>` no registro npm, arquivos copiados de `package/files/` sem modificação.

Atualizar: refazer o `npm pack` com a versão nova, trocar os arquivos e atualizar esta tabela.

## Integridade (sha256)

```
14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb  jetbrains-mono-latin-400-normal.woff2
cb182feeed4d798ff6961d3c79f7026279448fca0676438aaecb21f3fc39553a  jetbrains-mono-latin-500-normal.woff2
7d93459d86585bfcdbb7e0376056226adb25821ee54b96236fe2123e9560929f  poppins-latin-400-normal.woff2
cd36de204aca2d5fa263a731f7c20009b5e3d754ba1f1e03c33e93a48f3e7446  poppins-latin-500-normal.woff2
f4e80d9dfd374d02989b87a27b5ed4cb78fbb177c27f1478e9a8b0afb7513149  poppins-latin-600-normal.woff2
9338e65fc077355c7a87ae0d64cc101e23b9bf8ad78ae65f0f319c857311b526  poppins-latin-700-normal.woff2
```

Ressalva: a procedência (`@fontsource` 5.3.0) foi declarada pelo desenvolvedor e não foi refeita por terceiro independente. Os hashes só provam que os arquivos não mudaram desde o registro.
