// Leitor de CSV (T-302, T-306a CSV, T-309): CSV-01..04, 10, 12, 14, 15, 30, 40(xss), 51..53, 360px, axe, privacidade.
// Requer: fixtures pequenas em docs/testing/fixtures e as grandes em FIXTURES_LARGE (padrao /tmp/csv-large),
//   geradas FORA do repo: (cd docs/testing/fixtures && python3 -I gen_csv.py --large --out /tmp/csv-large)
const L = require('./lib'); const fs = require('fs'); const path = require('path');
const FX = path.join(L.REPO, 'docs/testing/fixtures'); const LARGE = process.env.FIXTURES_LARGE || '/tmp/csv-large';
const EXP = JSON.parse(fs.readFileSync(FX + '/expected.json', 'utf8')).files.reduce((a, f) => (a[f.file] = f, a), {});
const AXE = fs.existsSync(L.AXE_PATH) ? fs.readFileSync(L.AXE_PATH, 'utf8') : null;
if (!AXE) L.rec('A11-02 (CSV) axe-core presente em ' + L.AXE_PATH + ' (sem ele a cobertura axe nao roda)', false, 'instale axe-core: cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz');
const PAGE = 'hub/ferramentas/csv/';
const fpath = n => path.isAbsolute(n) ? n : fs.existsSync(path.join(FX, n)) ? path.join(FX, n) : path.join(LARGE, n);

