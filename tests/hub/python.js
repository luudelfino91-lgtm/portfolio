// Playground de Python (T-402, Fase 4): PY-01..PY-26 (execucao, erros, Parar, tempo limite, saida, PRV-14,
// isolamento/canario, CSP/sandbox, dados do cenario (D11), limites, i18n, axe, tema, armazenamento).
// D11: removidos PY-11 (arquivo CSV do usuario: escolher, sanitizar nome, remover, 10 MB) e a leitura de fixtures grandes; no lugar, PY-11 testa o
// cenario escolhido em /data (5 cenarios x tabelas = oraculo sqlite3), o fetch so apos Executar, a recuperacao de erro e o Parar durante o fetch.
// Justificativa em docs/status/no-upload-status.md.
//
// SERVIDORES PROPRIOS (nao usa os de lib.js, que nao enviam CORS):
//   site    http://127.0.0.1:${PORT_PY||8084}   serve o repo em / e em /portfolio/ (subpasta, como o Pages de projeto)
//   fora    http://127.0.0.1:${PORT_OUT||8085}  "origem de fora": registra TODA requisicao recebida (hits = prova de que nada saiu)
// Portas diferentes das fixas 8081/8082/8083 do run-all.sh (lib.js).
//
// CORS: o runner roda em iframe sandbox (origem opaca), entao o navegador exige Access-Control-Allow-Origin
// nos arquivos do Pyodide (docs/security/phase-4-worker-isolation.md, SEC-P4-03). Este servidor de teste envia
// `Access-Control-Allow-Origin: *` porque a documentacao do GitHub Pages diz que o Pages envia esse cabecalho
// ([S], NAO verificado: o shell nao alcanca github.io; conferir com `curl -I` no deploy). O teste PY-26 mostra o que
// acontece SEM o cabecalho (falha limpa, mensagem de erro). O PY-26 e a unica parte que desliga o CORS.
//
// Requer axe-core (AXE_PATH) como os demais testes. So Chrome (CHROME_PATH). Firefox/Safari NAO testados.
const L = require('./lib'); const fs = require('fs'); const path = require('path'); const http = require('http');
const O = require('./oracle'); const ORA = O.data();
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
const PORT_PY = Number(process.env.PORT_PY || 8084), PORT_OUT = Number(process.env.PORT_OUT || 8085);
const SITE = `http://127.0.0.1:${PORT_PY}`, OUT = `http://127.0.0.1:${PORT_OUT}`;
const PAGE = 'hub/ferramentas/python/';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null; const want = id => !ONLY || id.split('|').some(x => ONLY.test(x));
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', wasm: 'application/wasm', zip: 'application/zip', svg: 'image/svg+xml', woff2: 'font/woff2', csv: 'text/csv', txt: 'text/plain', md: 'text/plain' };
// runnerCsp: [de, para] troca a CSP servida em runner.html (so PY-09, simula navegador que nao confina)
const opts = { cors: true, wasmDelayMs: 0, runnerCsp: null }; const served = [];
function siteServer() {
  return http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); served.push(u);
    if (u === '/__attacker.html') {   // pagina "atacante" (so teste): emoldura o runner SEM sandbox e tenta mandar {t:'run'}
      res.writeHead(200, { 'content-type': MIME.html }); return res.end(`<!doctype html><meta charset=utf-8><iframe id=f src="/hub/ferramentas/python/runner.html"></iframe><script>window.__msgs=[];addEventListener('message',e=>__msgs.push(JSON.stringify(e.data)));const f=document.getElementById('f');const go=()=>f.contentWindow.postMessage({t:'run',id:1,code:'print(1)',tables:[]},'*');f.onload=()=>{go();setTimeout(go,300);setTimeout(go,800)}</script>`);
    }
    if (u.startsWith('/portfolio/')) u = u.slice('/portfolio'.length);
    let p = path.join(L.REPO, u); if (!p.startsWith(L.REPO)) { res.statusCode = 403; return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('404'); }
    const h = { 'content-type': MIME[p.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' };
    if (opts.cors) h['access-control-allow-origin'] = '*';
    if (opts.runnerCsp && /python\/runner\.html$/.test(p)) { const b = fs.readFileSync(p, 'utf8').replace(opts.runnerCsp[0], opts.runnerCsp[1]); res.writeHead(200, h); return res.end(b); }
    const send = () => { res.writeHead(200, h); fs.createReadStream(p).pipe(res); };
    if (/pyodide\.asm\.wasm$/.test(p) && opts.wasmDelayMs) setTimeout(send, opts.wasmDelayMs); else send();
  }).listen(PORT_PY, '127.0.0.1').on('error', portBusy);
}
const outHits = [];
function portBusy(e) { L.rec('PY-00 portas de teste livres (' + PORT_PY + ' e ' + PORT_OUT + ')', false, String(e.message) + ' (encerre o processo que as usa ou defina PORT_PY/PORT_OUT)'); process.exit(1); }
function outServer() {
  return http.createServer((req, res) => { outHits.push(req.method + ' ' + req.url); res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'text/plain' }); res.end('x'); }).listen(PORT_OUT, '127.0.0.1').on('error', portBusy);
}
const pyReq = log => log.requests.filter(u => /pyodide/i.test(u));
async function open(br, base, lang, theme, vp = 1280, extra = {}) {
  const c = await L.ctx(br, { lang, theme, vp, ...extra }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
  const dialogs = { n: 0 }; pg.on('dialog', d => { dialogs.n++; d.dismiss(); });
  await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' });
  return { c, pg, log, dialogs };
}
const idle = (pg, ms = 90000) => pg.waitForFunction(() => document.getElementById('pyTool').dataset.state === 'idle', null, { timeout: ms });
const running = (pg, ms = 90000) => pg.waitForFunction(() => document.getElementById('pyTool').dataset.state === 'running', null, { timeout: ms });
async function run(pg, code, { secs, wait = true } = {}) {
  await pg.fill('#pyEditor', code); if (secs !== undefined) await pg.fill('#pyTimeout', String(secs));
  await pg.click('#pyRun'); if (wait) { await pg.waitForTimeout(50); await idle(pg); }
}
const grab = pg => pg.evaluate(() => {
  const g = id => document.getElementById(id);
  const out = g('pyOut');
  return { state: g('pyTool').dataset.state, engine: g('pyTool').dataset.engine, out: out.hidden ? '' : out.textContent, outHidden: out.hidden,
    errVisible: !g('pyErr').hidden, errT: g('pyErrT').textContent, errM: g('pyErrM').textContent, warn: g('pyWarn').hidden ? '' : g('pyWarn').textContent,
    status: g('pyStatus').textContent, frames: document.querySelectorAll('iframe').length, runDisabled: g('pyRun').disabled, stopDisabled: g('pyStop').disabled,
    errSpans: [...out.querySelectorAll('.py-err')].map(e => e.textContent).join('') };
});
const nf = (n, lang) => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(n);

(async () => {
  if (!AXE) L.rec('A11-02 (Python) axe-core presente em ' + L.AXE_PATH, false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
  const sSite = siteServer(), sOut = outServer(); await new Promise(r => setTimeout(r, 500));
  const br = await L.launch();
  const finish = async () => { await br.close(); sSite.close(); sOut.close(); process.exit(L.results.some(r => !r.ok) ? 1 : 0); };
  process.on('unhandledRejection', e => { L.rec('erro do teste', false, String(e && e.stack || e)); finish(); });

  // ===== PRV-14: zero requisicao pyodide* antes do clique (home e pagina do Python); depois do clique, sim =====
  if (want('PY-07')) {
    for (const p of ['hub/', PAGE]) {
      const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
      await pg.goto(`${SITE}/${p}`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500);
      const frames = await pg.evaluate(() => document.querySelectorAll('iframe').length);
      L.rec(`PY-07/PRV-14 ${p}: zero requisicao pyodide* e zero iframe antes do clique em Executar (servidor viu ${served.filter(u => /pyodide/i.test(u)).length})`,
        pyReq(log).length === 0 && frames === 0 && served.filter(u => /pyodide/i.test(u)).length === 0, `requests pyodide=${JSON.stringify(pyReq(log))}; iframes=${frames}; total de requisicoes=${log.requests.length}`);
      await c.close();
    }
    const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    await pg.goto(`${SITE}/${PAGE}`, { waitUntil: 'networkidle' }); served.length = 0;
    await pg.click('#pyRun'); await pg.waitForFunction(() => document.getElementById('pyTool').dataset.engine === 'loading');
    const stTxt = await pg.evaluate(() => document.getElementById('pyStatus').textContent); await idle(pg);
    const got = served.filter(u => /vendor\/pyodide\//.test(u)).map(u => u.split('/').pop());
    L.rec('PY-07 depois do clique: so os arquivos do nucleo em vendor/pyodide/ (sem pacotes, sem micropip), estado de carregamento visivel', ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'].every(f => got.includes(f)) && got.every(f => ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'].includes(f)) && /about 6 MB/.test(stTxt), `arquivos pedidos=${JSON.stringify([...new Set(got)])}; status="${stTxt}"`);
    await c.close();
  }

  // ===== matriz funcional: raiz e subpasta x PT/EN =====
  if (want('PY-01|PY-02|PY-03')) {
    for (const [base, label] of [[SITE, 'raiz'], [`${SITE}/portfolio`, 'subpasta /portfolio/']]) {
      for (const lang of ['pt', 'en']) {
        const { c, pg, log, dialogs } = await open(br, base, lang, 'light'); const tag = `(${label}, ${lang})`;
        let g = await grab(pg);
        L.rec(`PY-01 ${tag} estado inicial: sem iframe, botao Executar habilitado, Parar desabilitado, editor com exemplo`, g.state === 'idle' && g.frames === 0 && !g.runDisabled && g.stopDisabled && /print/.test(await pg.inputValue('#pyEditor')), JSON.stringify(g));
        await pg.click('#pyRun'); await pg.waitForFunction(() => document.getElementById('pyTool').dataset.state !== 'idle');
        const loadTxt = await pg.evaluate(() => document.getElementById('pyStatus').textContent);
        const runDis = await pg.evaluate(() => document.getElementById('pyRun').disabled);
        await idle(pg); g = await grab(pg);
        L.rec(`PY-01 ${tag} print(1+1) -> "2", sem pageerror/console.error, estado carregando mostrado ("~6 MB"), motor pronto`, g.out === '2\n' && !g.errVisible && log.pageerrors.length === 0 && log.consoleErrors.length === 0 && /6 MB/.test(loadTxt) && runDis && g.engine === 'ready' && /(Done|Conclu)/.test(g.status),
          `out=${JSON.stringify(g.out)} status="${g.status}" carregando="${loadTxt}" pageerrors=${JSON.stringify(log.pageerrors)} console=${JSON.stringify(log.consoleErrors)}`);
        // segunda execucao: rapida, sem novo download
        const before = served.filter(u => /vendor\/pyodide/.test(u)).length; const t0 = Date.now();
        await run(pg, 'x = 40\nprint(x + 2)\nprint("olá", "ünï")'); g = await grab(pg);
        L.rec(`PY-01 ${tag} segunda execucao reaproveita o motor (sem novo download, ${Date.now() - t0} ms), acentos preservados, namespace novo a cada execucao`, g.out === '42\nolá ünï\n' && served.filter(u => /vendor\/pyodide/.test(u)).length === before, `out=${JSON.stringify(g.out)}`);
        await run(pg, 'print("x" in globals())'); g = await grab(pg);
        L.rec(`PY-01 ${tag} variaveis nao persistem entre execucoes (documentado)`, g.out === 'False\n', JSON.stringify(g.out));
        // erro
        await run(pg, 'def f():\n    return 1/0\nprint("antes")\nf()'); g = await grab(pg);
        L.rec(`PY-02 ${tag} excecao: traceback com ZeroDivisionError e linha do codigo do usuario, stderr destacado, sem pageerror, sem quadros internos do Pyodide, UI utilizavel`,
          /Traceback \(most recent call last\)/.test(g.out) && /File "<main>", line 4, in <module>/.test(g.out) && /ZeroDivisionError: division by zero/.test(g.errSpans) && !/_pyodide/.test(g.out) && g.out.startsWith('antes\n') && log.pageerrors.length === 0 && !g.runDisabled && /(error|erro)/i.test(g.status),
          `out=${JSON.stringify(g.out)} status="${g.status}" pageerrors=${log.pageerrors.length}`);
        await run(pg, 'print(1'); g = await grab(pg);
        L.rec(`PY-03 ${tag} erro de sintaxe exibido como SyntaxError, sem pageerror`, /SyntaxError/.test(g.out) && log.pageerrors.length === 0, JSON.stringify(g.out));
        await run(pg, 'print(input())'); g = await grab(pg);
        L.rec(`PY-03 ${tag} input() nao trava nem abre dialogo: EOFError`, /EOFError/.test(g.out) && dialogs.n === 0, JSON.stringify(g.out.slice(-80)) + ' dialogos=' + dialogs.n);
        await run(pg, 'print("<img src=x onerror=\\"window.__x=1\\">")\nprint("<b>negrito</b>")'); g = await grab(pg);
        const dom = await pg.evaluate(() => ({ img: document.querySelectorAll('#pyOut img,#pyOut b').length, x: window.__x === 1 }));
        L.rec(`PY-03 ${tag} saida e texto puro: HTML impresso nao vira elemento nem executa`, dom.img === 0 && !dom.x && g.out.includes('<img src=x onerror="window.__x=1">') && g.out.includes('<b>negrito</b>'), JSON.stringify({ dom, out: g.out }));
        await run(pg, 'import sys\nprint("a")\nprint("b", file=sys.stderr)\nprint("c")'); g = await grab(pg);
        L.rec(`PY-03 ${tag} stdout e stderr na ordem; stderr marcado`, g.out === 'a\nb\nc\n' && g.errSpans === 'b\n', JSON.stringify({ out: g.out, err: g.errSpans }));
        await run(pg, 'pass'); g = await grab(pg);
        L.rec(`PY-03 ${tag} programa sem saida: mensagem propria, nao erro`, g.outHidden && !g.errVisible && /(Done|Conclu)/.test(g.status) && /(printed nothing|n\u00e3o imprimiu nada)/.test(await pg.evaluate(() => document.body.innerText)), JSON.stringify(g));
        // Limpar
        await pg.click('#pyClear'); g = await grab(pg);
        L.rec(`PY-03 ${tag} Limpar remove a saida`, g.outHidden, JSON.stringify(g.out));
        await c.close();
      }
    }
  }

  // ===== Parar: laco infinito =====
  if (want('PY-04|PY-05')) {
    for (const lang of ['en', 'pt']) {
      const { c, pg, log } = await open(br, SITE, lang, 'light');
      await run(pg, 'print("warm")'); // carrega o motor
      await run(pg, 'while True: pass', { wait: false }); await running(pg);
      // a thread principal segue viva durante o laco
      await pg.waitForTimeout(1500);
      const lat = await pg.evaluate(() => new Promise(r => { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - t0))); }));
      const g0 = await grab(pg);
      const t0 = Date.now(); await pg.click('#pyStop'); await idle(pg, 5000); const stopMs = Date.now() - t0;
      let g = await grab(pg);
      const wk = pg.workers().length;
      L.rec(`PY-04 (${lang}) laco infinito + Parar: volta a "idle" em ${stopMs} ms, iframe removido, nenhum Worker restante, aviso visivel, sem pageerror`, g0.state === 'running' && !g0.stopDisabled && g.state === 'idle' && g.frames === 0 && wk === 0 && g.warn.length > 20 && g.stopDisabled && !g.runDisabled && log.pageerrors.length === 0 && stopMs < 3000,
        `antes=${g0.state} depois=${JSON.stringify({ state: g.state, frames: g.frames, workers: wk, warn: g.warn, status: g.status })} resposta da UI durante 1,5 s de laco (2 frames)=${lat.toFixed(0)} ms`);
      await run(pg, 'print(3*3)'); g = await grab(pg);
      L.rec(`PY-04 (${lang}) depois de Parar a interface segue utilizavel e executa de novo (Python recarrega)`, g.out === '9\n' && !g.errVisible && g.frames === 1 && log.pageerrors.length === 0, `out=${JSON.stringify(g.out)} frames=${g.frames}`);
      await c.close();
    }
    // parar durante o carregamento (wasm lento)
    { opts.wasmDelayMs = 4000; const { c, pg, log } = await open(br, SITE, 'en', 'light');
      await pg.click('#pyRun'); await pg.waitForFunction(() => document.getElementById('pyTool').dataset.engine === 'loading'); await pg.waitForTimeout(800);
      await pg.click('#pyStop'); await idle(pg, 3000); opts.wasmDelayMs = 0; const g = await grab(pg);
      await pg.waitForTimeout(1500); const g2 = await grab(pg);
      L.rec('PY-04 Parar durante o carregamento: volta a idle, sem iframe, sem erro e nada executa depois (aguardado 1,5 s)', g.state === 'idle' && g.frames === 0 && !g.errVisible && g2.state === 'idle' && g2.out === '' && log.pageerrors.length === 0, JSON.stringify({ g, g2: { state: g2.state, out: g2.out } }));
      await run(pg, 'print("ok")'); const g3 = await grab(pg);
      L.rec('PY-04 depois de Parar no carregamento, nova execucao funciona', g3.out === 'ok\n', JSON.stringify(g3.out)); await c.close(); }
    // tempo limite
    { const { c, pg, log } = await open(br, SITE, 'en', 'light'); const t0 = Date.now();
      await run(pg, 'print("antes")\nwhile True: pass', { secs: 5 }); const el = Date.now() - t0; const g = await grab(pg);
      L.rec(`PY-05 tempo limite de 5 s: laco infinito e encerrado (${el} ms total incl. carga), erro explicito, saida anterior mantida, sem Worker, UI utilizavel`, g.errVisible && /time limit/i.test(g.errT) && /5 seconds/.test(g.errM) && g.out === 'antes\n' && g.frames === 0 && pg.workers().length === 0 && g.state === 'idle' && !g.runDisabled && log.pageerrors.length === 0 && el < 30000, JSON.stringify(g) + ' ms=' + el);
      await run(pg, 'print(7)'); const g2 = await grab(pg);
      L.rec('PY-05 depois do tempo limite roda de novo; o erro anterior some', g2.out === '7\n' && !g2.errVisible, JSON.stringify(g2.out)); await c.close(); }
    // tempo limite pt + valor invalido
    { const { c, pg, log } = await open(br, SITE, 'pt', 'dark'); const before = served.length;
      const res = [];
      for (const v of ['4', '121', '', 'abc', '5.5', '-10']) { await pg.evaluate(x => { document.getElementById('pyTimeout').value = x; }, v); await pg.fill('#pyEditor', 'print(1)'); await pg.click('#pyRun'); const g = await grab(pg); res.push([v, g.errVisible && /Tempo limite inv/.test(g.errT), g.state, g.frames]); }
      L.rec('PY-05 tempo limite fora de 5..120 ou nao inteiro: erro (PT), nada executa e nenhum iframe/pyodide e criado', res.every(r => r[1] && r[2] === 'idle' && r[3] === 0) && !served.slice(before).some(u => /pyodide/i.test(u)), JSON.stringify(res));
      for (const v of ['5', '120']) { await pg.fill('#pyTimeout', v); await pg.fill('#pyEditor', 'print(1)'); await pg.click('#pyRun'); await idle(pg); res.push([v, (await grab(pg)).out]); await pg.click('#pyClear'); }
      L.rec('PY-05 limites 5 e 120 aceitos', res.slice(-2).every(r => r[1] === '1\n'), JSON.stringify(res.slice(-2))); await c.close(); }
  }

  // ===== saida gigante =====
  if (want('PY-06')) {
    for (const lang of ['en', 'pt']) {
      const { c, pg, log } = await open(br, SITE, lang, 'light');
      const t0 = Date.now(); await run(pg, 'for i in range(200000):\n    print("linha", i)'); const g = await grab(pg); const nl = g.out.split('\n').length - 1;
      L.rec(`PY-06 (${lang}) 200.000 linhas: saida truncada em <= 2.000 linhas e <= 256 KiB, aviso de truncamento, programa termina (${Date.now() - t0} ms), sem pageerror`,
        nl <= 2000 && nl >= 1900 && g.out.length <= 262144 && g.warn.includes(nf(2000, lang)) && g.state === 'idle' && log.pageerrors.length === 0 && g.out.startsWith('linha 0\n'), `linhas=${nl} bytes=${g.out.length} aviso="${g.warn}"`);
      await run(pg, 'print("y" * 400000)'); const g2 = await grab(pg);
      L.rec(`PY-06 (${lang}) uma unica linha de 400.000 caracteres: descartada, aviso de truncamento, sem travar`, g2.out.length <= 262144 && g2.warn.length > 10 && g2.state === 'idle', `bytes=${g2.out.length} aviso="${g2.warn}"`);
      // inundacao com tempo limite: a pagina continua responsiva
      await run(pg, 'while True:\n    print("x" * 100)', { secs: 5, wait: false }); await running(pg); await pg.waitForTimeout(1500);
      const lat = await pg.evaluate(() => new Promise(r => { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - t0))); }));
      const mid = await grab(pg); const t1 = Date.now(); await pg.click('#pyClear'); const clickMs = Date.now() - t1; await idle(pg, 20000); const g3 = await grab(pg);
      L.rec(`PY-06 (${lang}) inundacao de saida (while True: print) por 5 s: UI responde (2 frames em ${lat.toFixed(0)} ms, clique em ${clickMs} ms), tempo limite encerra, saida <= teto`, lat < 1500 && clickMs < 1500 && g3.errVisible && mid.out.length > 0 && mid.out.length <= 262144 && mid.warn.length > 10 && log.pageerrors.length === 0, `frame=${lat.toFixed(0)}ms clique=${clickMs}ms estado=${g3.state} saida durante a inundacao=${mid.out.length} B (aviso=${mid.warn.length > 10})`);
      await c.close();
    }
  }

  // ===== isolamento: rede e eval bloqueados dentro do Python; servidor de fora sem hits =====
  if (want('PY-08|PY-18')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light'); outHits.length = 0;
    const code = `
import js, json
from pyodide.ffi import to_js
from pyodide.code import run_js
res = {}
def t(name, f):
    try:
        f(); res[name] = 'ABERTO'
    except BaseException as e:
        res[name] = type(e).__name__
OUT = "${OUT}"
t('js.eval', lambda: js.eval('1+1'))
t('js.Function', lambda: js.Function('return 1')())
t('run_js', lambda: run_js('1+1'))
def xhr():
    x = js.XMLHttpRequest.new(); x.open('GET', OUT + '/py_xhr', False); x.send()
t('XHR sync', xhr)
def openurl():
    import pyodide.http
    pyodide.http.open_url(OUT + '/py_openurl').read()
t('open_url', openurl)
def urllib_():
    import urllib.request
    urllib.request.urlopen(OUT + '/py_urllib', timeout=3).read()
t('urllib', urllib_)
def accepted(f):
    f(); raise StopIteration  # chamada aceita (Promise/objeto criado): a prova de bloqueio e o servidor de fora, nao esta chamada
t('js.fetch (so cria a Promise)', lambda: accepted(lambda: js.fetch(OUT + '/py_fetch')))
t('js.WebSocket (so cria o objeto)', lambda: accepted(lambda: js.WebSocket.new(OUT.replace('http', 'ws') + '/py_ws')))
t('js.importScripts', lambda: js.importScripts(OUT + '/py_import.js'))
t('js.document', lambda: js.document.title)
t('js.localStorage', lambda: js.localStorage.getItem('ld-lang'))
t('js.parent', lambda: js.parent.document)
t('js.indexedDB', lambda: js.indexedDB.open('x'))
t('micropip', lambda: __import__('micropip'))
def lp():
    import pyodide_js
    pyodide_js.loadPackage('numpy')
t('loadPackage', lp)
print(json.dumps(res))
`;
    await run(pg, code, { secs: 60 }); await pg.waitForTimeout(1500);
    const g = await grab(pg); let res = {}; try { res = JSON.parse(g.out.split('\n').filter(l => l.startsWith('{"'))[0]); } catch (e) {}
    const must = ['js.eval', 'js.Function', 'run_js', 'XHR sync', 'open_url', 'urllib', 'js.document', 'js.localStorage', 'js.parent', 'js.importScripts', 'micropip', 'loadPackage'];
    L.rec('PY-08 Python: js.eval, js.Function, run_js, XHR sincrono, open_url, urllib, importScripts, document, localStorage, parent, micropip e loadPackage falham (nenhum "ABERTO")', must.every(k => res[k] && res[k] !== 'ABERTO') && Object.keys(res).length >= 15, JSON.stringify(res) + (Object.keys(res).length ? '' : ' SAIDA=' + g.out.slice(-300)));
    L.rec('PY-08 js.fetch e WebSocket sem await: zero hits no servidor de fora (porta ' + PORT_OUT + ') apos 1,5 s, incluindo conexoes assincronas', outHits.length === 0, `hits no servidor de fora=${JSON.stringify(outHits)}; js.fetch=${res['js.fetch (so cria a Promise)']} js.WebSocket=${res['js.WebSocket (so cria o objeto)']}`);
    { const ext = log.requests.filter(u => !u.startsWith(SITE) && !u.startsWith('data:'));
      const blocked = ext.filter(u => log.failed.some(f => f.startsWith(u + ' ') && /csp/i.test(f)));
      L.rec('PY-08 toda tentativa de requisicao a outra origem (o Chrome as relata em page.on request) falhou por bloqueio de CSP, e o servidor de fora recebeu 0; sem pageerror', ext.length > 0 && blocked.length === ext.length && outHits.length === 0 && log.pageerrors.length === 0, `tentativas=${JSON.stringify(ext)} bloqueadas por CSP=${blocked.length} hits=${outHits.length} falhas=${JSON.stringify(log.failed.filter(f => !f.startsWith(SITE)).slice(0, 6))}`); }
    // Worker real, sondado de fora via CDP (Runtime.evaluate do Playwright), independente do Python
    const w = pg.workers()[0];
    const probe = w ? await w.evaluate(async (o) => {
      const r = {};
      try { await fetch(o + '/probe_fetch'); r.fetch = 'ABERTO'; } catch (e) { r.fetch = 'bloqueado'; }
      r.origin = self.origin; r.idb = typeof indexedDB === 'undefined' ? 'indefinido' : await new Promise(res => { try { const q = indexedDB.open('p'); q.onsuccess = () => res('ABERTO'); q.onerror = () => res('negado'); } catch (e) { res('negado:' + e.name); } });
      r.caches = await (async () => { try { return typeof caches === 'undefined' ? 'indefinido' : await caches.open('x').then(() => 'ABERTO', () => 'negado'); } catch (e) { return 'negado:' + e.name; } })();
      r.opfs = await (async () => { try { return navigator.storage && navigator.storage.getDirectory ? await navigator.storage.getDirectory().then(() => 'ABERTO', () => 'negado') : 'indefinido'; } catch (e) { return 'negado:' + e.name; } })();
      r.nested = (() => { try { const nw = new Worker('data:text/javascript,postMessage(1)'); nw.terminate(); return 'criado (herda a CSP)'; } catch (e) { return 'negado'; } })();
      return r; }, OUT) : null;
    await pg.waitForTimeout(500);
    L.rec('PY-08 sonda direta no Worker vivo (CDP; eval fica de fora porque codigo avaliado pelo CDP ignora a CSP): fetch bloqueado, origem "null", IndexedDB/Cache/OPFS negados', !!probe && probe.fetch === 'bloqueado' && probe.origin === 'null' && !/ABERTO/.test(probe.idb + probe.caches + probe.opfs) && outHits.length === 0, JSON.stringify(probe) + ' hits=' + outHits.length);
    L.rec('PY-08 o Worker e de URL data: (nao http)', !!w && w.url().startsWith('data:'), w ? w.url().slice(0, 40) : 'sem worker');
    await c.close();
  }

  // ===== mensagens forjadas: do Python (via js.postMessage) e da propria pagina =====
  if (want('PY-20')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light');
    await run(pg, 'print("warm")');
    const id = await pg.evaluate(() => 2); // proxima execucao tera id 2
    const forged = `
import js
from pyodide.ffi import to_js
def send(o): js.postMessage(to_js(o, dict_converter=js.Object.fromEntries, create_pyproxies=False))
send({'t': 'out', 'id': ${id}, 'parts': [['out', 'A' * 5000000]]})
send({'t': 'out', 'id': ${id}, 'parts': [['out', '<img src=x onerror="window.__y=1">\\n']]})
send({'t': 'out', 'id': ${id}, 'parts': [['hack', 'B'], 7, None, ['out', 5]]})
send({'t': 'refused', 'reason': 'eval', 'detail': 'x'})
print("fim")
`;
    await run(pg, forged, { wait: false });
    // mensagem da propria pagina (source = window) enquanto roda: deve ser ignorada
    await pg.evaluate(() => window.postMessage({ t: 'done', id: 2, ok: true }, '*')); await idle(pg); await pg.waitForTimeout(300);
    const g = await grab(pg); const dom = await pg.evaluate(() => ({ imgs: document.querySelectorAll('#pyOut img').length, y: window.__y === 1 }));
    L.rec('PY-20 mensagens forjadas pelo Python (5 MB, HTML, formatos invalidos): saida <= teto (a parte forjada de 5 MB gasta a cota e o resto e descartado com aviso: so o proprio codigo do usuario sofre), HTML nao executa, "refused" forjado depois de pronto e ignorado; mensagem vinda da propria janela e ignorada', g.out.length <= 262144 && !dom.imgs && !dom.y && !g.errVisible && g.warn.length > 10 && /Done/.test(g.status) && log.pageerrors.length === 0, `bytes=${g.out.length} dom=${JSON.stringify(dom)} aviso="${g.warn}" erro=${g.errVisible} status="${g.status}" fim=${g.out.endsWith('fim\n')}`);
    await c.close();
  }

  // ===== M3: runner fora do sandbox (topo ou iframe sem sandbox) recusa iniciar =====
  if (want('PY-21')) {
    const runner = fs.readFileSync(`${L.REPO}/hub/assets/js/python-runner.js`, 'utf8');
    L.rec('PY-21 python-runner.js checa window.origin/self.origin === "null" e parent !== window antes de registrar o listener', /window\.origin !== 'null'/.test(runner) && runner.indexOf("window.origin !== 'null'") < runner.indexOf("addEventListener('message'"), 'ok');
    { // (a) runner aberto como pagina de topo
      const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); served.length = 0;
      await pg.goto(`${SITE}/hub/ferramentas/python/runner.html`, { waitUntil: 'load' });
      await pg.evaluate(() => { window.postMessage({ t: 'run', id: 1, code: 'print(1)', tables: [] }, '*'); }); await pg.waitForTimeout(1500);
      const o = await pg.evaluate(() => ({ origin: window.origin, hasWorker: false }));
      L.rec('PY-21 runner como pagina de topo (origem do site): {t:"run"} por postMessage nao cria Worker nem baixa o Pyodide', pg.workers().length === 0 && !served.some(u => /vendor\/pyodide/.test(u)) && o.origin === SITE && log.pageerrors.length === 0, JSON.stringify({ workers: pg.workers().length, pyodide: served.filter(u => /pyodide/.test(u)), origin: o.origin })); await c.close(); }
    { // (b) pai atacante com iframe SEM sandbox em outra pagina
      const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); served.length = 0; outHits.length = 0;
      await pg.goto(`${SITE}/__attacker.html`, { waitUntil: 'load' }); await pg.waitForTimeout(2000);
      const msgs = await pg.evaluate(() => window.__msgs); const nested = pg.frames().length;
      L.rec('PY-21 iframe SEM sandbox emoldurado por pagina atacante: {t:"run",code} repetido 3x nao executa nada (zero Worker, zero requisicao pyodide); o runner responde "fatal" recusando, sem "out"/"done"', nested === 2 && pg.workers().length === 0 && !served.some(u => /vendor\/pyodide/.test(u)) && msgs.some(m => /runner outside sandbox/.test(m)) && !msgs.some(m => /"t":"(out|done|started|boot)"/.test(m)), JSON.stringify({ workers: pg.workers().length, pyodide: served.filter(u => /pyodide/.test(u)), msgs })); await c.close(); }
    { // controle: no sandbox da ferramenta continua funcionando
      const { c, pg } = await open(br, SITE, 'en', 'light'); await run(pg, 'print(5)'); const g = await grab(pg); L.rec('PY-21 controle: no iframe sandbox da pagina o runner segue funcionando', g.out === '5\n', JSON.stringify(g.out)); await c.close(); }
  }

  // ===== B1: fatal/done forjados pelo Python =====
  if (want('PY-22')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light');
    await run(pg, 'print("warm")');
    const code = `
import js
from pyodide.ffi import to_js
def send(o): js.postMessage(to_js(o, dict_converter=js.Object.fromEntries, create_pyproxies=False))
send({'t': 'fatal', 'detail': 'forjado'})
send({'t': 'done', 'id': 2, 'ok': 'sim'})
send({'t': 'done', 'id': 2})
send({'t': 'done', 'id': 99, 'ok': True})
print("continua")
`;
    await run(pg, code); const g = await grab(pg);
    L.rec('PY-22 "fatal" e "done" forjados pelo Python (ok nao booleano, sem ok, id errado) sao ignorados: a execucao termina normalmente com a saida completa, sem erro e sem fechar o iframe', g.out === 'continua\n' && !g.errVisible && g.frames === 1 && g.engine === 'ready' && /Done/.test(g.status) && log.pageerrors.length === 0, JSON.stringify(g));
    const dup = `
import js
from pyodide.ffi import to_js
js.postMessage(to_js({'t': 'done', 'id': 3, 'ok': True}, dict_converter=js.Object.fromEntries, create_pyproxies=False))
js.postMessage(to_js({'t': 'done', 'id': 3, 'ok': False}, dict_converter=js.Object.fromEntries, create_pyproxies=False))
print("tarde")
`;
    await run(pg, dup); const g2 = await grab(pg); await pg.waitForTimeout(300); const g3 = await grab(pg);
    L.rec('PY-22 "done" valido duplicado: so a primeira conta (a execucao encerra uma vez, estado ocioso, sem erro) e a proxima execucao funciona', g2.state === 'idle' && !g3.errVisible && g3.state === 'idle', JSON.stringify({ g2: g2.status, g3: g3.status }));
    await run(pg, 'print("seguinte")'); const g4 = await grab(pg);
    L.rec('PY-22 execucao seguinte ao "done" forjado funciona normalmente', g4.out === 'seguinte\n' && !g4.errVisible, JSON.stringify(g4.out)); await c.close();
  }

  // ===== canario: simulacao de falha (CSP afrouxada pelo servidor de teste em runner.html, so no teste) =====
  if (want('PY-09')) {
    const real = fs.readFileSync(`${L.REPO}/hub/ferramentas/python/runner.html`, 'utf8');
    const csp = real.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    for (const [name, newCsp, reason] of [
      ['eval permitido (script-src com unsafe-eval)', csp.replace("'wasm-unsafe-eval'", "'wasm-unsafe-eval' 'unsafe-eval'"), /eval/],
      ['rede liberada (connect-src *), eval ainda bloqueado', csp.replace("connect-src 'self'", 'connect-src *'), /network/],
    ]) {
      const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
      opts.runnerCsp = [csp, newCsp];
      await pg.goto(`${SITE}/${PAGE}`, { waitUntil: 'networkidle' }); served.length = 0; outHits.length = 0;
      await run(pg, 'print("CODIGO DO USUARIO EXECUTOU")\nimport js\njs.fetch("' + OUT + '/canary_open")'); await pg.waitForTimeout(1200);
      const g = await grab(pg);
      L.rec(`PY-09 canario recusa: ${name}: mensagem de recusa, motor "refused", nada executou, Pyodide nem foi baixado, iframe removido, sem hits fora`,
        g.errVisible && /isolation check failed/.test(g.errT) && reason.test(g.errM) && g.engine === 'refused' && g.out === '' && g.frames === 0 && g.state === 'idle' && !served.some(u => /pyodide/i.test(u)) && outHits.length === 0 && log.pageerrors.length === 0,
        JSON.stringify({ errT: g.errT, errM: g.errM, engine: g.engine, out: g.out, frames: g.frames, pyodideServed: served.filter(u => /pyodide/i.test(u)), hits: outHits }));
      // com a CSP normal, na mesma pagina, volta a funcionar (sem estado preso)
      opts.runnerCsp = null; await run(pg, 'print("normal")'); const g2 = await grab(pg);
      L.rec(`PY-09 depois da recusa (${name.split(' ')[0]}), com a CSP real o proximo Executar funciona e o erro some`, g2.out === 'normal\n' && !g2.errVisible && g2.engine === 'ready', JSON.stringify({ out: g2.out, engine: g2.engine }));
      await c.close();
    }
    // caminho feliz: canario passa e e anunciado
    { const { c, pg } = await open(br, SITE, 'en', 'light'); const seen = new Set();
      await pg.exposeFunction('__seen', s => seen.add(s)); await pg.evaluate(() => { new MutationObserver(() => window.__seen(document.getElementById('pyStatus').textContent)).observe(document.getElementById('pyStatus'), { childList: true, characterData: true, subtree: true }); });
      await run(pg, 'print(1)'); L.rec('PY-09 caminho feliz: o canario passa e o status passa por "Isolation check passed" antes de executar', [...seen].some(s => /Isolation check passed/.test(s)), JSON.stringify([...seen])); await c.close(); }
  }

  // ===== CSP / sandbox =====
  if (want('PY-10')) {
    const runner = fs.readFileSync(`${L.REPO}/hub/ferramentas/python/runner.html`, 'utf8'); const page = fs.readFileSync(`${L.REPO}/hub/ferramentas/python/index.html`, 'utf8');
    const rc = runner.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/); const pc = page.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
    const dirs = s => Object.fromEntries(s.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v.join(' ')]; }));
    const rd = rc && dirs(rc[1]), pd = pc && dirs(pc[1]);
    L.rec('PY-10 runner.html: CSP meta primeiro no <head>, default-src none, script-src self + wasm-unsafe-eval (sem unsafe-eval/unsafe-inline), connect-src self, worker-src data:, base-uri none, form-action none, object-src none',
      !!rd && /<head>\s*<meta http-equiv="Content-Security-Policy"/.test(runner) && rd['default-src'] === "'none'" && rd['script-src'] === "'self' 'wasm-unsafe-eval'" && rd['connect-src'] === "'self'" && rd['worker-src'] === 'data:' && rd['base-uri'] === "'none'" && rd['form-action'] === "'none'" && rd['object-src'] === "'none'" && !/unsafe-eval'(?! )|unsafe-inline/.test(rc[1].replace("'wasm-unsafe-eval'", '')) && !/<script>[^<]/.test(runner), rc ? rc[1] : 'sem CSP');
    L.rec('PY-10 pagina do Python: CSP com frame-src self, script-src self (sem wasm-unsafe-eval, o Pyodide so roda no iframe), connect-src self (D11: a pagina busca os CSV do cenario na mesma origem), sem worker-src', !!pd && pd['frame-src'] === "'self'" && pd['script-src'] === "'self'" && pd['connect-src'] === "'self'" && !('worker-src' in pd) && pd['default-src'] === "'none'", pc ? pc[1] : 'sem CSP');
    L.rec('PY-10 nenhum <iframe> literal no HTML da pagina (criado so no clique) e nenhum script inline', !/<iframe/i.test(page) && !/<script>[^<]/.test(page), 'ok');
    const { c, pg, log } = await open(br, SITE, 'en', 'light'); const csp = []; pg.on('console', m => csp.push(m.text()));
    await run(pg, 'print(1)');
    const f = await pg.evaluate(() => { const i = document.querySelector('iframe'); return { sandbox: i.getAttribute('sandbox'), allow: i.getAttribute('allow'), src: i.src, title: i.title, same: (() => { try { return !!i.contentWindow.document; } catch (e) { return false; } })() }; });
    const fr = pg.frames().find(x => x !== pg.mainFrame()); const fo = fr ? await fr.evaluate(() => ({ origin: location.origin, self: self.origin, ls: (() => { try { return typeof localStorage; } catch (e) { return 'SecurityError'; } })(), ck: (() => { try { return document.cookie; } catch (e) { return 'SecurityError'; } })() })) : null;
    L.rec('PY-10 iframe criado com sandbox="allow-scripts" exato (sem allow-same-origin), allow vazio, origem opaca (self.origin "null"), sem acesso ao DOM da pagina, localStorage/cookie negados dentro dele',
      f.sandbox === 'allow-scripts' && f.allow === '' && !f.same && !!fo && fo.self === 'null' && fo.ls === 'SecurityError' && fo.ck === 'SecurityError' && f.title.length > 5 && /runner\.html$/.test(f.src), JSON.stringify({ f, fo }));
    L.rec('PY-10 nenhuma violacao de CSP inesperada no console da pagina', !csp.some(t => /Content Security Policy/.test(t) && !/canary/.test(t)), JSON.stringify(csp.filter(t => /Content Security/.test(t))).slice(0, 400));
    await c.close();
  }

  // ===== dados do cenario (D11): /data/<tabela>.csv =====
  if (want('PY-11')) {
    const tblNames = slug => ORA[slug].tables.map(t => t.name);
    const PROBE = `import csv, os
for n in sorted(os.listdir('/data')):
    rows = list(csv.reader(open('/data/' + n, newline='', encoding='utf-8')))
    print(n, len(rows) - 1, sum(1 for r in rows[1:] for c in r if c == ''), ','.join(rows[0]))`;
    for (const lang of ['en', 'pt']) {
      const { c, pg, log } = await open(br, SITE, lang, 'light');
      const dom = await pg.evaluate(() => ({ files: document.querySelectorAll('input[type=file], [type=file], [accept]').length, ids: ['pyFile', 'pyFileRm', 'pyFileInfo', 'pyFileNote'].filter(i => document.getElementById(i)), radios: document.querySelectorAll('#pyPicker input[type=radio]').length, checked: (document.querySelector('#pyPicker input:checked') || {}).value, files2: document.getElementById('pyDataFiles').textContent }));
      const before = log.requests.filter(u => /\/data\/csv\//.test(u)).length;
      L.rec(`PY-11 (${lang}) pagina sem escolha de arquivo (nenhum input file, nenhum controle de arquivo), 5 cenarios como radios, Vendas marcado, lista de arquivos de /data visivel; nenhum CSV buscado antes de Executar`, dom.files === 0 && dom.ids.length === 0 && dom.radios === 5 && dom.checked === 'loja-exemplo' && dom.files2.includes('/data/clientes.csv') && dom.files2.includes('/data/itens_pedido.csv') && before === 0, JSON.stringify({ dom, before }));
      const bad = [], seen = [];
      for (const slug of O.SLUGS) {
        await pg.check(`#pyPicker input[value="${slug}"]`);
        const listed = await pg.textContent('#pyDataFiles');
        const f0 = log.requests.length;
        await run(pg, PROBE); const g = await grab(pg);
        const got = g.out.trim().split('\n').map(l => { const [n, rows, nulls, ...h] = l.split(' '); return { n, rows: +rows, nulls: +nulls, header: h.join(' ') }; });
        const exp = tblNames(slug).slice().sort().map(n => { const t = ORA[slug].tables.find(x => x.name === n); return { n: n + '.csv', rows: t.count, nulls: t.nulls.reduce((a, b) => a + b, 0), header: t.columns.map(x => x.name).join(',') }; });
        const fetched = log.requests.slice(f0).filter(u => /\/data\/csv\//.test(u)).map(u => u.split('/').pop()).sort();
        const ok = JSON.stringify(got) === JSON.stringify(exp) && tblNames(slug).every(n => listed.includes('/data/' + n + '.csv')) && fetched.join() === tblNames(slug).map(n => n + '.csv').sort().join();
        seen.push(`${slug}: ${got.length} arquivos, ${got.reduce((a, r) => a + r.rows, 0)} linhas`);
        if (!ok) bad.push(`${slug}: dados=${JSON.stringify(got) === JSON.stringify(exp)} lista=${tblNames(slug).every(n => listed.includes('/data/' + n + '.csv'))} fetched=${fetched} esperado=${tblNames(slug).map(n => n + '.csv').sort()} got=${JSON.stringify(got.filter((r, i) => JSON.stringify(r) !== JSON.stringify(exp[i])))} exp=${JSON.stringify(exp.filter((r, i) => JSON.stringify(r) !== JSON.stringify(got[i])))}`);
      }
      L.rec(`PY-11 (${lang}) o cenario escolhido aparece em /data: os 5 cenarios, na MESMA sessao do Python (troca de cenario nao deixa arquivo do anterior), cada tabela com linhas, celulas vazias (NULL) e cabecalho = sqlite3; so as tabelas do cenario sao buscadas`, bad.length === 0 && log.pageerrors.length === 0, bad.length ? bad.join('\n') : seen.join(' | '));
      const f1 = log.requests.filter(u => /\/data\/csv\//.test(u)).length;
      await run(pg, "import os\nprint(len(os.listdir('/data')))"); const again = await grab(pg);
      L.rec(`PY-11 (${lang}) rodar de novo o mesmo cenario (Atendimento, 5 tabelas) nao busca os CSV outra vez (cache de memoria da pagina) e os arquivos sao reenviados ao Python`, again.out === '5\n' && log.requests.filter(u => /\/data\/csv\//.test(u)).length === f1, `saida=${JSON.stringify(again.out)} buscas ${f1} -> ${log.requests.filter(u => /\/data\/csv\//.test(u)).length}`);
      await c.close();
    }
    { // cada execucao comeca com /data intacto (o programa pode alterar/apagar os arquivos)
      const { c, pg } = await open(br, SITE, 'en', 'light');
      await run(pg, "import os\nopen('/data/clientes.csv', 'w').write('x\\n')\nos.remove('/data/categorias.csv')\nprint(sorted(os.listdir('/data')))"); const a = await grab(pg);
      await run(pg, "import os\nprint(sorted(os.listdir('/data')))\nprint(sum(1 for _ in open('/data/clientes.csv')) - 1)"); const b = await grab(pg);
      L.rec('PY-11 depois de um programa sobrescrever e apagar arquivos de /data, a execucao seguinte ve os arquivos originais (clientes com 40 linhas, categorias de volta)', b.out.startsWith("['categorias.csv', 'clientes.csv'") && /\n40\n$/.test(b.out) && !a.out.includes("'categorias.csv'"), JSON.stringify({ a: a.out, b: b.out }));
      await c.close(); }
    { // erro ao buscar os dados: mensagem clara, nada executa, nenhum iframe criado; depois recupera
      const { c, pg, log } = await open(br, SITE, 'en', 'light');
      await pg.route('**/csv/loja-exemplo/pedidos.csv', r => r.fulfill({ status: 404, body: 'nope' }));
      await run(pg, 'print("NAO DEVE EXECUTAR")'); let g = await grab(pg);
      L.rec('PY-11 CSV do cenario indisponivel (404): erro "Could not load the scenario data" com HTTP 404, nada executou, nenhum iframe/Pyodide criado, botoes liberados', g.errVisible && /Could not load the scenario data/.test(g.errT) && /HTTP 404 pedidos\.csv/.test(g.errM) && g.out === '' && g.frames === 0 && g.state === 'idle' && !g.runDisabled && pyReq(log).length === 0 && log.pageerrors.length === 0, JSON.stringify({ t: g.errT, m: g.errM, frames: g.frames, py: pyReq(log).length }));
      await pg.unroute('**/csv/loja-exemplo/pedidos.csv'); await run(pg, "import os\nprint(len(os.listdir('/data')))"); g = await grab(pg);
      L.rec('PY-11 depois do erro de dados, com o arquivo de volta o Executar funciona (5 arquivos) e o erro some', g.out === '5\n' && !g.errVisible, JSON.stringify(g.out));
      await c.close(); }
    { // Parar enquanto os dados estao sendo buscados: nada executa depois, nenhum iframe e criado
      const { c, pg, log } = await open(br, SITE, 'en', 'light');
      await pg.route('**/csv/loja-exemplo/clientes.csv', async r => { await new Promise(x => setTimeout(x, 1500)); r.continue(); });
      await pg.fill('#pyEditor', 'print("TARDIO")'); await pg.click('#pyRun'); await pg.waitForFunction(() => document.getElementById('pyTool').dataset.state === 'loading');
      const midStatus = await pg.textContent('#pyStatus'); const pickerLocked = await pg.evaluate(() => document.querySelector('#pyPicker input').disabled);
      await pg.click('#pyStop'); await pg.waitForTimeout(2500); const g = await grab(pg);
      L.rec('PY-11 Parar durante a busca dos dados: volta a "idle", seletor liberado, nada executa depois (sem saida "TARDIO"), nenhum iframe nem Pyodide criado; durante a busca o seletor fica travado', /Loading the scenario tables/.test(midStatus) && pickerLocked && g.state === 'idle' && g.out === '' && g.frames === 0 && pyReq(log).length === 0 && !(await pg.evaluate(() => document.querySelector('#pyPicker input').disabled)), JSON.stringify({ midStatus, pickerLocked, state: g.state, out: g.out, frames: g.frames }));
      await c.close(); }
    { // CSV com mais de 1 MiB ou vazio e recusado pela pagina (teto de defesa, o runner confere de novo)
      const { c, pg } = await open(br, SITE, 'en', 'light');
      await pg.route('**/csv/loja-exemplo/categorias.csv', r => r.fulfill({ status: 200, contentType: 'text/csv', body: '' }));
      await run(pg, 'print(1)'); const g = await grab(pg);
      L.rec('PY-11 CSV vazio recebido do servidor e recusado como erro de dados (nada executa)', g.errVisible && /scenario data/.test(g.errT) && /categorias\.csv: 0 bytes/.test(g.errM) && g.out === '', JSON.stringify({ t: g.errT, m: g.errM }));
      await c.close(); }
  }

  // ===== limites de codigo =====
  if (want('PY-12')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light'); const before = served.length;
    await pg.fill('#pyEditor', '# ' + 'x'.repeat(204800) + '\nprint(1)'); await pg.click('#pyRun'); let g = await grab(pg);
    L.rec('PY-12 codigo de 200 KB + 1: recusado com mensagem, sem iframe, sem requisicao pyodide', g.errVisible && /too large/i.test(g.errT) && g.frames === 0 && !served.slice(before).some(u => /pyodide/i.test(u)), JSON.stringify({ t: g.errT, m: g.errM }));
    await pg.fill('#pyEditor', '   \n'); await pg.click('#pyRun'); g = await grab(pg);
    L.rec('PY-12 editor vazio: "Nothing to run", sem iframe', g.errVisible && /Nothing to run/.test(g.errT) && g.frames === 0, g.errT);
    await pg.fill('#pyEditor', 'print("limite")\n#' + 'x'.repeat(204800 - 'print("limite")\n#'.length)); await pg.fill('#pyTimeout', '30');
    const bytes = await pg.evaluate(() => new TextEncoder().encode(document.getElementById('pyEditor').value).length);
    await pg.click('#pyRun'); await idle(pg); g = await grab(pg);
    L.rec(`PY-12 codigo com exatamente ${bytes} bytes (= 204.800) executa`, bytes === 204800 && g.out === 'limite\n', JSON.stringify(g.out) + ' bytes=' + bytes);
    await pg.fill('#pyEditor', 'print("ç"*2)'); await pg.keyboard.press('Control+Enter'); await idle(pg); const g2 = await grab(pg);
    L.rec('PY-12 Ctrl+Enter executa', g2.out === 'çç\n', JSON.stringify(g2.out)); await c.close();
  }

  // ===== sem CORS: falha limpa (controle negativo; unica parte com o cabecalho desligado) =====
  if (want('PY-26')) {
    opts.cors = false; const { c, pg, log } = await open(br, SITE, 'en', 'light'); outHits.length = 0;
    await run(pg, 'print(1)', { secs: 30 }); const g = await grab(pg); opts.cors = true;
    L.rec('PY-26 sem Access-Control-Allow-Origin (origem opaca do iframe): falha limpa, mensagem "Python stopped unexpectedly", sem execucao, sem iframe, UI utilizavel, sem pageerror na pagina', g.errVisible && /stopped unexpectedly/.test(g.errT) && g.out === '' && g.frames === 0 && g.state === 'idle' && !g.runDisabled && log.pageerrors.length === 0, JSON.stringify({ t: g.errT, m: g.errM.slice(0, 200), state: g.state }));
    await run(pg, 'print(2)'); const g2 = await grab(pg);
    L.rec('PY-26 com o cabecalho de volta, a mesma pagina executa', g2.out === '2\n' && !g2.errVisible, JSON.stringify(g2.out)); await c.close();
  }

  // ===== i18n: paridade de chaves e textos =====
  if (want('PY-13')) {
    const K = require(path.join(L.REPO, 'docs/testing/check-i18n-keys.js')); const dict = K.loadDict(path.join(L.REPO, 'hub/assets/js/i18n.js'));
    const used = new Set(); for (const f of ['hub/ferramentas/python/index.html', 'hub/index.html']) K.usedKeys([path.join(L.REPO, f)]).forEach(k => used.add(k));
    const js = fs.readFileSync(path.join(L.REPO, 'hub/assets/js/python.js'), 'utf8'); for (const m of js.matchAll(/'(hub\.py\.[a-z0-9.]+)'/g)) used.add(m[1]);
    const r = K.check(dict, used); const pyEn = Object.keys(dict.en).filter(k => k.startsWith('hub.py.')), pyPt = Object.keys(dict.pt).filter(k => k.startsWith('hub.py.'));
    L.rec(`PY-13 chaves: todas as usadas (HTML e python.js) existem em EN e PT; EN e PT com o mesmo conjunto; hub.py.* EN=${pyEn.length} PT=${pyPt.length}`, !r.usedMissingEn.length && !r.usedMissingPt.length && !r.enWithoutPt.length && !r.ptWithoutEn.length && pyEn.length === pyPt.length && pyEn.length > 40, JSON.stringify({ usedMissingEn: r.usedMissingEn, usedMissingPt: r.usedMissingPt, enWithoutPt: r.enWithoutPt, ptWithoutEn: r.ptWithoutEn }));
    const unusedPy = pyEn.filter(k => !used.has(k) && !/^hub\.py\.(err|status)\./.test(k)); L.rec('PY-13 sem chave hub.py.* orfa (fora das montadas dinamicamente)', unusedPy.length === 0, JSON.stringify(unusedPy));
    const same = pyEn.filter(k => dict.en[k] === dict.pt[k] && !/^hub\.py\.(err\.refused\.eval)$/.test(k)); L.rec('PY-13 nenhum texto PT identico ao EN (traducao nao esquecida)', same.length === 0, JSON.stringify(same));
    const vars = k => (s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join())(dict.en[k]) === (s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join())(dict.pt[k]);
    L.rec('PY-13 mesmos {placeholders} em EN e PT', pyEn.every(vars), JSON.stringify(pyEn.filter(k => !vars(k))));
    const { c, pg } = await open(br, SITE, 'pt', 'light'); const t = await pg.evaluate(() => ({ lang: document.documentElement.lang, run: document.getElementById('pyRun').textContent, h1: document.querySelector('h1').textContent, ph: document.querySelectorAll('[data-i]').length }));
    await pg.click('[data-lang=en]'); const t2 = await pg.evaluate(() => ({ lang: document.documentElement.lang, run: document.getElementById('pyRun').textContent, ls: localStorage.getItem('ld-lang') }));
    await run(pg, '1/0'); await pg.click('[data-lang=pt]'); const g = await grab(pg);
    L.rec('PY-13 PT/EN: textos e <html lang> trocam; erro e status ja exibidos sao retraduzidos ao trocar de idioma', t.lang === 'pt-BR' && t.run === 'Executar' && /Python/.test(t.h1) && t2.lang === 'en' && t2.run === 'Run' && /(erro|Erro)/.test(g.status) && /linhas? de sa\u00edda/.test(g.status) && /ZeroDivisionError/.test(g.out), JSON.stringify({ t, t2, status: g.status }));
    await c.close();
  }

  // ===== axe, tema, armazenamento =====
  if (want('PY-14|PY-15|PY-16')) {
    let bad = [], n = 0, inc = new Set();
    for (const lang of ['en', 'pt']) for (const theme of ['light', 'dark']) for (const vp of [360, 1280]) {
      const { c, pg } = await open(br, SITE, lang, theme, vp);
      for (const st of ['inicial', 'erro+saida']) {
        if (st === 'erro+saida') { await run(pg, 'print("saida")\nimport sys\nprint("err", file=sys.stderr)\n1/0'); await run(pg, 'print("x")', { secs: 5 }); await pg.fill('#pyTimeout', '5'); await pg.fill('#pyEditor', 'while True: pass'); await pg.click('#pyRun'); await idle(pg); await pg.fill('#pyEditor', 'print(12)'); await pg.click('#pyRun'); await idle(pg); await pg.fill('#pyEditor', '1/0'); await pg.click('#pyRun'); await idle(pg) ; }
        await pg.evaluate(() => window.scrollTo(0, 0)); await pg.evaluate(AXE); n++;
        const res = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return { v: r.violations.map(v => v.id + ' [' + v.impact + '] ' + v.nodes.slice(0, 3).map(x => x.target.join(' ')).join(' | ')), inc: r.incomplete.map(v => v.id + ' x' + v.nodes.length) }; });
        res.v.forEach(v => bad.push(`${lang}/${theme}/${vp}/${st}: ${v}`)); res.inc.forEach(v => inc.add(v));
        const horiz = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (horiz > 0) bad.push(`${lang}/${theme}/${vp}/${st}: overflow horizontal ${horiz}px`);
      }
      await c.close();
    }
    L.rec(`PY-14/A11-02 axe-core: zero violacoes (qualquer impacto, incl. best-practice) e sem rolagem horizontal em ${n} estados (EN/PT x claro/escuro x 360/1280 x inicial / com erro, saida e arquivo)`, bad.length === 0, bad.length ? [...new Set(bad)].join('\n') : 'nenhuma; incomplete (revisao manual): ' + ([...inc].join(', ') || 'nenhum'));
    // tema
    const cols = {};
    for (const theme of ['light', 'dark']) { const { c, pg } = await open(br, SITE, 'en', theme); await run(pg, 'print(1)\n1/0'); cols[theme] = await pg.evaluate(() => { const o = getComputedStyle(document.getElementById('pyOut')), e = getComputedStyle(document.getElementById('pyEditor')); return { out: o.backgroundColor + '/' + o.color, ed: e.backgroundColor + '/' + e.color, theme: document.documentElement.dataset.theme }; }); await c.close(); }
    L.rec('PY-15 temas claro e escuro aplicados a editor e saida (cores computadas diferem, vindas dos tokens)', cols.light.theme === 'light' && cols.dark.theme === 'dark' && cols.light.out !== cols.dark.out && cols.light.ed !== cols.dark.ed, JSON.stringify(cols));
    { const c = await L.ctx(br, { lang: 'en', extra: { reducedMotion: 'reduce' } }); const pg = await c.newPage(); await pg.goto(`${SITE}/${PAGE}`); const an = await pg.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect.getTiming().iterations === Infinity).length); L.rec('PY-15 reduced-motion: sem animacao infinita', an === 0, 'animacoes=' + an); await c.close(); }
    // armazenamento
    { const c = await L.ctx(br, { lang: 'en', theme: 'dark' }); const pg = await c.newPage(); await pg.goto(`${SITE}/${PAGE}`, { waitUntil: 'networkidle' });
      await run(pg, 'import js\nprint(1)'); await run(pg, 'print(open("/data/clientes.csv").read()[:5])');
      const st = await pg.evaluate(async () => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage), ck: document.cookie, idb: indexedDB.databases ? (await indexedDB.databases()).length : 'n/a', caches: (await caches.keys()).length }));
      const cookies = await c.cookies();
      L.rec('PY-16/PRV-06/07 depois de executar e ler os CSV do cenario: nenhum cookie, localStorage so ld-lang/ld-theme, sem sessionStorage/IndexedDB/Cache Storage', cookies.length === 0 && st.ck === '' && st.ls.every(k => ['ld-lang', 'ld-theme'].includes(k)) && !st.ss.length && st.idb === 0 && st.caches === 0, JSON.stringify({ st, cookies })); await c.close(); }
  }

  // ===== shell: a pagina entra na navegacao e no cartao da home =====
  if (want('PY-17')) {
    const { c, pg, log } = await open(br, SITE, 'en', 'light', 1280);
    const nav = await pg.evaluate(() => [...document.querySelectorAll('header .nav-in a:not(.brand)')].map(a => a.textContent.trim().replace(/\s+/g, ' ') + '|' + new URL(a.href).pathname));
    const crumb = await pg.evaluate(() => [...document.querySelectorAll('.crumb li')].map(l => l.textContent.trim()));
    await pg.goto(`${SITE}/hub/`); const cards = await pg.evaluate(() => [...document.querySelectorAll('.hub-card a')].map(a => a.getAttribute('href')));
    await pg.click('.hub-card a[href$="python/"]'); await pg.waitForLoadState('load'); const opens = await pg.evaluate(() => !!document.getElementById('pyEditor'));
    L.rec('PY-17 home: cartao de Python ativo e abre a ferramenta; navegacao e migalhas da pagina corretas; skip link e h1 unico', cards.join() === 'ferramentas/csv/,ferramentas/sql/,ferramentas/python/' && opens && crumb.join() === 'Home,Tools,Python playground' && /Tools\|\/hub\/ferramentas\/$/.test(nav[0]) && (await pg.evaluate(() => document.querySelectorAll('h1').length)) === 1 && log.pageerrors.length === 0, JSON.stringify({ cards, nav, crumb }));
    await c.close();
  }
  await finish();
})();
