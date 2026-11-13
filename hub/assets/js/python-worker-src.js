/* =====================================================================
   Fonte do Worker de Python (T-402, D10). NAO e carregado como Worker de URL.
   Este arquivo (script classico externo, permitido pela CSP 'self' do runner)
   so expoe o codigo de workerMain como TEXTO em window.__PY_WORKER_SRC. O
   runner cria o Worker a partir de uma URL data: (modulo), que herda a CSP do
   runner.html (sem eval, sem rede de fora). Um Worker de URL http(s) NAO herda
   a CSP e deixaria o Python do usuario exfiltrar dados (SEC-P3-03, SEC-P4-01).
   Por isso workerMain nao pode depender de nada fora de si mesma (e serializada
   com toString), nem de variaveis deste arquivo.

   Protocolo (tudo texto, numeros e ArrayBuffer):
     runner -> worker: {t:'init', indexURL}                      carrega (canario, depois Pyodide)
                       {t:'run', id, code, tables|null}          executa; tables = [{name, buf}] CSV do cenario (D11) e substitui /data/*
     worker -> runner: {t:'status', s:'canary-ok'|'loading'|'ready'}
                       {t:'refused', reason, detail}             canario falhou: NAO roda codigo
                       {t:'fatal', detail}
                       {t:'started', id}
                       {t:'out', id, parts:[[stream, texto], ...]}   stream 'out' | 'err'
                       {t:'done', id, ok}
                       {t:'pkgs', id, s:'loading'|'ready', names, bytes}   (D12) so informativo; pacotes sendo baixados/prontos
                       {t:'done', id, ok, hint?}                 hint = {k:'nomodule', name} (ModuleNotFoundError) | {k:'toodeep'} | {k:'dead'} (Pyodide morreu) | {k:'pkgfail'} | {k:'isolation'}
   D12 (numpy + pandas): sem micropip e SEM loadPackage exposto ao usuario. Quem carrega pacotes e este Worker, no inicio de cada execucao (antes de iniciar o
   codigo DESTA execucao; codigo de uma execucao anterior, ex. setInterval, pode continuar rodando: limite conhecido, M1), a partir de uma LISTA FECHADA de 5 pacotes (numpy, pandas, python-dateutil, pytz, six),
   decidida por analise do AST do codigo (imports) e nao por pedido do usuario. Os wheels vem do proprio site
   (vendor/pyodide/packages/, URL absoluta derivada de indexURL, sha256 conferido pelo Pyodide contra o pyodide-lock.json
   FILTRADO, que so conhece esses 5 pacotes). Depois de carregar, o canario roda de novo.
   ===================================================================== */
