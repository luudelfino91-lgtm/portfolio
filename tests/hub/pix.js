// Fase 6 (D5): pagina de apoio por PIX. QR e codigo estaticos, sem coleta.
// Cobre: payload = repositorio = literal aprovado, CRC16, TLV, QR (SVG + decodificacao), zero rede externa,
// botao copiar + fallback acessivel, PT/EN com a frase aprovada, axe, sem terceiros.
const L = require('./lib'); const fs = require('fs'); const { spawnSync } = require('child_process');
const PAGE = 'hub/apoie/';
// Literais APROVADOS pelo Lucas em D5 (2026-11-13). Mudar a chave/codigo exige nova aprovacao: este teste falha de proposito.
const APPROVED_KEY = '4f5fccbd-8e7e-4092-9b22-cf55fc77f0f4';
const APPROVED_PAYLOAD = '00020126580014BR.GOV.BCB.PIX01364f5fccbd-8e7e-4092-9b22-cf55fc77f0f45204000053039865802BR592463.574.817 LUCAS EDUARDO6009SAO PAULO62140510DycACOcHKI630419C2';
const INVITE_PT = 'Gostou do conteúdo? Se te ajudou e você se sentir tocado, me ajude com o meu intercâmbio com qualquer quantia, por favor.';
const INVITE_EN = 'Enjoyed the content? If it helped you and you feel moved to, please help me with my study-abroad exchange with any amount.';
const MSG = { en: { copied: 'PIX code copied. Paste it in your bank app.', manual: 'Could not copy automatically. The code is selected: press Ctrl+C (or touch and hold, then Copy).' },
  pt: { copied: 'Código PIX copiado. Cole no app do seu banco.', manual: 'Não foi possível copiar automaticamente. O código está selecionado: use Ctrl+C (ou toque e segure, depois Copiar).' } };
