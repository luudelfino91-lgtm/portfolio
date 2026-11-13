// REG: linha de base do portfolio (index.html, certificacoes.html) + rota #/case + diff.
const L = require('./lib');
const { execSync } = require('child_process');
(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();
  const pages = ['index.html', 'certificacoes.html'];
  for (const p of pages) for (const lang of L.LANGS) for (const theme of L.THEMES) {
    const c = await L.ctx(br, { lang, theme, vp: 1280 }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    const resp = await pg.goto(`${L.BASE}/${p}`, { waitUntil: 'networkidle' }).catch(e => ({ status: () => 'ERR ' + e.message }));
    await pg.waitForTimeout(300);
    const info = await pg.evaluate(() => ({ lang: document.documentElement.lang, theme: document.documentElement.getAttribute('data-theme'), title: document.title,
      keys: [...document.body.innerText.matchAll(/\b(?:n|b|hub)\.[a-z]+\.?[a-z]*\b/g)].map(m => m[0]).slice(0, 5), h: document.documentElement.scrollWidth <= innerWidth }));
    // ignorar erros de rede de Google Fonts se sandbox sem internet: separar
    const ext = log.requests.filter(u => !u.startsWith(L.BASE) && !u.startsWith('data:'));
    const ownErr = log.consoleErrors.filter(t => !/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(t));
    const ok = resp.status() === 200 && log.pageerrors.length === 0 && ownErr.length === 0 && info.keys.length === 0
      && info.lang === (lang === 'pt' ? 'pt-BR' : 'en') && info.theme === theme;
    L.rec(`REG ${p} ${lang}/${theme}`, ok, JSON.stringify({ status: resp.status(), pageerrors: log.pageerrors, consoleErrors: log.consoleErrors, info, externos: [...new Set(ext.map(u => new URL(u).host))] }));
    await c.close();
  }
  // rota de case
  const slugs = ['panorama-consorcios','agent-performance-report','lets-cola','seguradora-xperiun','pharmavantage','vela-people-analytics','olist-store','xperiun-metalurgica','automacao-python'];
  for (const lang of L.LANGS) for (const theme of L.THEMES) {
    const c = await L.ctx(br, { lang, theme }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    const bad = [];
    for (const s of slugs) {
      await pg.goto(`${L.BASE}/index.html#/case/${s}`, { waitUntil: 'load' }); await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(150);
      const st = await pg.evaluate(() => ({ caseHidden: document.getElementById('case').hidden, homeHidden: document.getElementById('home').hidden, h: (document.querySelector('#case h1,#case h2')||{}).textContent }));
      if (st.caseHidden || !st.homeHidden || !st.h) bad.push([s, st]);
    }
    L.rec(`REG case x9 ${lang}/${theme}`, bad.length === 0 && log.pageerrors.length === 0, JSON.stringify({ bad, pageerrors: log.pageerrors }));
    await c.close();
  }
  // rota de um projeto + volta/ancora
  { const c = await L.ctx(br, { lang: 'pt', theme: 'dark', vp: 360 }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    await pg.goto(`${L.BASE}/index.html#/case/lets-cola`); await pg.waitForTimeout(200);
    const h = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    L.rec('REG case 360px sem rolagem horizontal', h && log.pageerrors.length === 0, 'scrollWidth<=innerWidth=' + h); await c.close(); }
  // diff do portfolio (commitado + working tree + nao rastreados)
  const S = require('./scope'); const fs = require('fs'), os = require('os'), path = require('path');
  const all = S.changed(L.REPO);
  // Alteracao do portfolio APROVADA pelo Lucas (link Portfolio->Hub no rodape + contraste --ink-3): somente estes 3 arquivos.
  const APPROVED = ['index.html', 'assets/css/styles.css', 'assets/js/i18n.js', '.gitignore']; // .gitignore: __pycache__/ e *.pyc (revisao D11, B1)
  const out = S.offending(L.REPO).filter(f => !APPROVED.includes(f));
  L.rec('REG-01/T-210 nenhum arquivo fora de docs/, hub/, tests/, .claude/ alterado, exceto os 3 aprovados e .gitignore (B1) (diff commitado + working tree + porcelain)', out.length === 0, 'arquivos fora do escopo: ' + JSON.stringify(out) + ' (total alterados: ' + all.length + ')');
  { const sh = (c, d) => execSync(c, { cwd: d, stdio: 'pipe', encoding: 'utf8' });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-neg-')); const res = [];
    try {
      sh(`git clone -q --no-hardlinks "${L.REPO}" "${tmp}/c"`, tmp); const c = `${tmp}/c`;
      sh('git config user.email t@t && git config user.name t', c);
      // o origin/main do clone e o branch main LOCAL do repo (pode estar atrasado); use o origin/main real do repo
      sh(`git fetch -q "${L.REPO}" +refs/remotes/origin/main:refs/remotes/origin/main`, c);
      res.push(['controle limpo (HEAD commitado)', S.offending(c).filter(f => !APPROVED.includes(f)).length === 0]);
      fs.appendFileSync(`${c}/docs/_x.md`, 'x'); res.push(['controle: arquivo novo em docs/ nao acusa', S.offending(c).filter(f => !APPROVED.includes(f)).length === 0]); fs.unlinkSync(`${c}/docs/_x.md`);
      for (const f of ['index.html', 'certificacoes.html', 'assets/css/styles.css', 'README.md', 'CHANGELOG.md']) {
        if (!fs.existsSync(`${c}/${f}`)) { res.push([`${f} (ausente no clone)`, false]); continue; }
        fs.appendFileSync(`${c}/${f}`, '\n<!-- x -->'); res.push([`${f} alterado no working tree acusa`, S.offending(c).includes(f)]);
        sh(`git checkout -q -- ${f}`, c); }
      fs.writeFileSync(`${c}/assets/novo.txt`, 'x'); res.push(['arquivo nao rastreado em assets/ acusa', S.offending(c).includes('assets/novo.txt')]); fs.unlinkSync(`${c}/assets/novo.txt`);
      fs.appendFileSync(`${c}/index.html`, '\n<!-- x -->'); sh('git commit -qam x', c); sh('git checkout -q -- .', c); res.push(['index.html alterado e COMMITADO acusa (diff origin/main...HEAD)', S.offending(c).includes('index.html')]);
    } catch (e) { res.push(['erro no clone temporario: ' + String(e.message).slice(0, 200), false]); }
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    L.rec('REG-01 teste negativo: alteracao do portfolio (working tree, nao rastreado e commitada) e detectada, em clone temporario', res.every(r => r[1]), JSON.stringify(res)); }
  // coexistencia REG-70: portfolio nao pede /hub/
  { const c = await L.ctx(br, {}); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    await pg.goto(`${L.BASE}/index.html`, { waitUntil: 'networkidle' });
    const hubReq = log.requests.filter(u => /\/hub\//.test(u));
    const hubLinks = await pg.evaluate(() => [...document.querySelectorAll('a[href^="hub/"],a[href^="./hub/"],a[href*="/hub/"]')].map(a => a.href));
    const footerLinks = await pg.evaluate(() => [...document.querySelectorAll('footer a[href="hub/"]')].length);
    L.rec('REG-70 portfolio sem requisicoes para /hub/; unico link para o Hub e o do rodape (aprovado)', hubReq.length === 0 && hubLinks.length === 1 && footerLinks === 1, JSON.stringify({ hubReq, hubLinks })); await c.close(); }
  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})();
