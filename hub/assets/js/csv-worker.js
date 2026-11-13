/* =====================================================================
   Worker de leitura de CSV (T-302/T-306a). Roda fora da thread principal.
   - Recebe o File, decodifica (UTF-8 com/sem BOM ou Windows-1252), detecta o
     delimitador, le em fluxo (Papa Parse, callback step) e devolve só o
     resumo: primeiras linhas, contagens e tipos. Nada sai do navegador:
     este arquivo não usa fetch, XHR nem WebSocket.
   - Cancelar = o csv.js chama worker.terminate().
   Mensagem de entrada: {type:'parse', file, delimiter:'auto'|',',';','\t','|', encoding:'auto'|'utf-8'|'windows-1252', preview}
   Saídas: {type:'progress', pct} | {type:'result', ...} | {type:'error', code, detail}
   ===================================================================== */
'use strict';
importScripts('../vendor/papaparse/papaparse.min.js'); // relativo a este arquivo: hub/assets/vendor/

var CANDIDATES = [',', ';', '\t', '|'];
var RE_INT = /^[+-]?(0|[1-9][0-9]*)$/;
var RE_DEC = /^[+-]?(0|[1-9][0-9]*)\.[0-9]+$/;
var RE_DEC_BR = /^[+-]?(0|[1-9][0-9]*),[0-9]+$/;
var RE_DATE_ISO = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
var RE_DATE_BR = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/;

// Tipos (mesmas regras do oráculo docs/testing/fixtures/compute_expected.py). Bits:
var K_INT = 1, K_DEC = 2, K_DECBR = 4, K_BOOL = 8, K_DATE = 16, K_DATEBR = 32, K_TEXT = 64;

function validDate(y, m, d) {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  var leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  var dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= dim;
}
function kindOf(v) {
  var m;
  if (RE_INT.test(v)) return K_INT;
  if (RE_DEC.test(v)) return K_DEC;
  if (RE_DEC_BR.test(v)) return K_DECBR;
  var l = v.toLowerCase();
  if (l === 'true' || l === 'false') return K_BOOL;
  if ((m = RE_DATE_ISO.exec(v)) && validDate(+m[1], +m[2], +m[3])) return K_DATE;
  if ((m = RE_DATE_BR.exec(v)) && validDate(+m[3], +m[2], +m[1])) return K_DATEBR;
  return K_TEXT;
}
function typeOf(mask) {
  if (!mask) return 'empty';
  if ((mask & ~K_INT) === 0) return 'integer';
  if ((mask & ~(K_INT | K_DEC)) === 0) return 'decimal';
  if ((mask & ~(K_INT | K_DECBR)) === 0) return 'decimal_br';
  if (mask === K_BOOL) return 'boolean';
  if (mask === K_DATE) return 'date';
  if (mask === K_DATEBR) return 'date_br';
  return 'text';
}

// Delimitador: o que deixa as primeiras 20 linhas mais consistentes (empate: mais colunas); 1 coluna -> null.
function detectDelimiter(text) {
  var sample = text.length > 1048576 ? text.slice(0, 1048576) : text;
  var best = null, bk = [0, 1];
  for (var i = 0; i < CANDIDATES.length; i++) {
    var recs = Papa.parse(sample, { delimiter: CANDIDATES[i], preview: 20, skipEmptyLines: true }).data;
    if (!recs.length) continue;
    var n0 = recs[0].length;
    if (n0 < 2) continue;
    var ok = 0;
    for (var j = 0; j < recs.length; j++) if (recs[j].length === n0) ok++;
    var c = ok / recs.length;
    if (c > bk[0] || (c === bk[0] && n0 > bk[1])) { best = CANDIDATES[i]; bk = [c, n0]; }
  }
  return best;
}

function fail(code, detail) { self.postMessage({ type: 'error', code: code, detail: detail || '' }); }

function decode(bytes, mode) {
  var bom = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
  var body = bom ? bytes.subarray(3) : bytes;
  if (mode === 'windows-1252') return { text: new TextDecoder('windows-1252').decode(body), encoding: 'windows-1252', bom: bom, fallback: false };
  try {
    return { text: new TextDecoder('utf-8', { fatal: mode === 'auto', ignoreBOM: true }).decode(body), encoding: 'utf-8', bom: bom, fallback: false };
  } catch (e) {
    // não é UTF-8 válido: Windows-1252 (superconjunto prático de ISO-8859-1) e avisa
    return { text: new TextDecoder('windows-1252').decode(body), encoding: 'windows-1252', bom: false, fallback: true };
  }
}

function run(msg) {
  var file = msg.file;
  file.arrayBuffer().then(function (buf) {
    var bytes = new Uint8Array(buf);
    if (bytes.length === 0) return fail('empty');
    var head = Math.min(bytes.length, 8192);
    for (var i = 0; i < head; i++) if (bytes[i] === 0) return fail('binary');
    var dec = decode(bytes, msg.encoding || 'auto');
    bytes = null; buf = null;
    var text = dec.text;
    var delim = msg.delimiter && msg.delimiter !== 'auto' ? msg.delimiter : detectDelimiter(text);
    var keep = msg.preview || 100;
    var header = null, preview = [], rows = 0, ragged = 0, quoteErrors = 0, masks = [];
    var total = text.length, last = 0;
    self.postMessage({ type: 'progress', pct: 0 });
    Papa.parse(text, {
      delimiter: delim || ',',
      skipEmptyLines: true,
      step: function (r) {
        if (r.errors && r.errors.length) for (var e = 0; e < r.errors.length; e++) if (r.errors[e].type === 'Quotes') quoteErrors++;
        var row = r.data;
        if (header === null) {
          header = row; for (var c = 0; c < header.length; c++) masks.push(0);
          return;
        }
        rows++;
        if (row.length !== header.length) ragged++;
        if (preview.length < keep) preview.push(row);
        var n = Math.min(row.length, header.length);
        for (var k = 0; k < n; k++) {
          var v = row[k];
          if (v.trim() === '') continue; // nulo = vazio ou só espaços
          masks[k] |= kindOf(v);
        }
        if ((rows & 511) === 0) {
          var now = Date.now();
          if (now - last > 60) {
            last = now;
            var cur = r.meta && r.meta.cursor ? r.meta.cursor : 0;
            self.postMessage({ type: 'progress', pct: Math.min(99, Math.floor(cur / total * 100)) });
          }
        }
      }
    });
    if (header === null) return fail('empty');
    self.postMessage({
      type: 'result', header: header, rows: preview, rowCount: rows, colCount: header.length,
      delimiter: delim, encoding: dec.encoding, bom: dec.bom, fallback: dec.fallback,
      replacement: text.indexOf('�') !== -1, ragged: ragged, quoteErrors: quoteErrors,
      types: masks.map(typeOf), size: file.size
    });
  }).catch(function (e) { fail('parse', e && e.message ? e.message : String(e)); });
}

self.onmessage = function (e) {
  var m = e.data;
  if (m && m.type === 'parse') {
    try { run(m); } catch (err) { fail('parse', err && err.message ? err.message : String(err)); }
  }
};
