// Utilitarios comuns dos testes da casca do Hub (Playwright 1.63 + Chrome instalado).
// Uso: node <script>.js   (variaveis: BASE=http://127.0.0.1:8081  SUB=http://127.0.0.1:8082/portfolio)
const { chromium, firefox } = require('/opt/npm-tools/node_modules/playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');
const BASE = process.env.BASE || 'http://127.0.0.1:8081';
const SUB = process.env.SUB || 'http://127.0.0.1:8082/portfolio';
const PAGES = ['hub/', 'hub/ferramentas/', 'hub/ferramentas/csv/', 'hub/ferramentas/sql/', 'hub/privacidade/'];
const VPS = [360, 768, 1280];
const LANGS = ['en', 'pt'];
const THEMES = ['light', 'dark'];

function startServers() {
  // raiz do repo em 8081; /tmp/site/portfolio -> repo em 8082
  execSync(`mkdir -p /tmp/site && ln -sfn ${REPO} /tmp/site/portfolio`);
  const a = spawn('python3', ['-m', 'http.server', '8081', '--bind', '127.0.0.1', '-d', REPO], { stdio: 'ignore' });
  const b = spawn('python3', ['-m', 'http.server', '8082', '--bind', '127.0.0.1', '-d', '/tmp/site'], { stdio: 'ignore' });
  return { stop() { a.kill(); b.kill(); } };
}
async function launch() {
  return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
}
// contexto com idioma/tema pre-semeados via localStorage (init script, antes de qualquer script da pagina)
async function ctx(browser, { lang, theme, vp = 1280, scheme = 'light', seed = true, extra = {} } = {}) {
  const c = await browser.newContext({ viewport: { width: vp, height: 900 }, colorScheme: scheme, ...extra });
  if (seed && (lang || theme)) {
    await c.addInitScript(([l, t]) => {
      try { if (l) localStorage.setItem('ld-lang', l); if (t) localStorage.setItem('ld-theme', t); } catch (e) {}
    }, [lang, theme]);
  }
  return c;
}
function watch(page, log) {
  page.on('pageerror', e => log.pageerrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') log.consoleErrors.push(m.text()); });
  page.on('request', r => log.requests.push(r.url()));
  page.on('response', r => log.responses.push([r.status(), r.url()]));
  page.on('requestfailed', r => log.failed.push(r.url() + ' ' + (r.failure() || {}).errorText));
}
const newLog = () => ({ pageerrors: [], consoleErrors: [], requests: [], responses: [], failed: [] });
const results = [];
function rec(id, ok, evidence) { results.push({ id, ok, evidence }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' :: ' + evidence); }
module.exports = { chromium, firefox, startServers, launch, ctx, watch, newLog, rec, results, BASE, SUB, PAGES, VPS, LANGS, THEMES, REPO };
