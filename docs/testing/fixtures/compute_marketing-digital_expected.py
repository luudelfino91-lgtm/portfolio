#!/usr/bin/env python3
"""Oraculo independente do banco "Marketing digital": sqlite3 do Python sobre o MESMO .sql que o Hub carrega.
Uso: python3 -I compute_marketing-digital_expected.py <marketing-digital.sql>
Saida (JSON em stdout): integridade, foreign_key_check, contagens, somas, NULLs e 3 consultas-chave. Cada consulta traz o
SQL, o resultado do sqlite3 ("rows") e o mesmo resultado calculado em Python puro a partir das linhas brutas ("py_rows");
o script sai com codigo 1 se os dois divergirem (tolerancia 1e-6 em numeros)."""
import json, sqlite3, sys
from collections import defaultdict

TABELAS = ['canais', 'campanhas', 'anuncios', 'metricas_diarias', 'leads']
SQL = {
    'ctr_por_canal': """SELECT c.nome, SUM(m.impressoes) AS impressoes, SUM(m.cliques) AS cliques,
  ROUND(100.0 * SUM(m.cliques) / SUM(m.impressoes), 4) AS ctr_pct
FROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id JOIN canais c ON c.id = a.canal_id
GROUP BY c.id ORDER BY c.id""",
    'roas_por_canal_mes': """SELECT c.nome, substr(m.data, 1, 7) AS mes, ROUND(SUM(m.custo), 2) AS custo,
  ROUND(SUM(m.receita), 2) AS receita, ROUND(SUM(m.receita) / SUM(m.custo), 4) AS roas
FROM metricas_diarias m JOIN anuncios a ON a.id = m.anuncio_id JOIN canais c ON c.id = a.canal_id
GROUP BY c.id, mes ORDER BY c.id, mes""",
    'leads_sem_conversao': """SELECT p.id, p.nome, COUNT(l.id) AS leads, SUM(l.convertido_em IS NULL) AS sem_conversao
FROM campanhas p JOIN leads l ON l.campanha_id = p.id
GROUP BY p.id ORDER BY sem_conversao DESC, p.id LIMIT 10""",
}


def py_queries(t):
    can = {r[0]: r[1] for r in t['canais']}
    anu_canal = {r[0]: r[2] for r in t['anuncios']}
    imp, cli = defaultdict(int), defaultdict(int)
    cus, rec = defaultdict(float), defaultdict(float)
    for (_, aid, data, i, c, custo, conv, receita) in t['metricas_diarias']:
        k = (anu_canal[aid], data[:7])
        imp[k] += i; cli[k] += c; cus[k] += custo; rec[k] += receita
    q1 = []
    for cid in sorted(can):
        ks = [k for k in imp if k[0] == cid]
        si, sc = sum(imp[k] for k in ks), sum(cli[k] for k in ks)
        q1.append([can[cid], si, sc, round(100.0 * sc / si, 4)])
    q2 = [[can[k[0]], k[1], round(cus[k], 2), round(rec[k], 2), round(rec[k] / cus[k], 4)] for k in sorted(imp)]
    tot, sem = defaultdict(int), defaultdict(int)
    for l in t['leads']:
        tot[l[1]] += 1
        sem[l[1]] += l[6] is None
    nome = {r[0]: r[1] for r in t['campanhas']}
    q3 = sorted(([p, nome[p], tot[p], sem[p]] for p in tot), key=lambda x: (-x[3], x[0]))[:10]
    return {'ctr_por_canal': q1, 'roas_por_canal_mes': q2, 'leads_sem_conversao': q3}


def same(a, b):
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if len(x) != len(y):
            return False
        for u, v in zip(x, y):
            if isinstance(u, (int, float)) and isinstance(v, (int, float)):
                if abs(u - v) > 1e-6 * max(1, abs(u)):
                    return False
            elif u != v:
                return False
    return True


def main():
    c = sqlite3.connect(':memory:')
    c.execute('PRAGMA foreign_keys = ON')
    c.executescript(open(sys.argv[1], encoding='utf-8').read())
    one = lambda s: c.execute(s).fetchone()[0]
    t = {n: c.execute('SELECT * FROM %s ORDER BY id' % n).fetchall() for n in TABELAS}
    out = {'sqlite_version': sqlite3.sqlite_version, 'integrity_check': one('PRAGMA integrity_check'),
           'fk_check': c.execute('PRAGMA foreign_key_check').fetchall(),
           'counts': {n: len(t[n]) for n in TABELAS},
           'sums': {'impressoes': one('SELECT SUM(impressoes) FROM metricas_diarias'), 'cliques': one('SELECT SUM(cliques) FROM metricas_diarias'),
                    'conversoes': one('SELECT SUM(conversoes) FROM metricas_diarias'), 'custo': round(one('SELECT SUM(custo) FROM metricas_diarias'), 2),
                    'receita': round(one('SELECT SUM(receita) FROM metricas_diarias'), 2), 'orcamento': round(one('SELECT SUM(orcamento) FROM campanhas'), 2)},
           'nulls': {'campanhas_sem_data_fim': one('SELECT COUNT(*) FROM campanhas WHERE data_fim IS NULL'),
                     'leads_sem_email': one('SELECT COUNT(*) FROM leads WHERE email IS NULL'),
                     'leads_sem_conversao': one('SELECT COUNT(*) FROM leads WHERE convertido_em IS NULL')},
           'queries': {}}
    py = py_queries(t)
    ok = True
    for k, s in SQL.items():
        cur = c.execute(s)
        rows = [list(r) for r in cur.fetchall()]
        m = same(rows, py[k])
        ok = ok and m
        out['queries'][k] = {'sql': s, 'columns': [d[0] for d in cur.description], 'n': len(rows), 'rows': rows, 'py_rows': py[k], 'match': m}
    json.dump(out, sys.stdout)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
