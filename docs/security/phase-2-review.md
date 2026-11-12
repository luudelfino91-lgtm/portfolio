# Revisão de segurança e privacidade da casca do Hub (T-209, Fase 2)

Branch `feat/phase-2-hub-shell`. Data: 2026-11-12. Revisor: security-auditor. Nenhum código alterado.

## Resultado
Sem achados críticos, altos ou médios. 1 baixo, 3 informativos. SR-01 a SR-06, SR-13, SR-15, SR-16, SR-17 e ST-08 (estático), ST-09 (parcial), ST-11, ST-12, ST-13, ST-16 passam por análise estática. Nada foi executado em navegador.

## VERIFICADO (grep, leitura, sha256sum, wc)
- XSS (SR-01/03): `grep` em `hub/` por `innerHTML|insertAdjacentHTML|outerHTML|document.write|eval(|new Function|setTimeout("|on*=|javascript:|style=|<iframe|<img|<form|_blank|<script>` inline: zero ocorrências.
- `i18n.js` aplica `data-i` com `textContent` e `data-ia` com `setAttribute` (apenas `aria-label`, valores do dicionário). O dicionário é literal no próprio arquivo (SR-02). `Hub.t` usa `split/join`, sem HTML.
- `?lang=` e `ld-lang` só são aceitos se forem exatamente `pt` ou `en`. `ld-theme` só é aceito se for `light` ou `dark`. Todos os acessos ao `localStorage` estão em `try/catch`. Não há leitura de `location.hash`.
- Chaves `data-i` e `data-ia` das 5 páginas: todas existem em PT e EN (verificado por script de grep).
- CSP: as 5 páginas têm a mesma `<meta http-equiv="Content-Security-Policy">` na linha 4, antes de `charset` e em posição inicial no `<head>`: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'`. Sem `unsafe-inline` nem `unsafe-eval`.
- Terceiros (SR-06/PRV-01): `hub/**/*.html`, `hub.css`, `*.js` não têm nenhuma URL `http(s)://`, nem `preconnect`, nem `@import`. `url()` do CSS só aponta para os 4 woff2 locais. `assets/css/styles.css` (do portfólio, usado pelo Hub) não tem `@import`, `googleapis`, `gstatic` nem `url(`. Não há `target=_blank` nem links de saída.
- Armazenamento (SR-13): o código grava só `ld-lang` e `ld-theme`. Não há `cookie`, `fetch`, `XMLHttpRequest` nem `sendBeacon`.
- Segredos (SR-15/ST-16): varredura de padrões (AKIA, ghp_, sk-, chave privada, api_key, password, token) em `hub/` e no diff contra `main`: zero correspondências no código. A única ocorrência está em texto de docs que descreve os padrões buscados.
- Fontes: 4 woff2, 104.500 bytes no total (limite de 120 KB: passa). Os tamanhos e nomes coincidem com `hub/assets/fonts/README.md`. `LICENSE.md` traz OFL 1.1 e os três pacotes 5.3.0.
- Peso (T-209), em bytes brutos sem compressão: cada página, somando HTML, `hub.css`, 3 JS e `styles.css`, fica entre 48,4 e 49,6 KB (limite de 150 KB: passa com folga). Bytes transferidos não foram medidos.
- Caminhos: todos os `href`, `src` e `url()` são relativos (`./`, `../`). Não há caminho absoluto, então subpasta `/portfolio/` e `file://` funcionam em teoria.

### SHA-256 dos woff2 (para o futuro manifest)
```
a97804dc9fbe5fc972a08018c5eda4dab7ef2346f64c57e61419d05e6de4ea1c  bricolage-grotesque-latin-wght-normal.woff2
4ba7d3d096695818fe0686be4f1e82c6b05134e18a22260336130335027462dd  figtree-latin-wght-normal.woff2
14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb  jetbrains-mono-latin-400-normal.woff2
cb182feeed4d798ff6961d3c79f7026279448fca0676438aaecb21f3fc39553a  jetbrains-mono-latin-500-normal.woff2
```
Esses hashes não estão registrados em nenhum arquivo do repositório. Recomenda-se incluí-los no README das fontes.

## Texto de `privacidade/` versus código
- Cookies, `localStorage` (duas chaves) e "sem requisições a outros domínios": confere com o código (análise estática).
- "O portfólio ainda carrega as fontes pelo Google Fonts": confere. `index.html` do portfólio tem `preconnect` e `stylesheet` para `fonts.googleapis.com` (linhas 26 a 28). Não foi verificado `certificacoes.html`.
- "As ferramentas ainda não estão disponíveis" e "compromisso de projeto verificado por testes": são afirmações provisórias (PRV-10). Não há código de ferramenta para auditar.
- Divergência de redação: a nota da home diz "não fazem requisições a terceiros" sem ressalva. O link "Portfolio" leva a uma página que contata o Google. Isso é coerente só porque a nota fala das páginas do Hub. A frase é aceitável, mas depende de a página de privacidade estar visível (ela está linkada).

## Registro de riscos novos
| ID | Sev. | Risco | Recomendação |
|---|---|---|---|
| SEC-P2-01 | Baixa | O `ld-lang` e o `ld-theme` são compartilhados com o portfólio. O portfólio (`app.js`) pode ter validação diferente. A validação do portfólio não foi auditada nesta tarefa. | Auditar a leitura de `ld-lang` e `ld-theme` em `assets/js/app.js` na revisão do portfólio. |
| SEC-P2-02 | Info | CSP por `<meta>` não suporta `frame-ancestors`, `report-uri` nem `sandbox`. Clickjacking não é mitigável no GitHub Pages. O Hub não tem ação sensível, então o impacto é baixo. | Aceitar e documentar (já previsto na seção 7 de `security-review.md`). |
| SEC-P2-03 | Info | `style-src 'self'` e `script-src 'self'` quebram se alguém adicionar script ou estilo inline no futuro (ferramentas). | Testes ST-09 e ST-16 em cada PR da Fase 3. Para workers e WASM, revisar a CSP (`worker-src`, `wasm-unsafe-eval`) com aprovação do Lucas. |
| SEC-P2-04 | Info | `img-src data:` permite imagens `data:`. Risco baixo. | Remover `data:` se nenhuma página usar. |

## Não aplicável nesta fase
SR-07 a SR-12, SR-14 (SQL, CSV, Python, vendor e manifest); ST-01 a ST-07, ST-14, ST-15, ST-17, ST-18. SR-16 (iframe) passa por ausência. PIX não existe no Hub.

## NÃO verificado
- Execução em navegador: aba Network (ST-08), Console com CSP (ST-09), `localStorage` com valores inválidos (ST-12), `?lang=<html>` (ST-13). Conclusões são por leitura de código.
- Teste real em `/portfolio/` e `file://`. Em `file://`, `script-src 'self'` e `font-src 'self'` podem se comportar de forma diferente entre navegadores.
- Procedência dos woff2: não foi refeito `npm pack` (sem acesso de rede aprovado), então a identidade com os pacotes 5.3.0 é só declarada no README.
- Bytes transferidos reais (compressão do GitHub Pages) e `certificacoes.html`.
- RNF-03 segue como suposição até o Lucas confirmar (PRV-06 e PRV-08 provisórios).
