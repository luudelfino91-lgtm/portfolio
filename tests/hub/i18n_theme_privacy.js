// i18n (HUB-10..16,50), tema (HUB-20/21, HUB-14), privacidade/CSP (PRV-06..08,13).
const L = require('./lib'); const fs = require('fs');
(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();
  const url = p => `${L.BASE}/${p}`;
  // --- i18n: chaves cruas / EN residual em PT
  const bad = []; const resid = [];
  for (const p of L.PAGES) {
    const c = await L.ctx(br, { lang: 'pt', theme: 'light' }); const pg = await c.newPage(); await pg.goto(url(p));
    const r = await pg.evaluate(() => {
      const txt = document.body.innerText; const keys = txt.match(/\bhub\.[a-z0-9.]+/g) || [];
      const attrs = [...document.querySelectorAll('*')].flatMap(e => ['aria-label', 'title', 'alt'].map(a => e.getAttribute(a)).filter(Boolean)).filter(v => /^hub\./.test(v));
      // chaves usadas no HTML mas ausentes do dicionario PT: compara texto atual com texto EN
      return { keys, attrs, title: document.title, desc: document.querySelector('meta[name=description]').content, text: txt };
    });
    if (r.keys.length || r.attrs.length || /^hub\./.test(r.title)) bad.push(p + JSON.stringify(r.keys.concat(r.attrs)));
    resid.push(p + ': title=' + r.title);
    // texto EN remanescente: palavras EN comuns
    const en = (r.text.match(/\b(the|your|and|with|Skip to content|Tools|Privacy|Back to|Under construction|is not available|Home)\b/g) || []);
    if (en.length) resid.push('  possiveis termos EN em PT: ' + [...new Set(en)].join(', '));
    await c.close();
  }
  L.rec('HUB-10 nenhuma chave crua em PT (texto, aria, title)', bad.length === 0, bad.length ? bad.join('; ') : 'zero chaves hub.* visiveis em 5 paginas\n' + resid.join('\n'));

  // data-i / data-ia versus dicionario (HUB-15 inverso: verificador de chaves)
  const keysByPage = {}; const html = L.PAGES.map(p => fs.readFileSync(`${L.REPO}/${p}index.html`, 'utf8')).join('\n');
  const used = new Set([...html.matchAll(/data-i="([^"]+)"/g)].map(m => m[1]));
  [...html.matchAll(/data-ia="([^"]+)"/g)].forEach(m => m[1].split(',').forEach(x => used.add(x.slice(x.indexOf(':') + 1))));
  const { spawnSync } = require('child_process'); const CHK = `${L.REPO}/docs/testing/check-i18n-keys.js`;
  const chk = (...args) => spawnSync('node', [CHK, ...args], { encoding: 'utf8' });
  const real = chk(); const dictEval = require(CHK).loadDict(`${L.REPO}/hub/assets/js/i18n.js`);
  L.rec('HUB-15/T-205 verificador CLI (docs/testing/check-i18n-keys.js) no Hub real sai com 0', real.status === 0, 'exit=' + real.status + ' ' + real.stdout.replace(/\n/g, ' | '));
  const fxd = `${L.REPO}/docs/testing/fixtures-i18n`;
  const fxBad = chk('--i18n', `${fxd}/i18n-missing-pt.js`, '--html', `${fxd}/page.html`); const fxOk = chk('--i18n', `${fxd}/i18n-ok.js`, '--html', `${fxd}/page.html`);
  L.rec('HUB-15 verificador CLI sai != 0 com chave PT removida (fixture em arquivo) e 0 no controle', fxBad.status === 1 && fxOk.status === 0, `fixture sem PT: exit=${fxBad.status} (${fxBad.stdout.split('\n')[1]}); controle: exit=${fxOk.status}`);
  // HUB-10 (asserção real): em PT, todo [data-i] tem exatamente o texto do dicionario PT; todo data-ia o atributo PT
  { const c = await L.ctx(br, { lang: 'pt', theme: 'light' }); const diffs = []; let n = 0;
    for (const p of L.PAGES) { const pg = await c.newPage(); await pg.goto(url(p));
      const rows = await pg.evaluate(() => [...document.querySelectorAll('[data-i]')].map(e => ['t', e.getAttribute('data-i'), e.textContent]).concat(
        [...document.querySelectorAll('[data-ia]')].flatMap(e => e.getAttribute('data-ia').split(',').map(x => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1), null]).map(([a, k]) => ['a', k, e.getAttribute(a)]))));
      for (const [, k, v] of rows) { n++; if (v !== dictEval.pt[k]) diffs.push(`${p} ${k}: obtido=${JSON.stringify(v)} esperado=${JSON.stringify(dictEval.pt[k])}`); }
      await pg.close(); }
    L.rec('HUB-10 em PT cada [data-i] e [data-ia] tem exatamente o texto do dicionario PT', n > 0 && diffs.length === 0, `${n} elementos/atributos comparados em 5 paginas; divergencias=${JSON.stringify(diffs)}`); await c.close(); }

  // persistencia, invalido, ?lang, aria-label/title
  { const c = await L.ctx(br, { seed: false }); const pg = await c.newPage(); await pg.goto(url('hub/'));
    const before = await pg.evaluate(() => ({ lang: document.documentElement.lang, aria: document.querySelector('.brand').getAttribute('aria-label'), nav: document.getElementById('links').getAttribute('aria-label'), grp: document.querySelector('.lang').getAttribute('aria-label'), th: document.getElementById('themeBtn').getAttribute('aria-label'), menu: document.getElementById('menuBtn').getAttribute('aria-label'), desc: document.querySelector('meta[name=description]').content, title: document.title }));
    await pg.click('[data-lang=pt]'); const stored = await pg.evaluate(() => localStorage.getItem('ld-lang'));
    const after = await pg.evaluate(() => ({ lang: document.documentElement.lang, aria: document.querySelector('.brand').getAttribute('aria-label'), nav: document.getElementById('links').getAttribute('aria-label'), grp: document.querySelector('.lang').getAttribute('aria-label'), th: document.getElementById('themeBtn').getAttribute('aria-label'), menu: document.getElementById('menuBtn').getAttribute('aria-label'), desc: document.querySelector('meta[name=description]').content, title: document.title, pressed: [...document.querySelectorAll('[data-lang]')].map(b => b.getAttribute('aria-pressed')) }));
    await pg.reload(); const persisted = await pg.evaluate(() => document.documentElement.lang);
    L.rec('HUB-11 persistencia ld-lang (PT apos recarregar)', stored === 'pt' && persisted === 'pt-BR', `ld-lang=${stored}; apos reload lang=${persisted}`);
    const changed = ['aria', 'nav', 'grp', 'desc'].filter(k => before[k] === after[k]);
    L.rec('HUB-10 troca de idioma atualiza aria-label/meta description (excecoes: menu="Menu" e titulo da home sao iguais nos dois idiomas)', changed.length === 0 && after.pressed.join() === 'false,true', JSON.stringify({ before, after, nao_mudaram: changed }));
    // aria-label do botao de tema
    L.rec('HUB-10 aria-label do botao de tema muda com idioma', before.th !== after.th, `${before.th} -> ${after.th}`);
    await c.close(); }
  for (const [name, val, query, exp] of [['valor invalido ignorado (ld-lang=fr)', 'fr', '', 'en'], ['valor XSS em ld-lang ignorado', '<script>alert(1)</script>', '', 'en'], ['?lang=pt vence ld-lang=en', 'en', '?lang=pt', 'pt-BR'], ['?lang=<script> ignorado', 'pt', '?lang=%3Cscript%3Ealert(1)%3C/script%3E', 'pt-BR'], ['?lang=invalido cai em ld-lang', 'pt', '?lang=zz', 'pt-BR']]) {
    const c = await L.ctx(br, { seed: false }); await c.addInitScript(v => localStorage.setItem('ld-lang', v), val);
    const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); let dialog = false; pg.on('dialog', d => { dialog = true; d.dismiss(); });
    await pg.goto(url('hub/' + query)); const lang = await pg.evaluate(() => document.documentElement.lang);
    const stored = await pg.evaluate(() => localStorage.getItem('ld-lang'));
    L.rec(`HUB-13/50 ${name}`, lang === exp && !dialog && log.pageerrors.length === 0, `lang=${lang} (esperado ${exp}); ld-lang armazenado=${stored}; dialog=${dialog}`); await c.close(); }
  { const c = await L.ctx(br, { seed: false }); const pg = await c.newPage(); await pg.goto(url('hub/?lang=pt#<img src=x onerror=alert(1)>'));
    const n = await pg.evaluate(() => document.querySelectorAll('img[src=x]').length); await c.close();
    L.na('HUB-50 hash: injecao via location.hash', 'Nao aplicavel na Fase 2: a casca nao le location.hash (nenhuma rota/estado por hash). Observacao: sem injecao, img[src=x] no DOM=' + n + ' (informativo, nao conta como PASS). Reavaliar quando houver estado por hash.'); }

  // --- tema
  for (const [scheme, exp] of [['dark', 'dark'], ['light', 'light']]) {
    const c = await L.ctx(br, { seed: false, scheme }); const pg = await c.newPage();
    // registra data-theme no primeiro requestAnimationFrame (antes do primeiro paint ser observavel), no DOMContentLoaded e em todo atributo mudado
    await pg.addInitScript(() => { const T = () => document.documentElement.getAttribute('data-theme'); window.__t = { raf: 'n/a', dcl: 'n/a', muts: [] };
      requestAnimationFrame(() => { window.__t.raf = T(); }); document.addEventListener('DOMContentLoaded', () => { window.__t.dcl = T(); });
      new MutationObserver(() => window.__t.muts.push(T())).observe(document.documentElement, { attributes: true }); });
    await pg.goto(url('hub/')); const r = await pg.evaluate(() => ({ final: document.documentElement.dataset.theme, ...window.__t }));
    const onlyExp = r.muts.every(v => v === exp);
    L.rec(`HUB-20 prefers-color-scheme=${scheme}: data-theme correto no 1o requestAnimationFrame e no DOMContentLoaded, sem flash de tema oposto`, r.raf === exp && r.dcl === exp && r.final === exp && onlyExp, JSON.stringify(r)); await c.close(); }
  { const c = await L.ctx(br, { seed: false, scheme: 'light' }); const pg = await c.newPage(); await pg.goto(url('hub/'));
    await pg.click('#themeBtn'); const s1 = await pg.evaluate(() => [localStorage.getItem('ld-theme'), document.documentElement.dataset.theme, themeBtn.getAttribute('aria-pressed')]);
    await pg.reload(); const s2 = await pg.evaluate(() => document.documentElement.dataset.theme);
    await pg.goto(url('hub/privacidade/')); const s3 = await pg.evaluate(() => document.documentElement.dataset.theme);
    await pg.goto(url('index.html')); const s4 = await pg.evaluate(() => document.documentElement.getAttribute('data-theme'));
    L.rec('HUB-21 ld-theme persiste (recarga, outra pagina do Hub, portfolio)', s1[0] === 'dark' && s2 === 'dark' && s3 === 'dark' && s4 === 'dark', `clique: ${s1}; reload=${s2}; privacidade=${s3}; portfolio=${s4}`); await c.close(); }
  for (const bad of ['blue', '', 'DARK', '<script>']) {
    const c = await L.ctx(br, { seed: false, scheme: 'light' }); await c.addInitScript(v => localStorage.setItem('ld-theme', v), bad);
    const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); await pg.goto(url('hub/'));
    const t = await pg.evaluate(() => document.documentElement.dataset.theme); L.rec(`HUB-21 ld-theme invalido ignorado (${JSON.stringify(bad)})`, t === 'light' && !log.pageerrors.length, `data-theme=${t}`); await c.close(); }
  { // storage bloqueado: Storage.prototype lanca SecurityError
    const c = await L.ctx(br, { seed: false }); await c.addInitScript(() => { const thr = () => { throw new DOMException('denied', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get: thr }); });
    const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); await pg.goto(url('hub/'));
    await pg.click('#themeBtn'); await pg.click('[data-lang=pt]');
    const r = await pg.evaluate(() => ({ t: document.documentElement.dataset.theme, l: document.documentElement.lang }));
    L.rec('HUB-14 localStorage bloqueado nao quebra (tema e idioma ainda alternam na sessao)', !log.pageerrors.length && !log.consoleErrors.length && r.t === 'dark' && r.l === 'pt-BR', JSON.stringify({ r, pageerrors: log.pageerrors, consoleErrors: log.consoleErrors })); await c.close(); }
  { // flag --disable-... contexto com storage negado de verdade: ver tambem pagina com cookies bloqueados nao e aplicavel
  }

  // --- privacidade
  { const c = await L.ctx(br, { lang: 'pt', theme: 'dark' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    const ck = []; const keys = [];
    for (const p of L.PAGES) { await pg.goto(url(p), { waitUntil: 'networkidle' }); await pg.click('#themeBtn'); await pg.click('[data-lang=en]'); await pg.reload();
      keys.push(...await pg.evaluate(() => Object.keys(localStorage)), ...await pg.evaluate(() => Object.keys(sessionStorage).map(k => 'SESSION:' + k))); }
    const cookies = await c.cookies(); const jsck = await pg.evaluate(() => document.cookie);
    const idb = await pg.evaluate(async () => indexedDB.databases ? (await indexedDB.databases()).length : 'n/a');
    const caches = await pg.evaluate(async () => (await caches.keys()).length);
    L.rec('PRV-06 nenhum cookie', cookies.length === 0 && jsck === '', `context.cookies()=${JSON.stringify(cookies)}; document.cookie="${jsck}"`);
    L.rec('PRV-07 localStorage so ld-lang/ld-theme; sem sessionStorage/IndexedDB/Cache Storage', [...new Set(keys)].every(k => ['ld-lang', 'ld-theme'].includes(k)) && idb === 0 && caches === 0, `chaves=${JSON.stringify([...new Set(keys)])}; indexedDB=${idb}; caches=${caches}`);
    const google = log.requests.filter(u => /googleapis|gstatic|google/.test(u)); const nonGet = log.requests.length; 
    L.rec('PRV-01 zero requisicao googleapis/gstatic', google.length === 0, `requisicoes totais=${log.requests.length}; google=${JSON.stringify(google)}; externas=${JSON.stringify(log.requests.filter(u => !u.startsWith(L.BASE)))}`);
    // PRV-08 busca em HTML + metodos
    const found = []; for (const p of L.PAGES) { const h = fs.readFileSync(`${L.REPO}/${p}index.html`, 'utf8'); for (const t of ['<iframe', 'googletagmanager', 'gtag\\(', 'fbq\\(', 'src="[^"]*analytics', '\\bpix\\b', 'apoie', 'support']) if (new RegExp(t, 'i').test(h)) found.push(`${p}:${t}`); }
    L.rec('PRV-08/HUB-02(parcial) sem iframe/analytics/pixel; sem PIX/apoie/support no HTML', found.length === 0, 'achados=' + JSON.stringify(found));
    await c.close(); }
  // CSP
  { const out = []; let allHave = true;
    for (const p of L.PAGES) { const h = fs.readFileSync(`${L.REPO}/${p}index.html`, 'utf8'); const m = h.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/); if (!m) { allHave = false; out.push(p + ': SEM CSP'); } else out.push(p + ': ' + m[1]); }
    L.rec('PRV-13 CSP meta presente em todas as paginas', allHave, [...new Set(out.map(s => s.split(': ').slice(1).join(': ')))].join(' || '));
    const c = await L.ctx(br, {}); const pg = await c.newPage(); const csp = []; pg.on('console', m => csp.push(m.text()));
    // pagina de sonda servida pela rota, com a CSP REAL lida de hub/index.html (sem tocar no produto)
    const real = fs.readFileSync(`${L.REPO}/hub/index.html`, 'utf8').match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)[0];
    await pg.route('**/__probe__.html', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${real}</head><body>
<script>window.__inl=1</script><img src="x" onerror="window.__inl2=1"><img src="https://example.com/a.png">
<script src="/tests/hub/csp-probe.js"></script></body></html>` }));
    await pg.goto(L.BASE + '/__probe__.html'); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => ({ inlineScript: window.__inl ? 'EXECUTOU' : 'bloqueado', inlineHandler: window.__inl2 ? 'EXECUTOU' : 'bloqueado', ...window.__probe }));
    L.rec('PRV-13 CSP bloqueia script inline, onerror inline, eval/Function e imagem externa', r.inlineScript === 'bloqueado' && r.inlineHandler === 'bloqueado' && r.eval === 'bloqueado' && r.fn === 'bloqueado' && csp.some(t => /example\.com/.test(t)), JSON.stringify(r) + ' console: ' + csp.filter(t => /Content Security/.test(t)).map(t => t.slice(0, 120)).join(' | '));
    await c.close(); }
  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})();
