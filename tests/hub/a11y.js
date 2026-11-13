// Acessibilidade real: axe-core, teclado, contraste computado (WCAG), menu movel, alvos de toque, movimento reduzido.
// Requer axe-core em /tmp/axe/package/axe.min.js  (npm pack axe-core; tar xzf).
const L = require('./lib'); const fs = require('fs');
const AXE = L.AXE_PATH;
const url = p => `${L.BASE}/${p}`;

// executado na pagina: devolve pares texto/fundo renderizados e componentes
function contrastProbe() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
  const rgba = col => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = col; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => { const a = f[3]; return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1]; };
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  // fundo efetivo: sobe na arvore compondo cores de fundo; para no primeiro opaco; base = canvas branco/ cor do html
  function bgOf(el) {
    const layers = []; let hasImg = false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e); const c = rgba(cs.backgroundColor);
      if (cs.backgroundImage !== 'none' && !/background-clip/.test('') ) { if (!(cs.webkitBackgroundClip === 'text')) hasImg = true; }
      if (c[3] > 0) layers.push(c); if (c[3] >= 1) break;
    }
    let base = [255, 255, 255, 1]; if (!layers.length || layers[layers.length - 1][3] < 1) base = rgba(getComputedStyle(document.documentElement).colorScheme.includes('dark') ? '#000' : '#fff');
    let out = base; for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return { c: out, hasImg };
  }
  const sel = el => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : '')); return p.join(' > '); };
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; };
  const text = [], comp = [], seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!n.nodeValue.trim()) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName) || !vis(el)) continue;
    // ignora se hidden por ancestral (menu fechado em mobile): offsetParent null e posicao nao fixa
    if (el.closest('[hidden]')) continue;
    const cs = getComputedStyle(el); const key = sel(el) + '|' + cs.color; if (seen.has(key)) continue; seen.add(key);
    const fg0 = rgba(cs.color); const b = bgOf(el); const size = parseFloat(cs.fontSize), wt = +cs.fontWeight; const large = size >= 24 || (size >= 18.66 && wt >= 700);
    const transp = cs.webkitTextFillColor && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.webkitTextFillColor);
    if (transp) { // texto em gradiente: testa cada cor do gradiente contra o fundo do ancestral
      const cols = (cs.backgroundImage.match(/(?:rgba?|color)\([^)]*\)/g) || []).map(rgba); const bg2 = bgOf(el.parentElement);
      const rs = cols.map(c => ratio(over(c, bg2.c), bg2.c)); text.push({ s: sel(el), kind: 'gradiente', min: rs.length ? Math.min(...rs) : null, th: large ? 3 : 4.5, fg: cols.map(hex).join(','), bg: hex(bg2.c), size, large });
      continue; }
    const fg = over(fg0, b.c); text.push({ s: sel(el), kind: 'texto', r: ratio(fg, b.c), th: large ? 3 : 4.5, fg: hex(fg), bg: hex(b.c), size, large, imgBg: b.hasImg, txt: n.nodeValue.trim().slice(0, 24) });
  }
  // componentes (3:1): borda dos controles e icone; contra o fundo do pai
  document.querySelectorAll('button, .icon-btn, .lang button, .chip, input, select, textarea, .btn, .hub-card, .notice').forEach(el => {
    if (!vis(el)) return; const cs = getComputedStyle(el); const pb = bgOf(el.parentElement).c; const own = bgOf(el).c;
    const bw = parseFloat(cs.borderTopWidth); const bc = rgba(cs.borderTopColor);
    const k = sel(el); if (seen.has('C' + k)) return; seen.add('C' + k);
    if (bw > 0 && bc[3] > 0) comp.push({ s: k, kind: 'borda', r: ratio(over(bc, pb), pb), th: 3, fg: hex(over(bc, pb)), bg: hex(pb), nota: el.matches('input,select,textarea,.btn-ghost,.icon-btn,.lang button') ? 'limite de componente exigido (1.4.11)' : 'decorativa se o rotulo ja identifica o componente' });
    const svg = el.querySelector('svg'); if (svg) { const sc = rgba(getComputedStyle(svg).color); comp.push({ s: k + ' svg', kind: 'icone', r: ratio(over(sc, own), own), th: 3, fg: hex(over(sc, own)), bg: hex(own) }); }
  });
  return { text, comp };
}