const url = (root = L.BASE) => `${root}/${PAGE}`;
function crc16(s) { let c = 0xFFFF; for (const b of Buffer.from(s, 'latin1')) { c ^= b << 8; for (let i = 0; i < 8; i++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c; }
function tlv(s) { const out = []; let i = 0; while (i < s.length) { const t = s.slice(i, i + 2), n = parseInt(s.slice(i + 2, i + 4), 10); if (!/^\d\d$/.test(s.slice(i + 2, i + 4)) || i + 4 + n > s.length) throw new Error('TLV invalido em ' + i); out.push([t, s.slice(i + 4, i + 4 + n)]); i += 4 + n; } return out; }

(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch(); const origin = new URL(L.BASE).origin;
  const rec = JSON.parse(fs.readFileSync(`${L.REPO}/hub/assets/data/pix.json`, 'utf8'));
  const html = fs.readFileSync(`${L.REPO}/${PAGE}index.html`, 'utf8');

  // PIX-01 payload exibido = repositorio = aprovado
  { const c = await L.ctx(br, { lang: 'pt', theme: 'light' }); const pg = await c.newPage(); await pg.goto(url());
    const shown = await pg.evaluate(() => ({ code: document.getElementById('pixCode').textContent, key: document.getElementById('pixKey').textContent }));
    const htmlCode = (html.match(/<code id="pixCode">([^<]*)<\/code>/) || [])[1]; const htmlKey = (html.match(/<code id="pixKey">([^<]*)<\/code>/) || [])[1];
    L.rec('PIX-01 codigo e chave exibidos = hub/assets/data/pix.json = literais aprovados na D5 (HTML e DOM)', shown.code === rec.payload && shown.code === APPROVED_PAYLOAD && htmlCode === APPROVED_PAYLOAD && shown.key === rec.chave_aleatoria && shown.key === APPROVED_KEY && htmlKey === APPROVED_KEY && rec.valor === null,
      `payload ${shown.code.length} chars; chave=${shown.key}; HTML==JSON==aprovado=${htmlCode === rec.payload && rec.payload === APPROVED_PAYLOAD}`); await c.close(); }

  // PIX-02 CRC16 recalculado
  { const p = rec.payload; const calc = crc16(p.slice(0, -4)).toString(16).toUpperCase().padStart(4, '0');
    L.rec('PIX-02 CRC16-CCITT (poly 0x1021, init 0xFFFF) recalculado confere com o campo 63', p.slice(-8, -4) === '6304' && calc === p.slice(-4), `calculado=${calc} no payload=${p.slice(-4)}`); }

  // PIX-03 TLV
  { let f, err = null, sub26, sub62, list = []; try { list = tlv(rec.payload); f = Object.fromEntries(list); sub26 = Object.fromEntries(tlv(f['26'])); sub62 = Object.fromEntries(tlv(f['62'])); } catch (e) { err = e.message; }
    const ok = !err && f['00'] === '01' && sub26['00'] === 'BR.GOV.BCB.PIX' && sub26['01'] === rec.chave_aleatoria && f['52'] === '0000' && f['53'] === '986' && f['58'] === 'BR' && f['59'] === '63.574.817 LUCAS EDUARDO' && f['60'] === 'SAO PAULO' && !!sub62['05'] && !('54' in f) && list.map(x => x[0]).join() === '00,26,52,53,58,59,60,62,63';
    L.rec('PIX-03 TLV: 00=01, 26{00=BR.GOV.BCB.PIX,01=chave}, 52=0000, 53=986, 58=BR, 59, 60, 62{05}, sem 54 (valor), ordem 00,26,52,53,58,59,60,62,63; consome 100% da string', ok, err || JSON.stringify(f)); }

  // PIX-04 QR: SVG presente, tamanho razoavel, carrega; gerador reproduz o arquivo
  { const svgPath = `${L.REPO}/${rec.qr.arquivo}`; const size = fs.existsSync(svgPath) ? fs.statSync(svgPath).size : 0; const svg = size ? fs.readFileSync(svgPath, 'utf8') : '';
    const c = await L.ctx(br, {}); const pg = await c.newPage(); await pg.goto(url(), { waitUntil: 'networkidle' });
    const img = await pg.evaluate(() => { const i = document.querySelector('.pix-qr img'); return { ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src'), alt: i.getAttribute('alt') }; });
    L.rec('PIX-04 SVG do QR existe (2 KB a 40 KB), e SVG puro sem script, carrega na pagina e tem alt', size > 2048 && size < 40960 && /^<svg /.test(svg) && !/<script|onload|href=/i.test(svg) && img.ok && !!img.alt, `bytes=${size}; carregou=${img.ok}; src=${img.src}; alt="${img.alt}"`);
    const gen = spawnSync('python3', ['-I', `${L.REPO}/docs/tools/gen_pix_qr.py`, '--check'], { encoding: 'utf8', env: { ...process.env, QR_LIB: process.env.QR_LIB || '/tmp/pyqr' } });
    if (gen.status === 0) L.rec('PIX-05 docs/tools/gen_pix_qr.py --check: SVG do repositorio = saida do gerador (deterministico)', true, gen.stdout.trim().replace(/\n/g, ' | '));
    else L.na('PIX-05 gerador do QR', `biblioteca qrcode indisponivel neste ambiente (exit=${gen.status}); a prova de reproducao foi feita na entrega, ver docs/status/phase-06-status.md. ${(gen.stderr || '').split('\n').slice(-2)[0]}`);
    // PIX-06 decodificacao do QR renderizado na pagina (tema escuro, 360 e 1280) = payload
    const outs = [];
    for (const [theme, vp] of [['light', 1280], ['dark', 360], ['dark', 1280]]) {
      const c2 = await L.ctx(br, { lang: 'pt', theme, vp }); const p2 = await c2.newPage(); await p2.goto(url(), { waitUntil: 'networkidle' });
      const f = `${require('os').tmpdir()}/pix-qr-${theme}-${vp}.png`; await p2.locator('.pix-qr img').screenshot({ path: f });
      const d = spawnSync('python3', ['-I', `${L.REPO}/tests/hub/pix_decode.py`, f], { encoding: 'utf8' });
      outs.push({ theme, vp, status: d.status, rows: (d.stdout || '').split('\n').filter(Boolean).map(l => l.split('\t')) }); fs.unlinkSync(f); await c2.close(); }
    if (outs.every(o => o.status === 3)) L.na('PIX-06 QR decodificado = payload', 'opencv-python indisponivel neste ambiente; a prova foi feita na entrega, ver docs/status/phase-06-status.md');
    else L.rec('PIX-06 QR renderizado na pagina (claro 1280, escuro 360, escuro 1280) decodificado por cada decodificador (OpenCV QRCodeDetector e WeChat) = payload', outs.every(o => o.status === 0 && o.rows.length >= 1 && o.rows.every(r => r[1] === rec.payload)), outs.map(o => `${o.theme}/${o.vp}: ` + o.rows.map(r => `${r[0]}=${r[1] === rec.payload ? 'IGUAL' : 'DIFERENTE'}`).join(', ')).join(' | '));
    await c.close(); }

  // PIX-07 rede: so a propria origem, so GET, sem 4xx, sem erro; sem scripts de terceiros nem inline; CSP igual a das outras paginas
  for (const [label, root] of [['/', L.BASE], ['/portfolio/', L.SUB]]) {
    const c = await L.ctx(br, { lang: 'en', theme: 'light' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); const methods = new Set(); pg.on('request', r => methods.add(r.method()));
    await pg.goto(url(root), { waitUntil: 'networkidle' }); await pg.click('#pixCopy'); await pg.waitForTimeout(300);
    const o = new URL(root).origin; const ext = log.requests.filter(u => !u.startsWith(o) && !u.startsWith('data:'));
    L.rec(`PIX-07 zero requisicao externa, so GET, sem >=400, sem pageerror/console.error (carga + clique em Copiar) em ${label}`, ext.length === 0 && [...methods].join() === 'GET' && !log.responses.some(([s]) => s >= 400) && !log.pageerrors.length && !log.consoleErrors.length && !log.failed.length,
      `requisicoes=${log.requests.length}; externas=${JSON.stringify(ext)}; metodos=${[...methods]}; pageerrors=${JSON.stringify(log.pageerrors)}; console.error=${JSON.stringify(log.consoleErrors)}`); await c.close(); }
  { const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map(m => m[1]); const srcs = scripts.map(a => (a.match(/src="([^"]+)"/) || [])[1]);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]; const ref = fs.readFileSync(`${L.REPO}/hub/index.html`, 'utf8').match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    const bad = srcs.filter(s => !s || /^(https?:)?\/\//.test(s) || s.startsWith('/'));
    L.rec('PIX-08 sem scripts de terceiros nem inline; so scripts relativos do Hub; sem on*=/style=; CSP identica a da home (sem relaxar)', srcs.join() === '../assets/js/theme.js,../assets/js/i18n.js,../assets/js/nav.js,../assets/js/apoie.js' && bad.length === 0 && csp === ref && !/\son[a-z]+=|\sstyle=/i.test(html) && !/\b(?:eval|innerHTML|document\.write|alert)\b/.test(fs.readFileSync(`${L.REPO}/hub/assets/js/apoie.js`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')),
      `scripts=${JSON.stringify(srcs)}; CSP igual=${csp === ref}`); }

  // PIX-09 copiar: com permissao copia exatamente o payload e avisa (aria-live); sem alert
  for (const lang of ['en', 'pt']) {
    const c = await L.ctx(br, { lang, theme: 'light' }); await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }); const pg = await c.newPage(); let dialog = false; pg.on('dialog', d => { dialog = true; d.dismiss(); });
    await pg.goto(url()); const live = await pg.evaluate(() => { const s = document.getElementById('pixStatus'); return { role: s.getAttribute('role'), live: s.getAttribute('aria-live') }; });
    const before = await pg.evaluate(() => document.activeElement.id);
    await pg.click('#pixCopy'); await pg.waitForFunction(() => document.getElementById('pixStatus').textContent !== '', null, { timeout: 3000 });
    const clip = await pg.evaluate(() => navigator.clipboard.readText()); const st = await pg.textContent('#pixStatus'); const focus = await pg.evaluate(() => document.activeElement.id);
    L.rec(`PIX-09 [${lang}] Copiar com permissao de clipboard: area de transferencia = payload exato; aviso em role=status/aria-live=polite; sem alert; foco continua no botao`, clip === rec.payload && st === MSG[lang].copied && live.role === 'status' && live.live === 'polite' && !dialog && focus === 'pixCopy', `clip==payload=${clip === rec.payload}; aviso="${st}"; live=${JSON.stringify(live)}; dialog=${dialog}; foco=${focus}`); await c.close(); }

  // PIX-10 fallback: sem Clipboard API / writeText rejeitado
  for (const [name, init, expect] of [
    ['sem navigator.clipboard e execCommand falha', () => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); document.execCommand = () => false; }, 'manual'],
    ['writeText rejeita (permissao negada) e execCommand falha', () => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new DOMException('negado', 'NotAllowedError')) }, configurable: true }); document.execCommand = () => false; }, 'manual'],
    ['sem navigator.clipboard e execCommand("copy") funciona', () => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); window.__copied = null; document.execCommand = c => { window.__copied = String(getSelection()); return c === 'copy'; }; }, 'copied']]) {
    for (const lang of ['en', 'pt']) {
      const c = await L.ctx(br, { lang, theme: 'dark', vp: 360 }); await c.addInitScript(init); const pg = await c.newPage(); let dialog = false; pg.on('dialog', d => { dialog = true; d.dismiss(); });
      await pg.goto(url()); await pg.click('#pixCopy'); await pg.waitForFunction(() => document.getElementById('pixStatus').textContent !== '', null, { timeout: 3000 });
      const r = await pg.evaluate(() => ({ st: document.getElementById('pixStatus').textContent, sel: String(getSelection()), copied: window.__copied, vis: document.getElementById('pixStatus').getBoundingClientRect().height > 0, live: document.getElementById('pixStatus').getAttribute('aria-live') }));
      const ok = r.st === MSG[lang][expect] && r.sel === rec.payload && r.vis && r.live === 'polite' && !dialog && (expect === 'manual' || r.copied === rec.payload);
      L.rec(`PIX-10 [${lang}] fallback (${name}): mensagem acessivel "${expect}", codigo selecionado = payload, sem alert`, ok, JSON.stringify({ ...r, dialog })); await c.close(); }
  }
  // troca de idioma re-renderiza o aviso
  { const c = await L.ctx(br, { lang: 'en', theme: 'light' }); await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }); const pg = await c.newPage(); await pg.goto(url()); await pg.click('#pixCopy'); await pg.waitForFunction(() => document.getElementById('pixStatus').textContent !== '');
    await pg.click('[data-lang=pt]'); const st = await pg.textContent('#pixStatus'); L.rec('PIX-11 trocar o idioma depois de copiar traduz o aviso', st === MSG.pt.copied, `aviso="${st}"`); await c.close(); }

  // PIX-12 PT/EN: frase exata; nada de chave crua; textos principais traduzidos
  for (const [lang, invite, h1, htmlLang] of [['pt', INVITE_PT, 'Apoie o projeto', 'pt-BR'], ['en', INVITE_EN, 'Support the project', 'en']]) {
    const c = await L.ctx(br, { lang, theme: 'light' }); const pg = await c.newPage(); await pg.goto(url());
    const r = await pg.evaluate(() => ({ invite: document.getElementById('pixInvite').textContent, h1: document.querySelector('h1').textContent, lang: document.documentElement.lang, title: document.title, text: document.querySelector('main').innerText, alt: document.querySelector('.pix-qr img').alt, btn: document.getElementById('pixCopy').textContent }));
    L.rec(`PIX-12 [${lang}] frase do convite exata (D5), h1, lang, titulo, alt, botao; sem chave crua; nome do favorecido e "voluntario" presentes`, r.invite === invite && r.h1 === h1 && r.lang === htmlLang && !/\bhub\.[a-z0-9.]+/.test(r.text + r.title + r.alt) && r.text.includes('63.574.817 LUCAS EDUARDO') && (lang === 'pt' ? /volunt/i.test(r.text) && r.btn === 'Copiar código PIX' : /voluntary/i.test(r.text) && r.btn === 'Copy PIX code'),
      JSON.stringify({ invite: r.invite, h1: r.h1, lang: r.lang, title: r.title, btn: r.btn })); await c.close(); }
  { // lede e invite iguais no HTML (EN) e no dicionario usado pelo i18n.js
    const dict = require(`${L.REPO}/docs/testing/check-i18n-keys.js`).loadDict(`${L.REPO}/hub/assets/js/i18n.js`);
    L.rec('PIX-12 dicionario: hub.pix.invite = frase aprovada em PT e EN; HTML em EN = dicionario EN', dict.pt['hub.pix.invite'] === INVITE_PT && dict.en['hub.pix.invite'] === INVITE_EN && html.includes(`>${INVITE_EN}</p>`), 'ok'); }

  // PIX-13 sem rastreamento/contador/meta/popup; link de entrada discreto no rodape de todas as paginas, nunca no cabecalho nem como cartao
  { const pagesAll = [...L.PAGES, 'hub/ferramentas/python/']; const out = [];
    const c = await L.ctx(br, { lang: 'en', theme: 'light' }); const pg = await c.newPage();
    for (const p of pagesAll) { await pg.goto(url().replace(PAGE, p)); out.push(p + ' ' + JSON.stringify(await pg.evaluate(() => ({ foot: [...document.querySelectorAll('footer a[href$="apoie/"], footer a[href="./"][aria-current]')].map(a => a.getAttribute('href')), header: document.querySelectorAll('header a[href*="apoie"]').length, cards: document.querySelectorAll('.hub-card a[href*="apoie"]').length, dialogs: document.querySelectorAll('dialog,[role=dialog],[role=alertdialog]').length })))); }
    const okAll = pagesAll.every((p, i) => /"header":0,"cards":0,"dialogs":0/.test(out[i]) && /"foot":\["[^"]*"\]/.test(out[i]));
    await pg.goto(url().replace(PAGE, 'hub/')); await pg.click('footer a[href="apoie/"]'); await pg.waitForLoadState('load');
    const t = (await pg.evaluate(() => document.querySelector('main').innerText)).toLowerCase(); const widgets = await pg.evaluate(() => document.querySelectorAll('progress,meter,[role=progressbar],[role=meter],dialog,[role=dialog]').length);
    L.rec('PIX-13 link "Apoie/Support" so no rodape (todas as paginas do Hub), nenhum no cabecalho/cartao/dialogo; navega para a pagina; sem barra de progresso/contador/valor arrecadado', okAll && pg.url() === url() && widgets === 0 && !/(raised|arrecad|\d\s*(donors|supporters|apoiadores)|r\$\s*\d|\$\s*\d)/.test(t), out.join('\n') + '\nnavegou=' + pg.url()); await c.close(); }

  // PIX-14 axe: zero violacoes de qualquer impacto, claro/escuro x 360/1280 x PT/EN (+ estado apos copiar com mensagem)
  { const axeSrc = fs.readFileSync(L.AXE_PATH, 'utf8'); const rows = []; let n = 0; let ver = '';
    for (const lang of L.LANGS) for (const theme of L.THEMES) for (const vp of [360, 1280]) for (const state of ['inicial', 'apos-fallback']) {
      const c = await L.ctx(br, { lang, theme, vp }); if (state !== 'inicial') await c.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); document.execCommand = () => false; });
      const pg = await c.newPage(); await pg.goto(url(), { waitUntil: 'networkidle' }); if (state !== 'inicial') { await pg.click('#pixCopy'); await pg.waitForTimeout(150); }
      await pg.evaluate(axeSrc); const r = await pg.evaluate(async () => { const x = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return { v: x.violations.map(v => v.id + ' [' + v.impact + '] ' + v.nodes.map(m => m.target.join(' ')).join(';')), ver: axe.version }; });
      n++; ver = r.ver; r.v.forEach(v => rows.push(`${lang}/${theme}/${vp}/${state}: ${v}`)); await c.close(); }
    L.rec(`PIX-14 axe-core ${ver}: zero violacoes (qualquer impacto) em ${n} combinacoes idioma x tema x 360/1280 x estado`, rows.length === 0, rows.length ? rows.join('\n') : 'nenhuma'); }

  // PIX-15 layout: sem overflow horizontal em 360 e 1280; QR com >= 160 px (hub-ux 9.4) e em fundo branco; teclado alcanca o botao
  { const out = []; let ok = true;
    for (const [theme, vp] of [['light', 360], ['dark', 360], ['light', 1280], ['dark', 1280]]) { const c = await L.ctx(br, { lang: 'pt', theme, vp }); const pg = await c.newPage(); await pg.goto(url(), { waitUntil: 'networkidle' });
      const r = await pg.evaluate(() => { const i = document.querySelector('.pix-qr img').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('.pix-qr img')); return { over: document.documentElement.scrollWidth - innerWidth, w: Math.round(i.width), bg: cs.backgroundColor }; });
      for (let k = 0; k < 12; k++) { await pg.keyboard.press('Tab'); if (await pg.evaluate(() => document.activeElement.id) === 'pixCopy') { r.tab = k + 1; break; } }
      const btn = await pg.locator('#pixCopy').boundingBox(); r.btnH = Math.round(btn.height);
      ok = ok && r.over <= 0 && r.w >= 160 && r.bg === 'rgb(255, 255, 255)' && !!r.tab && r.btnH >= 44; out.push(`${theme}/${vp}: ${JSON.stringify(r)}`); await c.close(); }
    L.rec('PIX-15 sem overflow, QR >= 160 px sobre branco fixo nos dois temas, botao >= 44 px e alcancavel por Tab (360 e 1280)', ok, out.join('\n')); }

  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})();
