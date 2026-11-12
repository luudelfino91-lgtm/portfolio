// Casca do Hub: matriz paginas x idioma x tema x viewport, em / (BASE) e em /portfolio/ (SUB).
const L = require('./lib');
(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();
  const allReq = new Map(); // url -> contagem
  for (const [label, root] of [['/', L.BASE], ['/portfolio/', L.SUB]]) {
    let n = 0, bad = [];
    for (const p of L.PAGES) for (const lang of L.LANGS) for (const theme of L.THEMES) for (const vp of L.VPS) {
      n++;
      const c = await L.ctx(br, { lang, theme, vp }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
      const resp = await pg.goto(`${root}/${p}`, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(100);
      const info = await pg.evaluate(() => ({ lang: document.documentElement.lang, theme: document.documentElement.dataset.theme,
        overflow: document.documentElement.scrollWidth - innerWidth, h1: !!document.querySelector('h1'),
        title: document.title }));
      log.requests.forEach(u => allReq.set(u.replace(root, '<ROOT>'), (allReq.get(u.replace(root, '<ROOT>')) || 0) + 1));
      const origin = new URL(root).origin;
      const ext = log.requests.filter(u => !u.startsWith(origin) && !u.startsWith('data:'));
      const notOk = log.responses.filter(([s]) => s >= 400);
      const problems = [];
      if (resp.status() !== 200) problems.push('status ' + resp.status());
      if (log.pageerrors.length) problems.push('pageerror ' + log.pageerrors);
      if (log.consoleErrors.length) problems.push('console.error ' + log.consoleErrors);
      if (ext.length) problems.push('externas ' + ext);
      if (notOk.length) problems.push('>=400 ' + JSON.stringify(notOk));
      if (log.failed.length) problems.push('falhou ' + log.failed);
      if (info.overflow > 0) problems.push('overflow ' + info.overflow);
      if (info.lang !== (lang === 'pt' ? 'pt-BR' : 'en')) problems.push('lang ' + info.lang);
      if (info.theme !== theme) problems.push('theme ' + info.theme);
      if (!info.h1) problems.push('sem h1');
      if (problems.length) bad.push(`${p} ${lang}/${theme}/${vp}: ${problems.join(' | ')}`);
      await c.close();
    }
    L.rec(`HUB-01/RSP-01/A11-04/PRV-01 matriz em ${label} (${n} combinacoes)`, bad.length === 0, bad.length ? bad.slice(0, 10).join('\n') : 'zero falhas: 200, sem pageerror/console.error, sem externas, sem >=400, sem overflow, lang e data-theme corretos');

    // rastreio de links e recursos relativos
    const checked = new Map(); const badl = []; const abs = [];
    const c = await L.ctx(br, {}); const pg = await c.newPage();
    for (const p of L.PAGES) {
      await pg.goto(`${root}/${p}`);
      const refs = await pg.evaluate(() => [...document.querySelectorAll('a[href],link[href],script[src],img[src]')].map(e => [e.getAttribute('href') || e.getAttribute('src'), e.tagName]));
      for (const [raw] of refs) {
        if (/^(mailto:|tel:|javascript:)/.test(raw)) continue;
        if (raw.startsWith('/') && !raw.startsWith('//')) abs.push(`${p}: ${raw}`);
        if (/^(https?:)?\/\//.test(raw)) { badl.push(`${p}: EXTERNO ${raw}`); continue; }
        const u = new URL(raw, `${root}/${p}`); u.hash = '';
        const k = u.href; if (!checked.has(k)) { const r = await pg.request.get(k); checked.set(k, r.status()); }
        if (checked.get(k) !== 200) badl.push(`${p}: ${raw} -> ${checked.get(k)}`);
      }
    }
    L.rec(`HUB links/recursos relativos sem 404 em ${label}`, badl.length === 0 && abs.length === 0, `${checked.size} URLs unicas verificadas; defeitos=${JSON.stringify(badl)}; caminhos absolutos iniciados em '/'=${JSON.stringify(abs)}`);
    // link Portfolio resolve
    const outs = [];
    for (const p of L.PAGES) {
      await pg.goto(`${root}/${p}`);
      const href = await pg.locator('a:has([data-i="hub.nav.portfolio"])').first().getAttribute('href');
      await pg.locator('a:has([data-i="hub.nav.portfolio"])').first().click({ force: true });
      await pg.waitForLoadState('load');
      const exp = new URL(root + '/').href;
      outs.push(`${p}: href=${href} -> ${pg.url()} ${pg.url() === exp ? 'ok' : 'ERRADO'} titulo="${await pg.title()}"`);
    }
    L.rec(`HUB-04/T-204 link Portfolio resolve para ${label}`, outs.every(o => o.includes(' ok ') && /Lucas Delfino/.test(o)), outs.join('\n'));
    await c.close();
  }
  console.log('\n=== TODAS AS URLs REQUISITADAS (ROOT = origem de teste, deduplicado) ===');
  [...allReq.entries()].sort().forEach(([u, n]) => console.log(String(n).padStart(4), u));
  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})();
