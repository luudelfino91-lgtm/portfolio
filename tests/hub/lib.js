// Utilitarios comuns dos testes da casca do Hub (Playwright 1.63 + Chrome instalado).
// Uso: node <script>.js   (variaveis: CHROME_PATH AXE_PATH PORT_ROOT=8081 PORT_SUB=8082 PORT_GZ=8083 SITE_DIR BASE SUB)
const { chromium, firefox } = require('/opt/npm-tools/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');
const BASE = process.env.BASE || `http://127.0.0.1:${process.env.PORT_ROOT || '8081'}`;
const SUB = process.env.SUB || `http://127.0.0.1:${process.env.PORT_SUB || '8082'}/portfolio`;
const PAGES = ['hub/', 'hub/ferramentas/', 'hub/ferramentas/csv/', 'hub/ferramentas/sql/', 'hub/privacidade/'];
const VPS = [360, 768, 1280];
const LANGS = ['en', 'pt'];
const THEMES = ['light', 'dark'];

const PORT_ROOT = process.env.PORT_ROOT || '8081', PORT_SUB = process.env.PORT_SUB || '8082', PORT_GZ = process.env.PORT_GZ || '8083';
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const AXE_PATH = process.env.AXE_PATH || process.env.AXE || '/tmp/axe/package/axe.min.js';
function startServers() {
  // raiz do repo em PORT_ROOT; <SITE_DIR>/portfolio -> repo em PORT_SUB. SITE_DIR vem do run-all.sh; sem ele, cria e limpa um proprio.
  let own = null, site = process.env.SITE_DIR;
  if (!site) { own = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-site-')); site = own; fs.symlinkSync(REPO, path.join(site, 'portfolio')); }
  // Falha se a porta estiver ocupada: um servidor antigo (orfao) serviria conteudo que nao e o desta execucao.
  for (const port of [PORT_ROOT, PORT_SUB]) {
    try { require('child_process').execFileSync('python3', ['-c', `import socket,sys\ns=socket.socket();s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)\ntry:\n s.bind(('127.0.0.1',${Number(port)}))\nexcept OSError:\n sys.exit(3)`], { stdio: 'ignore' }); }
    catch (e) { if (own) fs.rmSync(own, { recursive: true, force: true }); throw new Error('porta ' + port + ' ocupada: encerre o servidor antigo (pkill -f "http.server ' + port + '") antes de rodar os testes'); }
  }
  const a = spawn('python3', ['-m', 'http.server', PORT_ROOT, '--bind', '127.0.0.1', '-d', REPO], { stdio: 'ignore' });
  const b = spawn('python3', ['-m', 'http.server', PORT_SUB, '--bind', '127.0.0.1', '-d', site], { stdio: 'ignore' });
  return { stop() { a.kill(); b.kill(); if (own) fs.rmSync(own, { recursive: true, force: true }); } };
}
async function launch() {
  return chromium.launch({ executablePath: CHROME_PATH, args: ['--no-sandbox'] });
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
function na(id, why) { results.push({ id, ok: true, na: true, evidence: why }); console.log('N/A  ' + id + ' :: ' + why); }
module.exports = { na, chromium, firefox, startServers, launch, ctx, watch, newLog, rec, results, BASE, SUB, PAGES, VPS, LANGS, THEMES, REPO, CHROME_PATH, AXE_PATH, PORT_GZ };
