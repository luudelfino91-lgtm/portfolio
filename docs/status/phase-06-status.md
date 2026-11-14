# Status da Fase 6: apoio voluntário por PIX (T-601 a T-603)

**Data:** 2026-11-14. **Branch:** `feat/phase-6-pix` (sem commit, sem PR). **Autor:** frontend-developer. **Estado:** **Implementado, testado só no Chrome (Playwright, Linux headless). Sem QA (qa-engineer) nem revisão independente.**

## 1. O que existe
- `hub/apoie/index.html` (PT/EN, tema, CSP idêntica à das outras páginas, sem script inline), `hub/assets/css/apoie.css`, `hub/assets/js/apoie.js`.
- Dados: `hub/assets/data/pix.json` (chave aleatória `4f5fccbd-...-cf55fc77f0f4`, BR Code estático sem valor, finalidade intercâmbio). Aprovados pelo Lucas na D5.
- QR: `hub/assets/img/pix-qr.svg` (8,6 KB), gerado por `docs/tools/gen_pix_qr.py` com o pacote Python `qrcode` 8.2 (só para gerar o arquivo; nada de QR no navegador). QR versão 8, 49x49 módulos, correção de erros **M**, zona de silêncio de 4 módulos, preto sobre branco fixo nos dois temas. O gerador valida CRC16 e TLV antes de escrever e é determinístico (`--check`).
- Página: frase do convite (D5), QR, chave, código copia e cola, botão "Copiar código PIX", nota de transparência (voluntário, sem contrapartida, QR e código estáticos sem valor, nome do favorecido, nada coletado, pagamento fora do site, aviso de que PIX só funciona com conta brasileira).
- Entrada: um link de texto "Apoie/Support" no **rodapé** das 7 páginas do Hub (home, ferramentas, CSV, SQL, Python, privacidade e a própria página). Nada no cabeçalho, nem cartão, pop-up, contador ou meta. `index.html` e `assets/` do portfólio não foram tocados.
- `hub/privacidade/`: nova seção "Apoio voluntário (PIX)" PT/EN.
- Textos: 25 chaves novas (`hub.nav.support`, `hub.title.pix`, `hub.desc.pix`, `hub.pix.*`, `hub.priv.s6.*`) em EN e PT.

## 2. Transparência pública (registrar)
O campo 59 do BR Code ("63.574.817 LUCAS EDUARDO") contém um número de CNPJ e **fica público** no repositório, no código exibido e na nota da página (o Lucas foi informado na D5). O número aparece também no texto da nota de transparência.

## 3. Frase do convite
PT (aprovada, literal): "Gostou do conteúdo? Se te ajudou e você se sentir tocado, me ajude com o meu intercâmbio com qualquer quantia, por favor."
EN (tradução do frontend-developer, **a confirmar pelo Lucas**): "Enjoyed the content? If it helped you and you feel moved to, please help me with my study-abroad exchange with any amount."

## 4. Evidência (Chrome)
Verificado por mim: CRC16-CCITT recalculado (19C2) e TLV (00, 26{00,01}, 52=0000, 53=986, 58=BR, 59, 60, 62{05}, 63; sem campo 54); chave do campo 26 = chave registrada.
**QR lido por:** OpenCV 5.0.0 `QRCodeDetector` e OpenCV `wechat_qrcode` (ZXing-like do contrib), sobre capturas de tela do `<img>` renderizado pelo Chrome (claro 1280, escuro 360, escuro 1280; antes também em 200/320/480 px sobre fundo escuro). Texto decodificado **idêntico** ao payload em todos os casos. O teste `tests/hub/pix.js` repete isso (PIX-06; N/A se não houver `opencv-python`) e confere o SVG contra o gerador (PIX-05; N/A sem `qrcode`, via `QR_LIB`).
`tests/hub/pix.js`: **24 PASS, 0 FAIL, 0 N/A** (payload exibido = JSON = literal aprovado; CRC16; TLV; SVG; gerador; QR decodificado; zero requisição externa, só GET, em `/` e `/portfolio/`; sem scripts de terceiros/inline e CSP igual; Copiar com permissão de clipboard copia exatamente o payload; 3 fallbacks com mensagem em `role="status"`/`aria-live="polite"` e código selecionado, PT e EN; sem `alert`; troca de idioma traduz o aviso; frase exata PT/EN; link só no rodapé; axe 4.14.0 zero violações de qualquer impacto em 16 combinações idioma x tema x 360/1280 x estado; sem overflow, QR >= 160 px, botão >= 44 px). Mutação de um caractere da chave no HTML faz o PIX-01 e os testes de cópia falharem.

## 5. Suíte completa
`bash tests/hub/run-all.sh` (portas 9081 a 9085, `HUB_LOG_DIR=/tmp/pix-logs`, `QR_LIB=/tmp/pyqr`), 22 min:
datasets 41/0/0; reg 15 PASS, 1 FAIL (ver abaixo); shell 6/0/0; i18n/tema/privacidade 26/0/1 N/A (HUB-50, preexistente); a11y 18/0/0; budget_file 5/0/0; csv 39/0/0; sql 114/0/0; sample 62/0/0; exercises 63/0/0; scenarios 39/0/0; nouploads 10/0/0; **pix 24/0/0**; python 113/0/0; check-i18n-keys exit 0.
**REG-01 falhou só porque existe `qrcode-8.2-py3-none-any.whl` não rastreado na raiz da worktree** (arquivo do tech-lead, fora do escopo e fora de `.gitignore`; não é meu e não será commitado). Movido para fora, `reg.js` dá 16/16 PASS. Remover o arquivo (ou ignorá-lo) antes do commit.

## 6. Mudanças em testes existentes (justificativa)
- `tests/hub/lib.js`: `hub/apoie/` entra em `PAGES` (shell, a11y, i18n, budget, CSP, nouploads passam a cobri-la: 6 páginas em vez de 5; as contagens nos rótulos derivam de `PAGES.length`).
- `tests/hub/i18n_theme_privacy.js` PRV-08: antes proibia "pix/apoie/support" em todo o HTML do Hub. Agora permite só na página `apoie/`, na seção PIX da privacidade e no link único de rodapé (e exige esse link em cada página). Continua proibindo iframe/analytics/pixel.
- `tests/hub/run-all.sh`: `pix` na lista. Nenhum teste de cartões foi alterado (HUB-02 segue com 3 cartões; Apoie não é cartão).

## 7. NÃO verificado
- Leitura do QR e do código por **apps de banco reais** (verificação humana do Lucas, G6): nome e CNPJ exibidos pelo banco, aceitação do BR Code.
- Firefox e Safari/iOS; **clipboard em Safari/iOS** (o fallback por seleção existe mas não foi exercitado lá). Chrome móvel real.
- Teste de copiar usa permissão concedida pelo Playwright e stubs para os fallbacks, não um usuário real.
- Termos do GitHub Pages sobre contribuição (R2); revisão de privacidade formal (T-603) e QA/independent-reviewer.
- O QR foi decodificado por OpenCV, não por leitores de celular.

## 8. Pendências para decisão
Confirmar a tradução EN da frase; confirmar que exibir o nome do favorecido com o CNPJ na nota da página é aceitável (a alternativa seria omitir o nome na nota, mantendo-o no código copia e cola, que já o contém).