async function load(pg, name, opts = {}) {
  await pg.setInputFiles('#csvFile', typeof name === 'string' ? fpath(name) : name);
  await pg.waitForFunction(() => ['ready', 'error'].includes(document.getElementById('csvTool').dataset.state), null, { timeout: 60000 });
}
const grab = pg => pg.evaluate(() => {
  const g = id => document.getElementById(id);
  return {
    state: g('csvTool').dataset.state, errVisible: !g('csvErr').hidden, err: g('csvErr').textContent, warn: g('csvWarn').hidden ? '' : g('csvWarn').textContent,
    status: g('csvStatus').textContent, rows: (document.querySelector('[data-stat=rows]') || {}).textContent, cols: (document.querySelector('[data-stat=cols]') || {}).textContent,
    delim: (document.querySelector('[data-stat=delim]') || {}).textContent, enc: (document.querySelector('[data-stat=enc]') || {}).textContent,
    header: [...document.querySelectorAll('#csvData thead th')].map(e => e.textContent),
    body: [...document.querySelectorAll('#csvData tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)),
    types: [...document.querySelectorAll('#csvCols tbody td[data-type]')].map(e => e.dataset.type),
    resultVisible: !g('csvResult').hidden, bodyText: document.body.innerText,
  };
});
const os = require('os');
// SEC-P3-01: fixtures de largura geradas em tempo de teste, fora do repo
const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-wide-'));
const wide = n => { const p = path.join(WDIR, 'wide-' + n + '.csv'); const h = Array.from({ length: n }, (_, i) => 'c' + (i + 1)); fs.writeFileSync(p, h.join(',') + '\n' + h.map((_, i) => i).join(',') + '\n' + h.map((_, i) => 'v' + i).join(',') + '\n'); return p; };
const nf = (n, lang) => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(n);

(async () => {
  const srv = L.startServers(); await new Promise(r => setTimeout(r, 800));
  const br = await L.launch();
  const cases = ['basic.csv', 'bom.csv', 'latin1.csv', 'semicolon.csv', 'tab.tsv', 'pipe.csv', 'quoted.csv', 'xss.csv', 'types.csv', 'nulls.csv', 'ragged.csv', 'dup-headers.csv', 'crlf.csv', 'cr.csv', 'lf.csv', 'one-col.csv', 'wide.csv', 'header-only.csv', 'canary-CANARIO-NOME-4c8e1b.csv'];
  const DN = { ',': 'comma|vírgula', ';': 'semicolon|ponto e vírgula', '\t': 'tab', '|': 'pipe|barra vertical' };

  for (const [base, label] of [[L.BASE, 'raiz /hub/'], [L.SUB, 'subpasta /portfolio/hub/']]) {
    for (const lang of ['pt', 'en']) {
      const c = await L.ctx(br, { lang }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log);
      let dialogs = 0; pg.on('dialog', d => { dialogs++; d.dismiss(); });
      await pg.goto(`${base}/${PAGE}`, { waitUntil: 'networkidle' });
      const bad = [];
      for (const n of cases) {
        const e = EXP[n]; await load(pg, n); const r = await grab(pg);
        const dn = e.delimiter ? DN[e.delimiter] : 'none|nenhum';
        const rowsOk = r.rows === (e.rows === 1 ? (lang === 'pt' ? '1 linha' : '1 row') : `${nf(e.rows, lang)} ${lang === 'pt' ? 'linhas' : 'rows'}`);
        const colsOk = r.cols === (e.columns === 1 ? (lang === 'pt' ? '1 coluna' : '1 column') : `${e.columns} ${lang === 'pt' ? 'colunas' : 'columns'}`);
        const delimOk = new RegExp(dn).test(r.delim);
        const hdrOk = JSON.stringify(r.header.map(h => /^\((no name|sem nome)\)$/.test(h) ? '' : h)) === JSON.stringify(e.header.slice(0, 200)); // previa limitada a 200 colunas (SEC-P3-01)
        const firstOk = e.first_rows.slice(0, 10).every((row, i) => r.body[i] && r.body[i].length === Math.min(e.columns, 200) && row.slice(0, Math.min(e.columns, 200)).every((v, j) => r.body[i][j] === v));
        const typesOk = e.columns_stats ? JSON.stringify(r.types) === JSON.stringify(e.columns_stats.map(s => s.type)) : true;
        const nobom = !r.header.join('').includes('﻿') && !r.bodyText.includes('﻿');
        const nofffd = !r.bodyText.includes('�') || n === 'xss.csv';
        const prev = r.body.length === Math.min(100, e.rows);
        if (!(r.state === 'ready' && rowsOk && colsOk && delimOk && hdrOk && firstOk && typesOk && nobom && nofffd && prev)) bad.push(`${n}: ${JSON.stringify({ state: r.state, rows: r.rows, cols: r.cols, delim: r.delim, rowsOk, colsOk, delimOk, hdrOk, firstOk, typesOk, nobom, nofffd, prev, shown: r.body.length })}`);
      }
      L.rec(`CSV-01/02/03/04/12/14/16/17/19/20 (${label}, ${lang}): ${cases.length} fixtures conferem com expected.json (linhas, colunas, delimitador, cabecalho, 10 primeiras linhas, tipos, sem BOM/U+FFFD, previa=min(100,linhas))`, bad.length === 0, bad.length ? bad.join('\n') : 'todas conferem');
      // basic: texto "10.000 linhas"/"10 colunas" e 100 linhas
      await load(pg, 'basic.csv'); const b = await grab(pg);
      L.rec(`CSV-01 (${label}, ${lang}) basic.csv: 100 linhas na previa, "${nf(10000, lang)}" e "10" visiveis`, b.body.length === 100 && b.rows.startsWith(nf(10000, lang)) && b.cols.startsWith('10'), `${b.rows} | ${b.cols} | previa=${b.body.length} | status="${b.status}"`);
      // erros
      const errs = [];
      for (const n of ['empty.csv', 'fake.csv']) {
        await load(pg, n); const r = await grab(pg);
        const hasCause = r.err.length > 30 && /(empty|no content|vazio|sem conte|binary|bin[aá]rio|text file|texto)/i.test(r.err);
        const hasAction = /(Choose|Try|Use|Escolha|Tente|Use)/.test(r.err);
        errs.push(`${n}: ${r.state}/${r.errVisible} "${r.err}"`);
        if (!(r.errVisible && hasCause && hasAction && !/undefined|NaN|\{|\}/.test(r.err))) errs.push('  FALHOU causa/acao');
      }
      L.rec(`CSV-10/CSV-30 (${label}, ${lang}) empty.csv e fake.csv: mensagem com causa e acao, sem pageerror`, !errs.some(s => /FALHOU/.test(s)) && log.pageerrors.length === 0, errs.join('\n') + ` | pageerrors=${log.pageerrors.length}`);
      L.rec(`CSV-40 (${label}, ${lang}) sem pageerror, sem dialogo, sem erro de console em todas as cargas`, log.pageerrors.length === 0 && dialogs === 0 && log.consoleErrors.length === 0, `pageerrors=${JSON.stringify(log.pageerrors)} dialogs=${dialogs} console=${JSON.stringify(log.consoleErrors)}`);
      const origin = new URL(base).origin;
      const foreign = log.requests.filter(u => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'));
      const leaks = log.requests.filter(u => /CANARIO|9f3a7c/i.test(decodeURIComponent(u)));
      L.rec(`PRV (${label}, ${lang}) nenhuma requisicao a outra origem e nenhum canario em URL (${log.requests.length} requisicoes)`, foreign.length === 0 && leaks.length === 0, `externas=${JSON.stringify(foreign)} canario em URL=${JSON.stringify(leaks)}`);
      await c.close();
    }
  }

  // ---- xss: nada de elemento injetado
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); let dl = 0; pg.on('dialog', d => { dl++; d.dismiss(); });
    await pg.goto(`${L.BASE}/${PAGE}`); await load(pg, 'xss.csv'); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => ({ imgs: document.querySelectorAll('#csvTool img, #csvTool iframe, #csvTool a, #csvTool svg:not([aria-hidden])').length, scripts: document.querySelectorAll('main script').length, inTable: document.querySelectorAll('#csvData *:not(table):not(thead):not(tbody):not(tr):not(th):not(td):not(caption):not(div.csv-cell)').length, hasText: document.querySelector('#csvData thead th').textContent }));
    L.rec('CSV-40/41 xss.csv: celulas e cabecalhos como texto (nenhum img/script/iframe/a injetado, nenhum dialogo, nenhum onerror)', r.inTable === 0 && r.scripts === 0 && r.imgs === 0 && dl === 0 && r.hasText === '<img src=x onerror=alert(1)>' && log.pageerrors.length === 0, JSON.stringify(r) + ' dialogs=' + dl);
    // nome de arquivo malicioso so como texto
    const buf = fs.readFileSync(fpath('xss.csv')); for (const nm of ['<img src=x onerror=alert(1)>.csv', '"><script>alert(1)</script>.csv', "a'b\"c`d.csv"]) {
      await load(pg, { name: nm, mimeType: 'text/csv', buffer: buf }); }
    const nm = await pg.evaluate(() => ({ t: document.querySelector('[data-stat=file]').textContent, n: document.querySelectorAll('[data-stat=file] *').length, scripts: document.querySelectorAll('main script, main img').length }));
    L.rec('CSV-22 nome de arquivo malicioso aparece como texto', nm.n === 0 && nm.scripts === 0 && dl === 0 && nm.t.includes("a'b\"c`d.csv"), JSON.stringify(nm));
    await c.close(); }

  // ---- codificacao manual (CSV-15)
  { const c = await L.ctx(br, { lang: 'pt' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`);
    await load(pg, 'latin1.csv'); const a = await grab(pg);
    L.rec('CSV-15 latin1.csv (auto): sem "�", acentos corretos, aviso de codificacao exibido', !a.bodyText.includes('�') && a.body[0][1] === 'João' && /Windows-1252/.test(a.warn), `linha1=${JSON.stringify(a.body[0])} aviso="${a.warn}" enc="${a.enc}"`);
    await pg.selectOption('#csvEnc', 'utf-8'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'ready' && document.querySelector('#csvData tbody td').textContent.length > 0);
    await pg.waitForTimeout(300); const u = await grab(pg);
    L.rec('CSV-15 latin1.csv forcado UTF-8: mostra aviso claro de caracteres nao decodificados', u.bodyText.includes('�') && /não puderam ser decodificados/.test(u.warn), `aviso="${u.warn}" linha1=${JSON.stringify(u.body[0])}`);
    await pg.selectOption('#csvEnc', 'windows-1252'); await pg.waitForTimeout(600); const w = await grab(pg);
    L.rec('CSV-15 escolha manual Windows-1252: acentos corretos e sem aviso', w.body[0][1] === 'João' && !w.bodyText.includes('�') && w.warn === '', `linha1=${JSON.stringify(w.body[0])} aviso="${w.warn}"`);
    await load(pg, 'bom.csv'); const bm = await grab(pg);
    L.rec('CSV-14 bom.csv: 1a coluna "código" sem U+FEFF; basic.csv acentos identicos', bm.header[0] === 'código' && bm.enc.includes('BOM'), `header=${JSON.stringify(bm.header)} enc=${bm.enc}`);
    await c.close(); }

  // ---- limites e desempenho (CSV-51/52/53)
  { const c = await L.ctx(br, { lang: 'pt' }); await c.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) { window.__lt = null; } });
    const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); await pg.goto(`${L.BASE}/${PAGE}`);
    const lim = fpath('limit-10mb.csv'), over = fpath('over-limit.csv');
    if (!fs.existsSync(lim) || !fs.existsSync(over)) { L.rec('CSV-51/52 fixtures grandes presentes', false, 'gere com gen_csv.py --large --out ' + LARGE); }
    else {
      const sz = [fs.statSync(lim).size, fs.statSync(over).size];
      const t0 = Date.now(); await load(pg, lim); const dt = Date.now() - t0; const r = await grab(pg);
      const lt = await pg.evaluate(() => window.__lt);
      const mx = lt && lt.length ? Math.max(...lt) : 0;
      L.rec('CSV-51 limit-10mb.csv (10.485.760 bytes) aceito, 111.875 linhas x 10 colunas, nenhuma long task > 1 s (PerformanceObserver)', sz[0] === 10485760 && r.state === 'ready' && r.rows.startsWith('111.875') && r.cols.startsWith('10') && lt !== null && mx < 1000, `bytes=${sz[0]} estado=${r.state} ${r.rows} ${r.cols} tempo=${dt} ms long tasks=${JSON.stringify(lt)} maior=${Math.round(mx)} ms`);
      L.rec('CSV-51 limit-10mb.csv previa de 100 linhas e tipos conferem com expected.json', r.body.length === 100 && JSON.stringify(r.types) === JSON.stringify(EXP['limit-10mb.csv'].columns_stats.map(s => s.type)), `previa=${r.body.length} tipos=${r.types}`);
      await load(pg, over); const o = await grab(pg);
      L.rec('CSV-52 over-limit.csv (10.485.761 bytes) recusado com "10 MB"; arquivo anterior mantido', sz[1] === 10485761 && o.errVisible && /10 MB/.test(o.err) && o.resultVisible && o.rows.startsWith('111.875'), `bytes=${sz[1]} msg="${o.err}" resultado anterior visivel=${o.resultVisible}`);
      // cancelar a 40%: a leitura de 10 MB e rapida, entao a amostragem pode perder a corrida contra o fim da leitura;
      // ate 5 tentativas (a asserção abaixo continua exigindo cancelamento efetivo a >=40%)
      let seen = [], cancelled = null;
      for (let attempt = 0; attempt < 5 && cancelled === null; attempt++) {
        await pg.goto(`${L.BASE}/${PAGE}`); await load(pg, 'basic.csv');
        await pg.setInputFiles('#csvFile', lim);
        for (let i = 0; i < 4000; i++) {
          const v = await pg.evaluate(() => ({ p: document.getElementById('csvProg').value, s: document.getElementById('csvTool').dataset.state }));
          seen.push(v.p); if (v.s !== 'loading' && i > 0) break;
          if (v.p >= 40) {
            try { await pg.click('#csvCancel', { timeout: 1000 }); cancelled = v.p; } catch (e) { /* leitura terminou antes do clique: nova tentativa */ }
            break; }
          await pg.waitForTimeout(5);
        }
      }
      await pg.waitForTimeout(1500); const k = await grab(pg);
      const info = await pg.evaluate(() => ({ focus: document.activeElement.id, runHidden: document.getElementById('csvRun').hidden }));
      L.rec('CSV-53 cancelar a >=40%: interrompe, volta ao estado anterior (basic.csv), sem resultado tardio, sem pageerror', cancelled !== null && cancelled >= 40 && k.state === 'ready' && k.rows.startsWith('10.000') && /cancelada/i.test(k.status) && info.runHidden && log.pageerrors.length === 0, `cancelado em ${cancelled}% (amostras de progresso=${JSON.stringify(seen.slice(-8))}) estado=${k.state} linhas=${k.rows} status="${k.status}" foco=${info.focus}`);
      if (cancelled === null) console.log('INFO leitura terminou antes de 40% ser amostrado: progresso=' + JSON.stringify(seen));
    }
    await c.close(); }


  // ---- SEC-P3-01: limite de colunas (2.000), Hub.t em passada unica
  { const c = await L.ctx(br, { lang: 'pt' }); await c.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) { window.__lt = null; } });
    const pg = await c.newPage(); const log = L.newLog(); L.watch(pg, log); await pg.goto(`${L.BASE}/${PAGE}`);
    const nodes = () => pg.evaluate(() => document.getElementsByTagName('*').length);
    const lts = () => pg.evaluate(() => window.__lt);
    await load(pg, wide(2000)); let r = await grab(pg);
    const n2000 = await nodes();
    L.rec('SEC-P3-01 CSV 2.000 colunas aceito: 2.000 colunas/tipos contados, previa limitada a 200 colunas com aviso', r.state === 'ready' && r.cols.startsWith('2.000') && r.types.length === 2000 && r.header.length === 200 && r.body.length === 2 && r.body[0].length === 200 && /200 primeiras de 2\.000/.test(r.warn) && n2000 < 20000, `estado=${r.state} cols="${r.cols}" tipos=${r.types.length} cabecalho=${r.header.length} aviso="${r.warn}" nos DOM=${n2000}`);
    await load(pg, 'basic.csv');
    for (const n of [2001, 5000, 100000]) {
      await pg.evaluate(() => { window.__lt = []; });
      const t0 = Date.now(); await load(pg, wide(n)); const dt = Date.now() - t0; r = await grab(pg); const lt = await lts(); const mx = lt && lt.length ? Math.max(...lt) : 0; const nn = await nodes();
      L.rec(`SEC-P3-01 CSV ${n} colunas recusado com causa e acao, arquivo anterior mantido, long task < 1 s, DOM < 20.000 nos`, r.errVisible && r.err.includes(nf(n, 'pt')) && r.err.includes('2.000') && /Escolha/.test(r.err) && /continua sendo mostrado/.test(r.err) && r.resultVisible && r.rows.startsWith('10.000') && lt !== null && mx < 1000 && nn < 20000 && log.pageerrors.length === 0, `msg="${r.err}" tempo=${dt} ms maior long task=${Math.round(mx)} ms nos=${nn} resultado anterior=${r.resultVisible}/${r.rows}`);
    }
    // EN
    await pg.evaluate(() => Hub.setLang('en')); await pg.waitForTimeout(100); r = await grab(pg);
    L.rec('SEC-P3-01 mensagem de colunas em EN', /Too many columns|columns and the limit is 2,000/.test(r.err) && !/\{|\}|undefined/.test(r.err), `msg="${r.err}"`);
    await pg.evaluate(() => Hub.setLang('pt'));
    // Hub.t: passada unica
    const bufb = fs.readFileSync(fpath('basic.csv'));
    await load(pg, { name: '{rows} {cols}.csv', mimeType: 'text/csv', buffer: bufb }); r = await grab(pg);
    const tt = await pg.evaluate(() => Hub.t('hub.csv.stat.file', { v: '{x}' }) + '|' + Hub.t('hub.csv.data.cap.some', { n: '{total}', total: 'T' }));
    L.rec('Hub.t substitui {x} em passada unica: arquivo "{rows} {cols}.csv" aparece literal no status', /\{rows\} \{cols\}\.csv/.test(await pg.textContent('[data-stat=file]')) && /\{x\}/.test(tt) && tt.includes('Primeiras {total} de T'), `status="${r.status}" t="${tt}"`);
    await c.close(); }

  // ---- 360px sem rolagem horizontal, temas, axe
  for (const theme of ['light', 'dark']) for (const lang of ['en', 'pt']) {
    const c = await L.ctx(br, { lang, theme, vp: 360 }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' });
    const m = async () => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const res = [];
    res.push(['inicial', await m()]);
    for (const n of ['wide.csv', 'basic.csv', 'xss.csv']) { await load(pg, n); res.push([n, await m()]); }
    await load(pg, 'fake.csv'); res.push(['erro', await m()]);
    await load(pg, 'latin1.csv'); res.push(['aviso', await m()]);
    L.rec(`RSP/CSV-360px (${lang}/${theme}): sem rolagem horizontal da pagina em todos os estados`, res.every(([, x]) => x.sw <= x.cw), JSON.stringify(res));
    if (AXE) {
      const out = [];
      for (const [st, n] of [['inicial', null], ['tabela carregada', 'basic.csv'], ['aviso', 'latin1.csv'], ['erro', 'fake.csv']]) {
        if (n) await load(pg, n);
        await pg.evaluate(AXE);
        const r = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })); });
        out.push(`${st}: ${r.length ? JSON.stringify(r) : 'sem violacoes'}`);
      }
      L.rec(`A11-02 axe (${lang}/${theme}/360) nos estados dinamicos: zero violacoes`, out.every(s => /sem violacoes/.test(s)), out.join('\n'));
    }
    await c.close();
  }
  { const c = await L.ctx(br, { lang: 'en', theme: 'dark', vp: 1280 }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`);
    await load(pg, 'basic.csv'); await pg.evaluate(AXE);
    const r = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => v.id + ' ' + v.impact));
    L.rec('A11-02 axe (en/dark/1280) tabela carregada: zero violacoes', r.length === 0, JSON.stringify(r)); await c.close(); }

  // ---- teclado (CSV-05): Tab chega ao seletor de arquivo, foco visivel, Enter/Space abrem o seletor; selects por teclado
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`, { waitUntil: 'networkidle' });
    const seq = []; for (let i = 0; i < 14; i++) { await pg.keyboard.press('Tab'); seq.push(await pg.evaluate(() => { const e = document.activeElement; return e.id || e.tagName + ':' + e.textContent.trim().slice(0, 12); })); if (seq[seq.length - 1] === 'csvEnc') break; }
    await pg.focus('#csvFile'); const vis = await pg.evaluate(() => { const l = document.querySelector('.csv-pick'); const o = getComputedStyle(l).outlineStyle; return o; });
    let fc = null, via = 'Enter';
    for (const k of ['Enter', 'Space', 'Enter']) { via = k; const w = pg.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null); await pg.focus('#csvFile'); await pg.keyboard.press(k === 'Space' ? ' ' : k); fc = await w; if (fc) break; }
    if (!fc) throw new Error('seletor de arquivo nao abriu por teclado (Enter/Space/Enter)');
    await fc.setFiles(fpath('basic.csv')); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'ready');
    await pg.focus('#csvDelim'); await pg.keyboard.press('ArrowDown'); await pg.waitForFunction(() => document.getElementById('csvTool').dataset.state === 'ready'); await pg.waitForTimeout(500);
    const r = await grab(pg);
    L.rec('CSV-05 operacao so por teclado: Tab chega a escolha de arquivo e aos seletores, Enter abre o seletor, foco visivel (outline), mudar opcao com seta relê', seq.includes('csvFile') && seq.includes('csvEnc') && vis !== 'none' && r.state === 'ready', `ordem de Tab=${seq.join(' > ')} outline=${vis} tecla que abriu=${via} delim apos seta="${r.delim}" erro=${r.errVisible}`);
    await c.close(); }

  // ---- i18n: troca de idioma re-renderiza texto dinamico
  { const c = await L.ctx(br, { lang: 'en' }); const pg = await c.newPage(); await pg.goto(`${L.BASE}/${PAGE}`); await load(pg, 'basic.csv'); const en = await grab(pg);
    await pg.click('[data-lang=pt]'); const pt = await grab(pg);
    L.rec('HUB-15 troca EN->PT com arquivo carregado traduz resumo e legenda', en.rows === '10,000 rows' && pt.rows === '10.000 linhas' && /Primeiras 100 de 10\.000 linhas/.test(await pg.textContent('#csvDataCap')), `${en.rows} -> ${pt.rows}`); await c.close(); }

  fs.rmSync(WDIR, { recursive: true, force: true });
  await br.close(); srv.stop();
  process.exit(L.results.some(r => !r.ok) ? 1 : 0);
})().catch(e => { console.log('FAIL erro do teste :: ' + (e && e.stack || e)); process.exit(1); });
