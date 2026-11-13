#!/bin/sh
# Executa todos os testes da casca do Hub.
# Variaveis: CHROME_PATH (padrao /usr/bin/google-chrome), AXE_PATH (padrao /tmp/axe/package/axe.min.js),
#            PORT_ROOT=8081 PORT_SUB=8082 PORT_GZ=8083.
# Pre-requisito: axe-core (cd /tmp/axe && npm pack axe-core && tar xzf axe-core-*.tgz).
# csv.js e sql.js tambem exigem as fixtures grandes FORA do repo: (cd docs/testing/fixtures && python3 -I gen_csv.py --large --out /tmp/csv-large)  (FIXTURES_LARGE muda o caminho).
cd "$(dirname "$0")/../.." || exit 1
SITE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/hub-site-XXXXXX") || exit 1
trap 'rm -rf "$SITE_DIR"' EXIT INT TERM
ln -s "$(pwd)" "$SITE_DIR/portfolio"   # /portfolio/ servido na PORT_SUB
export SITE_DIR
rc=0
for t in reg shell i18n_theme_privacy a11y budget_file csv sql sample exercises; do
  echo "=== $t ==="; node tests/hub/$t.js > /tmp/hub-$t.log 2>&1; r=$?; [ $r -ne 0 ] && rc=1
  echo "exit=$r"
  grep -c '^PASS' /tmp/hub-$t.log | sed 's/^/PASS: /'; grep -c '^FAIL' /tmp/hub-$t.log | sed 's/^/FAIL: /'; grep -c '^N/A' /tmp/hub-$t.log | sed 's/^/N\/A: /'
  grep '^FAIL' /tmp/hub-$t.log | cut -c1-200
done
echo "=== check-i18n-keys (Hub real) ==="; node docs/testing/check-i18n-keys.js > /tmp/hub-i18nkeys.log 2>&1; r=$?; [ $r -ne 0 ] && rc=1; echo "exit=$r"
exit $rc
