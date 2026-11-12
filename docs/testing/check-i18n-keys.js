#!/usr/bin/env node
// Verificador de chaves i18n do Hub (T-205, HUB-15). Dono: qa-engineer.
// Uso: node docs/testing/check-i18n-keys.js [--i18n <arquivo.js>] [--html <arquivo|pasta> ...]
// Padrao: hub/assets/js/i18n.js e todo index.html sob hub/.
// Saida: 0 = conjuntos consistentes; 1 = inconsistencia; 2 = erro de uso/leitura.
// Carregamento do dicionario: o literal de `var DICT = {...}` e delimitado por um leitor de
// chaves que respeita strings e comentarios (sem regex sobre o formato) e avaliado com o modulo vm,
// em contexto vazio (sem acesso a require/process/globais). Sem eval.
// Limitacao: DICT e privado na IIFE de i18n.js, entao a ancora `var DICT =` e necessaria.
// Proposta ao desenvolvedor: expor o dicionario como dado (ex.: hub/assets/js/i18n-dict.json ou
// Hub.dict) para dispensar a ancora.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const REPO = path.resolve(__dirname, '../..');

function literalAfter(src, anchor) {
  const at = src.indexOf(anchor); if (at < 0) throw new Error('ancora nao encontrada: ' + anchor);
  let i = src.indexOf('{', at), depth = 0; const start = i;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === '"' || c === "'" || c === '`') { for (i++; src[i] !== c; i++) { if (src[i] === '\\') i++; if (i >= src.length) throw new Error('string nao fechada'); } continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2); if (i < 0) throw new Error('comentario nao fechado'); i++; continue; }
    if (c === '{') depth++; else if (c === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error('literal nao fechado');
}
function loadDict(file) {
  const lit = literalAfter(fs.readFileSync(file, 'utf8'), 'var DICT =');
  const d = vm.runInNewContext('(' + lit + ')', Object.create(null), { timeout: 1000 });
  if (!d || typeof d.en !== 'object' || typeof d.pt !== 'object') throw new Error('dicionario sem en/pt');
  return d;
}
function htmlFiles(p) {
  const st = fs.statSync(p); if (st.isFile()) return [p];
  return fs.readdirSync(p).flatMap(n => { const f = path.join(p, n); return fs.statSync(f).isDirectory() ? (n === 'assets' ? [] : htmlFiles(f)) : (n.endsWith('.html') ? [f] : []); });
}
function usedKeys(files) {
  const used = new Set();
  for (const f of files) { const h = fs.readFileSync(f, 'utf8');
    for (const m of h.matchAll(/data-i="([^"]+)"/g)) used.add(m[1]);
    for (const m of h.matchAll(/data-ia="([^"]+)"/g)) m[1].split(',').forEach(x => used.add(x.slice(x.indexOf(':') + 1))); }
  return used;
}
function check(dict, used) {
  const en = Object.keys(dict.en), pt = Object.keys(dict.pt);
  return { usedMissingEn: [...used].filter(k => !(k in dict.en)), usedMissingPt: [...used].filter(k => !(k in dict.pt)),
    enWithoutPt: en.filter(k => !(k in dict.pt)), ptWithoutEn: pt.filter(k => !(k in dict.en)), unused: en.filter(k => !used.has(k)), counts: { used: used.size, en: en.length, pt: pt.length } };
}
module.exports = { loadDict, usedKeys, check, htmlFiles };
if (require.main === module) {
  try {
    const a = process.argv.slice(2); let i18n = path.join(REPO, 'hub/assets/js/i18n.js'); const html = [];
    for (let k = 0; k < a.length; k++) { if (a[k] === '--i18n') i18n = path.resolve(a[++k]); else if (a[k] === '--html') html.push(path.resolve(a[++k])); else throw new Error('argumento desconhecido: ' + a[k]); }
    const files = htmlFiles(...(html.length ? [html[0]] : [path.join(REPO, 'hub')])).concat(html.slice(1).flatMap(htmlFiles));
    const r = check(loadDict(i18n), usedKeys(files));
    const bad = r.usedMissingEn.length + r.usedMissingPt.length + r.enWithoutPt.length + r.ptWithoutEn.length;
    console.log(`i18n=${path.relative(REPO, i18n)} html=${files.length} arquivos; chaves usadas=${r.counts.used} EN=${r.counts.en} PT=${r.counts.pt}`);
    console.log('usadas sem EN:', JSON.stringify(r.usedMissingEn), '| usadas sem PT:', JSON.stringify(r.usedMissingPt));
    console.log('EN sem PT:', JSON.stringify(r.enWithoutPt), '| PT sem EN:', JSON.stringify(r.ptWithoutEn), '| nao usadas (informativo):', JSON.stringify(r.unused));
    console.log(bad ? 'FAIL' : 'PASS'); process.exit(bad ? 1 : 0);
  } catch (e) { console.error('ERRO: ' + e.message); process.exit(2); }
}
