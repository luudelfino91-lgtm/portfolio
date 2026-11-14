#!/usr/bin/env python3
"""Gera hub/assets/vendor/pyodide/pyodide-lock.json (D12): o pyodide-lock.json OFICIAL (357 pacotes) filtrado para o fecho
de dependencias de numpy e pandas (numpy, pandas, python-dateutil, pytz, six). Nao altera nenhuma entrada, so remove as outras.
Uso: python3 -I docs/testing/vendor-pyodide-lock-filter.py <pyodide-lock.json original> <pasta dos .whl> <saida>
Confere o sha256 de cada wheel contra o campo sha256 do lock original e que o fecho de pandas == o conjunto esperado."""
import hashlib, json, os, sys
src, wheels, out = sys.argv[1:4]
KEEP = {'numpy', 'pandas', 'python-dateutil', 'pytz', 'six'}
lock = json.load(open(src, encoding='utf-8'))
P = lock['packages']
def closure(n, seen):
    if n not in seen:
        seen.add(n)
        for d in P[n]['depends']: closure(d.lower().replace('_', '-'), seen)
    return seen
assert closure('pandas', set()) == KEEP, closure('pandas', set())
for n in KEEP:
    f = os.path.join(wheels, P[n]['file_name'])
    h = hashlib.sha256(open(f, 'rb').read()).hexdigest()
    assert h == P[n]['sha256'], (n, h, P[n]['sha256'])
lock['packages'] = {n: P[n] for n in sorted(KEEP)}
with open(out, 'w', encoding='utf-8') as fh:
    json.dump(lock, fh, ensure_ascii=False, separators=(',', ':'))
print('ok', len(lock['packages']), 'pacotes ->', out)