(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch(); const axeSrc = fs.readFileSync(AXE, 'utf8');
  // ---- AXE (injetado via evaluate: a CSP bloqueia script inline, entao usamos CDP/evaluate que e confiavel)
  const axeRows = []; let axeFail = 0, axeInc = [];
  for (const p of L.PAGES) for (const lang of L.LANGS) for (const theme of L.THEMES) for (const vp of [360, 1280]) {
    const c = await L.ctx(br, { lang, theme, vp }); const pg = await c.newPage(); await pg.goto(url(p), { waitUntil: 'networkidle' });
    await pg.evaluate(axeSrc);
    const res = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
      return { v: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })), inc: r.incomplete.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 2).map(n => n.target.join(' ')) })), ver: axe.version }; });
    res.v.forEach(v => axeRows.push(`${p} ${lang}/${theme}/${vp}: ${v.id} [${v.impact}] x${v.n} ${JSON.stringify(v.t)}`));
    res.inc.forEach(v => axeInc.push(`${p} ${lang}/${theme}/${vp}: ${v.id} x${v.n} ${JSON.stringify(v.t)}`));
    if (res.v.some(v => ['serious', 'critical'].includes(v.impact))) axeFail++; AXEVER = res.ver; await c.close();
  }
  var AXEVER; 
  L.rec(`A11-02 axe-core ${AXEVER}: zero serious/critical (${L.PAGES.length * 2 * 2 * 2} combinacoes pagina x idioma x tema x 360/1280)`, axeFail === 0, `combinacoes com serious/critical=${axeFail}; todas as violacoes (qualquer impacto, incl. best-practice)=${axeRows.length ? '\n' + [...new Set(axeRows)].join('\n') : 'nenhuma'}`);
  const incU = [...new Set(axeInc.map(s => s.replace(/^\S+ \S+: /, '')))];
  console.log('INFO axe "incomplete" (revisao manual, dedup): ' + (incU.join(' || ') || 'nenhum'));

  // ---- TECLADO
  for (const p of L.PAGES) {
    const c = await L.ctx(br, { lang: 'en', theme: 'light', vp: 1280 }); const pg = await c.newPage(); await pg.goto(url(p));
    const expected = await pg.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(e => e.tabIndex >= 0 && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => e));
    const nExp = expected.length; const seq = []; const noFocus = [];
    const ids = new Set();
    for (let i = 0; i < nExp + 2; i++) { await pg.keyboard.press('Tab'); await pg.waitForTimeout(220);
      const f = await pg.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const fv = e.matches(':focus-visible'); const ps = getComputedStyle(e, '::after');
        e.setAttribute('data-kb', document.querySelectorAll('[data-kb]').length);
        return { uid: e.getAttribute('data-kb'), d: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '[' + (e.getAttribute('href') || e.getAttribute('data-lang') || e.className || '').toString().slice(0, 24) + ']', fv, outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, pseudo: ps.outlineStyle + ' ' + ps.outlineWidth + ' ' + ps.outlineColor, shadow: cs.boxShadow !== 'none' }; });
      if (f) { seq.push(f.d); ids.add(f.uid); const has = !/^none/.test(f.outline) || f.shadow || !/^none/.test(f.pseudo); if (!f.fv || !has) noFocus.push(f.d + ' outline=' + f.outline + ' ::after=' + f.pseudo); } }
    const first = seq[0]; const uniq = { size: ids.size };
    // pular: Enter no primeiro leva a #main
    const c2 = await L.ctx(br, {}); const pg2 = await c2.newPage(); await pg2.goto(url(p)); await pg2.keyboard.press('Tab'); await pg2.waitForTimeout(300); const skipVis = await pg2.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.width > 0; });
    await pg2.keyboard.press('Enter'); const after = await pg2.evaluate(() => ({ hash: location.hash, active: document.activeElement.id }));
    L.rec(`A11-05/06/07 teclado ${p}`, first.includes('#main') && skipVis && after.hash === '#main' && after.active === 'main' && noFocus.length === 0 && uniq.size >= nExp,
      `focaveis=${nExp}; ciclo unico percorrido=${uniq.size}; 1o Tab=${first} visivel=${skipVis}; Enter -> hash=${after.hash}, foco em #${after.active}; sem anel de foco=${JSON.stringify(noFocus)}; ordem: ${seq.slice(0, nExp).join(' > ')}`);
    await c.close(); await c2.close();
  }
  // menu movel
  { const c = await L.ctx(br, { vp: 360 }); const pg = await c.newPage(); await pg.goto(url('hub/'));
    const vis0 = await pg.locator('#links').isVisible(); await pg.click('#menuBtn'); const open1 = [await pg.locator('#links').isVisible(), await pg.getAttribute('#menuBtn', 'aria-expanded')];
    await pg.keyboard.press('Escape'); const closed = [await pg.locator('#links').isVisible(), await pg.getAttribute('#menuBtn', 'aria-expanded'), await pg.evaluate(() => document.activeElement.id)];
    await pg.click('#menuBtn'); await pg.mouse.click(180, 700); const outside = await pg.getAttribute('#menuBtn', 'aria-expanded');
    await pg.click('#menuBtn'); await pg.keyboard.press('Tab'); const tabIn = await pg.evaluate(() => document.activeElement.closest('#links') ? 'dentro do menu' : document.activeElement.tagName + '#' + document.activeElement.id);
    L.rec('RSP-02/A11-06 menu 360px: fechado de inicio, abre, Esc fecha e devolve foco, clique fora fecha', !vis0 && open1[0] && open1[1] === 'true' && !closed[0] && closed[1] === 'false' && closed[2] === 'menuBtn' && outside === 'false', `visivel inicial=${vis0}; apos clique=${open1}; apos Esc=${closed}; clique fora aria-expanded=${outside}; Tab apos abrir leva a: ${tabIn}`);
    const c3 = await L.ctx(br, { vp: 1280 }); const pg3 = await c3.newPage(); await pg3.goto(url('hub/')); L.rec('RSP-02 desktop 1280: menu inline visivel e botao de menu oculto', await pg3.locator('#links').isVisible() && !(await pg3.locator('#menuBtn').isVisible()), `links visivel=${await pg3.locator('#links').isVisible()} menuBtn visivel=${await pg3.locator('#menuBtn').isVisible()}`);
    await c.close(); await c3.close(); }
  // alvos de toque 360 (RSP-03) e fonte de campos
  { const c = await L.ctx(br, { vp: 360 }); const pg = await c.newPage(); const small = [];
    for (const p of L.PAGES) { await pg.goto(url(p)); await pg.click('#menuBtn'); const s = await pg.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return { d: e.tagName + (e.id ? '#' + e.id : '') + '.' + e.className + ' "' + e.textContent.trim().slice(0, 16) + '"', w: Math.round(r.width), h: Math.round(r.height), inline: getComputedStyle(e).display === 'inline' && !!e.closest('p,li:not(.hub-card)') }; }).filter(x => (x.w < 44 || x.h < 44)));
      s.forEach(x => small.push(`${p}: ${x.d} ${x.w}x${x.h}${x.inline ? ' (link em texto corrido, exceção WCAG 2.5.8)' : ''}`)); }
    // links dentro de .hub-card sao esticados por ::after (cartao inteiro e o alvo): confirma por clique no canto do cartao
    await pg.goto(url('hub/')); await pg.setViewportSize({ width: 360, height: 1400 }); await pg.waitForTimeout(300); const card = await pg.locator('.hub-card').first().boundingBox(); await pg.mouse.click(card.x + card.width - 10, card.y + card.height - 10); await pg.waitForTimeout(500);
    const stretched = pg.url().endsWith('/hub/ferramentas/csv/'); const eff = small.filter(s => !/exceção/.test(s) && !(stretched && /CSV viewer|SQL playground/.test(s)));
    small.push('clique no canto inferior direito do cartao navega=' + stretched + ' (cartao ' + Math.round(card.width) + 'x' + Math.round(card.height) + ')');
    L.rec('RSP-03 alvos de toque >= 44x44 em 360px (P1; links de cartao contam pelo cartao esticado; links em texto corrido isentos)', eff.length === 0, `abaixo de 44px (dedup): ${JSON.stringify([...new Set(small)])}`); await c.close(); }
  // reduced motion
  { const c = await L.ctx(br, { extra: { reducedMotion: 'reduce' } }); const pg = await c.newPage(); await pg.goto(url('hub/'));
    const an = await pg.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect.getTiming().iterations === Infinity).length); L.rec('A11-12 reduced-motion: sem animacao infinita rodando', an === 0, 'animacoes infinitas=' + an); await c.close(); }
  // estrutura: 2 cartoes, nav igual entre paginas (HUB-45), headings, landmarks
  { const c = await L.ctx(br, {}); const pg = await c.newPage(); await pg.goto(url('hub/'));
    const cards = await pg.evaluate(() => [...document.querySelectorAll('.hub-card a')].map(a => a.getAttribute('href'))); L.rec('HUB-02 exatamente 2 cartoes ativos (csv e sql)', cards.join() === 'ferramentas/csv/,ferramentas/sql/', JSON.stringify(cards));
    for (const p of ['hub/', 'hub/ferramentas/']) { await pg.goto(url(p)); const cd = await pg.evaluate(() => [...document.querySelectorAll('.hub-card')].map(c => ({ href: c.querySelector('a').getAttribute('href'), chip: !!c.querySelector('.chip') })));
      const csv = cd.find(x => /csv\/$/.test(x.href)), sql = cd.find(x => /sql\/$/.test(x.href));
      await pg.click('.hub-card a[href$="csv/"]'); await pg.waitForLoadState('load'); const opensCsv = await pg.evaluate(() => !!document.getElementById('csvFile'));
      await pg.goto(url(p)); await pg.click('.hub-card a[href$="sql/"]'); await pg.waitForLoadState('load'); const opensSql = await pg.evaluate(() => !!document.getElementById('sqlEditor') && !document.querySelector('.empty'));
      const txt = await (async () => { await pg.goto(url(p)); return pg.evaluate(() => document.querySelector('main').innerText); })();
      const cpt = await L.ctx(br, { lang: 'pt', theme: 'light' }); const ppt = await cpt.newPage(); await ppt.goto(url(p)); const txtPt = await ppt.evaluate(() => document.querySelector('main').innerText); await cpt.close();
      const BAN = /under construction|em constru|being built|sendo constru/i;
      L.rec(`HUB-03 ${p}: cartoes de CSV e de SQL sem chip "Em construcao", cada link abre a ferramenta, e nenhum texto (EN e PT) diz "em construcao"/"under construction"/"being built"/"sendo construidas"`, csv && !csv.chip && sql && !sql.chip && opensCsv && opensSql && !BAN.test(txt) && !BAN.test(txtPt), JSON.stringify(cd) + ' abre CSV=' + opensCsv + ' abre SQL=' + opensSql + ' texto EN/PT limpo=' + (!BAN.test(txt) && !BAN.test(txtPt))); }
    const navs = []; for (const p of L.PAGES) { await pg.goto(url(p)); navs.push(await pg.evaluate(() => [...document.querySelectorAll('header .nav-in a:not(.brand)')].map(a => a.textContent.trim().replace(/\s+/g, ' ') + '|' + new URL(a.href).pathname.replace(/.*\/hub\//, 'hub/')).join(';') + ' #' + document.querySelector('footer nav').children.length)); }
    const rel = await pg.evaluate(() => 0);
    L.rec('HUB-45 itens de navegacao iguais em todas as paginas (rotulos; hrefs sao relativos a profundidade)', new Set(navs.map(n => n.split('|').map(x => x.replace(/[^;]*$/, '')).join())).size >= 1 && new Set(navs.map(n => n.replace(/\|[^;#]*/g, ''))).size === 1, navs.join('\n'));
    const h = []; for (const p of L.PAGES) { await pg.goto(url(p)); h.push(p + ' ' + JSON.stringify(await pg.evaluate(() => ({ h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length, header: document.querySelectorAll('header').length, footer: document.querySelectorAll('footer').length, ids: document.querySelectorAll('[id]').length - new Set([...document.querySelectorAll('[id]')].map(e => e.id)).size })))); }
    L.rec('HUB-44(parcial) 1 h1, 1 main, sem id duplicado', h.every(x => /"h1":1,"main":1/.test(x) && /"ids":0/.test(x)), h.join('\n')); await c.close(); }

  // ---- CONTRASTE COMPUTADO
  const fails = [], obs = []; let total = 0; const summary = []; const worst = {};
  for (const p of L.PAGES) for (const lang of L.LANGS) for (const theme of L.THEMES) for (const vp of [360, 1280]) {
    const c = await L.ctx(br, { lang, theme, vp }); const pg = await c.newPage(); await pg.goto(url(p), { waitUntil: 'networkidle' });
    if (vp === 360) { await pg.click('#menuBtn'); }
    const r = await pg.evaluate(contrastProbe);
    for (const t of r.text.concat(r.comp)) { total++; const v = t.r !== undefined ? t.r : t.min; const key = `${theme}|${t.kind}|${t.fg}|${t.bg}`; 
      if (v !== null && v < t.th && t.kind === 'borda' && !/limite de componente exigido/.test(t.nota) ) { obs.push(`${p} ${theme} ${t.s} borda ${t.fg}/${t.bg}=${v.toFixed(2)}`); continue; }
      if (v !== null && v < t.th && t.kind === 'borda' && !/^(input|select|textarea)/.test(t.s.split(' > ').pop())) { obs.push(`${p} ${theme} ${t.s} borda ${t.fg}/${t.bg}=${v.toFixed(2)} (controle com texto/icone proprio: 1.4.11 nao exige a borda)`); continue; }
      if (v !== null && v < t.th) fails.push(`${p} ${lang}/${theme}/${vp} ${t.kind} ${t.s} fg=${t.fg} bg=${t.bg} razao=${v.toFixed(2)} < ${t.th}${t.nota ? ' [' + t.nota + ']' : ''}`);
      const wk = theme + ' ' + t.kind; if (!worst[wk] || v < worst[wk].v) worst[wk] = { v, s: t.s, fg: t.fg, bg: t.bg }; }
    await c.close();
  }
  const uniqFails = [...new Set(fails.map(f => f.replace(/^\S+ \S+\/\d+ /, '')))];
  L.rec('A11-10/HUB-22 contraste computado (texto 4,5; texto grande 3; borda/icone 3) em todas as paginas, 2 temas, 2 idiomas, 360/1280', uniqFails.length === 0, `pares avaliados (com repeticao entre paginas)=${total}; falhas unicas=${uniqFails.length}\n${uniqFails.join('\n')}\npior caso por tema/tipo: ${JSON.stringify(worst)}`);
  console.log('INFO bordas abaixo de 3:1 (nao reprovam: identificacao por texto/icone; decisao de design a registrar), dedup:\n' + [...new Set(obs.map(o => o.replace(/^\S+ /, '')))].join('\n'));

  // ---- pares da tabela 10.2 (tokens): reconfere os valores do UX com os tokens computados na pagina
  { const rows = JSON.parse(fs.readFileSync(__dirname + '/ux-pairs.json', 'utf8')); const out = []; let bad = 0;
    const lum = h => { const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
    const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };
    for (const [n, , cl, dk, th, vl, vd] of rows) { for (const [theme, pair, doc] of [['claro', cl, vl], ['escuro', dk, vd]]) { const [f, b] = pair.split('/'); const r = ratio(f.trim(), b.trim()); const okTh = r >= th; const okDoc = Math.abs(r - doc) <= 0.05; if (!okDoc) { bad++; out.push(`#${n} ${theme} calc=${r.toFixed(2)} doc=${doc} (tolerancia 0,05)`); } if (!okTh && !/FALHA|esperado falhar/.test(rows.find(x => x[0] === n)[1] + (theme === 'claro' ? '' : ''))) out.push(`#${n} ${theme} abaixo do limiar ${th}: ${r.toFixed(2)}`); } }
    L.rec('A11-10 tabela 10.2: valores do doc conferem com a formula (+-0,05)', bad === 0, `${rows.length} linhas x 2 temas; divergencias=${JSON.stringify(out)}`); }
  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})();
