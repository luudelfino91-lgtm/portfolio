#!/usr/bin/env python3
"""Exporta cada tabela de cada cenario do Hub para CSV (D11: sem upload; as ferramentas usam so as 5 bases embutidas).

Uso:
  python3 -I docs/testing/fixtures/export_scenarios_csv.py                # grava em hub/assets/data/csv/
  python3 -I docs/testing/fixtures/export_scenarios_csv.py --out <pasta>   # grava em outra pasta (testes)
  python3 -I docs/testing/fixtures/export_scenarios_csv.py --report        # imprime a tabela Markdown de bytes e SHA-256

Entrada: hub/assets/data/<cenario>.sql (a MESMA fonte de verdade do SQL playground). Saida, por cenario <slug>:
  <slug>/<tabela>.csv  UTF-8 sem BOM, fim de linha LF, primeira linha = cabecalho, aspas so quando preciso (csv.QUOTE_MINIMAL),
                       linhas na ordem de rowid. NULL vira celula VAZIA (por isso o script RECUSA texto vazio ou so com espacos:
                       nao haveria como distinguir de NULL). REAL e escrito com repr() do Python (ex.: 12.5, 100.0).
  <slug>/schema.json   tabelas na ordem do CREATE TABLE, colunas com tipo declarado, PK e FK (de PRAGMA table_info/foreign_key_list).
  SHA256SUMS           (na pasta de saida) conferivel com: cd hub/assets/data/csv && sha256sum -c SHA256SUMS
Determinismo: duas execucoes geram arquivos identicos. Somente biblioteca padrao."""
import argparse, csv, hashlib, io, json, os, sqlite3, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DATA = os.path.join(REPO, 'hub', 'assets', 'data')
SCENARIOS = [('loja-exemplo', 'loja-exemplo.sql'), ('marketing-digital', 'marketing-digital.sql'), ('logistica', 'logistica.sql'),
             ('rh', 'rh.sql'), ('atendimento', 'atendimento.sql')]


def cell(v, where):
    if v is None:
        return ''
    if isinstance(v, bool):
        raise ValueError('bool inesperado em ' + where)
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(v)
    if isinstance(v, str):
        if v == '' or v != v.strip() or '\r' in v:
            raise ValueError('texto vazio/com espacos nas pontas/com CR em %s: %r (ambiguo com NULL ou com o fim de linha)' % (where, v))
        return v
    raise ValueError('tipo %s inesperado em %s' % (type(v).__name__, where))


def export_scenario(slug, sqlfile):
    """Devolve {caminho_relativo: bytes} para um cenario."""
    c = sqlite3.connect(':memory:')
    c.executescript(open(os.path.join(DATA, sqlfile), encoding='utf-8').read())
    names = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY rowid")]
    out, schema = {}, {'slug': slug, 'tables': []}
    for n in names:
        info = c.execute('PRAGMA table_info("%s")' % n).fetchall()
        fks = {r[3]: '%s.%s' % (r[2], r[4]) for r in c.execute('PRAGMA foreign_key_list("%s")' % n).fetchall()}
        cols = [{'name': r[1], 'type': r[2], 'pk': r[5] > 0, 'fk': fks.get(r[1], '')} for r in info]
        schema['tables'].append({'name': n, 'columns': cols})
        buf = io.StringIO(newline='')
        w = csv.writer(buf, lineterminator='\n', quoting=csv.QUOTE_MINIMAL)
        w.writerow([x['name'] for x in cols])
        for row in c.execute('SELECT * FROM "%s" ORDER BY rowid' % n):
            w.writerow([cell(v, '%s.%s' % (slug, n)) for v in row])
        out['%s/%s.csv' % (slug, n)] = buf.getvalue().encode('utf-8')
    out['%s/schema.json' % slug] = (json.dumps(schema, indent=1, sort_keys=True) + '\n').encode('utf-8')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(DATA, 'csv'))
    ap.add_argument('--report', action='store_true', help='imprime bytes e SHA-256 em Markdown (sem gravar)')
    a = ap.parse_args()
    files = {}
    for slug, f in SCENARIOS:
        files.update(export_scenario(slug, f))
    if a.report:
        tot = 0
        print('| Arquivo | Bytes | SHA-256 |\n|---|---|---|')
        for p in sorted(files):
            b = files[p]; tot += len(b)
            print('| `%s` | %d | `%s` |' % (p, len(b), hashlib.sha256(b).hexdigest()))
        print('\nTotal: %d arquivos, %d bytes' % (len(files), tot))
        return
    for p, b in files.items():
        dst = os.path.join(a.out, p)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(b)
    sums = ''.join('%s  %s\n' % (hashlib.sha256(files[p]).hexdigest(), p) for p in sorted(files))
    with open(os.path.join(a.out, 'SHA256SUMS'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(sums)
    print('%d arquivos, %d bytes em %s' % (len(files), sum(len(b) for b in files.values()), a.out))


if __name__ == '__main__':
    sys.exit(main())