(function () {
  'use strict';
  function workerMain() {
    var CAP_LINES = 2000, CAP_BYTES = 262144;   // iguais aos do runner e da pagina (3 camadas)
    var violations = [];
    self.addEventListener('securitypolicyviolation', function (e) {
      violations.push(String(e.effectiveDirective || e.violatedDirective || ''));
    });
    var pyodide = null, cur = 0;
    var enc = new TextEncoder();

    // ---- D12: lista fechada de pacotes (nome do import -> pacote; dependencias e tamanho do wheel em bytes, do pyodide-lock.json)
    var IMPORT2PKG = { numpy: 'numpy', pandas: 'pandas', dateutil: 'python-dateutil', pytz: 'pytz', six: 'six' };
    var PKGS = {
      'numpy': { deps: [], bytes: 2960568 },
      'pandas': { deps: ['numpy', 'python-dateutil', 'pytz'], bytes: 4177749 },
      'python-dateutil': { deps: ['six'], bytes: 229892 },
      'pytz': { deps: [], bytes: 510489 },
      'six': { deps: [], bytes: 11050 }
    };
    var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
    var realLoad = null, helper = null, loadedPkgs = {}, gateOpen = false;
    // Analise (so ast.parse, nada do usuario executa): nomes de modulo de nivel superior em `import x`, `from x import y` (nivel 0),
    // e chamadas __import__('x') / import_module('x') com literal. Qualquer erro de analise (SyntaxError, recursao...) = nenhum pacote.
    var DETECT_PY = [
      'import ast',
      'def detect(src, known):',
      '    try:',
      '        tree = ast.parse(src)',
      '    except Exception:',
      '        return []',
      '    out = set()',
      '    for n in ast.walk(tree):',
      '        if isinstance(n, ast.Import):',
      '            for a in n.names:',
      '                out.add(a.name.split(".")[0])',
      '        elif isinstance(n, ast.ImportFrom):',
      '            if n.level == 0 and n.module:',
      '                out.add(n.module.split(".")[0])',
      '        elif isinstance(n, ast.Call) and n.args and isinstance(n.args[0], ast.Constant) and isinstance(n.args[0].value, str):',
      '            f = n.func',
      '            name = f.id if isinstance(f, ast.Name) else (f.attr if isinstance(f, ast.Attribute) else None)',
      '            if name in ("__import__", "import_module"):',
      '                out.add(n.args[0].value.split(".")[0])',
      '    return sorted(x for x in out if x in known)'
    ].join('\n');
    function detectPackages(code) {
      var proxy = null, res = [];
      try {
        helper.set('__src__', code);
        proxy = pyodide.runPython('detect(__src__, ' + JSON.stringify(Object.keys(IMPORT2PKG)) + ')', { globals: helper });
        res = proxy.toJs();
      } catch (e) { res = []; }
      finally { try { if (proxy) proxy.destroy(); } catch (e) {} }
      var pk = [];
      res.forEach(function (m) { if (own(IMPORT2PKG, m) && pk.indexOf(IMPORT2PKG[m]) < 0) pk.push(IMPORT2PKG[m]); });
      return pk;
    }
    // M2: o parser/AST do CPython no WebAssembly estoura a pilha (fatal, o Pyodide morre) em expressoes de ~1000 niveis: parenteses,
    // operadores unarios, cadeias de atributos ou de operadores binarios. Barreira barata e linear ANTES de ast.parse e antes de
    // executar. Limites bem abaixo do estouro (medido: ate 800 niveis passa; ~1000 mata; limites: 150 colchetes, 600 em cadeias). Nao cobre toda forma possivel de
    // aninhamento: o que escapar e tratado como "Pyodide morto" (ver run()).
    function tooComplex(code) {
      var depth = 0, max = 0;
      for (var i = 0; i < code.length; i++) {
        var ch = code.charCodeAt(i);
        if (ch === 40 || ch === 91 || ch === 123) { if (++depth > max) max = depth; }
        else if (ch === 41 || ch === 93 || ch === 125) { if (depth > 0) depth--; }
      }
      if (max > 150) return 'more than 150 nested brackets';
      if (/(?:[-+~][ \t]*){601,}/.test(code) || /(?:\bnot[ \t]+){601,}/.test(code)) return 'more than 600 chained unary operators';
      if (/(?:\.[ \t]*[A-Za-z_][A-Za-z_0-9]*[ \t]*){601,}/.test(code)) return 'more than 600 chained attribute accesses';
      if (/(?:[-+*\/%|&^][ \t]*[A-Za-z_0-9.]+[ \t]*){601,}/.test(code)) return 'more than 600 chained operators in one expression';
      return null;
    }
    function closure(names) {
      var seen = [];
      function add(n) { if (own(PKGS, n) && seen.indexOf(n) < 0) { seen.push(n); PKGS[n].deps.forEach(add); } }
      names.forEach(add);
      return seen;
    }

    // ---- saida em lotes com teto (a thread do Worker fica bloqueada durante runPython: sem timers)
    var buf = [], bufBytes = 0, lastFlush = 0, lines = 0, bytes = 0, truncated = false;
    function flush() {
      if (!buf.length) return;
      var parts = buf; buf = []; bufBytes = 0; lastFlush = performance.now();
      self.postMessage({ t: 'out', id: cur, parts: parts });
    }
    function emit(stream, text) {
      if (truncated) return;
      text = String(text);
      var n = 1;
      for (var i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
      var b = enc.encode(text).length + 1;
      if (lines + n > CAP_LINES || bytes + b > CAP_BYTES) {
        truncated = true; flush();
        self.postMessage({ t: 'out', id: cur, parts: [], truncated: true });
        return;
      }
      lines += n; bytes += b;
      push(stream, text + '\n');
    }
    function push(stream, s) {
      var last = buf[buf.length - 1];
      if (last && last[0] === stream) last[1] += s; else buf.push([stream, s]);
      bufBytes += s.length;
      // as primeiras linhas saem na hora: se o programa travar logo depois (laco infinito), o que ja foi impresso nao se perde
      if (lines <= 100 || bufBytes >= 32768 || performance.now() - lastFlush >= 50) flush();
    }

    // ---- canario: a CSP do runner foi herdada? (falha fechada)
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    async function canary() {
      var evalOpen = false, fnOpen = false, fetchOpen = false, wsOpen = false;
      try { (0, eval)('1'); evalOpen = true; } catch (e) {}
      try { new Function('return 1')(); fnOpen = true; } catch (e) {}
      var v0 = violations.length;
      // .invalid nunca resolve: mesmo se a CSP falhar nao ha trafego util nem dado do usuario na requisicao
      try { await fetch('https://canary.invalid/c', { mode: 'no-cors', cache: 'no-store' }); fetchOpen = true; } catch (e) {}
      try { var ws = new WebSocket('wss://canary.invalid/c'); ws.onerror = function () {}; wsOpen = true; setTimeout(function () { try { ws.close(); } catch (e) {} }, 0); } catch (e) { wsOpen = false; }
      await wait(100);
      var seen = violations.slice(v0);
      var fetchBlocked = !fetchOpen && seen.some(function (d) { return /^connect-src/.test(d); });
      var detail = JSON.stringify({ evalOpen: evalOpen, fnOpen: fnOpen, fetchOpen: fetchOpen, fetchBlocked: fetchBlocked, violations: seen.slice(0, 6) });
      if (evalOpen || fnOpen) return { ok: false, reason: 'eval', detail: detail };
      if (!fetchBlocked) return { ok: false, reason: 'fetch', detail: detail };
      return { ok: true };
    }

    // ---- tabelas do cenario escolhido em /data/<tabela>.csv (D11: nao ha arquivo do usuario; open()/csv ou pd.read_csv, D12)
    function safeName(n) {
      n = String(n || '').split(/[\\/]/).pop().replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^\.+/, '').slice(0, 100);
      return n || 'data.csv';
    }
    function syncFiles(files) {
      var FS = pyodide.FS;
      try { FS.mkdir('/data'); } catch (e) {}
      FS.readdir('/data').forEach(function (n) { if (n !== '.' && n !== '..') { try { FS.unlink('/data/' + n); } catch (e) {} } });
      files.forEach(function (f) {
        if (f && f.buf instanceof ArrayBuffer) FS.writeFile('/data/' + safeName(f.name), new Uint8Array(f.buf));
      });
    }

    // traceback sem os quadros internos do Pyodide (_pyodide/...): so o codigo do usuario fica visivel
    function cleanTb(msg) {
      var L = String(msg).split('\n'), out = [];
      for (var i = 0; i < L.length; i++) {
        if (/^\s+File "\/lib\/python[^"]*\/_pyodide\//.test(L[i]) || /^\s+File "\/lib\/python[^"]*\/pyodide\//.test(L[i])) {
          while (i + 1 < L.length && /^ {4,}/.test(L[i + 1]) && !/^\s+File /.test(L[i + 1])) i++;
          continue;
        }
        out.push(L[i]);
      }
      return out.join('\n');
    }

    async function init(indexURL) {
      var c = await canary();
      if (!c.ok) { self.postMessage({ t: 'refused', reason: c.reason, detail: c.detail }); return; }
      self.postMessage({ t: 'status', s: 'canary-ok' });
      self.postMessage({ t: 'status', s: 'loading' });
      var mod = await import(indexURL + 'pyodide.mjs');
      pyodide = await mod.loadPyodide({
        indexURL: indexURL,
        // D12: o lock e FILTRADO (so numpy, pandas, python-dateutil, pytz, six; sha256 de cada wheel) e os wheels vem do proprio
        // site, por URL absoluta. Nada e baixado agora: `packages` fica vazio e so o Worker (nunca o usuario) pede pacotes, em run().
        lockFileURL: indexURL + 'pyodide-lock.json',
        packageBaseUrl: indexURL + 'packages/',
        packages: [],
        stdin: function () { return null; }, // input() -> EOFError
        stdout: function (s) { emit('out', s); },
        stderr: function (s) { emit('err', s); }
      });
      // Guarda a funcao real e DESATIVA a exposta (pyodide_js.loadPackage / loadPackagesFromImports): o codigo do usuario nao pede pacotes.
      // A referencia fica numa variavel local deste Worker, fora do alcance do Python. micropip nao existe no lock filtrado.
      realLoad = pyodide.loadPackage.bind(pyodide);
      var off = function () { throw new Error('Package loading is disabled in this playground.'); };
      try { pyodide.loadPackage = off; pyodide.loadPackagesFromImports = off; } catch (e) {}
      // A API interna (pyodide_js._api.packageManager) tambem e alcancavel pelo Python, inclusive pelo prototipo
      // (Reflect.apply(proto.loadPackage...), constructor.prototype, deleteProperty na instancia). Fechamento (A1): os metodos que
      // carregam (loadPackage, loadPackageInner) sao SUBSTITUIDOS NO PROTOTIPO por uma versao com portao (so abre dentro de
      // ensurePackages), o prototipo e CONGELADO (nao da para trocar de volta) e o lock em memoria (lockfile_packages) e CONGELADO
      // (nao da para registrar pacote novo). Nao da para congelar a instancia (o Pyodide grava callbacks nela). Limite honesto: as
      // outras funcoes internas do gerenciador continuam chamaveis, mas sem entrada no lock so alcancam os 5 wheels do mesmo site;
      // a defesa real continua sendo CSP + sandbox de origem opaca + sha256 de cada wheel.
      try {
        var api = pyodide._api, pm = api && api.packageManager, PR = pm && Object.getPrototypeOf(pm);
        if (PR) {
          ['loadPackage', 'loadPackageInner'].forEach(function (k) {
            var orig = PR[k]; if (typeof orig !== 'function') return;
            Object.defineProperty(PR, k, { configurable: false, writable: false, value: function () {
              if (!gateOpen) throw new Error('Package loading is disabled in this playground.');
              return orig.apply(this, arguments);
            } });
          });
          Object.freeze(PR);
        }
        if (api && api.lockfile_packages) Object.freeze(api.lockfile_packages);
        if (api && api.lockfile && api.lockfile.packages) Object.freeze(api.lockfile.packages);
      } catch (e) { self.postMessage({ t: 'fatal', detail: 'hardening failed: ' + String((e && e.message) || e).slice(0, 200) }); throw e; }
      helper = pyodide.globals.get('dict')();   // namespace PRIVADO do detector (o usuario roda em outro dict)
      pyodide.runPython(DETECT_PY, { globals: helper, filename: '<detector>' });
      self.postMessage({ t: 'status', s: 'ready' });
    }

    // carrega (se faltar) os pacotes da lista fechada que o codigo importa; depois confere o que ficou carregado e repete o canario
    async function ensurePackages(names) {
      var need = closure(names).filter(function (n) { return !loadedPkgs[n]; });
      if (!need.length) return;
      var total = need.reduce(function (a, n) { return a + PKGS[n].bytes; }, 0);
      self.postMessage({ t: 'pkgs', id: cur, s: 'loading', names: need, bytes: total });
      var errs = [];
      gateOpen = true;
      try { await realLoad(names.filter(function (n) { return own(PKGS, n); }), { messageCallback: function () {}, errorCallback: function (m) { errs.push(String(m)); } }); }
      finally { gateOpen = false; }
      var got = Object.keys(pyodide.loadedPackages || {});
      var stray = got.filter(function (n) { return !own(PKGS, n); });
      if (stray.length) throw new Error('unexpected package loaded: ' + stray.join(','));
      need.forEach(function (n) { if (got.indexOf(n) < 0) throw new Error('package not loaded: ' + n + (errs.length ? ' (' + errs[0].slice(0, 200) + ')' : '')); loadedPkgs[n] = true; });
      var c = await canary();   // importar numpy/pandas nao pode ter reaberto eval nem rede
      if (!c.ok) { var ie = new Error('isolation check failed after loading packages (' + c.reason + ')'); ie.isolation = c.reason; throw ie; }
      self.postMessage({ t: 'pkgs', id: cur, s: 'ready', names: need, bytes: total });
    }

    async function run(d) {
      cur = d.id; lines = 0; bytes = 0; truncated = false; buf = []; bufBytes = 0; lastFlush = performance.now();
      var ok = true, g = null, hint = null;
      try {
        if (d.tables) syncFiles(d.tables);
        var why = tooComplex(String(d.code));
        if (why) {   // nao analisa nem executa: o parser do CPython no WASM morreria
          emit('err', 'Code not run: ' + why + ' (the Python parser would crash in this browser build).');
          flush(); self.postMessage({ t: 'done', id: cur, ok: false, hint: { k: 'toodeep' } }); return;
        }
        var want = detectPackages(String(d.code));
        if (want.length) {
          try { await ensurePackages(want); }
          catch (pe) {
            // falha ao baixar/instalar: o codigo do usuario NAO roda; mensagem no stderr e fim da execucao
            emit('err', 'Could not load numpy/pandas: ' + String((pe && pe.message) || pe).slice(0, 300));
            // (se foi o canario repetido que falhou, a pagina encerra a sessao: hint 'isolation')
            flush(); self.postMessage({ t: 'done', id: cur, ok: false, hint: pe && pe.isolation ? { k: 'isolation', reason: String(pe.isolation) } : { k: 'pkgfail' } }); return;
          }
        }
        self.postMessage({ t: 'started', id: cur });
        g = pyodide.globals.get('dict')();
        g.set('__name__', '__main__');
        pyodide.runPython(String(d.code), { globals: g, filename: '<main>' });
      } catch (e) {
        ok = false;
        var m = String((e && e.message) || e);
        var shown = cleanTb(m).replace(/\n+$/, '');
        var mm0 = /ModuleNotFoundError: No module named '([^'\n]{1,60})'/.exec(m);
        if (mm0) {
          // B2: a mensagem do Pyodide manda usar micropip/loadPackage, que NAO existem aqui: tira e explica o que vale neste playground
          shown = shown.split('\n').filter(function (l) { return /^ModuleNotFoundError/.test(l) || !/micropip|loadPackage|included in the Pyodide distribution|You can install it|loading-packages/i.test(l); }).join('\n');
          var top = mm0[1].split('.')[0];
          shown += '\n' + (own(IMPORT2PKG, top)
            ? 'Note: numpy and pandas are loaded only when an import statement is visible in your code (for example "import ' + top + '" at the top). Imports hidden in exec(), getattr or __import__(variable) are not detected.'
            : 'Note: only the Python standard library, numpy and pandas are available here (nothing can be installed).');
        }
        emit('err', shown);
        var mm = /ModuleNotFoundError: No module named '([^'\n]{1,60})'/.exec(m);
        if (mm) hint = { k: 'nomodule', name: mm[1] };
        var dead = /fatally failed|fatal error|Maximum call stack/i.test(m);
        if (!dead) { try { pyodide.runPython('0', { globals: helper }); } catch (pe2) { dead = true; } }   // sonda de vida: o estouro de pilha chega como excecao comum e deixa o Pyodide morto
        if (dead) hint = { k: 'dead' };   // Pyodide morreu (ex.: pilha estourada): a pagina recria a sessao
      } finally {
        try { if (g) g.destroy(); } catch (e) {}
      }
      flush();
      self.postMessage({ t: 'done', id: cur, ok: ok, hint: hint });
    }

    self.onmessage = function (e) {
      var d = e.data || {};
      if (d.t === 'init' && typeof d.indexURL === 'string') {
        init(d.indexURL).catch(function (err) { self.postMessage({ t: 'fatal', detail: String((err && err.message) || err).slice(0, 500) }); });
      } else if (d.t === 'run' && pyodide) {
        run(d).catch(function (err) { self.postMessage({ t: 'fatal', detail: String((err && err.message) || err).slice(0, 500) }); });
      }
    };
  }
  window.__PY_WORKER_SRC = '(' + workerMain.toString() + ')();';
})();
