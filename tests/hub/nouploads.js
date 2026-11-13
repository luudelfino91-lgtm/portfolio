// D11: nenhum upload de arquivo do usuario em lugar nenhum do Hub. Prova por (1) grep no codigo-fonte de hub/ (sem hub/assets/vendor, codigo de
// terceiros que o Hub nunca chama com arquivo do usuario; os acertos la sao listados), (2) DOM de TODAS as paginas do Hub (inclui Python), em PT e EN,
// (3) um drop de arquivo simulado em cada pagina nao tem tratador, (4) a UI nao oferece mais "carregar CSV", (5) i18n sem chaves de upload,
// (6) Papa Parse/csv-worker removidos e fora do manifest, (7) nenhuma pagina exige/permite WASM ou Worker alem do que ja usava.
const L = require('./lib'); const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const O = require('./oracle');
const HUB = path.join(L.REPO, 'hub');
const ALL_PAGES = [...L.PAGES, 'hub/ferramentas/python/'];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => { const f = path.join(d, e.name); return e.isDirectory() ? (e.name === 'vendor' || e.name === 'fonts' ? [] : walk(f)) : [f]; });
const SRC = walk(HUB).filter(f => /\.(html|js|css|json|md)$/.test(f));
const FORBID = [['type="file"/type=file', /type\s*=\s*["']?file/i], ['FileReader', /FileReader/], ['dataTransfer', /dataTransfer/], ['.files', /\.files\b/], ['showOpenFilePicker/showDirectoryPicker', /show(Open|Save|Directory)(File)?Picker/], ['webkitdirectory', /webkitdirectory/i], ['atributo accept=', /\baccept\s*=/i],
  ['ondrop/dragover/drop listener', /\bondrop\b|addEventListener\(\s*['"](drop|dragover|dragenter)['"]/], ['new File(/FormData', /new File\(|new FormData|FormData\(/], ['XMLHttpRequest/sendBeacon', /XMLHttpRequest|sendBeacon/], ['Papa/csv-worker', /\bPapa\b|csv-worker|papaparse/i]];
(async () => {
  // ---- 1) grep
  const hits = FORBID.map(([n, re]) => [n, SRC.flatMap(f => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => re.test(l) ? path.relative(L.REPO, f) + ':' + (i + 1) : null).filter(Boolean))]);
  const sc = cp.spawnSync('grep', ['-rlE', 'type="?file|FileReader|dataTransfer|\\.files\\b', path.join(HUB, 'assets/vendor')]).stdout.toString().trim().split('\n').filter(Boolean).map(f => path.relative(L.REPO, f));
  // os acertos de "Papa/csv-worker" em comentarios que explicam a remocao (README de vendor, status) ficam fora de hub/**/*.js e *.html; o README do vendor cita
  const bad = hits.filter(([n, h]) => h.length && !(n === 'Papa/csv-worker' && h.every(x => /\.md:|manifest\.json:/.test(x))));
  L.rec('NOUP-01 grep em hub/ (sem hub/assets/vendor): zero ocorrencias de type="file", FileReader, dataTransfer, .files, File System Access, webkitdirectory, accept=, tratador de drop/dragover, new File/FormData, XMLHttpRequest/sendBeacon, Papa/csv-worker (fora das notas de remocao em .md/manifest)', bad.length === 0, bad.length ? JSON.stringify(bad) : `${SRC.length} arquivos varridos; hits so em notas: ${JSON.stringify(hits.filter(([, h]) => h.length).map(([n, h]) => [n, h.length]))}`);
  console.log('INFO vendor (terceiros, fora do escopo do grep, nao chamado com arquivo do usuario): ' + (sc.join(', ') || 'nenhum'));
  const fetches = SRC.filter(f => /\.js$/.test(f)).flatMap(f => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => /\bfetch\(/.test(l) ? path.relative(L.REPO, f) + ':' + (i + 1) : null).filter(Boolean));
  const canaryLine = fs.readFileSync(path.join(HUB, 'assets/js/python-worker-src.js'), 'utf8').split('\n').filter(l => /\bfetch\(/.test(l));
  L.rec('NOUP-02 os UNICOS fetch() do Hub sao os dos dados embutidos (csv.js: schema.json e CSV; sql.js: .sql; python.js: CSV), todos same-origin sem credenciais; o outro fetch() e so o do CANARIO do Worker de Python, para canary.invalid (precisa FALHAR: prova de que a CSP foi herdada)', JSON.stringify(fetches.map(x => x.split(':')[0]).filter(f => !/python-worker-src/.test(f)).sort()) === JSON.stringify(['hub/assets/js/csv.js', 'hub/assets/js/python.js', 'hub/assets/js/sql.js']) && canaryLine.length === 1 && /canary\.invalid/.test(canaryLine[0]) && SRC.filter(f => /\.js$/.test(f) && !/python-worker-src/.test(f)).every(f => { const t = fs.readFileSync(f, 'utf8'); return !/fetch\(/.test(t) || /credentials:\s*'omit'/.test(t); }), JSON.stringify(fetches));
  // ---- 6) vendor
  const man = JSON.parse(fs.readFileSync(path.join(HUB, 'assets/vendor/manifest.json'), 'utf8')), sums = fs.readFileSync(path.join(HUB, 'assets/vendor/SHA256SUMS'), 'utf8');
  const sh = cp.spawnSync('sha256sum', ['-c', 'SHA256SUMS'], { cwd: path.join(HUB, 'assets/vendor') });
  L.rec('NOUP-03 Papa Parse e csv-worker removidos: arquivos apagados, fora do manifest.json e do SHA256SUMS; sha256sum -c do vendor continua OK', !fs.existsSync(path.join(HUB, 'assets/vendor/papaparse')) && !fs.existsSync(path.join(HUB, 'assets/js/csv-worker.js')) && !man.files.some(f => /papa/i.test(f.path + f.package)) && !/papaparse/.test(sums) && sh.status === 0, `sha256sum -c: exit=${sh.status} ${String(sh.stdout).split('\n').filter(Boolean).length} arquivos; manifest=${man.files.length} entradas`);
  // ---- 5) i18n
  const { loadDict } = require(path.join(L.REPO, 'docs/testing/check-i18n-keys.js')); const dict = loadDict(path.join(HUB, 'assets/js/i18n.js'));
  const dead = Object.keys(dict.en).filter(k => /^hub\.(csv\.(drop|opt|delim|enc|warn|cancel|progress|noname|err\.(empty|binary|size|parse|worker|noworker|cols|keep))|sql\.(load|progress|schema\.(note|cap\.csv|th\.orig))|py\.(file|err\.file))/.test(k) || /^hub\.csv\.(status\.(canceled)|stat\.(file|size|delim|enc))/.test(k));
  const words = Object.entries(dict.en).filter(([k, v]) => /(choose a file|drop a|upload a|load a csv|your own csv|your csv|10 MB per file|delimiter|encoding)/i.test(v) && !/hub\.(priv|home|tool|desc)/.test(k)).map(([k]) => k);
  const wordsPt = Object.entries(dict.pt).filter(([k, v]) => /(escolher um arquivo|solte|carregar um csv|seus próprios csv|seu csv|delimitador|codificação)/i.test(v)).map(([k]) => k);
  L.rec('NOUP-04 i18n: nenhuma chave dos recursos removidos (arrastar, escolher arquivo, delimitador, codificacao, tamanho maximo, aviso de leitura, arquivo do Python) em EN nem PT; nenhum texto de interface oferece carregar/escolher arquivo; paridade EN = PT', dead.length === 0 && words.length === 0 && wordsPt.length === 0 && Object.keys(dict.en).sort().join() === Object.keys(dict.pt).sort().join(), JSON.stringify({ dead, words, wordsPt, en: Object.keys(dict.en).length, pt: Object.keys(dict.pt).length }));
  // chaves nunca usadas (codigo morto de texto): toda chave hub.csv/sql/py/sc existe em HTML ou JS, literal ou por prefixo dinamico
  const code = SRC.filter(f => /\.(html|js)$/.test(f) && !/i18n\.js$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const prefixes = [...code.matchAll(/['"](hub\.[a-z.]+\.)['"]\s*\+/g)].map(m => m[1]);
  const unused = Object.keys(dict.en).filter(k => /^hub\.(csv|sql|py|sc)\./.test(k) && !code.includes(k.replace(/\.(one|other)$/, '')) && !code.includes(k) && !prefixes.some(p => k.startsWith(p)));   // .one/.other = plural escolhido em plural(base, n)
  L.rec('NOUP-05 i18n sem chave morta: toda chave hub.csv.*, hub.sql.*, hub.py.* e hub.sc.* e usada no HTML/JS (literal ou por prefixo dinamico)', unused.length === 0, JSON.stringify(unused));
  // ---- 2/3/4) DOM de todas as paginas
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800)); const br = await L.launch();
  const rows = [];
  for (const lang of ['en', 'pt']) for (const p of ALL_PAGES) {
    const c = await L.ctx(br, { lang }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
    await pg.goto(`${L.BASE}/${p}`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
    const r = await pg.evaluate(() => {
      const dt = new DataTransfer(); dt.items.add(new File(['a,b\n1,2\n'], 'x.csv', { type: 'text/csv' }));
      const evs = ['dragenter', 'dragover', 'drop'].map(n => { const e = new DragEvent(n, { dataTransfer: dt, bubbles: true, cancelable: true }); (document.querySelector('main') || document.body).dispatchEvent(e); return e.defaultPrevented; });
      return { files: document.querySelectorAll('input[type=file], [type=file], [accept], [webkitdirectory], [ondrop], [ondragover]').length, inputs: [...document.querySelectorAll('input')].map(i => i.type).filter(t => t !== 'radio' && t !== 'number'), prevented: evs, text: document.body.innerText };
    });
    const offers = /(drop a|choose a file|upload a (file|csv)|upload your|load a csv|load your|solte um|escolher um arquivo|carregar um csv|carregue seu)/i.test(r.text);
    rows.push({ p, lang, ok: r.files === 0 && r.inputs.length === 0 && r.prevented.every(x => x === false) && !offers && log.pageerrors.length === 0, r: { files: r.files, inputs: r.inputs, prevented: r.prevented, offers } });
    await c.close();
  }
  L.rec(`NOUP-06 DOM de ${ALL_PAGES.length} paginas do Hub x EN/PT: nenhum input file/accept/webkitdirectory/ondrop; os unicos <input> sao radios (cenarios) e o numero do tempo limite do Python; drop de arquivo simulado (dragenter/dragover/drop) NAO e tratado (defaultPrevented=false); nenhum texto oferece enviar/escolher/soltar arquivo`, rows.every(x => x.ok) && rows.length === ALL_PAGES.length * 2, rows.filter(x => !x.ok).map(x => JSON.stringify(x)).join('\n') || `${rows.length} combinacoes sem upload`);
  // controles removidos nao existem em nenhuma pagina
  const gone = ['csvFile', 'csvDrop', 'csvDelim', 'csvEnc', 'csvRun', 'csvProg', 'csvCancel', 'sqlFile', 'sqlDelim', 'sqlEnc', 'sqlLoadRun', 'sqlLoadCancel', 'sqlProg', 'sqlTypeNote', 'pyFile', 'pyFileRm', 'pyFileInfo'];
  const c2 = await L.ctx(br, { lang: 'en' }); const pg2 = await c2.newPage(); const present = [];
  for (const p of ['hub/ferramentas/csv/', 'hub/ferramentas/sql/', 'hub/ferramentas/python/']) { await pg2.goto(`${L.BASE}/${p}`, { waitUntil: 'networkidle' }); present.push(...await pg2.evaluate(ids => ids.filter(i => document.getElementById(i)), gone)); }
  L.rec('NOUP-07 nenhum dos 17 controles de arquivo removidos (ids csvFile/csvDrop/sqlFile/pyFile e afins) existe no DOM das 3 ferramentas', present.length === 0, JSON.stringify(present)); await c2.close();
  // ---- 7) CSPs: nenhuma pagina ganhou permissao; o explorador perdeu worker-src
  const csp = p => fs.readFileSync(path.join(L.REPO, p, 'index.html'), 'utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const base = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'";
  const want = { 'hub/': base, 'hub/ferramentas/': base, 'hub/privacidade/': base, 'hub/ferramentas/csv/': base, 'hub/ferramentas/sql/': base.replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval'").replace("base-uri", "worker-src 'self'; base-uri"), 'hub/ferramentas/python/': base.replace("connect-src 'self'; ", "connect-src 'self'; frame-src 'self'; ") };
  const diffs = Object.entries(want).filter(([p, w]) => csp(p) !== w).map(([p, w]) => p + ' => ' + csp(p));
  L.rec("NOUP-08 CSP das 6 paginas = a esperada: explorador SEM worker-src e SEM wasm-unsafe-eval (mais restrita que antes); SQL igual a de antes; Python so trocou connect-src 'none' por 'self' (para buscar os CSV do cenario na mesma origem); demais iguais", diffs.length === 0, JSON.stringify(diffs));
  // ---- 8) NOUP-09: o <select> de tabelas nao e confiavel; valor fora da definicao do cenario nao gera fetch
  for (const lang of ['en', 'pt']) {
    const c3 = await L.ctx(br, { lang }); const pg3 = await c3.newPage(); const log3 = L.newLog(); L.watch(pg3, log3);
    await pg3.goto(`${L.BASE}/hub/ferramentas/csv/`, { waitUntil: 'networkidle' });
    await pg3.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'ready');
    const reqs0 = log3.requests.length;
    await pg3.evaluate(() => { const o = document.createElement('option'); o.value = '../../../README'; o.textContent = 'x'; const s = document.getElementById('csvTable'); s.appendChild(o); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await pg3.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'error', null, { timeout: 5000 }).catch(() => {});
    const r = await pg3.evaluate(() => ({ state: document.getElementById('csvTool').dataset.state, errVisible: !document.getElementById('csvErr').hidden, t: document.getElementById('csvErrT').textContent, m: document.getElementById('csvErrM').textContent }));
    const extra = log3.requests.slice(reqs0);
    L.rec(`NOUP-09 (${lang}) tabela fora da definicao do cenario (option injetada "../../../README"): erro exibido por textContent, estado "error", zero requisicoes novas`, r.state === 'error' && r.errVisible && r.t.length > 0 && r.m.includes('../../../README') && extra.length === 0 && log3.pageerrors.length === 0, JSON.stringify({ r, extra, pe: log3.pageerrors.length }));
    await c3.close();
  }
  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
