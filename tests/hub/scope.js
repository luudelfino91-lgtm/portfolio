// Escopo da Fase 2: so docs/, hub/, tests/ e .claude/ podem mudar. Une o diff COMMITADO (origin/main...HEAD),
// o diff do working tree contra HEAD e `git status --porcelain` (inclui nao rastreados).
const { execSync } = require('child_process');
const ALLOWED = /^(docs|hub|tests|\.claude)\//;
const run = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function changed(repo, base = 'origin/main') {
  const set = new Set();
  const add = out => out.split('\n').filter(Boolean).forEach(f => set.add(f));
  add(run(`git diff --name-only ${base}...HEAD`, repo));
  add(run('git diff --name-only HEAD', repo));
  run('git status --porcelain --untracked-files=all', repo).split('\n').filter(Boolean).forEach(l => {
    const p = l.slice(3); set.add(p.includes(' -> ') ? p.split(' -> ')[1] : p); });
  return [...set].map(f => f.replace(/^"|"$/g, ''));
}
const offending = (repo, base) => changed(repo, base).filter(f => !ALLOWED.test(f));
module.exports = { changed, offending, ALLOWED };
