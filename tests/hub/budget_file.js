// HUB-40/RNF-04 orcamento de peso (bytes transferidos, cache vazio, gzip) e HUB-42 file://.
const L = require('./lib'); const zlib = require('zlib'); const fs = require('fs'); const http = require('http');
(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  // servidor com gzip (python http.server nao comprime): proxy local que comprime texto, como o GitHub Pages faria
  const gz = http.createServer((req, res) => { const f = L.REPO + decodeURIComponent(req.url.split('?')[0]); let p = f; if (p.endsWith('/')) p += 'index.html';
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end(); }
    const b = fs.readFileSync(p); const ext = p.split('.').pop(); const type = { html: 'text/html', css: 'text/css', js: 'text/javascript', woff2: 'font/woff2', svg: 'image/svg+xml' }[ext] || 'application/octet-stream';
    if (['html', 'css', 'js', 'svg'].includes(ext)) { res.setHeader('content-encoding', 'gzip'); res.setHeader('content-type', type + '; charset=utf-8'); return res.end(zlib.gzipSync(b, { level: 9 })); }
    res.setHeader('content-type', type); res.end(b); }).listen(Number(L.PORT_GZ), '127.0.0.1');
  const br = await L.launch(); const out = []; let max = 0, fontsMax = 0;
  for (const p of L.PAGES) {
    const c = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await c.newPage(); const cdp = await c.newCDPSession(pg);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const items = {}; cdp.on('Network.requestWillBeSent', e => items[e.requestId] = { url: e.request.url, type: e.type, bytes: 0 });
    cdp.on('Network.loadingFinished', e => { if (items[e.requestId]) items[e.requestId].bytes = e.encodedDataLength; });
    await pg.goto(`http://127.0.0.1:${L.PORT_GZ}/${p}`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(300);
    let shell = 0, fonts = 0, imgs = 0; const rows = [];
    for (const i of Object.values(items)) { const k = /\.woff2$/.test(i.url) ? 'fonte' : (i.type === 'Image' || /favicon|\.(png|jpe?g|webp|svg)$/.test(i.url) && i.type !== 'Document' && i.type !== 'Stylesheet') ? 'imagem' : 'shell'; if (k === 'shell') shell += i.bytes; else if (k === 'fonte') fonts += i.bytes; else imgs += i.bytes; rows.push(`${k} ${i.bytes}B ${i.url.replace(`http://127.0.0.1:${L.PORT_GZ}`, '')}`); }
    max = Math.max(max, shell); fontsMax = Math.max(fontsMax, fonts);
    out.push(`${p}: shell(sem fontes/imagens, gzip)=${(shell / 1024).toFixed(1)} KB; fontes carregadas=${(fonts / 1024).toFixed(1)} KB; imagens=${(imgs / 1024).toFixed(2)} KB\n    ` + rows.join('\n    '));
    await c.close();
  }
  const fontDisk = fs.readdirSync(L.REPO + '/hub/assets/fonts').filter(f => f.endsWith('.woff2')).reduce((a, f) => a + fs.statSync(L.REPO + '/hub/assets/fonts/' + f).size, 0);
  L.rec('HUB-40 shell <= 150 KB (bytes transferidos com gzip, cache desligado, sem fontes e imagens; maior pagina)', max <= 150 * 1024, `maior=${(max / 1024).toFixed(1)} KB (limite 150 KB)\n` + out.join('\n'));
  L.rec('HUB-40/RNF-14 fontes woff2 somadas <= 120 KB', fontDisk <= 120 * 1024, `soma dos 4 woff2 em hub/assets/fonts/ = ${fontDisk} B = ${(fontDisk / 1024).toFixed(1)} KB (limite 120 KB); maior carregamento por pagina=${(fontsMax / 1024).toFixed(1)} KB`);
  // file://
  const c = await br.newContext(); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  const r = await pg.goto('file://' + L.REPO + '/hub/index.html', { waitUntil: 'load' }).catch(e => ({ status: () => 'ERR ' + e.message }));
  await pg.waitForTimeout(400); const st = await pg.evaluate(() => ({ h1: (document.querySelector('h1') || {}).textContent, lang: document.documentElement.lang, theme: document.documentElement.dataset.theme, bodyLen: document.body.innerText.length, csss: [...document.styleSheets].length, fontsOk: [...document.fonts].filter(f => f.status === 'loaded').length }));
  await pg.click('[data-lang=pt]'); const pt = await pg.evaluate(() => document.documentElement.lang); await pg.click('#themeBtn'); const th = await pg.evaluate(() => document.documentElement.dataset.theme);
  await pg.click('a[href="privacidade/"] >> nth=0'); await pg.waitForLoadState('load'); const nav = pg.url();
  L.rec('HUB-42 file:// (P2, registro): hub/index.html abre, i18n, tema e navegacao relativa funcionam', log.pageerrors.length === 0 && !!st.h1 && pt === 'pt-BR' && (nav.endsWith('privacidade/') || nav.endsWith('privacidade/index.html')), JSON.stringify({ status: String(r.status && r.status()), st, pt, th, nav, pageerrors: log.pageerrors, consoleErrors: log.consoleErrors, falhas: log.failed }));
  { const p2 = await c.newPage(); const l2 = L.newLog(); L.watch(p2, l2); await p2.goto('file://' + L.REPO + '/index.html'); await p2.waitForTimeout(500); L.rec('REG-10 index.html via file:// sem pageerror', l2.pageerrors.length === 0, 'pageerrors=' + JSON.stringify(l2.pageerrors) + ' h1=' + (await p2.evaluate(() => (document.querySelector('h1') || {}).textContent || '').then(s => s.slice(0, 40)))); 
    const p3 = await c.newPage(); const l3 = L.newLog(); L.watch(p3, l3); await p3.goto('file://' + L.REPO + '/certificacoes.html'); await p3.waitForTimeout(500); L.rec('REG-11 certificacoes.html via file:// sem pageerror', l3.pageerrors.length === 0, 'pageerrors=' + JSON.stringify(l3.pageerrors)); }
  await br.close(); gz.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})();
