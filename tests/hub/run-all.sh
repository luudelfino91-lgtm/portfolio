#!/bin/sh
# Executa todos os testes da casca do Hub. Pre-requisito: axe-core em /tmp/axe/package (npm pack axe-core; tar xzf).
cd "$(dirname "$0")/../.." || exit 1
rc=0
for t in reg shell i18n_theme_privacy a11y budget_file; do
  echo "=== $t ==="; node tests/hub/$t.js > /tmp/hub-$t.log 2>&1; r=$?; [ $r -ne 0 ] && rc=1
  grep -c '^PASS' /tmp/hub-$t.log | sed 's/^/PASS: /'; grep -c '^FAIL' /tmp/hub-$t.log | sed 's/^/FAIL: /'; grep '^FAIL' /tmp/hub-$t.log | cut -c1-140
done
exit $rc
