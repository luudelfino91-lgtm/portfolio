#!/bin/sh
# Executa todos os testes da casca do Hub.
# Variaveis: CHROME_PATH (padrao /usr/bin/google-chrome), AXE_PATH (padrao /tmp/axe/package/axe.min.js),
#            PORT_ROOT=8081 PORT_SUB=8082 PORT_GZ=8083, HUB_LOG_DIR (padrao /tmp; logs hub-<teste>.log).
# Pre-requisito: axe-core (cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz).
# python.js (T-402) sobe servidores PROPRIOS em PORT_PY=8084 (site, com CORS) e PORT_OUT=8085 ("origem de fora", registra hits); nao usa 8081/8082/8083.
# D11 (sem upload): nenhum teste precisa mais das fixtures grandes de CSV (limit-10mb.csv etc.). datasets.js nao usa portas nem navegador (precisa de python3 e node).
# Oraculo dos 5 cenarios: tests/hub/oracle.js (sqlite3 do Python sobre hub/assets/data/*.sql).
cd "$(dirname "$0")/../.." || exit 1
SITE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/hub-site-XXXXXX") || exit 1
trap 'rm -rf "$SITE_DIR"' EXIT INT TERM
ln -s "$(pwd)" "$SITE_DIR/portfolio"   # /portfolio/ servido na PORT_SUB
export SITE_DIR
rc=0
LOGDIR=${HUB_LOG_DIR:-/tmp}   # HUB_LOG_DIR evita sobrescrever os logs de outra execucao concorrente (outra worktree)
mkdir -p "$LOGDIR"
for t in datasets reg shell i18n_theme_privacy a11y budget_file csv sql sample exercises scenarios nouploads python; do
  echo "=== $t ==="; node tests/hub/$t.js > $LOGDIR/hub-$t.log 2>&1; r=$?; [ $r -ne 0 ] && rc=1
  echo "exit=$r"
  grep -c '^PASS' $LOGDIR/hub-$t.log | sed 's/^/PASS: /'; grep -c '^FAIL' $LOGDIR/hub-$t.log | sed 's/^/FAIL: /'; grep -c '^N/A' $LOGDIR/hub-$t.log | sed 's/^/N\/A: /'
  grep '^FAIL' $LOGDIR/hub-$t.log | cut -c1-200
done
echo "=== check-i18n-keys (Hub real) ==="; node docs/testing/check-i18n-keys.js > $LOGDIR/hub-i18nkeys.log 2>&1; r=$?; [ $r -ne 0 ] && rc=1; echo "exit=$r"
exit $rc
